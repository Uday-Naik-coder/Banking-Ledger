import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../services/api'

// ─── Async Thunks ───────────────────────────────────────────────

export const fetchAccounts = createAsyncThunk(
    'accounts/fetchAccounts',
    async (_, { rejectWithValue }) => {
        try {
            const data = await api.getUserAccounts()
            return data.accounts || []
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

export const createAccount = createAsyncThunk(
    'accounts/createAccount',
    async (_, { rejectWithValue }) => {
        try {
            const data = await api.createAccount()
            return data.account
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

export const fetchBalance = createAsyncThunk(
    'accounts/fetchBalance',
    async (accountId, { rejectWithValue }) => {
        try {
            const data = await api.getAccountBalance(accountId)
            return { accountId, balance: data.balance }
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

// ─── Slice ──────────────────────────────────────────────────────

const accountSlice = createSlice({
    name: 'accounts',
    initialState: {
        accounts: [],
        activeAccountId: null,
        balances: {},     // { accountId: balance }
        loading: false,
        accountsFetched: false,  // true once fetchAccounts has completed at least once
        error: null
    },
    reducers: {
        setActiveAccount(state, action) {
            state.activeAccountId = action.payload
        },
        clearAccounts(state) {
            state.accounts = []
            state.activeAccountId = null
            state.balances = {}
            state.accountsFetched = false
        }
    },
    extraReducers: (builder) => {
        // Fetch accounts
        builder
            .addCase(fetchAccounts.pending, (state) => {
                state.loading = true
            })
            .addCase(fetchAccounts.fulfilled, (state, action) => {
                state.loading = false
                state.accountsFetched = true
                state.accounts = action.payload
                // Set active account if not set
                if (action.payload.length > 0 && !state.activeAccountId) {
                    state.activeAccountId = action.payload[0]._id
                }
            })
            .addCase(fetchAccounts.rejected, (state, action) => {
                state.loading = false
                state.accountsFetched = true
                state.error = action.payload
            })

        // Create account
        builder
            .addCase(createAccount.pending, (state) => {
                state.loading = true
            })
            .addCase(createAccount.fulfilled, (state, action) => {
                state.loading = false
                state.accounts.push(action.payload)
                state.activeAccountId = action.payload._id
            })
            .addCase(createAccount.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Fetch balance
        builder
            .addCase(fetchBalance.fulfilled, (state, action) => {
                state.balances[action.payload.accountId] = action.payload.balance
            })
    }
})

export const { setActiveAccount, clearAccounts } = accountSlice.actions
export default accountSlice.reducer
