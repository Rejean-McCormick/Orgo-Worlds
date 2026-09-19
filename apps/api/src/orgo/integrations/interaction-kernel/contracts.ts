import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';


export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError('VALIDATION_ERROR', result.error.issues.map((issue) => issue.message).join('; '), 400);
  return result.data;
}

export type IntegrationRequest = {
  operation_id: string;
  organization_id: string;
  operation: string;
  idempotency_key: string;
  correlation_id?: string | null;
  subject: { type: string; id: string };
  input: unknown;
};

export type IntegrationReceipt = {
  status: 'accepted' | 'succeeded';
  external_reference?: string;
  data: Record<string, unknown>;
};

export class DeliveryError extends Error {
  constructor(public readonly code: string, public readonly retryable = true) {
    super(code);
    this.name = 'DeliveryError';
  }
}

export interface IntegrationPort {
  execute(request: IntegrationRequest): Promise<IntegrationReceipt>;
}

export const IK_SPEC_VERSION = 'ik/1.1' as const;
export const IK_FINGERPRINT_PROFILE =
  'ik.request-fingerprint/jcs-rfc8785+sha256/v1' as const;

const participant = z
  .object({
    system: z.string().min(1).max(120),
    instance: z.string().max(200).nullable().optional(),
    organization: z.string().max(200).nullable().optional(),
    world: z.string().max(200).nullable().optional(),
    release: z.string().max(200).nullable().optional(),
  })
  .strict();
const profileRef = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,159}$/),
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  })
  .strict();
const subjectRef = z
  .object({ type: z.string().min(1).max(120), id: z.string().min(1).max(500) })
  .strict();
const artifactRef = z
  .object({
    owner: participant,
    artifact_type: z.string().min(1).max(200),
    artifact_id: z.string().min(1).max(1000),
    version: z.string().max(200).nullable().optional(),
    integrity: z
      .object({
        algorithm: z.literal('sha256'),
        digest: z.string().regex(/^(?:sha256:)?[a-f0-9]{64}$/),
      })
      .strict()
      .nullable()
      .optional(),
    locator: z
      .object({
        ref: z
          .string()
          .min(1)
          .max(2000)
          .refine(
            (value) =>
              !/(?:token|secret|password|api[_-]?key)=/i.test(value) &&
              !/:\/\/[^/@:]+:[^/@]+@/.test(value),
            'Artifact locator must not embed credentials',
          ),
      })
      .strict()
      .nullable()
      .optional(),
    content: z
      .object({
        media_type: z.string().max(200).nullable().optional(),
        contract_ref: z.string().max(2000).nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
    scope: z.record(z.unknown()).nullable().optional(),
    provenance: z.record(z.unknown()).nullable().optional(),
    access: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export const interactionEnvelope = z
  .object({
    specversion: z.literal(IK_SPEC_VERSION),
    id: z.string().min(8).max(200),
    class: z.enum(['command', 'query', 'event']),
    time: z.string().datetime({ offset: true }),
    profile: profileRef,
    source: participant,
    target: participant.optional(),
    subject: subjectRef,
    operation: z.string().max(160).nullable().optional(),
    correlation_id: z.string().min(1).max(500).nullable().optional(),
    causation_id: z.string().max(500).nullable().optional(),
    idempotency_key: z.string().min(1).max(500).nullable().optional(),
    authority: z
      .object({
        kind: z.string().min(1).max(120),
        claims: z.array(z.string().max(1000)).max(100).optional(),
        context: z.record(z.unknown()).optional(),
      })
      .strict()
      .nullable()
      .optional(),
    data_schema: z.string().max(2000).nullable().optional(),
    data: z.unknown().optional(),
    artifact_refs: z.array(artifactRef).max(1000).default([]),
    governance: z.record(z.unknown()).nullable().optional(),
    response: z.record(z.unknown()).nullable().optional(),
    trace: z.record(z.unknown()).nullable().optional(),
    evidence: z.array(z.string().max(2000)).nullable().optional(),
    extensions: z.record(z.unknown()).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.class === 'command' || value.class === 'query') && !value.target)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target'],
        message: 'Durable command/query requires a concrete target',
      });
  });

export type InteractionEnvelope = z.infer<typeof interactionEnvelope>;
export type ArtifactRef = z.infer<typeof artifactRef>;

export const decisionExecuteData = z
  .object({
    decision_revision: z.string().min(1).max(200),
    effective_at: z.string().datetime({ offset: true }).nullable().optional(),
    execution_scope: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export const decisionRouteConfig = z
  .object({
    workflow_code: z.string().trim().min(1).max(200),
    label: z.string().regex(/^[1-9]\d*\.[1-9][1-5](?:\.[A-Za-z0-9]+)*$/),
    type: z.string().trim().min(1).max(500).default('governance_decision'),
    category: z
      .enum(['request', 'incident', 'update', 'report', 'distribution'])
      .default('request'),
    severity: z.enum(['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL']).default('MODERATE'),
    title_prefix: z.string().trim().min(1).max(300).default('Governed decision'),
  })
  .strict();

export const artifactLinkInput = z
  .object({
    subject_type: z.enum(['task', 'case']),
    subject_id: z.string().uuid(),
    relation: z.string().trim().min(1).max(120),
    artifact: artifactRef,
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

const contentRef = z
  .object({
    alg: z.string().min(1),
    value: z.string().min(1),
    uri: z.string().url().optional(),
  })
  .strict();
const buildStage = z
  .object({
    name: z.string().min(1),
    status: z.enum(['PASS', 'FAIL', 'ERROR', 'SKIP']),
    started_at: z.string().datetime({ offset: true }).optional(),
    ended_at: z.string().datetime({ offset: true }).optional(),
    inputs: z.array(contentRef).optional(),
    outputs: z.array(contentRef).optional(),
    metrics: z.record(z.unknown()).optional(),
    notes: z.string().optional(),
  })
  .strict();
const buildPipeline = z
  .object({
    pipeline_id: z.string().min(1),
    toolchain: z
      .object({
        orgo_version: z.string().optional(),
        compiler_version: z.string().optional(),
        validator_version: z.string().optional(),
        resolver_version: z.string().optional(),
        render_version: z.string().optional(),
      })
      .strict(),
    source: z
      .object({
        repo: z.string().optional(),
        commit: z.string().optional(),
        branch: z.string().optional(),
        build_system: z.string().optional(),
      })
      .strict()
      .optional(),
    environment: z
      .object({
        env: z.string().optional(),
        region: z.string().optional(),
        runner_id: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const buildRecordInput = z
  .object({
    build_id: z.string().min(1).max(500),
    record_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    created_at: z.string().datetime({ offset: true }),
    trigger: z
      .object({
        type: z.enum(['manual', 'schedule', 'webhook', 'incident', 'release', 'other']).optional(),
        actor: z.string().optional(),
        reason: z.string().optional(),
        source_ref: contentRef.optional(),
      })
      .strict()
      .optional(),
    mandate_bundle_ref: contentRef,
    inputs: z
      .object({
        snapshots: z.array(contentRef).min(1),
        snapshot_manifest_ref: contentRef.optional(),
        notes: z.string().optional(),
      })
      .strict(),
    pipeline: buildPipeline,
    stages: z.array(buildStage).min(1),
    outputs: z
      .object({
        validation: z
          .object({
            report_ref: contentRef,
            status: z.enum(['PASS', 'FAIL']),
          })
          .strict(),
        kristal: z
          .object({
            exchange_ref: contentRef.optional(),
            runtime_pack_ref: contentRef.optional(),
          })
          .strict(),
        render_bundles: z.array(contentRef).optional(),
      })
      .strict(),
    checksums: z
      .object({
        build_record_hash: z
          .object({ alg: z.string().min(1), value: z.string().min(1) })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const releaseArtifact = z
  .object({
    artifact_type: z.string().min(1),
    artifact_ref: z.string().min(1),
    artifact_hash: z
      .object({ alg: z.string().min(1), value: z.string().min(1) })
      .strict()
      .optional(),
    compat: z.record(z.unknown()).optional(),
  })
  .strict();
const channelTarget = z
  .object({
    channel_id: z.string().min(1),
    target_cohorts: z.array(z.string().min(1)).optional(),
    constraints: z.record(z.unknown()).optional(),
  })
  .strict();
const rolloutStage = z
  .object({
    name: z.string().min(1),
    target_cohorts: z.array(z.string().min(1)).optional(),
    conditions: z.record(z.unknown()).optional(),
  })
  .strict();
const rolloutStrategy = z
  .object({
    mode: z.enum(['all_at_once', 'percentage', 'staged', 'pinned']),
    percentage: z.number().min(0).max(100).optional(),
    stages: z.array(rolloutStage).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === 'percentage' && value.percentage === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['percentage'],
        message: 'percentage is required for percentage rollout',
      });
    if (value.mode === 'staged' && !value.stages)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stages'],
        message: 'stages are required for staged rollout',
      });
  });
const releaseEvent = z
  .object({
    at: z.string().datetime({ offset: true }),
    type: z.string().min(1),
    actor: z.string().min(1),
    details: z.record(z.unknown()).optional(),
  })
  .strict();
export const releaseRecordInput = z
  .object({
    release_id: z.string().min(1).max(500),
    created_at: z.string().datetime({ offset: true }),
    created_by: z.string().min(1).max(500),
    build_ref: z.string().min(1).max(1000),
    artifacts: z.array(releaseArtifact).min(1),
    channels: z.array(channelTarget).min(1),
    strategy: rolloutStrategy,
    status: z.enum([
      'DRAFT',
      'QUEUED',
      'VERIFYING',
      'VERIFIED',
      'RELEASING',
      'RELEASED',
      'PAUSED',
      'ROLLED_BACK',
      'FAILED',
      'CANCELED',
    ]),
    updated_at: z.string().datetime({ offset: true }),
    events: z.array(releaseEvent),
    verification_policy_ref: z.string().min(1).optional(),
    activation_policy_ref: z.string().min(1).optional(),
    status_reason: z.string().optional(),
  })
  .strict();

function assertIJsonString(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new DomainError('IK_INVALID_IJSON', 'Unpaired high surrogate', 400);
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff)
      throw new DomainError('IK_INVALID_IJSON', 'Unpaired low surrogate', 400);
  }
}

export function ikCanonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') {
    assertIJsonString(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new DomainError('IK_INVALID_IJSON', 'Non-finite number', 400);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(ikCanonicalize).join(',')}]`;
  if (typeof value === 'object' && value) {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort();
    for (const key of keys) assertIJsonString(key);
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${ikCanonicalize(object[key])}`)
      .join(',')}}`;
  }
  throw new DomainError('IK_INVALID_IJSON', 'Unsupported JSON value', 400);
}

export function ikSha256(value: unknown) {
  return createHash('sha256').update(ikCanonicalize(value)).digest('hex');
}

const semanticFields = [
  'class',
  'profile',
  'source',
  'target',
  'subject',
  'operation',
  'authority',
  'data_schema',
  'data',
  'governance',
  'artifact_refs',
  'evidence',
] as const;
export function ikSemanticProjection(envelope: InteractionEnvelope) {
  const source = envelope as unknown as Record<string, unknown>;
  return Object.fromEntries(
    semanticFields
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => [key, source[key]]),
  );
}
export function ikRequestFingerprint(envelope: InteractionEnvelope) {
  return `sha256:${ikSha256(ikSemanticProjection(envelope))}`;
}

export function ikReceipt(input: {
  interactionId: string;
  organizationId: string;
  correlationId?: string | null;
  status: 'accepted' | 'rejected' | 'blocked' | 'succeeded' | 'failed';
  code?: string | null;
  retryable?: boolean;
  externalReference?: string | null;
  data?: Record<string, unknown>;
}) {
  return {
    specversion: IK_SPEC_VERSION,
    record_type: 'receipt' as const,
    id: randomUUID(),
    time: new Date().toISOString(),
    interaction_id: input.interactionId,
    source: { system: 'orgo', organization: input.organizationId },
    status: input.status,
    code: input.code ?? null,
    retryable: input.retryable ?? false,
    external_reference: input.externalReference ?? null,
    data: input.data ?? {},
    correlation_id: input.correlationId ?? null,
  };
}
