/**
 * Postinstall script: installs Chrome system library dependencies via apt-get,
 * then ensures Puppeteer's bundled Chrome is available.
 *
 * This runs automatically after `pnpm install` (postinstall hook).
 * In production containers (minimal Debian/Ubuntu) Chrome needs these libs.
 *
 * - Runs as root in production (Manus container) → no sudo needed
 * - Runs as ubuntu in dev sandbox → uses sudo
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// ── Step 1: Install Chrome system dependencies via apt-get ──────────────────
// These are the libraries required by Chromium on Debian/Ubuntu minimal images.
const CHROME_DEPS = [
  'libnspr4',
  'libnss3',
  'libglib2.0-0',
  'libatk1.0-0',
  'libatk-bridge2.0-0',
  'libcups2',
  'libdrm2',
  'libdbus-1-3',
  'libxcb1',
  'libxkbcommon0',
  'libx11-6',
  'libxcomposite1',
  'libxdamage1',
  'libxext6',
  'libxfixes3',
  'libxrandr2',
  'libgbm1',
  'libpango-1.0-0',
  'libcairo2',
  'libasound2',
  'libx11-xcb1',
  'fonts-liberation',
];

// Determine if we're running as root (production) or need sudo (dev)
const isRoot = process.getuid?.() === 0;
const aptCmd = isRoot ? 'apt-get' : 'sudo apt-get';

console.log(`[install-chrome] Running as ${isRoot ? 'root' : 'non-root'} — using: ${aptCmd}`);
console.log('[install-chrome] Installing Chrome system dependencies...');

try {
  // Update package list
  const updateResult = spawnSync(
    isRoot ? 'apt-get' : 'sudo',
    isRoot ? ['update', '-qq'] : ['apt-get', 'update', '-qq'],
    { stdio: 'inherit' }
  );

  if (updateResult.status !== 0) {
    console.warn('[install-chrome] apt-get update failed — may already be up to date, continuing.');
  }

  // Install all deps in one shot
  const installArgs = isRoot
    ? ['install', '-y', '--no-install-recommends', ...CHROME_DEPS]
    : ['apt-get', 'install', '-y', '--no-install-recommends', ...CHROME_DEPS];

  const installResult = spawnSync(
    isRoot ? 'apt-get' : 'sudo',
    installArgs,
    { stdio: 'inherit' }
  );

  if (installResult.status === 0) {
    console.log('[install-chrome] System dependencies installed successfully.');
  } else {
    console.warn('[install-chrome] apt-get install returned non-zero status:', installResult.status,
      '— continuing anyway (may already be installed).');
  }
} catch (err) {
  console.warn('[install-chrome] apt-get failed:', err.message, '— continuing.');
}

// ── Step 2: Ensure Puppeteer's bundled Chrome is present ────────────────────

// Check if puppeteer already has Chrome in its default cache
try {
  const { default: puppeteer } = await import('puppeteer');
  const ep = puppeteer.executablePath();
  if (ep && existsSync(ep)) {
    console.log(`[install-chrome] Puppeteer Chrome available at: ${ep}`);
    process.exit(0);
  }
  console.log(`[install-chrome] puppeteer.executablePath() = ${ep} — not found, downloading...`);
} catch (e) {
  console.log(`[install-chrome] executablePath() check failed: ${e.message} — downloading Chrome...`);
}

// Download Chrome using puppeteer's install script
console.log('[install-chrome] Downloading Puppeteer Chrome...');
try {
  execSync('node node_modules/puppeteer/install.mjs', {
    stdio: 'inherit',
    cwd: projectRoot,
    env: {
      ...process.env,
      PUPPETEER_SKIP_DOWNLOAD: '',
      PUPPETEER_EXECUTABLE_PATH: '',
    },
  });
  console.log('[install-chrome] Chrome downloaded successfully.');
} catch (err) {
  console.error('[install-chrome] Failed to download Chrome:', err.message);
  // Don't fail the install — the app can still start; PDF will show a clear error
  process.exit(0);
}
