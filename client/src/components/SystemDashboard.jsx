import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { api } from '../services/api'
import {
    IconBank, IconDatabase, IconActivity, IconRefresh,
    IconArrowDownLeft, IconArrowUpRight, IconShield,
    IconCheckCircle, IconAlertCircle
} from './Icons'

export const SystemDashboard = () => {
    const { user } = useSelector((state) => state.auth)
    const { accounts } = useSelector((state) => state.accounts)

    const [bankStats, setBankStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)
    const [ledgerAccountId, setLedgerAccountId] = useState('')
    const [ledgerEntries, setLedgerEntries] = useState([])
    const [ledgerLoading, setLedgerLoading] = useState(false)
    const [filterType, setFilterType] = useState('ALL')

    // Initial funds form
    const [depositToAccount, setDepositToAccount] = useState('')
    const [depositAmount, setDepositAmount] = useState('')
    const [depositLoading, setDepositLoading] = useState(false)
    const [depositMessage, setDepositMessage] = useState(null)
    const [depositError, setDepositError] = useState(null)

    const loadBankStats = useCallback(async () => {
        setStatsLoading(true)
        try {
            const data = await api.getBankStats()
            setBankStats(data)
        } catch (err) {
            console.error('Failed to load bank stats:', err)
        } finally {
            setStatsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadBankStats()
    }, [loadBankStats])

    const systemAccounts = bankStats?.systemAccounts || []
    const stats = bankStats?.stats || {
        totalTransactions: 0,
        totalCompleted: 0,
        totalAccounts: 0,
        totalLedgerEntries: 0,
        totalCustomerFunds: 0
    }
    const totalVaultBalance = systemAccounts.reduce((acc, curr) => acc + (curr.balance || 0), 0)

    const handleLoadLedger = async () => {
        if (!ledgerAccountId) return
        setLedgerLoading(true)
        try {
            const data = await api.getAccountLedger(ledgerAccountId)
            setLedgerEntries(data.entries || [])
        } catch (err) {
            console.error('Failed to load ledger:', err)
        } finally {
            setLedgerLoading(false)
        }
    }

    const generateKey = () =>
        'SYS-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(36).toUpperCase()

    const handleSystemDeposit = async (e) => {
        e.preventDefault()
        setDepositLoading(true)
        setDepositError(null)
        setDepositMessage(null)
        try {
            const data = await api.systemInitialFunds({
                toAccount: depositToAccount,
                amount: parseFloat(depositAmount),
                idempotencyKey: generateKey()
            })
            setDepositMessage(data.message)
            setDepositAmount('')
            loadBankStats()
        } catch (err) {
            setDepositError(err.message)
        } finally {
            setDepositLoading(false)
        }
    }

    const filteredEntries = ledgerEntries.filter((entry) => {
        if (filterType === 'ALL') return true
        return entry.type === filterType
    })

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">
                        System <span className="text-accent">Dashboard</span>
                    </h2>
                    <p className="text-sm text-text-muted mt-1">Bank administration & monitoring</p>
                </div>
                <button
                    onClick={loadBankStats}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
                >
                    <IconRefresh size={16} className={statsLoading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* System Balance - Always visible */}
            <div className="glass-card rounded-2xl p-6 glow-accent">
                <div className="flex items-center gap-2 mb-3">
                    <IconBank size={18} className="text-emerald-accent" />
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                        Central Bank Vault / System Reserve
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg text-text-muted">₹</span>
                    <span className="text-4xl font-bold font-mono text-emerald-accent">
                        {totalVaultBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm text-text-muted">INR</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                    {systemAccounts.length} System Account(s) • Balance derived from immutable ledger
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<IconActivity size={20} className="text-cyan-accent" />}
                    label="Total Customer Deposits"
                    value={`₹${(stats.totalCustomerFunds || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    sub={`Across ${stats.totalAccounts || 0} accounts`}
                    color="cyan"
                />
                <StatCard
                    icon={<IconDatabase size={20} className="text-violet-accent" />}
                    label="Ledger Entries"
                    value={stats.totalLedgerEntries || 0}
                    sub="Immutable journal records"
                    color="violet"
                />
                <StatCard
                    icon={<IconCheckCircle size={20} className="text-emerald-accent" />}
                    label="Completed Transactions"
                    value={stats.totalCompleted || 0}
                    sub={`of ${stats.totalTransactions || 0} total`}
                    color="emerald"
                />
                <StatCard
                    icon={<IconShield size={20} className="text-accent" />}
                    label="Registered Accounts"
                    value={stats.totalAccounts || 0}
                    sub="Active in the system"
                    color="accent"
                />
            </div>

            {/* System Initial Funds */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <IconArrowDownLeft size={18} className="text-emerald-accent" />
                    Issue Initial Funds (System → Account)
                </h3>
                <form onSubmit={handleSystemDeposit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={depositToAccount}
                        onChange={(e) => setDepositToAccount(e.target.value)}
                        placeholder="Recipient Account ID"
                        className="glass-input flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
                        required
                    />
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">₹</span>
                        <input
                            type="number"
                            step="any"
                            min="1"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="Amount"
                            className="glass-input w-full sm:w-40 pl-7 pr-4 py-2.5 rounded-xl text-sm font-mono"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={depositLoading}
                        className="btn-accent px-6 py-2.5 rounded-xl text-sm whitespace-nowrap"
                    >
                        {depositLoading ? 'Processing...' : 'Send Funds'}
                    </button>
                </form>
                {depositMessage && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-accent/10 border border-emerald-accent/20 text-emerald-accent text-sm animate-fade-in">
                        <IconCheckCircle size={16} /> {depositMessage}
                    </div>
                )}
                {depositError && (
                    <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-red-accent/10 border border-red-accent/20 text-red-accent text-sm animate-fade-in">
                        <IconAlertCircle size={16} /> {depositError}
                    </div>
                )}
            </div>

            {/* Ledger Explorer */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <IconDatabase size={18} className="text-violet-accent" />
                    Ledger Explorer
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                        type="text"
                        value={ledgerAccountId}
                        onChange={(e) => setLedgerAccountId(e.target.value)}
                        placeholder="Enter Account ID to inspect"
                        className="glass-input flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
                    />
                    {/* Quick select system accounts */}
                    {systemAccounts.map((acc) => (
                        <button
                            key={acc._id}
                            type="button"
                            onClick={() => setLedgerAccountId(acc._id)}
                            className="px-3 py-2 rounded-lg text-xs font-mono bg-surface-2 text-text-muted hover:text-text-primary border border-border-subtle transition-colors"
                        >
                            System: {acc._id.slice(0, 6)}...
                        </button>
                    ))}
                    <button
                        onClick={handleLoadLedger}
                        disabled={!ledgerAccountId || ledgerLoading}
                        className="btn-accent px-6 py-2.5 rounded-xl text-sm whitespace-nowrap"
                    >
                        {ledgerLoading ? 'Loading...' : 'Load Ledger'}
                    </button>
                </div>

                {/* Filter pills */}
                {ledgerEntries.length > 0 && (
                    <div className="flex gap-2 mb-4">
                        {['ALL', 'CREDIT', 'DEBIT'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                    ${filterType === type
                                        ? 'bg-accent text-white'
                                        : 'bg-surface-2 text-text-muted hover:text-text-primary border border-border-subtle'
                                    }`}
                            >
                                {type} ({type === 'ALL' ? ledgerEntries.length : ledgerEntries.filter(e => e.type === type).length})
                            </button>
                        ))}
                    </div>
                )}

                {/* Ledger Table */}
                {ledgerLoading ? (
                    <div className="py-8 text-center text-text-muted">
                        <IconRefresh size={16} className="animate-spin inline mr-2" />
                        Loading ledger entries...
                    </div>
                ) : filteredEntries.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-subtle">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Entry ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Amount</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Counterparty</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Idempotency Key</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry) => {
                                    const isCredit = entry.type === 'CREDIT'
                                    const tx = entry.transaction
                                    const fromAcc = tx?.fromAccount
                                    const toAcc = tx?.toAccount

                                    return (
                                        <tr key={entry._id} className="border-b border-border-subtle/50 hover:bg-surface-glass/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                                                {entry._id?.slice(0, 8)}...
                                            </td>
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
                                            <td className="px-4 py-3 text-xs text-text-muted">
                                                {isCredit ? (
                                                    <span>From: <span className="font-mono">{fromAcc?._id ? fromAcc._id.slice(0, 6) + '...' : 'External'}</span>{fromAcc?.user?.name ? ` (${fromAcc.user.name})` : ''}</span>
                                                ) : (
                                                    <span>To: <span className="font-mono">{toAcc?._id ? toAcc._id.slice(0, 6) + '...' : 'External'}</span>{toAcc?.user?.name ? ` (${toAcc.user.name})` : ''}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-text-muted">
                                                {tx?.idempotencyKey || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-text-muted">
                                                {tx?.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : ledgerAccountId && !ledgerLoading ? (
                    <div className="py-8 text-center text-text-muted text-sm">
                        No ledger entries found for this account.
                    </div>
                ) : null}
            </div>
        </div>
    )
}

// ─── Stat Card Sub-component ────────────────────────────────────

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-${color}-accent/10`}>
                    {icon}
                </div>
                <span className="text-xs font-medium text-text-muted">{label}</span>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">{value}</div>
            <span className="text-[11px] text-text-muted">{sub}</span>
        </div>
    )
}
