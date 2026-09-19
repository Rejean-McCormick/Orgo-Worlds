import { randomUUID } from 'node:crypto';
import { DeliveryError, type IntegrationRequest, type InteractionEnvelope } from './contracts';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new DeliveryError('INVALID_IK_REQUEST', false);
  return value as Record<string, unknown>;
}

export function konnaxionPublishEnvelope(
  request: IntegrationRequest,
): InteractionEnvelope {
  const data = record(request.input);
  return {
    specversion: 'ik/1.1',
    id: request.operation_id || randomUUID(),
    class: 'command',
    time: new Date().toISOString(),
    profile: { id: 'accountability.impact.publish', version: '1.0.0' },
    source: { system: 'orgo', organization: request.organization_id },
    target: {
      system: 'konnaxion',
      organization: request.organization_id,
      world: process.env.KONNAXION_IK_WORLD ?? null,
    },
    subject: request.subject,
    operation: 'publish',
    correlation_id: request.correlation_id,
    idempotency_key: request.idempotency_key,
    authority: { kind: 'operational-accountability' },
    data,
    artifact_refs: [],
    response: { acceptance_receipt: true, final_receipt: true },
  };
}

export function daatEnvelope(request: IntegrationRequest): InteractionEnvelope {
  const input = record(request.input);
  const artifactRefs = Array.isArray(input.artifact_refs)
    ? input.artifact_refs
    : [];
  if (request.operation === 'build') {
    const mapping = input.mapping_profile;
    const outputs = input.requested_outputs;
    if (typeof mapping !== 'string' || !Array.isArray(outputs) || !outputs.length)
      throw new DeliveryError('INVALID_DAAT_BUILD_REQUEST', false);
    return {
      specversion: 'ik/1.1',
      id: request.operation_id,
      class: 'command',
      time: new Date().toISOString(),
      profile: { id: 'kristal.build.request', version: '1.0.0' },
      source: { system: 'orgo', organization: request.organization_id },
      target: { system: 'daat', organization: request.organization_id },
      subject: request.subject,
      operation: request.operation,
      correlation_id: request.correlation_id,
      idempotency_key: request.idempotency_key,
      authority: { kind: 'operational-workflow' },
      data: {
        mapping_profile: mapping,
        requested_outputs: outputs,
        kristal_contract_set: '5.0.0-rc.1',
      },
      artifact_refs: artifactRefs as InteractionEnvelope['artifact_refs'],
      response: { acceptance_receipt: true, final_receipt: true },
    };
  }
  if (request.operation === 'revision') {
    if (typeof input.reason !== 'string' || typeof input.mapping_profile !== 'string')
      throw new DeliveryError('INVALID_DAAT_REVISION_REQUEST', false);
    return {
      specversion: 'ik/1.1',
      id: request.operation_id,
      class: 'command',
      time: new Date().toISOString(),
      profile: { id: 'kristal.revision.request', version: '1.0.0' },
      source: { system: 'orgo', organization: request.organization_id },
      target: { system: 'daat', organization: request.organization_id },
      subject: request.subject,
      operation: request.operation,
      correlation_id: request.correlation_id,
      idempotency_key: request.idempotency_key,
      authority: { kind: 'operational-workflow' },
      data: { reason: input.reason, mapping_profile: input.mapping_profile },
      artifact_refs: artifactRefs as InteractionEnvelope['artifact_refs'],
      response: { acceptance_receipt: true, final_receipt: true },
    };
  }
  throw new DeliveryError('UNSUPPORTED_OPERATION', false);
}
