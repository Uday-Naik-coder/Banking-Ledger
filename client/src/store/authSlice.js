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

export const verifyOtp = createAsyncThunk(
    'auth/verifyOtp',
    async ({ otp }, { rejectWithValue }) => {
        try {
            const data = await api.verifyOtp({ otp })
            setStoredUser(data.user)
            return data
        } catch (err) {
            return rejectWithValue(err.message)
        }
    }
)

export const resendOtp = createAsyncThunk(
    'auth/resendOtp',
    async (_, { rejectWithValue }) => {
        try {
            const data = await api.resendOtp()
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
        error: null,
        requiresOtp: false,
        otpMessage: null
    },
    reducers: {
        clearError(state) {
            state.error = null
        },
        clearOtpMessage(state) {
            state.otpMessage = null
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
                state.requiresOtp = action.payload.requiresOtp || false
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
                state.requiresOtp = action.payload.requiresOtp || false
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Verify OTP
        builder
            .addCase(verifyOtp.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.loading = false
                state.user = action.payload.user
                state.requiresOtp = false
                state.otpMessage = null
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Resend OTP
        builder
            .addCase(resendOtp.pending, (state) => {
                state.loading = true
                state.error = null
                state.otpMessage = null
            })
            .addCase(resendOtp.fulfilled, (state, action) => {
                state.loading = false
                state.otpMessage = action.payload.message
            })
            .addCase(resendOtp.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload
            })

        // Logout
        builder
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.error = null
                state.requiresOtp = false
                state.otpMessage = null
            })
    }
})

export const { clearError, clearOtpMessage } = authSlice.actions
export default authSlice.reducer
