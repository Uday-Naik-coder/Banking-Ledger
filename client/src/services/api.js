/**
 * API Client for Banking Ledger Backend
 * Uses Axios with interceptors for auth tokens and error handling
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
    : '/api'

// ─── Axios Instance ──────────────────────────────────────────────

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
})

// ─── Request Interceptor: Auto-attach auth token ────────────────

axiosInstance.interceptors.request.use((config) => {
    const token = getAuthToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Response Interceptor: Normalize errors ─────────────────────

axiosInstance.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response) {
            const msg = error.response.data?.message || `Request failed with status ${error.response.status}`
            const err = new Error(msg)
            err.status = error.response.status
            err.data = error.response.data
            return Promise.reject(err)
        }
        return Promise.reject(new Error(`Cannot connect to backend at ${API_BASE_URL}. Ensure the backend is running.`))
    }
)

// ─── LocalStorage Helpers ───────────────────────────────────────

export function getAuthToken() {
    return localStorage.getItem('ledger_auth_token') || ''
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem('ledger_auth_token', token)
    } else {
        localStorage.removeItem('ledger_auth_token')
    }
}

export function getStoredUser() {
    try {
        const raw = localStorage.getItem('ledger_auth_user')
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function setStoredUser(user) {
    if (user) {
        localStorage.setItem('ledger_auth_user', JSON.stringify(user))
    } else {
        localStorage.removeItem('ledger_auth_user')
    }
}

// ─── API Methods ────────────────────────────────────────────────

export const api = {
    // Auth
    register: (userData) => axiosInstance.post('/auth/register', userData),
    login: (credentials) => axiosInstance.post('/auth/login', credentials),
    logout: () => axiosInstance.post('/auth/logout'),

    // Accounts
    createAccount: () => axiosInstance.post('/accounts'),
    getUserAccounts: () => axiosInstance.get('/accounts'),
    getAccountBalance: (accountId) => axiosInstance.get(`/accounts/balance/${accountId}`),

    // Transactions
    transfer: (data) => axiosInstance.post('/transactions', data),
    deposit: (data) => axiosInstance.post('/transactions/deposit', data),
    withdraw: (data) => axiosInstance.post('/transactions/withdraw', data),
    systemInitialFunds: (data) => axiosInstance.post('/transactions/system/initial-funds', data),

    // Ledger & Stats
    getAccountLedger: (accountId) => axiosInstance.get(`/transactions/ledger/${accountId}`),
    getBankStats: () => axiosInstance.get('/transactions/bank-stats'),
}
