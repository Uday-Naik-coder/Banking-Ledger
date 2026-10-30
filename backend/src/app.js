const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const path = require("path")
const fs = require("fs")

const app = express()

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    process.env.CLIENT_URL
].filter(Boolean)

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }
        return callback(null, true); // Allow all in dev/flexible deployment
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "idempotency-key"]
}))

app.use(express.json())
app.use(cookieParser())

/**
 * - Health Check Endpoint
 */
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
})

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */
app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

/**
 * - Serve Frontend static assets in production/container
 */
const publicDir = path.join(__dirname, "../public")
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir))
    app.use((req, res, next) => {
        if (req.method === "GET" && !req.path.startsWith("/api")) {
            return res.sendFile(path.join(publicDir, "index.html"))
        }
        next()
    })
} else {
    app.get("/", (req, res) => {
        res.send("Ledger Service is up and running")
    })
}

module.exports = app
