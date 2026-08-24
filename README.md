# AegisLedger — Double-Entry Core Banking Engine

A full-stack banking ledger application built on double-entry bookkeeping principles. Every transaction produces immutable, balanced ledger entries — the same principles used in real banking systems.

## Architecture

```
Banking Ledger/
├── backend-ledger/    # Node.js / Express / MongoDB REST API
└── client/            # React / Redux Toolkit / Tailwind CSS v4
```

## Core Concepts

- **Double-Entry Bookkeeping**: Every transaction creates balanced DEBIT + CREDIT entries
- **Immutable Ledger**: Ledger entries can never be modified or deleted once created
- **Balance Derivation**: Account balances are never stored — always calculated from ledger entries
- **Idempotency**: Every transaction requires a unique key to prevent duplicate processing
- **Role-Based Access**: Regular users and System (Bank) users with separate dashboards

## Features

### User Dashboard
- Deposit money (credits user + bank)
- Withdraw money (debits user + bank)
- Transfer to other accounts
- Check real-time balance
- View transaction history / ledger entries

### System Admin Dashboard
- Always-visible system vault balance
- Bank-wide statistics (total accounts, transactions, ledger entries)
- Issue initial funds to any account
- Ledger explorer with CREDIT/DEBIT filters

## Tech Stack

**Backend**
- Node.js + Express.js
- MongoDB + Mongoose
- JSON Web Tokens (JWT) for authentication
- bcryptjs for password hashing
- Nodemailer for email notifications

**Frontend**
- React 18
- Redux Toolkit (state management)
- Axios (HTTP client)
- Tailwind CSS v4 (styling)
- Vite (build tool)

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI

### Backend Setup

```bash
cd backend-ledger
cp .env.example .env        # fill in your values
npm install
npm start                   # or: npx nodemon server.js
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3000`.

### Environment Variables (backend)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `CLIENT_URL` | Frontend URL for CORS |
| `TRANSACTION_DELAY_MS` | Artificial delay for demo purposes |
| `EMAIL_USER` | Gmail address for notifications |
| `CLIENT_ID` | Google OAuth2 Client ID |
| `CLIENT_SECRET` | Google OAuth2 Client Secret |
| `REFRESH_TOKEN` | Google OAuth2 Refresh Token |

## API Reference

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout (blacklists token) |

### Accounts
| Method | Route | Description |
|---|---|---|
| POST | `/api/accounts/` | Create account |
| GET | `/api/accounts/` | Get user's accounts |
| GET | `/api/accounts/balance/:id` | Get account balance |

### Transactions
| Method | Route | Description |
|---|---|---|
| POST | `/api/transactions/` | Transfer between accounts |
| POST | `/api/transactions/deposit` | Deposit (credits user + bank) |
| POST | `/api/transactions/withdraw` | Withdraw (debits user + bank) |
| POST | `/api/transactions/system/initial-funds` | System: issue funds |
| GET | `/api/transactions/ledger/:accountId` | Get ledger entries |
| GET | `/api/transactions/bank-stats` | Get bank statistics |

## Creating a System User

System users must be created directly in MongoDB:

```javascript
db.users.insertOne({
  name: "Bank Admin",
  email: "admin@bank.com",
  password: "<bcrypt-hashed-password>",
  systemUser: true
})
```

---

Built as a college project demonstrating immutable double-entry ledger accounting.
