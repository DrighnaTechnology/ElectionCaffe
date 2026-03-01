#!/usr/bin/env node
// =============================================================================
// Cross-platform script runner
// Finds Git Bash on Windows, uses bash on Linux/macOS
// Usage: node scripts/run.js <script.sh> [args...]
// =============================================================================

const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run.js <script.sh> [args...]');
  process.exit(1);
}

const script = args[0];
const scriptArgs = args.slice(1);

function findBash() {
  if (process.platform !== 'win32') return 'bash';

  // Common Git Bash locations on Windows
  const candidates = [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
  ];

  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }

  // Fallback: hope 'bash' is in PATH (and is Git Bash, not WSL)
  console.warn('Warning: Could not find Git Bash. Trying "bash" from PATH...');
  return 'bash';
}

const bash = findBash();
const root = path.resolve(__dirname, '..');

try {
  execFileSync(bash, [script, ...scriptArgs], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
} catch (err) {
  process.exit(err.status || 1);
}
