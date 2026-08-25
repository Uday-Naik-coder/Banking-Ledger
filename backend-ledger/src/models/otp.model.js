const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")


const otpSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [ true, "OTP must be associated with a user" ],
        index: true
    },
    otp: {
        type: String,
        required: [ true, "OTP code is required" ]
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 5
    }
}, {
    timestamps: true
})

// Auto-expire OTP documents after 10 minutes
otpSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 10 * 60 // 10 minutes
})

// Hash OTP before saving
otpSchema.pre("save", async function () {
    if (!this.isModified("otp")) {
        return
    }
    const hash = await bcrypt.hash(this.otp, 10)
    this.otp = hash
})

// Compare OTP
otpSchema.methods.compareOtp = async function (candidateOtp) {
    return await bcrypt.compare(candidateOtp, this.otp)
}

const otpModel = mongoose.model("otp", otpSchema)

module.exports = otpModel
