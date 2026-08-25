const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller")

const transactionRoutes = Router();

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */

transactionRoutes.post("/", authMiddleware.authVerifiedMiddleware, transactionController.createTransaction)

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction)

/**
 * - GET /api/transactions/ledger/:accountId
 * - Get immutable ledger entries for an account
 */
transactionRoutes.get("/ledger/:accountId", authMiddleware.authVerifiedMiddleware, transactionController.getAccountLedger)

/**
 * - GET /api/transactions/bank-stats
 * - Get system vault balance and bank network statistics
 */
transactionRoutes.get("/bank-stats", authMiddleware.authVerifiedMiddleware, transactionController.getBankStats)

/**
 * - POST /api/transactions/deposit
 * - Deposit money into user's account (credits both user + bank)
 */
transactionRoutes.post("/deposit", authMiddleware.authVerifiedMiddleware, transactionController.depositController)

/**
 * - POST /api/transactions/withdraw
 * - Withdraw money from user's account (debits both user + bank)
 */
transactionRoutes.post("/withdraw", authMiddleware.authVerifiedMiddleware, transactionController.withdrawController)

module.exports = transactionRoutes;