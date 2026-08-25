import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { verifyOtp, resendOtp, logoutUser, clearError, clearOtpMessage } from '../store/authSlice'
import { IconBank, IconShield, IconAlertCircle, IconCheckCircle, IconRefresh } from './Icons'

export const OtpVerification = () => {
    const dispatch = useDispatch()
    const { user, loading, error, otpMessage } = useSelector((state) => state.auth)

    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [cooldown, setCooldown] = useState(0)
    const inputRefs = useRef([])

    // Cooldown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1)
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    // Auto-clear messages after 5 seconds
    useEffect(() => {
        if (otpMessage) {
            const timer = setTimeout(() => dispatch(clearOtpMessage()), 5000)
            return () => clearTimeout(timer)
        }
    }, [otpMessage, dispatch])

    // Focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus()
    }, [])

    const handleChange = (index, value) => {
        // Only allow single digits
        if (value && !/^\d$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        // Clear error when user starts typing
        if (error) dispatch(clearError())

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }

        // Auto-submit when all 6 digits entered
        if (value && index === 5) {
            const fullOtp = newOtp.join('')
            if (fullOtp.length === 6) {
                dispatch(verifyOtp({ otp: fullOtp }))
            }
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
        if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (!pasteData) return

        const newOtp = [...otp]
        for (let i = 0; i < pasteData.length; i++) {
            newOtp[i] = pasteData[i]
        }
        setOtp(newOtp)

        // Focus the next empty input or the last one
        const nextEmpty = newOtp.findIndex((d) => !d)
        inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()

        // Auto-submit if all 6 digits pasted
        if (pasteData.length === 6) {
            dispatch(verifyOtp({ otp: pasteData }))
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const fullOtp = otp.join('')
        if (fullOtp.length !== 6) return
        dispatch(verifyOtp({ otp: fullOtp }))
    }

    const handleResend = () => {
        if (cooldown > 0 || loading) return
        dispatch(resendOtp())
        setCooldown(60)
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
    }

    const handleLogout = () => {
        dispatch(logoutUser())
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base p-4">
            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-accent/5 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative animate-fade-in">
                <div className="glass-card rounded-2xl p-8 glow-accent">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
                            <IconShield size={32} className="text-accent" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            Verify Your Email
                        </h1>
                        <p className="text-sm text-text-muted mt-2">
                            We sent a 6-digit code to
                        </p>
                        <p className="text-sm text-accent font-medium mt-1">
                            {user?.email}
                        </p>
                    </div>

                    {/* OTP Input */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-center gap-3" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl glass-input
                                        transition-all duration-200
                                        ${digit ? 'border-accent/50 text-accent' : ''}
                                        ${error ? 'border-red-accent/50' : ''}
                                        focus:border-accent focus:ring-2 focus:ring-accent/20`}
                                    autoComplete="one-time-code"
                                />
                            ))}
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-accent/10 border border-red-accent/20 text-red-accent text-sm animate-fade-in">
                                <IconAlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message */}
                        {otpMessage && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent text-sm animate-fade-in">
                                <IconCheckCircle size={18} />
                                <span>{otpMessage}</span>
                            </div>
                        )}

                        {/* Verify Button */}
                        <button
                            type="submit"
                            className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                            disabled={loading || otp.join('').length !== 6}
                        >
                            {loading ? (
                                <>
                                    <IconRefresh size={16} className="animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <IconShield size={16} />
                                    <span>Verify Email</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Resend & Logout */}
                    <div className="mt-6 space-y-3">
                        <div className="text-center">
                            <span className="text-sm text-text-muted">Didn't receive the code? </span>
                            <button
                                onClick={handleResend}
                                disabled={cooldown > 0 || loading}
                                className={`text-sm font-medium transition-colors duration-200
                                    ${cooldown > 0
                                        ? 'text-text-muted cursor-not-allowed'
                                        : 'text-accent hover:text-accent-hover cursor-pointer'
                                    }`}
                            >
                                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                            </button>
                        </div>

                        <div className="text-center">
                            <button
                                onClick={handleLogout}
                                className="text-sm text-text-muted hover:text-red-accent transition-colors duration-200 cursor-pointer"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </div>

                    {/* Timer notice */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-text-muted">
                            OTP expires in <span className="text-amber-accent font-medium">10 minutes</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
