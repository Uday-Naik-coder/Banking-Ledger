const userModel = require("../models/user.model")
const otpModel = require("../models/otp.model")
const jwt = require("jsonwebtoken")
const emailService = require("../services/email.service")
const tokenBlackListModel = require("../models/blackList.model")
const crypto = require("crypto")

/**
 * Generate a 6-digit numeric OTP
 */
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString()
}

/**
* - user register controller
* - POST /api/auth/register
* - Creates user (unverified) and sends OTP email
*/
async function userRegisterController(req, res) {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
        return res.status(400).json({
            message: "Email, password, and name are required",
            status: "failed"
        })
    }

    const isExists = await userModel.findOne({
        email: email
    })

    if (isExists) {
        // If user exists but is not verified, allow re-registration by resending OTP
        if (!isExists.verified) {
            // Delete any old OTPs for this user
            await otpModel.deleteMany({ user: isExists._id })

            const otp = generateOtp()
            await otpModel.create({ user: isExists._id, otp })

            const token = jwt.sign({ userId: isExists._id }, process.env.JWT_SECRET, { expiresIn: "3d" })
            res.cookie("token", token)

            res.status(200).json({
                user: {
                    _id: isExists._id,
                    email: isExists.email,
                    name: isExists.name,
                    verified: false,
                    systemUser: false
                },
                token,
                requiresOtp: true,
                message: "OTP resent to your email"
            })

            await emailService.sendOtpEmail(isExists.email, isExists.name, otp)
            return
        }

        return res.status(422).json({
            message: "User already exists with this email.",
            status: "failed"
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    // Regular users always have systemUser: false
    // System users are created manually in the database

    // Generate and send OTP
    const otp = generateOtp()
    await otpModel.create({ user: user._id, otp })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token)

    res.status(201).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            verified: false,
            systemUser: false
        },
        token,
        requiresOtp: true
    })

    await emailService.sendOtpEmail(user.email, user.name, otp)
}

/**
 * - Verify OTP Controller
 * - POST /api/auth/verify-otp
 * - Verifies the OTP and marks user as verified
 */
async function verifyOtpController(req, res) {
    const { otp } = req.body
    const user = req.user

    if (!otp) {
        return res.status(400).json({
            message: "OTP is required"
        })
    }

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized. Please register or login first."
        })
    }

    // Check if already verified
    if (user.verified) {
        return res.status(200).json({
            message: "Email is already verified",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                verified: true,
                systemUser: user.systemUser || false
            }
        })
    }

    // Find the most recent OTP for this user
    const otpRecord = await otpModel.findOne({ user: user._id }).sort({ createdAt: -1 })

    if (!otpRecord) {
        return res.status(400).json({
            message: "OTP has expired. Please request a new one."
        })
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
        await otpModel.deleteMany({ user: user._id })
        return res.status(429).json({
            message: "Too many failed attempts. Please request a new OTP."
        })
    }

    // Increment attempts
    otpRecord.attempts += 1
    await otpRecord.save()

    // Compare OTP
    const isValid = await otpRecord.compareOtp(otp)

    if (!isValid) {
        const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts
        return res.status(400).json({
            message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
        })
    }

    // OTP is valid — mark user as verified
    await userModel.findByIdAndUpdate(user._id, { verified: true })

    // Clean up all OTPs for this user
    await otpModel.deleteMany({ user: user._id })

    // Send welcome email after successful verification
    await emailService.sendRegistrationEmail(user.email, user.name)

    return res.status(200).json({
        message: "Email verified successfully",
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            verified: true,
            systemUser: user.systemUser || false
        }
    })
}

/**
 * - Resend OTP Controller
 * - POST /api/auth/resend-otp
 * - Generates a new OTP and sends it to the user's email
 */
async function resendOtpController(req, res) {
    const user = req.user

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized. Please register or login first."
        })
    }

    // Check if already verified
    if (user.verified) {
        return res.status(200).json({
            message: "Email is already verified"
        })
    }

    // Rate limit: check if an OTP was sent in the last 60 seconds
    const recentOtp = await otpModel.findOne({ user: user._id }).sort({ createdAt: -1 })
    if (recentOtp) {
        const timeSinceLastOtp = Date.now() - new Date(recentOtp.createdAt).getTime()
        const cooldownMs = 60 * 1000 // 60 seconds

        if (timeSinceLastOtp < cooldownMs) {
            const waitSeconds = Math.ceil((cooldownMs - timeSinceLastOtp) / 1000)
            return res.status(429).json({
                message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
            })
        }
    }

    // Delete all previous OTPs and create a new one
    await otpModel.deleteMany({ user: user._id })
    const otp = generateOtp()
    await otpModel.create({ user: user._id, otp })

    res.status(200).json({
        message: "A new OTP has been sent to your email."
    })

    await emailService.sendOtpEmail(user.email, user.name, otp)
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 * - If user is not verified, sends OTP and returns requiresOtp flag
  */

async function userLoginController(req, res) {
    const { email, password } = req.body

    const user = await userModel.findOne({ email }).select("+password +systemUser")

    if (!user) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
        return res.status(401).json({
            message: "Email or password is INVALID"
        })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

    res.cookie("token", token)

    // If user is not verified (and not a system user), trigger OTP flow
    if (!user.verified && !user.systemUser) {
        // Delete old OTPs and send a fresh one
        await otpModel.deleteMany({ user: user._id })
        const otp = generateOtp()
        await otpModel.create({ user: user._id, otp })

        res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                verified: false,
                systemUser: false
            },
            token,
            requiresOtp: true,
            message: "Please verify your email to continue."
        })

        await emailService.sendOtpEmail(user.email, user.name, otp)
        return
    }

    res.status(200).json({
        user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            verified: user.verified,
            systemUser: user.systemUser || false
        },
        token
    })

}


/**
 * - User Logout Controller
 * - POST /api/auth/logout
  */
async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[ 1 ]

    if (!token) {
        return res.status(200).json({
            message: "User logged out successfully"
        })
    }



    await tokenBlackListModel.create({
        token: token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })

}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    verifyOtpController,
    resendOtpController
}