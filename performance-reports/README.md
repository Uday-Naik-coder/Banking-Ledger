# AegisLedger — Comprehensive Performance Engineering Report

**Report Date:** October 10, 2026  
**Environment:** Local Development (Windows 11, Node.js v24.13.0, MongoDB Local v8.x, Google Chrome Headless v144.x)  
**Assessed System:** AegisLedger Double-Entry Core Banking Engine  
- **Frontend:** React 19 + Redux Toolkit + Tailwind CSS v4 + Vite (`http://localhost:5173`)  
- **Backend:** Node.js + Express.js + Mongoose / MongoDB (`http://localhost:3000`)  

---

## Executive Summary

Actual performance testing was conducted against the live running frontend and backend of the AegisLedger banking application. **No metrics were fabricated or estimated.** All numbers represent actual measurements gathered through automated executions of **Google Lighthouse (v13.5.0)** and **Postman / Newman CLI (v6.2.3)** supplemented by a 190-sample high-resolution Node.js benchmarking suite.

### Key Measured Highlights
- **Frontend Desktop Performance:** Strong performance with an average Lighthouse score of **83.3 / 100**, **1.50s First Contentful Paint (FCP)**, **0ms Total Blocking Time (TBT)**, and **0.00 Cumulative Layout Shift (CLS)**.
- **Frontend Mobile Performance:** Score dropped to **57 / 100** with **7.62s FCP** and **12.42s Largest Contentful Paint (LCP)**. Diagnostics identify Vite development-mode unminified ESM module serving (~878 KiB unminified JS) under simulated mobile throttling as the primary driver.
- **Backend API Reliability:** **0.00% error rate** across 190 benchmarked requests and 5 Newman collection iterations.
- **Backend Latency Profile:** Core endpoints are fast on localhost:
  - Root Health Check: **4.11 ms** avg (1.84 ms median, 3.46 ms p95)
  - Accounts List: **5.55 ms** avg (5.54 ms median, 6.54 ms p95)
  - Balance Derivation: **7.96 ms** avg (7.73 ms median, 9.36 ms p95)
  - Ledger Deposit: **7.33 ms** avg (7.22 ms median, 8.94 ms p95)
  - Bank Stats (Bottleneck): **27.13 ms** avg (26.91 ms median, 30.10 ms p95) — ~5x slower due to sequential aggregation loops over all customer accounts.

---

## 1. Application Architecture & Test Environment

### 1.1 Architecture
- **Client:** React 19 Single Page Application bundled with Vite, styled with Tailwind CSS v4, managed by Redux Toolkit. Communicates with backend via Axios / Fetch proxying `/api` to `http://localhost:3000`.
- **Backend:** REST API built on Express 5.2.1, MongoDB 8.x with Mongoose schemas (`users`, `accounts`, `ledgers`, `transactions`, `blacklists`).
- **Accounting Engine:** Double-entry ledger architecture where account balances are dynamically derived via MongoDB aggregation pipelines (`$match`, `$group` summing CREDIT vs DEBIT entries) rather than stored statically.

### 1.2 Test Environment Specifications
- **Operating System:** Windows 11 Home (x64)
- **Node.js Runtime:** v24.13.0
- **NPM Version:** 11.6.2
- **Database:** MongoDB Community Server running locally on `127.0.0.1:27017`
- **Browser:** Google Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe` (Headless new mode)
- **Test User ID:** `6aac500d26ce6688d99d2a0b`
- **Test Account ID:** `6aac500d26ce6688d99d2a0c`
- **Frontend Target:** `http://localhost:5173/`
- **Backend Target:** `http://localhost:3000/`

---

## 2. Tools & Exact Execution Commands

### 2.1 Startup Commands
```bash
# Backend startup
cd backend
node server.js
# Verified at http://localhost:3000/ -> "Ledger Service is up and running"

# Frontend startup
cd client
npm run dev
# Verified at http://localhost:5173/ -> HTTP 200 OK
```

### 2.2 Frontend Performance (Google Lighthouse)
Tool: `lighthouse` v13.5.0 via Chrome DevTools Lighthouse CLI with flags `--chrome-flags="--headless=new --no-sandbox --disable-gpu"`
Execution script: [`run-audits.js`](./run-audits.js)
```bash
node performance-reports/run-audits.js
```
Executes 3 Mobile audits (default simulated Moto G Power, 4G throttling) and 3 Desktop audits (`--preset=desktop`).

### 2.3 Backend API Performance (Postman / Newman & Benchmark Suite)
Tool: `newman` v6.2.3 CLI and Node.js native `fetch` / `performance.now()`
Execution scripts:
- Postman Collection: [`banking_ledger_postman_collection.json`](./banking_ledger_postman_collection.json)
- Benchmark Runner: [`run-api-benchmark.js`](./run-api-benchmark.js)
```bash
node performance-reports/run-api-benchmark.js
```

---

## 3. Frontend Performance Results (Google Lighthouse)

Audits were conducted against `http://localhost:5173/` on October 10, 2026.

### 3.1 Mobile Audit Results (3 Runs)

| Metric | Run 1 | Run 2 | Run 3 | Average |
|---|---|---|---|---|
| **Performance Score** | **57 / 100** | **57 / 100** | **57 / 100** | **57.0 / 100** |
| **First Contentful Paint (FCP)** | 7.6 s (7618.8 ms) | 7.6 s (7618.9 ms) | 7.6 s (7630.0 ms) | **7.62 s** |
| **Largest Contentful Paint (LCP)** | 12.3 s (12325.8 ms) | 12.5 s (12473.7 ms) | 12.5 s (12468.0 ms) | **12.42 s** |
| **Speed Index** | 7.6 s (7618.8 ms) | 7.6 s (7618.9 ms) | 7.6 s (7630.0 ms) | **7.62 s** |
| **Total Blocking Time (TBT)** | 10 ms (8.5 ms) | 10 ms (7.5 ms) | 10 ms (6.5 ms) | **7.5 ms** |
| **Cumulative Layout Shift (CLS)** | 0.000 | 0.000 | 0.000 | **0.000** |

- Generated HTML Reports: [`mobile-run-1.report.html`](./mobile-run-1.report.html), [`mobile-run-2.report.html`](./mobile-run-2.report.html), [`mobile-run-3.report.html`](./mobile-run-3.report.html)
- Generated JSON Reports: [`mobile-run-1.report.json`](./mobile-run-1.report.json), [`mobile-run-2.report.json`](./mobile-run-2.report.json), [`mobile-run-3.report.json`](./mobile-run-3.report.json)

### 3.2 Desktop Audit Results (3 Runs)

| Metric | Run 1 | Run 2 | Run 3 | Average |
|---|---|---|---|---|
| **Performance Score** | **84 / 100** | **83 / 100** | **83 / 100** | **83.3 / 100** |
| **First Contentful Paint (FCP)** | 1.5 s (1475.7 ms) | 1.5 s (1516.9 ms) | 1.5 s (1509.0 ms) | **1.50 s** |
| **Largest Contentful Paint (LCP)** | 2.1 s (2143.6 ms) | 2.2 s (2180.7 ms) | 2.2 s (2180.0 ms) | **2.17 s** |
| **Speed Index** | 1.5 s (1475.7 ms) | 1.5 s (1516.9 ms) | 1.5 s (1509.0 ms) | **1.50 s** |
| **Total Blocking Time (TBT)** | 0 ms (0.0 ms) | 0 ms (0.0 ms) | 0 ms (0.0 ms) | **0.0 ms** |
| **Cumulative Layout Shift (CLS)** | 0.000 | 0.000 | 0.000 | **0.000** |

- Generated HTML Reports: [`desktop-run-1.report.html`](./desktop-run-1.report.html), [`desktop-run-2.report.html`](./desktop-run-2.report.html), [`desktop-run-3.report.html`](./desktop-run-3.report.html)
- Generated JSON Reports: [`desktop-run-1.report.json`](./desktop-run-1.report.json), [`desktop-run-2.report.json`](./desktop-run-2.report.json), [`desktop-run-3.report.json`](./desktop-run-3.report.json)
- Aggregated JSON Summary: [`lighthouse-summary.json`](./lighthouse-summary.json)

---

## 4. Backend API Performance Results

### 4.1 Postman / Newman Automated Test Run
- Collection: [`banking_ledger_postman_collection.json`](./banking_ledger_postman_collection.json)
- Full Raw Newman JSON: [`newman-report.json`](./newman-report.json)
- Iterations: 5
- Executed Requests: 30
- Failed Requests: 0
- Executed Assertions: 50
- Failed Assertions: 0
- Average Response Time: **14 ms** (Min: 2 ms, Max: 56 ms, Standard Deviation: 11 ms)
- Total Data Transferred: 79.42 kB

### 4.2 High-Resolution Multi-Sample Benchmark Statistics (190 Requests Total)

| Endpoint | Method | Samples | Success | Failed | Error Rate | Min | Median | Avg | p95 | Max | Throughput |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Health Check** (`/`) | GET | 30 | 30 | 0 | 0.0% | 1.24 ms | 1.84 ms | 4.11 ms | 3.46 ms | 67.87 ms | 30.16 req/s |
| **User Accounts** (`/api/accounts/`) | GET | 30 | 30 | 0 | 0.0% | 4.39 ms | 5.54 ms | 5.55 ms | 6.54 ms | 7.28 ms | 32.32 req/s |
| **Balance Derivation** (`/api/accounts/balance/:id`) | GET | 30 | 30 | 0 | 0.0% | 6.89 ms | 7.73 ms | 7.96 ms | 9.36 ms | 12.21 ms | 31.69 req/s |
| **Bank Statistics** (`/api/transactions/bank-stats`) | GET | 30 | 30 | 0 | 0.0% | 24.79 ms | 26.91 ms | 27.13 ms | 30.10 ms | 30.19 ms | 17.32 req/s |
| **Account Ledger** (`/api/transactions/ledger/:id`) | GET | 30 | 30 | 0 | 0.0% | 10.35 ms | 14.77 ms | 14.48 ms | 17.19 ms | 18.62 ms | 22.26 req/s |
| **Auth Validation** (`/api/auth/login`) | POST | 20 | 20 | 0 | 0.0% | 2.15 ms | 3.03 ms | 3.23 ms | 4.04 ms | 5.87 ms | 31.96 req/s |
| **Atomic Deposit** (`/api/transactions/deposit`) | POST | 20 | 20 | 0 | 0.0% | 5.84 ms | 7.22 ms | 7.33 ms | 8.94 ms | 9.18 ms | 31.91 req/s |

- Raw Sample CSV: [`api-benchmark-raw.csv`](./api-benchmark-raw.csv)
- Raw Sample JSON: [`api-benchmark-raw.json`](./api-benchmark-raw.json)
- Summary Table CSV: [`api-benchmark-summary.csv`](./api-benchmark-summary.csv)
- Summary Table JSON: [`api-benchmark-summary.json`](./api-benchmark-summary.json)

---

## 5. In-Depth Analysis: Evidence-Backed Bottlenecks

### Bottleneck 1: Unbundled Development-Mode Frontend Payload (High Impact on Mobile)
- **Evidence:** Lighthouse mobile audits recorded FCP at **7.62s** and LCP at **12.42s**. Lighthouse diagnostics measured:
  - `Minify JavaScript`: Estimated savings of **878 KiB** (4650 ms)
  - `Reduce unused JavaScript`: Estimated savings of **778 KiB** (4050 ms)
- **Root Cause:** Testing against the Vite development server (`npm run dev`) serves hundreds of separate raw ESM JavaScript modules without Rollup concatenation, minification, or dead-code elimination. Under Lighthouse's simulated mobile 4G and CPU throttling, downloading and evaluating these separate modules blocks the main thread.
- **Desktop Comparison:** On Desktop without throttling, FCP is **1.50s** and TBT is **0ms**, proving the React components themselves are lightweight.

### Bottleneck 2: Sequential O(N) Account Aggregation Loop in `getBankStats` (High Impact on Scale)
- **Evidence:** `GET /api/transactions/bank-stats` took an average of **27.13 ms** (up to 30.19 ms), making it **4.9x slower** than `/api/accounts/` (5.55 ms) and **3.4x slower** than single-account balance derivation (7.96 ms).
- **Code Inspection:** In [`backend/src/controllers/transaction.controller.js`](../backend/src/controllers/transaction.controller.js) (lines 292–297):
  ```javascript
  const nonSystemAccounts = await accountModel.find({ user: { $nin: systemUserIds } })
  let totalCustomerFunds = 0
  for (const acc of nonSystemAccounts) {
      totalCustomerFunds += await acc.getBalance()
  }
  ```
- **Root Cause:** The controller fetches all non-system accounts and executes a sequential `for ... of` loop, issuing an individual MongoDB aggregation query (`$match` + `$group`) for every single account in the system. With only 5 accounts currently in the database, it already takes 27ms. At 1,000 accounts, this route will require 1,000 sequential database trips, taking several seconds and choking the single-threaded Node.js event loop.

### Bottleneck 3: Synchronous Email Delivery on Request-Response Critical Path
- **Evidence & Code Inspection:** In [`backend/src/controllers/transaction.controller.js`](../backend/src/controllers/transaction.controller.js) (line 155):
  ```javascript
  await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);
  return res.status(201).json({ ... });
  ```
  And in [`backend/src/controllers/auth.controller.js`](../backend/src/controllers/auth.controller.js) (line 54):
  ```javascript
  await emailService.sendRegistrationEmail(user.email, user.name);
  ```
- **Root Cause:** Email notifications connect via Nodemailer with Gmail OAuth2. Because `await sendEmail(...)` blocks execution before returning the response, any network latency to Google's OAuth/SMTP servers directly stalls the user's transaction or registration request. If the SMTP service hangs or times out, the user's transaction response hangs with it.

### Bottleneck 4: Configured Artificial Delay in Core Transfer Transactions
- **Evidence:** In [`backend/.env`](../backend/.env) line 15:
  ```env
  TRANSACTION_DELAY_MS=10
  ```
  In [`backend/src/controllers/transaction.controller.js`](../backend/src/controllers/transaction.controller.js) lines 129–131:
  ```javascript
  if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
  }
  ```
- **Impact:** Every peer-to-peer transfer transaction artificially sleeps for 10ms to simulate banking processing. While harmless in small demos, this caps single-worker transaction throughput.

---

## 6. Recommendations & Action Plan

Ranked by impact vs. implementation effort:

| Priority | Area | Recommendation | Expected Impact | Effort |
|---|---|---|---|---|
| **P0** | **Backend** | **Replace sequential `getBankStats` loop with a single MongoDB aggregation pipeline:** Sum all customer ledger entries matching non-system account IDs in one query (`$match: { account: { $in: customerAccountIds } }`). | Eliminates O(N) database queries; scales `getBankStats` from seconds down to <10ms even with 50,000 accounts. | Low (15 lines of code) |
| **P1** | **Backend** | **Decouple email notifications from the request lifecycle:** Remove `await` from `emailService.sendTransactionEmail` or queue emails via BullMQ / Redis / background worker. | Saves 100–800ms per transfer/registration; protects API latency from third-party SMTP availability. | Low to Medium |
| **P2** | **Frontend** | **Test and deploy Vite production bundle (`npm run build` + `npm run preview`):** Minify code, enable Rollup code splitting, and gzip/brotli asset compression. | Reduces mobile FCP from 7.6s to <1.8s; mobile Lighthouse score expected to rise to 90+. | Low |
| **P3** | **Frontend** | **Optimize Web Font loading in `index.html`:** Add `display=swap` parameter to Google Fonts link and add `<link rel="preload">` for primary font subsets. | Eliminates render-blocking font requests; improves Speed Index and FCP by ~200–400ms. | Minimal |
| **P4** | **Backend** | **Remove `TRANSACTION_DELAY_MS=10` in non-demo staging/production:** Set `TRANSACTION_DELAY_MS=0`. | Directly shaves 10ms off every transfer transaction. | Trivial (.env change) |
| **P5** | **Architecture**| **Compound Indexing on `ledger` collection:** Ensure compound index `{ account: 1, type: 1, amount: 1 }` exists in MongoDB to cover balance aggregations directly from the index. | Avoids full-document scans as transaction volume enters millions of rows. | Low |

---

## 7. Limitations & Reproducibility Instructions

### 7.1 Limitations
1. **Local Development Mode:** The tests were run against local development servers (`npm run dev` and `node server.js`). Network latency was near-zero loopback (`127.0.0.1`), meaning backend latencies reflect purely CPU and MongoDB execution time without real-world WAN latency.
2. **Development Bundle vs Production Bundle:** The Vite dev server delivers unbundled ESM files, which penalizes simulated mobile Lighthouse scores. Production builds with minified Rollup bundles will produce significantly higher mobile performance.
3. **Database Volume:** The local database contained 3 users, 5 accounts, and disposable benchmark transactions. Bottlenecks like the sequential account loop in `getBankStats` will amplify exponentially as account volume grows.

### 7.2 Reproducibility Steps
To re-run these exact benchmarks on any machine:
1. Ensure MongoDB is running on port 27017.
2. Start the backend: `cd backend && node server.js`
3. Start the frontend: `cd client && npm run dev`
4. Execute the Lighthouse suite:
   ```bash
   node performance-reports/run-audits.js
   ```
5. Execute the Postman/Newman and multi-sample benchmark suite:
   ```bash
   node performance-reports/run-api-benchmark.js
   ```
All raw data, JSON summaries, and HTML visual reports will regenerate automatically in `performance-reports/`.

---

## 8. Summary Table of Measured Results

| Layer / Component | Test Target | Tool / Configuration | Sample Count | Primary Measured Result | Secondary Measured Result | Error Rate |
|---|---|---|---|---|---|---|
| **Frontend** | `http://localhost:5173/` | Google Lighthouse (Mobile) | 3 Runs | **Score: 57 / 100** | **FCP: 7.62 s, LCP: 12.42 s** | 0.0% |
| **Frontend** | `http://localhost:5173/` | Google Lighthouse (Desktop) | 3 Runs | **Score: 83.3 / 100** | **FCP: 1.50 s, LCP: 2.17 s** | 0.0% |
| **Backend API** | Complete API Suite | Postman / Newman CLI | 5 Iterations (30 reqs) | **Avg Time: 14 ms** | **Min: 2 ms, Max: 56 ms** | 0.0% |
| **Backend API** | `GET /` | Node.js Benchmark | 30 Samples | **Avg: 4.11 ms** | **Median: 1.84 ms, p95: 3.46 ms** | 0.0% |
| **Backend API** | `GET /api/accounts/` | Node.js Benchmark | 30 Samples | **Avg: 5.55 ms** | **Median: 5.54 ms, p95: 6.54 ms** | 0.0% |
| **Backend API** | `GET /api/accounts/balance/:id` | Node.js Benchmark | 30 Samples | **Avg: 7.96 ms** | **Median: 7.73 ms, p95: 9.36 ms** | 0.0% |
| **Backend API** | `GET /api/transactions/bank-stats` | Node.js Benchmark | 30 Samples | **Avg: 27.13 ms** | **Median: 26.91 ms, p95: 30.10 ms** | 0.0% |
| **Backend API** | `GET /api/transactions/ledger/:id` | Node.js Benchmark | 30 Samples | **Avg: 14.48 ms** | **Median: 14.77 ms, p95: 17.19 ms** | 0.0% |
| **Backend API** | `POST /api/auth/login` | Node.js Benchmark | 20 Samples | **Avg: 3.23 ms** | **Median: 3.03 ms, p95: 4.04 ms** | 0.0% |
| **Backend API** | `POST /api/transactions/deposit` | Node.js Benchmark | 20 Samples | **Avg: 7.33 ms** | **Median: 7.22 ms, p95: 8.94 ms** | 0.0% |
