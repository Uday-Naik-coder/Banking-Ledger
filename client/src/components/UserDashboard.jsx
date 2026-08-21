import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchAccounts, fetchBalance, createAccount } from '../store/accountSlice'
import { api } from '../services/api'
import {
    IconShield, IconArrowDownLeft, IconArrowUpRight, IconTransfer,
    IconRefresh, IconCheckCircle, IconAlertCircle, IconPlus,
    IconCopy, IconHistory, IconBank
} from './Icons'

export const UserDashboard = () => {
    const { user } = useSelector((state) => state.auth)
    const { accounts, balances, loading: accountsLoading, accountsFetched } = useSelector((state) => state.accounts)
    const dispatch = useDispatch()

    const [activePanel, setActivePanel] = useState(null) // 'deposit' | 'withdraw' | 'transfer' | null
    const [amount, setAmount] = useState('')
    const [recipientId, setRecipientId] = useState('')
    const [txLoading, setTxLoading] = useState(false)
    const [txMessage, setTxMessage] = useState(null)
    const [txError, setTxError] = useState(null)
    const [copied, setCopied] = useState(false)
    const [ledgerEntries, setLedgerEntries] = useState([])
    const [ledgerLoading, setLedgerLoading] = useState(false)
    const [showLedger, setShowLedger] = useState(false)

    const activeAccount = accounts[0] // Primary account
    const balance = activeAccount ? balances[activeAccount._id] : null

    // Auto-create account only after fetchAccounts has completed and returned empty
    useEffect(() => {
        if (accountsFetched && !accountsLoading && accounts.length === 0) {
            dispatch(createAccount())
        }
    }, [accountsFetched, accountsLoading, accounts.length, dispatch])

    const generateKey = () =>
        'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()

    const handleCheckBalance = () => {
        if (activeAccount) {
            dispatch(fetchBalance(activeAccount._id))
        }
    }

    const handleCopyId = () => {
        if (activeAccount) {
            navigator.clipboard.writeText(activeAccount._id)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const resetForm = () => {
        setAmount('')
        setRecipientId('')
        setTxMessage(null)
        setTxError(null)
    }

    const openPanel = (panel) => {
        setActivePanel(panel)
        resetForm()
    }

    const handleDeposit = async (e) => {
        e.preventDefault()
        if (!activeAccount || !amount) return
        setTxLoading(true)
        setTxError(null)
        setTxMessage(null)
        try {
            const data = await api.deposit({
                accountId: activeAccount._id,
                amount: parseFloat(amount),
                idempotencyKey: generateKey()
            })
            setTxMessage(data.message)
            dispatch(fetchBalance(activeAccount._id))
            setAmount('')
        } catch (err) {
            setTxError(err.message)
        } finally {
            setTxLoading(false)
        }
    }

    const handleWithdraw = async (e) => {
        e.preventDefault()
        if (!activeAccount || !amount) return
        setTxLoading(true)
        setTxError(null)
        setTxMessage(null)
        try {
            const data = await api.withdraw({
                accountId: activeAccount._id,
                amount: parseFloat(amount),
                idempotencyKey: generateKey()
            })
            setTxMessage(data.message)
            dispatch(fetchBalance(activeAccount._id))
            setAmount('')
        } catch (err) {
            setTxError(err.message)
        } finally {
            setTxLoading(false)
        }
    }

    const handleTransfer = async (e) => {
        e.preventDefault()
        if (!activeAccount || !amount || !recipientId) return
        setTxLoading(true)
        setTxError(null)
        setTxMessage(null)
        try {
            const data = await api.transfer({
                fromAccount: activeAccount._id,
                toAccount: recipientId,
                amount: parseFloat(amount),
                idempotencyKey: generateKey()
            })
            setTxMessage(data.message)
            dispatch(fetchBalance(activeAccount._id))
            setAmount('')
            setRecipientId('')
        } catch (err) {
            setTxError(err.message)
        } finally {
            setTxLoading(false)
        }
    }

    const handleLoadLedger = async () => {
        if (!activeAccount) return
        setShowLedger(!showLedger)
        if (!showLedger) {
            setLedgerLoading(true)
            try {
                const data = await api.getAccountLedger(activeAccount._id)
                setLedgerEntries(data.entries || [])
            } catch (err) {
                console.error('Failed to load ledger:', err)
            } finally {
                setLedgerLoading(false)
            }
        }
    }

    if (accountsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <IconRefresh size={20} className="animate-spin text-accent" />
                <span className="ml-2 text-text-secondary">Loading your accounts...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome Header */}
            <div>
                <h2 className="text-2xl font-bold text-text-primary">
                    Welcome, <span className="text-accent">{user.name}</span>
                </h2>
                <p className="text-sm text-text-muted mt-1">Manage your banking account</p>
            </div>

            {/* Account Card */}
            {activeAccount && (
                <div className="glass-card rounded-2xl p-6 glow-accent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <IconShield size={16} className="text-accent" />
                            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                                Checking Account
                            </span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase
                            ${activeAccount.status === 'ACTIVE'
                                ? 'bg-emerald-accent/10 text-emerald-accent border border-emerald-accent/20'
                                : 'bg-amber-accent/10 text-amber-accent border border-amber-accent/20'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${activeAccount.status === 'ACTIVE' ? 'bg-emerald-accent' : 'bg-amber-accent'}`} />
                            {activeAccount.status || 'ACTIVE'}
                        </span>
                    </div>

                    {/* Account ID */}
                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-xs text-text-muted">Account ID:</span>
                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-1/50 hover:bg-surface-2 transition-colors text-xs font-mono text-text-secondary"
                            title="Click to copy"
                        >
                            {activeAccount._id.slice(0, 8)}...{activeAccount._id.slice(-6)}
                            {copied ? <IconCheckCircle size={12} className="text-emerald-accent" /> : <IconCopy size={12} />}
                        </button>
                        {copied && <span className="text-[10px] text-emerald-accent animate-fade-in">Copied!</span>}
                    </div>

                    {/* Balance Display */}
                    <div className="mb-6">
                        <span className="text-xs text-text-muted block mb-1">Account Balance</span>
                        {balance !== null && balance !== undefined ? (
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg text-text-muted">₹</span>
                                <span className="text-3xl font-bold font-mono text-text-primary">
                                    {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-sm text-text-muted ml-1">INR</span>
                            </div>
                        ) : (
                            <div className="text-text-muted text-sm">Click "Check Balance" to view</div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <button
                            onClick={handleCheckBalance}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
                        >
                            <IconRefresh size={16} />
                            <span>Check Balance</span>
                        </button>
                        <button
                            onClick={() => openPanel('deposit')}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${activePanel === 'deposit'
                                    ? 'bg-emerald-accent text-white'
                                    : 'bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent hover:bg-emerald-accent/20'
                                }`}
                        >
                            <IconArrowDownLeft size={16} />
                            <span>Deposit</span>
                        </button>
                        <button
                            onClick={() => openPanel('withdraw')}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${activePanel === 'withdraw'
                                    ? 'bg-amber-accent text-white'
                                    : 'bg-amber-accent/10 border border-amber-accent/20 text-amber-accent hover:bg-amber-accent/20'
                                }`}
                        >
                            <IconArrowUpRight size={16} />
                            <span>Withdraw</span>
                        </button>
                        <button
                            onClick={() => openPanel('transfer')}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                ${activePanel === 'transfer'
                                    ? 'bg-cyan-accent text-white'
                                    : 'bg-cyan-accent/10 border border-cyan-accent/20 text-cyan-accent hover:bg-cyan-accent/20'
                                }`}
                        >
                            <IconTransfer size={16} />
                            <span>Transfer</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Transaction Forms */}
            {activePanel && (
                <div className="glass-card rounded-2xl p-6 animate-slide-up">
                    <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        {activePanel === 'deposit' && <><IconArrowDownLeft size={20} className="text-emerald-accent" /> Deposit Money</>}
                        {activePanel === 'withdraw' && <><IconArrowUpRight size={20} className="text-amber-accent" /> Withdraw Money</>}
                        {activePanel === 'transfer' && <><IconTransfer size={20} className="text-cyan-accent" /> Transfer Money</>}
                    </h3>

                    <form
                        onSubmit={activePanel === 'deposit' ? handleDeposit : activePanel === 'withdraw' ? handleWithdraw : handleTransfer}
                        className="space-y-4"
                    >
                        {activePanel === 'transfer' && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                    Recipient Account ID
                                </label>
                                <input
                                    type="text"
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                    placeholder="Enter 24-character MongoDB Account ID"
                                    className="glass-input w-full px-4 py-3 rounded-xl text-sm font-mono"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                Amount (₹)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">₹</span>
                                <input
                                    type="number"
                                    step="any"
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="glass-input w-full pl-8 pr-4 py-3 rounded-xl text-sm font-mono font-bold"
                                    required
                                />
                            </div>
                            {/* Quick amount chips */}
                            <div className="flex gap-2 mt-2">
                                {[100, 500, 1000, 5000].map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => setAmount(val.toString())}
                                        className="px-3 py-1 rounded-lg text-xs font-medium bg-surface-2 text-text-muted hover:text-text-primary hover:bg-surface-glass transition-colors border border-border-subtle"
                                    >
                                        +₹{val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Success / Error messages */}
                        {txMessage && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent text-sm animate-fade-in">
                                <IconCheckCircle size={18} />
                                <span>{txMessage}</span>
                            </div>
                        )}
                        {txError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-accent/10 border border-red-accent/20 text-red-accent text-sm animate-fade-in">
                                <IconAlertCircle size={18} />
                                <span>{txError}</span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setActivePanel(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text-primary bg-surface-2 border border-border-subtle hover:border-border-glass transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={txLoading}
                                className="btn-accent flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                                {txLoading ? (
                                    <><IconRefresh size={16} className="animate-spin" /> Processing...</>
                                ) : (
                                    <span>
                                        {activePanel === 'deposit' && 'Deposit'}
                                        {activePanel === 'withdraw' && 'Withdraw'}
                                        {activePanel === 'transfer' && 'Transfer'}
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transaction History Toggle */}
            <div>
                <button
                    onClick={handleLoadLedger}
                    className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-accent transition-colors"
                >
                    <IconHistory size={16} />
                    <span>{showLedger ? 'Hide' : 'View'} Transaction History</span>
                </button>
            </div>

            {/* Ledger Table */}
            {showLedger && (
                <div className="glass-card rounded-2xl overflow-hidden animate-slide-up">
                    <div className="p-4 border-b border-border-subtle">
                        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                            <IconHistory size={16} className="text-violet-accent" />
                            Ledger Journal Entries
                        </h3>
                    </div>

                    {ledgerLoading ? (
                        <div className="p-8 text-center text-text-muted">
                            <IconRefresh size={16} className="animate-spin inline mr-2" />
                            Loading entries...
                        </div>
                    ) : ledgerEntries.length === 0 ? (
                        <div className="p-8 text-center text-text-muted text-sm">
                            No transactions yet. Make a deposit to get started!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-subtle">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Type</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Amount</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Details</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledgerEntries.map((entry) => {
                                        const isCredit = entry.type === 'CREDIT'
                                        const tx = entry.transaction
                                        return (
                                            <tr key={entry._id} className="border-b border-border-subtle/50 hover:bg-surface-glass/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold
                                                        ${isCredit
                                                            ? 'bg-emerald-accent/10 text-emerald-accent'
                                                            : 'bg-red-accent/10 text-red-accent'
                                                        }`}
                                                    >
                                                        {isCredit ? <IconArrowDownLeft size={10} /> : <IconArrowUpRight size={10} />}
                                                        {entry.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-mono font-semibold ${isCredit ? 'text-emerald-accent' : 'text-red-accent'}`}>
                                                        {isCredit ? '+' : '-'}₹{(entry.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-text-muted text-xs font-mono">
                                                    {tx?._id ? `Tx: ${tx._id.slice(0, 10)}...` : 'System'}
                                                </td>
                                                <td className="px-4 py-3 text-text-muted text-xs">
                                                    {tx?.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
