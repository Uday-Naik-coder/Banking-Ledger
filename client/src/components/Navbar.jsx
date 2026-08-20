import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logoutUser } from '../store/authSlice'
import { clearAccounts } from '../store/accountSlice'
import { IconBank, IconUser, IconLogOut } from './Icons'

export const Navbar = () => {
    const { user } = useSelector((state) => state.auth)
    const dispatch = useDispatch()

    const handleLogout = () => {
        dispatch(logoutUser())
        dispatch(clearAccounts())
    }

    return (
        <header className="sticky top-0 z-50 glass-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent/10 border border-accent/20">
                            <IconBank size={20} className="text-accent" />
                        </div>
                        <div>
                            <div className="text-base font-bold text-text-primary leading-tight">
                                Aegis<span className="text-accent">Ledger</span>
                            </div>
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">
                                {user?.systemUser ? 'System Admin' : 'Banking Portal'}
                            </div>
                        </div>
                    </div>

                    {/* User Section */}
                    {user && (
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 border border-accent/20">
                                    <IconUser size={14} className="text-accent" />
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-text-primary leading-tight">
                                        {user.name}
                                    </div>
                                    <div className="text-[11px] text-text-muted">
                                        {user.email}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-red-accent hover:bg-red-accent/10 transition-all duration-200"
                                title="Log Out"
                            >
                                <IconLogOut size={16} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
