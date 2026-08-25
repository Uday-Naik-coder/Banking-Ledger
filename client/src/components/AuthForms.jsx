import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser, registerUser, clearError } from '../store/authSlice'
import { IconBank, IconLock, IconUser, IconAlertCircle } from './Icons'

export const AuthForms = () => {
    const dispatch = useDispatch()
    const { loading, error } = useSelector((state) => state.auth)

    const [isLogin, setIsLogin] = useState(true)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isLogin) {
            dispatch(loginUser({ email, password }))
        } else {
            dispatch(registerUser({ email, password, name }))
        }
    }

    const switchMode = (login) => {
        setIsLogin(login)
        dispatch(clearError())
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-base p-4">
            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-accent/5 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative animate-fade-in">
                {/* Card */}
                <div className="glass-card rounded-2xl p-8 glow-accent">

                    {/* Brand Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
                            <IconBank size={32} className="text-accent" />
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary">
                            Aegis<span className="text-accent">Ledger</span>
                        </h1>
                        <p className="text-sm text-text-muted mt-1">
                            Double-Entry Core Banking Engine
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex rounded-xl bg-surface-1 p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => switchMode(true)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${isLogin
                                    ? 'bg-accent text-white shadow-lg'
                                    : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <IconLock size={15} />
                            <span>Sign In</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode(false)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${!isLogin
                                    ? 'bg-accent text-white shadow-lg'
                                    : 'text-text-muted hover:text-text-secondary'
                                }`}
                        >
                            <IconUser size={15} />
                            <span>Register</span>
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Uday Naik"
                                    className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                                    required={!isLogin}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="user@example.com"
                                className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                className="glass-input w-full px-4 py-3 rounded-xl text-sm"
                                minLength={6}
                                required
                            />
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-accent/10 border border-red-accent/20 text-red-accent text-sm animate-fade-in">
                                <IconAlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn-accent w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <span>Authenticating...</span>
                            ) : isLogin ? (
                                <>
                                    <IconLock size={16} />
                                    <span>Sign In</span>
                                </>
                            ) : (
                                <>
                                    <IconUser size={16} />
                                    <span>Create Account</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
