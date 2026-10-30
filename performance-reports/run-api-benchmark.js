const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(__dirname, '../backend/node_modules/jsonwebtoken'));
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env') });

const reportsDir = __dirname;
const baseUrl = 'http://localhost:3000';
const accountId = '6aac500d26ce6688d99d2a0c';
const userId = '6aac500d26ce6688d99d2a0b';

const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
console.log('Successfully minted JWT test token for user:', userId);

// 1. Run Newman (Postman CLI)
console.log('\n======================================================');
console.log('PHASE 4A: Running Postman Collection via Newman CLI...');
console.log('======================================================');

const postmanCollectionPath = path.join(reportsDir, 'banking_ledger_postman_collection.json');
const newmanReportPath = path.join(reportsDir, 'newman-report.json');

// Inject variables directly into collection JSON so Postman resolves them reliably
const coll = JSON.parse(fs.readFileSync(postmanCollectionPath, 'utf8'));
coll.variable = coll.variable.map(v => {
    if (v.key === 'token') v.value = token;
    if (v.key === 'accountId') v.value = accountId;
    if (v.key === 'baseUrl') v.value = baseUrl;
    return v;
});
fs.writeFileSync(postmanCollectionPath, JSON.stringify(coll, null, 2));

try {
    const newmanCmd = `npx -y newman run "${postmanCollectionPath}" -n 5 --reporters cli,json --reporter-json-export "${newmanReportPath}"`;
    execSync(newmanCmd, { stdio: 'inherit' });
    console.log('Newman execution complete. Saved report to newman-report.json');
} catch (err) {
    console.warn('Newman CLI finished with status:', err.message);
}

// 2. High-precision 30-sample benchmarking per endpoint
console.log('\n======================================================');
console.log('PHASE 4B: Running Detailed Multi-Sample API Benchmark (30 samples/endpoint)...');
console.log('======================================================');

const endpoints = [
    {
        id: 'health_check',
        name: 'GET / (Health Check)',
        method: 'GET',
        url: `${baseUrl}/`,
        headers: {},
        samples: 30
    },
    {
        id: 'get_accounts',
        name: 'GET /api/accounts/ (User Accounts)',
        method: 'GET',
        url: `${baseUrl}/api/accounts/`,
        headers: { 'Authorization': `Bearer ${token}` },
        samples: 30
    },
    {
        id: 'get_balance',
        name: 'GET /api/accounts/balance/:id (Ledger Aggregation Balance)',
        method: 'GET',
        url: `${baseUrl}/api/accounts/balance/${accountId}`,
        headers: { 'Authorization': `Bearer ${token}` },
        samples: 30
    },
    {
        id: 'get_bank_stats',
        name: 'GET /api/transactions/bank-stats (Bank Network Statistics)',
        method: 'GET',
        url: `${baseUrl}/api/transactions/bank-stats`,
        headers: { 'Authorization': `Bearer ${token}` },
        samples: 30
    },
    {
        id: 'get_ledger',
        name: 'GET /api/transactions/ledger/:id (Account Ledger Entries)',
        method: 'GET',
        url: `${baseUrl}/api/transactions/ledger/${accountId}`,
        headers: { 'Authorization': `Bearer ${token}` },
        samples: 30
    },
    {
        id: 'auth_validation',
        name: 'POST /api/auth/login (Auth Validation / Bcrypt Check)',
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test.perf@example.com', password: 'wrongpassword' }),
        samples: 20
    },
    {
        id: 'post_deposit',
        name: 'POST /api/transactions/deposit (Atomic Ledger Deposit)',
        method: 'POST',
        url: `${baseUrl}/api/transactions/deposit`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        dynamicBody: (i) => JSON.stringify({
            accountId: accountId,
            amount: 5,
            idempotencyKey: `bench-deposit-${Date.now()}-${i}`
        }),
        samples: 20
    }
];

function calculatePercentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

async function runBenchmark() {
    const rawResults = [];
    const summary = [];

    for (const ep of endpoints) {
        console.log(`\nBenchmarking: ${ep.name} (${ep.samples} iterations)...`);
        const durations = [];
        const statusCodes = {};
        let successCount = 0;
        let failCount = 0;

        const suiteStart = performance.now();

        for (let i = 1; i <= ep.samples; i++) {
            const body = ep.dynamicBody ? ep.dynamicBody(i) : ep.body;
            const start = performance.now();
            let status = 0;
            let ok = false;
            let errorMsg = null;

            try {
                const res = await fetch(ep.url, {
                    method: ep.method,
                    headers: ep.headers,
                    body: body
                });
                status = res.status;
                await res.text();
                // 2xx and 401 for expected invalid auth are counted by status code
                ok = ep.id === 'auth_validation' ? (status === 401) : (status >= 200 && status < 400);
            } catch (err) {
                status = 0;
                errorMsg = err.message;
                ok = false;
            }

            const duration = parseFloat((performance.now() - start).toFixed(2));
            durations.push(duration);

            if (ok) successCount++;
            else failCount++;

            statusCodes[status] = (statusCodes[status] || 0) + 1;

            rawResults.push({
                endpointId: ep.id,
                endpointName: ep.name,
                sampleIndex: i,
                method: ep.method,
                statusCode: status,
                durationMs: duration,
                success: ok,
                error: errorMsg,
                timestamp: new Date().toISOString()
            });

            // Small 20ms pause between samples to avoid socket exhaustion
            await new Promise(r => setTimeout(r, 20));
        }

        const totalSuiteDuration = (performance.now() - suiteStart) / 1000;
        const throughput = parseFloat((ep.samples / totalSuiteDuration).toFixed(2));

        durations.sort((a, b) => a - b);
        const sum = durations.reduce((acc, v) => acc + v, 0);
        const avg = parseFloat((sum / durations.length).toFixed(2));
        const median = calculatePercentile(durations, 50);
        const p95 = calculatePercentile(durations, 95);
        const min = durations[0];
        const max = durations[durations.length - 1];
        const errorRate = parseFloat(((failCount / ep.samples) * 100).toFixed(2));

        const epSummary = {
            id: ep.id,
            endpoint: ep.name,
            method: ep.method,
            totalSamples: ep.samples,
            successCount,
            failCount,
            errorRatePercent: errorRate,
            statusCodes,
            minMs: min,
            maxMs: max,
            avgMs: avg,
            medianMs: median,
            p95Ms: p95,
            throughputReqSec: throughput
        };

        summary.push(epSummary);
        console.log(`Results for ${ep.name}:`);
        console.log(`  Avg: ${avg}ms | Median: ${median}ms | p95: ${p95}ms | Min: ${min}ms | Max: ${max}ms | Statuses: ${JSON.stringify(statusCodes)} | Error Rate: ${errorRate}% | Throughput: ${throughput} req/s`);
    }

    // Save Summary JSON
    fs.writeFileSync(path.join(reportsDir, 'api-benchmark-summary.json'), JSON.stringify(summary, null, 2));

    // Save Raw JSON
    fs.writeFileSync(path.join(reportsDir, 'api-benchmark-raw.json'), JSON.stringify(rawResults, null, 2));

    // Save Summary CSV
    const summaryCsvHeader = 'id,endpoint,method,totalSamples,successCount,failCount,errorRatePercent,minMs,maxMs,avgMs,medianMs,p95Ms,throughputReqSec,statusCodes\n';
    const summaryCsvRows = summary.map(s => 
        `"${s.id}","${s.endpoint}","${s.method}",${s.totalSamples},${s.successCount},${s.failCount},${s.errorRatePercent},${s.minMs},${s.maxMs},${s.avgMs},${s.medianMs},${s.p95Ms},${s.throughputReqSec},"${JSON.stringify(s.statusCodes).replace(/"/g, '""')}"`
    ).join('\n');
    fs.writeFileSync(path.join(reportsDir, 'api-benchmark-summary.csv'), summaryCsvHeader + summaryCsvRows);

    // Save Raw CSV
    const rawCsvHeader = 'endpointId,endpointName,sampleIndex,method,statusCode,durationMs,success,timestamp\n';
    const rawCsvRows = rawResults.map(r => 
        `"${r.endpointId}","${r.endpointName}",${r.sampleIndex},"${r.method}",${r.statusCode},${r.durationMs},${r.success},"${r.timestamp}"`
    ).join('\n');
    fs.writeFileSync(path.join(reportsDir, 'api-benchmark-raw.csv'), rawCsvHeader + rawCsvRows);

    console.log('\n======================================================');
    console.log('All API benchmarks completed successfully!');
    console.log('Files generated:');
    console.log(' - api-benchmark-summary.json');
    console.log(' - api-benchmark-summary.csv');
    console.log(' - api-benchmark-raw.json');
    console.log(' - api-benchmark-raw.csv');
    console.log(' - newman-report.json');
    console.log('======================================================');
}

runBenchmark().catch(console.error);
