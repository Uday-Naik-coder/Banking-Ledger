const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname);
process.env.CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Remove debug files if present
['test-debug.report.json', 'test-mobile-debug.report.json'].forEach(f => {
    const p = path.join(reportsDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
});

const runs = [
    { name: 'mobile-run-1', preset: 'mobile' },
    { name: 'mobile-run-2', preset: 'mobile' },
    { name: 'mobile-run-3', preset: 'mobile' },
    { name: 'desktop-run-1', preset: 'desktop' },
    { name: 'desktop-run-2', preset: 'desktop' },
    { name: 'desktop-run-3', preset: 'desktop' },
];

console.log("Starting full Lighthouse Performance Audits (3 Mobile, 3 Desktop)...");

const summary = [];

for (const run of runs) {
    const outPath = path.join(reportsDir, run.name);
    const presetFlag = run.preset === 'desktop' ? '--preset=desktop' : '';
    console.log(`\n========================================`);
    console.log(`Executing ${run.name} (${run.preset})...`);
    console.log(`========================================`);

    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
        attempts++;
        try {
            const cmd = `npx lighthouse "http://localhost:5173" --chrome-flags="--headless=new --no-sandbox --disable-gpu" --output=html --output=json --output-path="${outPath}" ${presetFlag} --quiet`;
            execSync(cmd, { stdio: 'inherit', env: process.env });
            success = true;
        } catch (err) {
            console.error(`Attempt ${attempts} failed for ${run.name}. Retrying in 2 seconds...`);
            execSync('node -e "setTimeout(()=>{}, 2000)"');
        }
    }

    if (!success) {
        console.error(`FAILED to complete ${run.name} after 3 attempts.`);
        continue;
    }

    const jsonPath = `${outPath}.report.json`;
    if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const audits = data.audits;
        const perfCategory = data.categories.performance;

        const metrics = {
            run: run.name,
            preset: run.preset,
            testUrl: data.requestedUrl || data.finalDisplayedUrl,
            timestamp: data.fetchTime,
            performanceScore: Math.round((perfCategory.score || 0) * 100),
            firstContentfulPaint: audits['first-contentful-paint']?.displayValue || `${audits['first-contentful-paint']?.numericValue?.toFixed(1)} ms`,
            firstContentfulPaintMs: audits['first-contentful-paint']?.numericValue,
            largestContentfulPaint: audits['largest-contentful-paint']?.displayValue || `${audits['largest-contentful-paint']?.numericValue?.toFixed(1)} ms`,
            largestContentfulPaintMs: audits['largest-contentful-paint']?.numericValue,
            speedIndex: audits['speed-index']?.displayValue || `${audits['speed-index']?.numericValue?.toFixed(1)} ms`,
            speedIndexMs: audits['speed-index']?.numericValue,
            totalBlockingTime: audits['total-blocking-time']?.displayValue || `${audits['total-blocking-time']?.numericValue?.toFixed(1)} ms`,
            totalBlockingTimeMs: audits['total-blocking-time']?.numericValue,
            cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || `${audits['cumulative-layout-shift']?.numericValue?.toFixed(3)}`,
            cumulativeLayoutShiftVal: audits['cumulative-layout-shift']?.numericValue,
            htmlReport: `${run.name}.report.html`,
            jsonReport: `${run.name}.report.json`
        };
        summary.push(metrics);
        console.log(`Results for ${run.name}: Score=${metrics.performanceScore}, FCP=${metrics.firstContentfulPaint}, LCP=${metrics.largestContentfulPaint}, SpeedIndex=${metrics.speedIndex}, TBT=${metrics.totalBlockingTime}, CLS=${metrics.cumulativeLayoutShift}`);
    }
}

fs.writeFileSync(path.join(reportsDir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2));
console.log("\nAll Lighthouse audits completed successfully! Summary saved to lighthouse-summary.json");
