const express = require("express")
const authController = require("../controllers/auth.controller")
const { authMiddleware } = require("../middleware/auth.middleware")

const router = express.Router()


/* POST /api/auth/register */
router.post("/register", authController.userRegisterController)


/* POST /api/auth/login */
router.post("/login", authController.userLoginController)

/**
 * - POST /api/auth/verify-otp
 * - Requires auth token (user must be logged in)
 */
router.post("/verify-otp", authMiddleware, authController.verifyOtpController)

/**
 * - POST /api/auth/resend-otp
 * - Requires auth token (user must be logged in)
 */
router.post("/resend-otp", authMiddleware, authController.resendOtpController)

/**
 * - POST /api/auth/logout
 */
router.post("/logout", authController.userLogoutController)



module.exports = router