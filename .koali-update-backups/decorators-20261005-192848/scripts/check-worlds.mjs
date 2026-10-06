import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
const required = [
  'package.json',
  'apps/api/src/orgo/adapters/inbound/http/worlds.controller.ts',
  'apps/api/src/orgo/modules/worlds/worlds.module.ts',
  'apps/api/src/orgo/modules/worlds/worlds.service.ts',
  'apps/web/pages/worlds.tsx',
  'apps/web/pages/w/[world]/[[...path]].tsx',
  'apps/web/src/orgo/WorldManager.tsx',
  'apps/web/src/orgo/WorldSwitcher.tsx',
  'Orgo_World_Manager.pyw',
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`missing ${rel}`);
}

const forbiddenPaths = [
  'apps/api/src/orgo/adapters/inbound/http/interaction-kernel.controller.ts',
  'apps/api/src/orgo/modules/interaction-kernel',
  'apps/api/src/orgo/integrations/interaction-kernel',
  'apps/api/src/orgo/integrations/daat',
  'apps/api/prisma',
  'apps/api/test/unit/interaction-kernel.test.ts',
  'docs/Technical-Reference/INTERACTION_KERNEL.md',
];
for (const rel of forbiddenPaths) {
  if (fs.existsSync(path.join(root, rel))) failures.push(`main-product artifact remains ${rel}`);
}

const sourceFiles = [];
function collect(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(abs);
    else if (/\.(?:ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(path.relative(root, abs));
  }
}
collect(path.join(root, 'apps/api/src'));
collect(path.join(root, 'apps/web'));
const forbidden = [
  ['interaction-kernel', 'main-product Interaction Kernel dependency'],
  ['integrations/daat', 'main-product integration adapter dependency'],
  ['../platform/', 'removed platform dependency'],
  ['/platform/', 'removed platform dependency'],
  ['../intake/', 'removed intake dependency'],
  ['../work/', 'removed work dependency'],
  ['./api', 'removed Orgo web API client dependency'],
  ['OrgoApp', 'removed main Orgo application dependency'],
  ['../port', 'removed integration port dependency'],
];
for (const rel of sourceFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const [needle, label] of forbidden) {
    if (text.includes(needle)) failures.push(`${rel}: ${label} (${needle})`);
  }
  if (/\blegacy\b/i.test(text)) failures.push(`${rel}: legacy terminology remains in runtime source`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageJson.name !== 'orgo-worlds') failures.push('package.json: name must be orgo-worlds');
if (!packageJson.scripts?.['dev:api']) failures.push('package.json: dev:api script missing');
if (!packageJson.scripts?.['dev:web']) failures.push('package.json: dev:web script missing');

const worldsService = fs.readFileSync(
  path.join(root, 'apps/api/src/orgo/modules/worlds/worlds.service.ts'),
  'utf8',
);
if (!worldsService.includes('orgo-worlds-state.json')) failures.push('WorldsService: standalone state store missing');
if (worldsService.includes('@prisma/client')) failures.push('WorldsService: Prisma/main-app coupling remains');

if (failures.length) {
  console.error('Orgo Worlds static architecture check FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Orgo Worlds static architecture check: PASS');
}
