import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api, setAuthToken, setStoredUser, getAuthToken, getStoredUser } from '../services/api'

// ─── Async Thunks ───────────────────────────────────────────────

export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const data = await api.login({ email, password })
            setAuthToken(data.token)
            setStoredUser(data.user)
            return data
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async ({ email, password, name }, { rejectWithValue }) => {
        try {
            const data = await api.register({ email, password, name })
            setAuthToken(data.token)
            setStoredUser(data.user)
            return data
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            await api.logout().catch(() => {})
        } finally {
            setAuthToken(null)
            setStoredUser(null)
        }
    }
)

// ─── Slice ──────────────────────────────────────────────────────

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: getStoredUser(),
        token: getAuthToken(),
        loading: false,
        error: null
    },
    reducers: {
        clearError(state) {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Register
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.token = action.payload.token
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Logout
        builder
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.error = null
            })
    }
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
