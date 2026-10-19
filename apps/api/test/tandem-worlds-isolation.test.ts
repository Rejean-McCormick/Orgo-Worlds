import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WorldsService, type WorldsExecutionContext, DomainError } from '../src/orgo/modules/worlds/worlds.service';

const ACTOR_A = '10000000-0000-4000-8000-000000000001';
const ACTOR_B = '20000000-0000-4000-8000-000000000002';
const ADMIN_A: WorldsExecutionContext = { organizationId: 'org-a', userId: ACTOR_A, permissions: ['worlds:manage'] };
const ADMIN_B: WorldsExecutionContext = { organizationId: 'org-b', userId: ACTOR_B, permissions: ['worlds:manage'] };
function isolated<T>(fn: (service: WorldsService, stateFile: string) => T): T {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orgo-worlds-tandem-'));
  const file = path.join(directory, 'worlds.json');
  const previous = process.env.ORGO_WORLDS_STATE_FILE;
  process.env.ORGO_WORLDS_STATE_FILE = file;
  try { return fn(new WorldsService(), file); }
  finally {
    if (previous === undefined) delete process.env.ORGO_WORLDS_STATE_FILE;
    else process.env.ORGO_WORLDS_STATE_FILE = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
function assertCode(fn: () => unknown, code: string) {
  assert.throws(fn, (error: unknown) => error instanceof DomainError && error.code === code);
}

test('two tenants may have same World key without leaking releases or memberships', () => isolated((service) => {
  const a = service.create(ADMIN_A, { key: 'shared', title: 'A', visibility: 'private' });
  const b = service.create(ADMIN_B, { key: 'shared', title: 'B', visibility: 'private' });
  assert.notEqual(a.id, b.id);
  assert.equal(service.get(ADMIN_A, 'shared').title, 'A');
  assert.equal(service.get(ADMIN_B, 'shared').title, 'B');
  assert.equal(service.releases(ADMIN_A, 'shared').length, 1);
  assert.equal(service.memberships(ADMIN_B, 'shared')[0].user_id, ACTOR_B);
  assertCode(() => service.get({ organizationId: 'org-a', userId: ACTOR_B, permissions: [] }, 'shared'), 'WORLD_ACCESS_DENIED');
  assertCode(() => service.get({ organizationId: 'org-z', userId: ACTOR_A, permissions: ['*'] }, 'shared'), 'WORLD_NOT_FOUND');
}));

test('archived World refuses promotion, membership writes and runtime activation', () => isolated((service) => {
  service.create(ADMIN_A, { key: 'retired', title: 'Archived', visibility: 'private' });
  const release = service.createRelease(ADMIN_A, 'retired', { config: { demo: true } });
  service.archive(ADMIN_A, 'retired');
  assertCode(() => service.promote(ADMIN_A, 'retired', release.id), 'WORLD_ARCHIVED');
  assertCode(() => service.setMembership(ADMIN_A, 'retired', ACTOR_B, { role: 'owner' }), 'WORLD_ARCHIVED');
  assertCode(() => service.createRelease(ADMIN_A, 'retired', {}), 'WORLD_ARCHIVED');
  assertCode(() => service.runtime({ ...ADMIN_A, worldKey: 'retired' }), 'WORLD_ARCHIVED');
}));

test('runtime refuses a current release from a different World even in same tenant', () => isolated((service, file) => {
  service.create(ADMIN_A, { key: 'one', title: 'One' });
  service.create(ADMIN_A, { key: 'two', title: 'Two' });
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const one = state.worlds.find((world: { key: string }) => world.key === 'one');
  const two = state.worlds.find((world: { key: string }) => world.key === 'two');
  one.current_release_id = two.current_release_id;
  fs.writeFileSync(file, JSON.stringify(state));
  assertCode(() => new WorldsService().runtime({ ...ADMIN_A, worldKey: 'one' }), 'WORLD_RELEASE_MISMATCH');
}));

test('runtime refuses missing or non-current release', () => isolated((service, file) => {
  service.create(ADMIN_A, { key: 'unbound', title: 'Unbound' });
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const world = state.worlds.find((row: { key: string }) => row.key === 'unbound');
  const release = state.releases.find((row: { id: string }) => row.id === world.current_release_id);
  release.status = 'frozen';
  fs.writeFileSync(file, JSON.stringify(state));
  assertCode(() => new WorldsService().runtime({ ...ADMIN_A, worldKey: 'unbound' }), 'WORLD_RELEASE_MISMATCH');
}));
