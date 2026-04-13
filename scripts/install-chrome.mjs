/**
 * Ensures a Chrome browser is available for Puppeteer.
 * Runs as a postinstall script so production containers get Chrome automatically.
 * Only downloads if puppeteer.executablePath() doesn't point to an existing binary.
 */
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';

// Check if puppeteer already has a valid Chrome
try {
  const ep = puppeteer.executablePath();
  if (ep && existsSync(ep)) {
    console.log(`[install-chrome] Chrome already available at: ${ep}`);
    process.exit(0);
  }
  console.log(`[install-chrome] puppeteer.executablePath() = ${ep} — file not found.`);
} catch (e) {
  console.log(`[install-chrome] executablePath() threw: ${e.message}`);
}

// Check system Chrome candidates
const systemCandidates = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
];
for (const c of systemCandidates) {
  if (existsSync(c)) {
    console.log(`[install-chrome] System Chrome found at: ${c} — skipping download.`);
    process.exit(0);
  }
}

// Download Chrome using puppeteer's built-in mechanism
console.log('[install-chrome] No Chrome found. Downloading via Puppeteer...');
try {
  execSync('node node_modules/puppeteer/install.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_SKIP_DOWNLOAD: '',       // ensure download is NOT skipped
      PUPPETEER_EXECUTABLE_PATH: '',     // clear override so puppeteer downloads its own
    },
  });
  const ep = puppeteer.executablePath();
  console.log(`[install-chrome] Chrome downloaded. Path: ${ep}, exists: ${existsSync(ep)}`);
} catch (err) {
  console.error('[install-chrome] Failed to download Chrome:', err.message);
  // Don't fail the install — let the app start and show a clear error on PDF generation
  process.exit(0);
}
