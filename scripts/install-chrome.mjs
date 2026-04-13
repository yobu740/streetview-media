/**
 * Postinstall script: ensures Chrome is available for Puppeteer.
 * Downloads Chrome to a project-relative path (.puppeteer-cache/) so it works
 * regardless of which OS user runs the server (ubuntu, root, etc.).
 * This avoids the ~/.cache/puppeteer path mismatch in production containers.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Check system Chrome candidates first
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

// Check if puppeteer already has Chrome in its default cache
try {
  const { default: puppeteer } = await import('puppeteer');
  const ep = puppeteer.executablePath();
  if (ep && existsSync(ep)) {
    console.log(`[install-chrome] Puppeteer Chrome already available at: ${ep}`);
    process.exit(0);
  }
  console.log(`[install-chrome] puppeteer.executablePath() = ${ep} — not found.`);
} catch (e) {
  console.log(`[install-chrome] executablePath() check failed: ${e.message}`);
}

// Download Chrome using puppeteer's install script, forcing a project-relative cache
const cacheDir = join(projectRoot, '.puppeteer-cache');
console.log(`[install-chrome] Downloading Chrome to ${cacheDir}...`);

try {
  execSync('node node_modules/puppeteer/install.mjs', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      PUPPETEER_SKIP_DOWNLOAD: '',          // ensure download is NOT skipped
      PUPPETEER_EXECUTABLE_PATH: '',        // clear override so puppeteer downloads its own
      PUPPETEER_CACHE_DIR: cacheDir,        // use project-relative cache
    },
  });
  console.log(`[install-chrome] Chrome downloaded to ${cacheDir}`);
} catch (err) {
  console.error('[install-chrome] Failed to download Chrome:', err.message);
  // Don't fail the install — the app can still start; PDF will show a clear error
  process.exit(0);
}
