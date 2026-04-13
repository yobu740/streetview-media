/**
 * Ensures a Chrome browser is available for Puppeteer.
 * Runs as a postinstall script so production containers get Chrome automatically.
 * Skips download if PUPPETEER_EXECUTABLE_PATH points to an existing binary.
 */
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// If an explicit path is set and exists, nothing to do
const explicitPath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (explicitPath) {
  if (existsSync(explicitPath)) {
    console.log(`[install-chrome] Using existing Chrome at: ${explicitPath}`);
    process.exit(0);
  } else {
    console.log(`[install-chrome] PUPPETEER_EXECUTABLE_PATH set to ${explicitPath} but file not found — will download Chrome.`);
  }
}

// Check if system chromium is available
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
console.log('[install-chrome] No system Chrome found. Downloading via Puppeteer...');
try {
  // Use puppeteer's own install script
  const { execSync } = require('child_process');
  execSync('node node_modules/puppeteer/install.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PUPPETEER_SKIP_DOWNLOAD: '', // ensure download is NOT skipped
    },
  });
  console.log('[install-chrome] Chrome downloaded successfully.');
} catch (err) {
  console.error('[install-chrome] Failed to download Chrome:', err.message);
  console.error('[install-chrome] PDF generation may not work. Set PUPPETEER_EXECUTABLE_PATH to a valid Chrome binary.');
  // Don't exit with error — let the app start anyway
  process.exit(0);
}
