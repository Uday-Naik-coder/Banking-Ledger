import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchAccounts, clearAccounts } from './store/accountSlice'
import { AuthForms } from './components/AuthForms'
import { Navbar } from './components/Navbar'
import { UserDashboard } from './components/UserDashboard'
import { SystemDashboard } from './components/SystemDashboard'
import { IconRefresh } from './components/Icons'

export default function App() {
    const { user, loading: authLoading } = useSelector((state) => state.auth)
    const dispatch = useDispatch()

    // Load accounts when user logs in
    useEffect(() => {
        if (user) {
            dispatch(fetchAccounts())
        } else {
            dispatch(clearAccounts())
        }
    }, [user, dispatch])

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base">
                <div className="flex items-center gap-3 text-text-secondary">
                    <IconRefresh size={20} className="animate-spin text-accent" />
                    <span>Connecting to Banking Engine...</span>
                </div>
            </div>
        )
    }

    // Not logged in → show auth page
    if (!user) {
        return <AuthForms />
    }

    // Logged in and verified → show appropriate dashboard based on role
    return (
        <div className="min-h-screen bg-base">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {user.systemUser ? <SystemDashboard /> : <UserDashboard />}
            </main>
        </div>
    )
}
