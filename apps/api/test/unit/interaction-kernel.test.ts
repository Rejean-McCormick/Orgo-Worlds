import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decisionRouteConfig,
  ikCanonicalize,
  ikRequestFingerprint,
  interactionEnvelope,
} from '../../src/orgo/integrations/interaction-kernel/contracts';
import {
  daatEnvelope,
  konnaxionPublishEnvelope,
} from '../../src/orgo/integrations/interaction-kernel/outbound';
import { InteractionKernelHttpBridge } from '../../src/orgo/integrations/interaction-kernel/http-bridge';
import { DeliveryError } from '../../src/orgo/integrations/interaction-kernel/contracts';

const decision = (extra: Record<string, unknown> = {}) => ({
  specversion: 'ik/1.1' as const,
  id: '01J00000000000000000000001',
  class: 'command' as const,
  time: '2026-09-14T12:00:00Z',
  profile: { id: 'governance.decision.execute', version: '1.0.0' },
  source: { system: 'konnaxion', organization: 'org' },
  target: { system: 'orgo', organization: 'org', world: 'main' },
  subject: { type: 'decision', id: 'KX-D009' },
  correlation_id: 'corr.KX.D009',
  idempotency_key: 'decision:KX-D009:rev-3:orgo:execute:v1',
  authority: {
    kind: 'governance-mandate',
    claims: ['authority://konnaxion/decision/KX-D009'],
  },
  data: { decision_revision: 'rev-3', effective_at: null },
  artifact_refs: [
    {
      owner: { system: 'konnaxion' },
      artifact_type: 'konnaxion.decision_record',
      artifact_id: 'konnaxion:decision-record:KX-D009:rev-3',
      version: 'rev-3',
      integrity: { algorithm: 'sha256' as const, digest: `sha256:${'a'.repeat(64)}` },
    },
  ],
  ...extra,
});

test('IK semantic fingerprint ignores transport identity/time/correlation', () => {
  const base = interactionEnvelope.parse(decision());
  const changed = interactionEnvelope.parse(
    decision({
      id: '01J00000000000000000000099',
      time: '2027-01-01T00:00:00Z',
      correlation_id: 'different',
      trace: { traceparent: '00-abc' },
    }),
  );
  assert.equal(ikRequestFingerprint(base), ikRequestFingerprint(changed));
  assert.notEqual(
    ikRequestFingerprint(base),
    ikRequestFingerprint(
      interactionEnvelope.parse(
        decision({ data: { decision_revision: 'rev-4', effective_at: null } }),
      ),
    ),
  );
});

test('IK JCS matches canonical UTF-16 ordering and ECMAScript numbers', () => {
  assert.equal(
    ikCanonicalize({ numbers: [333333333.3333333, 1e30, 4.5, 0.002, 1e-27] }),
    '{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}',
  );
  assert.equal(ikCanonicalize({ '😀': 1, '€': 2, 'דּ': 3 }), '{"€":2,"😀":1,"דּ":3}');
});

test('World release IK decision route is explicit and fail-closed', () => {
  assert.deepEqual(
    decisionRouteConfig.parse({ workflow_code: 'governed-decision', label: '2.11' }),
    {
      workflow_code: 'governed-decision',
      label: '2.11',
      type: 'governance_decision',
      category: 'request',
      severity: 'MODERATE',
      title_prefix: 'Governed decision',
    },
  );
  assert.throws(() => decisionRouteConfig.parse({ workflow_code: 'x', label: 'bad' }));
});

test('Konnaxion publish operation maps to IK profile without changing domain payload', () => {
  const request = {
    operation_id: '6b8c5523-096e-4fc0-b6a9-be644240b497',
    organization_id: '60f51ca2-c845-45aa-bc7e-2c62e53dfc5a',
    operation: 'publish',
    idempotency_key: 'uckk:A014:impact:J30:v1',
    correlation_id: 'corr.uckk.A014.D009',
    subject: { type: 'case', id: 'fc305c81-afad-4b3a-8adb-b3668ad70d72' },
    input: {
      artifact_type: 'impact_update',
      external_reference: 'impact:UCKK-A014:day30:v1',
      summary: { policy_changes: 0 },
    },
  };
  const envelope = konnaxionPublishEnvelope(request);
  assert.deepEqual(envelope.profile, {
    id: 'accountability.impact.publish',
    version: '1.0.0',
  });
  assert.deepEqual(envelope.data, request.input);
  assert.equal(envelope.idempotency_key, request.idempotency_key);
});

test('Da’at build operation pins Kristal 5.0.0-rc.1', () => {
  const envelope = daatEnvelope({
    operation_id: '6b8c5523-096e-4fc0-b6a9-be644240b497',
    organization_id: '60f51ca2-c845-45aa-bc7e-2c62e53dfc5a',
    operation: 'build',
    idempotency_key: 'build:v1',
    correlation_id: 'corr.build',
    subject: { type: 'case', id: 'fc305c81-afad-4b3a-8adb-b3668ad70d72' },
    input: {
      mapping_profile: 'orgo.case/1.0.0',
      requested_outputs: ['working-exchange'],
      artifact_refs: [],
    },
  });
  assert.deepEqual(envelope.profile, { id: 'kristal.build.request', version: '1.0.0' });
  assert.deepEqual(envelope.data, {
    mapping_profile: 'orgo.case/1.0.0',
    requested_outputs: ['working-exchange'],
    kristal_contract_set: '5.0.0-rc.1',
  });
});

test('IK HTTP bridge maps terminal failure to DeliveryError retry policy', async () => {
  const bridge = new InteractionKernelHttpBridge(
    'https://example.test/ik',
    undefined,
    async () =>
      new Response(
        JSON.stringify({
          specversion: 'ik/1.1',
          record_type: 'receipt',
          status: 'blocked',
          code: 'IK_TARGET_NOT_READY',
          retryable: true,
          data: {},
        }),
        { status: 200 },
      ),
  );
  await assert.rejects(
    bridge.execute(interactionEnvelope.parse(decision())),
    (error: unknown) =>
      error instanceof DeliveryError &&
      error.code === 'IK_TARGET_NOT_READY' &&
      error.retryable,
  );
});
