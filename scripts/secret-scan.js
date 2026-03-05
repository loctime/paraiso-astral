#!/usr/bin/env node
/*
  Basic secret scanner for workspace files.
  Usage: node scripts/secret-scan.js
*/
const { readdirSync, readFileSync } = require('fs');
const { join, relative, extname } = require('path');

const ROOT = process.cwd();

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.nuxt', '.cache', 'coverage']);
const SKIP_FILES = new Set([
  '.env',
  'backend/.env',
  'astral.serviceAccount.json',
  'backend/astral.serviceAccount.json',
  'js/env.public.js',
  'public/js/env.public.js',
  '.env.example',
  'backend/.env.example',
  'js/env.public.example.js'
]);
const SCAN_EXT = new Set(['.js', '.ts', '.json', '.yml', '.yaml', '.toml', '.env', '.sh', '.ps1']);

const PATTERNS = [
  { name: 'Firebase API key', regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Cloudinary URL credential', regex: /cloudinary:\/\/[A-Za-z0-9]+:[^@\s]+@[A-Za-z0-9_-]+/i },
  { name: 'Postgres URL with password', regex: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'JWT secret assignment', regex: /JWT_SECRET\s*=\s*[^\n\r]{12,}/i }
];

function listFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = relative(ROOT, full).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...listFiles(full));
      continue;
    }

    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(rel)) continue;

    const ext = extname(entry.name).toLowerCase();
    if (!SCAN_EXT.has(ext) && !entry.name.endsWith('.env')) continue;
    files.push(full);
  }

  return files;
}

function scanFile(fullPath) {
  const rel = relative(ROOT, fullPath).replace(/\\/g, '/');
  const issues = [];

  let text = '';
  try {
    text = readFileSync(fullPath, 'utf8');
  } catch {
    return issues;
  }

  for (const pattern of PATTERNS) {
    const m = text.match(pattern.regex);
    if (m) {
      const line = text.slice(0, m.index).split(/\r?\n/).length;
      issues.push({ file: rel, line, rule: pattern.name });
    }
  }

  return issues;
}

function main() {
  const allFiles = listFiles(ROOT);
  const findings = allFiles.flatMap(scanFile);

  if (findings.length > 0) {
    console.error('Secret scan failed. Findings:');
    for (const f of findings) {
      console.error(`- ${f.file}:${f.line} (${f.rule})`);
    }
    process.exit(1);
  }

  console.log('Secret scan passed. No obvious secrets found in scanned files.');
}

main();

