import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import accountReducer from './accountSlice'

const store = configureStore({
    reducer: {
        auth: authReducer,
        accounts: accountReducer
    }
})

export default store
