import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeStandaloneBinding, assertSafeStandaloneRequest, LOCAL_WORLDS_ORIGINS } from '../../apps/api/src/orgo/modules/worlds/standalone-security.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('local binding remains supported by default', () => {
  assert.equal(assertSafeStandaloneBinding({}), '127.0.0.1');
  assert.equal(assertSafeStandaloneBinding({ NODE_ENV: 'development', ORGO_WORLDS_API_HOST: 'localhost' }), 'localhost');
});
test('all production modes refuse untrusted header identity', () => {
  for (const mode of ['production', 'staging', 'release']) {
    assert.throws(() => assertSafeStandaloneBinding({ NODE_ENV: mode }), /UNTRUSTED_HEADERS/);
  }
});
test('wildcard, LAN and externally routed bindings are refused', () => {
  for (const host of ['0.0.0.0', '::', '192.168.1.1', '10.2.3.4', 'orgo.example.com', 'host.docker.internal', '']) {
    assert.throws(() => assertSafeStandaloneBinding({ ORGO_WORLDS_API_HOST: host }), /PUBLIC_BIND_DENIED/);
  }
});
test('only local TCP peers and explicit dev browser origins accepted', () => {
  assert.doesNotThrow(() => assertSafeStandaloneRequest('127.0.0.1', 'http://127.0.0.1:3100'));
  assert.doesNotThrow(() => assertSafeStandaloneRequest('::1', 'http://localhost:3100'));
  assert.doesNotThrow(() => assertSafeStandaloneRequest('::ffff:127.0.0.1', undefined));
  assert.deepEqual(LOCAL_WORLDS_ORIGINS.length, 2);
  for (const peer of [undefined, '', '172.17.0.1', '192.168.1.5', '::ffff:192.168.0.1']) {
    assert.throws(() => assertSafeStandaloneRequest(peer, undefined), /NONLOCAL_PEER/);
  }
  for (const origin of ['null', 'https://evil.example', 'http://127.0.0.1:3000', 'http://localhost:4100']) {
    assert.throws(() => assertSafeStandaloneRequest('127.0.0.1', origin), /UNTRUSTED_ORIGIN/);
  }
});
test('HTTP bootstrap enforces local policy before listening, without wildcard CORS', () => {
  const controller = src('apps/api/src/orgo/adapters/inbound/http/worlds.controller.ts');
  const guard = controller.indexOf('assertSafeStandaloneBinding(process.env)');
  const create = controller.indexOf('NestFactory.create(StandaloneApiModule)');
  const listen = controller.indexOf('app.listen(port, host)');
  assert.ok(guard >= 0 && guard < create && create < listen);
  assert.ok(controller.includes('assertSafeStandaloneRequest(req.socket?.remoteAddress, req.headers?.origin)'));
  assert.ok(controller.includes('app.enableCors({ origin: [...LOCAL_WORLDS_ORIGINS], credentials: false })'));
  assert.ok(!controller.includes('cors: true'));
});
test('GUI launcher cannot silently start wildcard server anymore', () => {
  const launcher = src('START_ORGO_WORLDS.pyw');
  assert.ok(launcher.includes('env.setdefault("ORGO_WORLDS_API_HOST", "127.0.0.1")'));
  assert.ok(!launcher.includes('env.setdefault("ORGO_WORLDS_API_HOST", "0.0.0.0")'));
});
test('archived Worlds are immutable across release and membership mutations', () => {
  const service = src('apps/api/src/orgo/modules/worlds/worlds.service.ts');
  for (const segment of ['  promote(ctx:', '  setMembership(', '  runtime(ctx:']) {
    const pos = service.indexOf(segment);
    assert.ok(pos > 0, segment);
    const segmentBody = service.slice(pos, service.indexOf('\n  }', pos));
    assert.ok(segmentBody.includes("world.status === 'archived'"), segment);
  }
});
test('runtime release is explicitly pinned to the same World and current status', () => {
  const service = src('apps/api/src/orgo/modules/worlds/worlds.service.ts');
  assert.ok(service.includes("current.world_id !== world.id || current.status !== 'current'"));
  assert.ok(service.includes("throw new DomainError('WORLD_RELEASE_MISMATCH'"));
});
test('tenant and World ACL checks remain in standalone service', () => {
  const service = src('apps/api/src/orgo/modules/worlds/worlds.service.ts');
  assert.ok(service.includes('candidate.organization_id === ctx.organizationId && candidate.key === key'));
  assert.ok(service.includes('membership.world_id === world.id && membership.user_id === userId && membership.is_active'));
  assert.ok(service.includes('release.id === releaseId && release.world_id === world.id'));
});
