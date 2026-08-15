const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const accountModel = require("../models/account.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit MongoDB session
     * 10. Send email notification
 */

async function createTransaction(req, res) {

    /**
     * 1. Validate request
     */
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })
    }

    /**
     * 2. Validate idempotency key
     */

    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * 3. Check account status
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
        })
    }

    /**
     * 4. Derive sender balance from ledger
     */
    const balance = await fromUserAccount.getBalance()

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }

    let transaction;
    try {


        /**
         * 5. Create transaction (PENDING)
         */
        const transaction = await transactionModel.create({
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })

        const debitLedgerEntry = await ledgerModel.create({
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })

        const delay = process.env.TRANSACTION_DELAY_MS ? parseInt(process.env.TRANSACTION_DELAY_MS) : 0;
        if (delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const creditLedgerEntry = await ledgerModel.create({
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" }
        )

    } catch (error) {

        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime",
        })

    }
    /**
     * 10. Send email notification
     */
    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    let fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        // Auto-create system account if it doesn't exist
        fromUserAccount = await accountModel.create({
            user: req.user._id,
            currency: "INR",
            status: "ACTIVE"
        })
    }

    try {
        const transaction = await transactionModel.create({
            fromAccount: fromUserAccount._id,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        })

        const debitLedgerEntry = await ledgerModel.create({
            account: fromUserAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })

        const creditLedgerEntry = await ledgerModel.create({
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        })

        transaction.status = "COMPLETED"
        await transaction.save()


        return res.status(201).json({
            message: "Initial funds transaction completed successfully",
            transaction: transaction
        })
    } catch (error) {
        return res.status(500).json({
            message: "Initial funds transaction failed, please retry",
            error: error.message
        })
    }
}

async function getAccountLedger(req, res) {
    try {
        const { accountId } = req.params

        const account = await accountModel.findById(accountId)
        if (!account) {
            return res.status(404).json({ message: "Account not found" })
        }

        const entries = await ledgerModel.find({ account: accountId })
            .populate({
                path: "transaction",
                populate: [
                    { path: "fromAccount", populate: { path: "user", select: "name email" } },
                    { path: "toAccount", populate: { path: "user", select: "name email" } }
                ]
            })
            .sort({ _id: -1 })

        return res.status(200).json({
            accountId,
            entries
        })
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching ledger entries",
            error: error.message
        })
    }
}

async function getBankStats(req, res) {
    try {
        const userModel = require("../models/user.model")
        const systemUsers = await userModel.find({ systemUser: true }).select("+systemUser")
        const systemUserIds = systemUsers.map(u => u._id)

        const systemAccounts = await accountModel.find({ user: { $in: systemUserIds } }).populate("user", "name email")

        const systemAccountsWithBalance = await Promise.all(
            systemAccounts.map(async (acc) => {
                const bal = await acc.getBalance()
                return {
                    _id: acc._id,
                    user: acc.user,
                    currency: acc.currency,
                    status: acc.status,
                    balance: bal
                }
            })
        )

        const totalTransactions = await transactionModel.countDocuments()
        const totalCompleted = await transactionModel.countDocuments({ status: "COMPLETED" })
        const totalAccounts = await accountModel.countDocuments()
        const totalLedgerEntries = await ledgerModel.countDocuments()

        const nonSystemAccounts = await accountModel.find({ user: { $nin: systemUserIds } })
        let totalCustomerFunds = 0
        for (const acc of nonSystemAccounts) {
            totalCustomerFunds += await acc.getBalance()
        }

        return res.status(200).json({
            systemAccounts: systemAccountsWithBalance,
            stats: {
                totalTransactions,
                totalCompleted,
                totalAccounts,
                totalLedgerEntries,
                totalCustomerFunds
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching bank statistics",
            error: error.message
        })
    }
}

/**
 * - Deposit money into user's account
 * - Both user account and system account get CREDITED
 * - POST /api/transactions/deposit
 */
async function depositController(req, res) {
    const { accountId, amount, idempotencyKey } = req.body

    if (!accountId || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "accountId, amount and idempotencyKey are required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        })
    }

    // Check idempotency
    const existingTx = await transactionModel.findOne({ idempotencyKey })
    if (existingTx) {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: existingTx
        })
    }

    // Find user's account
    const userAccount = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!userAccount) {
        return res.status(404).json({
            message: "Account not found or does not belong to you"
        })
    }

    if (userAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Account must be ACTIVE to deposit"
        })
    }

    // Find system account to credit
    const userModel = require("../models/user.model")
    const systemUser = await userModel.findOne({ systemUser: true }).select("+systemUser")
    if (!systemUser) {
        return res.status(500).json({
            message: "No system user found. Please contact admin."
        })
    }

    const systemAccount = await accountModel.findOne({ user: systemUser._id })
    if (!systemAccount) {
        return res.status(500).json({
            message: "No system account found. Please contact admin."
        })
    }

    try {
        // Create transaction record
        const transaction = await transactionModel.create({
            toAccount: accountId,
            amount,
            idempotencyKey,
            transactionType: "DEPOSIT",
            status: "PENDING"
        })

        // CREDIT user's account (user balance goes UP)
        await ledgerModel.create({
            account: accountId,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        })

        // CREDIT system/bank account (bank balance goes UP)
        await ledgerModel.create({
            account: systemAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        })

        // Mark COMPLETED
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" }
        )


        return res.status(201).json({
            message: `Deposit of ₹${amount} completed successfully`,
            transaction
        })
    } catch (error) {
        return res.status(500).json({
            message: "Deposit failed, please retry",
            error: error.message
        })
    }
}

/**
 * - Withdraw money from user's account
 * - Both user account and system account get DEBITED
 * - POST /api/transactions/withdraw
 */
async function withdrawController(req, res) {
    const { accountId, amount, idempotencyKey } = req.body

    if (!accountId || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "accountId, amount and idempotencyKey are required"
        })
    }

    if (amount <= 0) {
        return res.status(400).json({
            message: "Amount must be greater than 0"
        })
    }

    // Check idempotency
    const existingTx = await transactionModel.findOne({ idempotencyKey })
    if (existingTx) {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: existingTx
        })
    }

    // Find user's account
    const userAccount = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!userAccount) {
        return res.status(404).json({
            message: "Account not found or does not belong to you"
        })
    }

    if (userAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Account must be ACTIVE to withdraw"
        })
    }

    // Check balance
    const balance = await userAccount.getBalance()
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ₹${balance}. Requested: ₹${amount}`
        })
    }

    // Find system account to debit
    const userModel = require("../models/user.model")
    const systemUser = await userModel.findOne({ systemUser: true }).select("+systemUser")
    if (!systemUser) {
        return res.status(500).json({
            message: "No system user found. Please contact admin."
        })
    }

    const systemAccount = await accountModel.findOne({ user: systemUser._id })
    if (!systemAccount) {
        return res.status(500).json({
            message: "No system account found. Please contact admin."
        })
    }

    try {
        // Create transaction record
        const transaction = await transactionModel.create({
            fromAccount: accountId,
            amount,
            idempotencyKey,
            transactionType: "WITHDRAWAL",
            status: "PENDING"
        })

        // DEBIT user's account (user balance goes DOWN)
        await ledgerModel.create({
            account: accountId,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })

        // DEBIT system/bank account (bank balance goes DOWN)
        await ledgerModel.create({
            account: systemAccount._id,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        })

        // Mark COMPLETED
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" }
        )


        return res.status(201).json({
            message: `Withdrawal of ₹${amount} completed successfully`,
            transaction
        })
    } catch (error) {
        return res.status(500).json({
            message: "Withdrawal failed, please retry",
            error: error.message
        })
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getAccountLedger,
    getBankStats,
    depositController,
    withdrawController
}
