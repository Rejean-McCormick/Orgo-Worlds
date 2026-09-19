import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  artifactLinkInput,
  buildRecordInput,
  decisionExecuteData,
  DomainError,
  ikReceipt,
  ikRequestFingerprint,
  ikSemanticProjection,
  ikSha256,
  interactionEnvelope,
  parse,
  releaseRecordInput,
  type InteractionEnvelope,
} from '../../integrations/interaction-kernel/contracts';
import {
  requirePermission,
  type WorldsExecutionContext,
} from '../worlds/worlds.service';

const exportRequest = z
  .object({
    subject_type: z.enum(['case', 'task']),
    subject_id: z.string().uuid(),
  })
  .strict();

type InteractionRow = {
  organization_id: string;
  world_id: string;
  operation: string;
  key: string;
  request_hash: string;
  envelope: InteractionEnvelope;
  response: Record<string, unknown>;
};

type ArtifactLinkRow = {
  id: string;
  organization_id: string;
  world_id: string;
  subject_type: 'case' | 'task';
  subject_id: string;
  relation: string;
  artifact_owner: string;
  artifact_owner_organization: string;
  artifact_owner_instance: string;
  artifact_type: string;
  artifact_id: string;
  artifact_version: string;
  digest: string | null;
  locator: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type BuildRecordRow = {
  id: string;
  organization_id: string;
  world_id: string;
  build_id: string;
  status: string;
  record: unknown;
  record_hash: string;
  created_at: string;
};

type ReleaseRecordRow = {
  id: string;
  organization_id: string;
  world_id: string;
  release_id: string;
  revision: number;
  build_ref: string;
  status: string;
  record: unknown;
  record_hash: string;
  created_at: string;
};

type Store = {
  version: 1;
  interactions: InteractionRow[];
  artifact_links: ArtifactLinkRow[];
  build_records: BuildRecordRow[];
  release_records: ReleaseRecordRow[];
};

function now() {
  return new Date().toISOString();
}

function worldId(ctx: WorldsExecutionContext) {
  return ctx.worldId ?? ctx.worldKey ?? 'main';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class InteractionKernelService {
  private readonly file =
    process.env.ORGO_WORLDS_IK_STATE_FILE ?? path.resolve(process.cwd(), 'runtime', 'orgo-worlds-ik.json');
  private state: Store = this.load();

  private load(): Store {
    if (fs.existsSync(this.file)) {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Store;
      if (parsed?.version === 1) return parsed;
    }
    const initial: Store = {
      version: 1,
      interactions: [],
      artifact_links: [],
      build_records: [],
      release_records: [],
    };
    this.persist(initial);
    return initial;
  }

  private persist(state = this.state) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private validateDecisionEnvelope(ctx: WorldsExecutionContext, raw: unknown) {
    const envelope = parse(interactionEnvelope, raw);
    if (
      envelope.class !== 'command' ||
      envelope.profile.id !== 'governance.decision.execute' ||
      envelope.profile.version !== '1.0.0'
    )
      throw new DomainError(
        'IK_UNKNOWN_PROFILE',
        'Only governance.decision.execute/1.0.0 is accepted on this boundary',
        422,
      );
    if (envelope.source.system !== 'konnaxion')
      throw new DomainError('IK_UNAUTHORIZED', 'Konnaxion source required', 403);
    if (
      envelope.source.organization &&
      envelope.source.organization !== ctx.organizationId
    )
      throw new DomainError('IK_UNAUTHORIZED', 'Source organization does not match tenant', 403);
    if (envelope.subject.type !== 'decision')
      throw new DomainError('IK_INVALID_ENVELOPE', 'subject.type must be decision', 422);
    if (envelope.target?.system !== 'orgo')
      throw new DomainError('IK_TARGET_NOT_FOUND', 'Orgo target required', 422);
    if (
      envelope.target.organization &&
      envelope.target.organization !== ctx.organizationId
    )
      throw new DomainError('IK_TARGET_NOT_FOUND', 'Target organization does not match tenant', 404);
    if (
      envelope.target.world &&
      ctx.worldKey &&
      envelope.target.world !== ctx.worldKey &&
      envelope.target.world !== ctx.worldId
    )
      throw new DomainError('IK_TARGET_NOT_FOUND', 'Target World does not match request context', 404);
    if (
      envelope.target.release &&
      ctx.worldReleaseId &&
      envelope.target.release !== ctx.worldReleaseId &&
      envelope.target.release !== String(ctx.worldReleaseNumber ?? '')
    )
      throw new DomainError('IK_TARGET_NOT_READY', 'Target release does not match request context', 409);
    if (!envelope.idempotency_key)
      throw new DomainError('IK_INVALID_ENVELOPE', 'idempotency_key is required', 400);
    if (ctx.idempotencyKey && ctx.idempotencyKey !== envelope.idempotency_key)
      throw new DomainError('IK_IDEMPOTENCY_CONFLICT', 'Header idempotency key differs from envelope', 409);
    if (envelope.authority?.kind !== 'governance-mandate')
      throw new DomainError('IK_UNAUTHORIZED', 'governance-mandate authority is required', 403);
    if (
      !envelope.artifact_refs.some(
        (ref) =>
          ref.owner.system === 'konnaxion' &&
          ref.artifact_type === 'konnaxion.decision_record',
      )
    )
      throw new DomainError('IK_INVALID_ENVELOPE', 'A Konnaxion decision artifact is required', 422);
    return { envelope, data: parse(decisionExecuteData, envelope.data ?? {}) };
  }

  async receive(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:write');
    const { envelope, data } = this.validateDecisionEnvelope(ctx, raw);
    const fingerprint = ikRequestFingerprint(envelope);
    const operation = `${envelope.profile.id}@${envelope.profile.version}`;
    const scope = worldId(ctx);
    const existing = this.state.interactions.find(
      (row) =>
        row.organization_id === ctx.organizationId &&
        row.world_id === scope &&
        row.operation === operation &&
        row.key === envelope.idempotency_key,
    );
    if (existing) {
      if (existing.request_hash !== fingerprint)
        throw new DomainError(
          'IK_IDEMPOTENCY_CONFLICT',
          'Same idempotency identity contains a divergent semantic request',
          409,
        );
      return existing.response;
    }

    const receipt = ikReceipt({
      interactionId: envelope.id,
      organizationId: ctx.organizationId,
      correlationId: envelope.correlation_id,
      status: 'accepted',
      externalReference: `orgo-worlds://decision/${encodeURIComponent(envelope.subject.id)}`,
      data: {
        decision_revision: data.decision_revision,
        world: scope,
        execution: 'accepted-by-standalone-boundary',
      },
    });
    this.state.interactions.push({
      organization_id: ctx.organizationId,
      world_id: scope,
      operation,
      key: envelope.idempotency_key,
      request_hash: fingerprint,
      envelope,
      response: receipt,
    });
    this.persist();
    return receipt;
  }

  async exportManifest(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:read');
    const input = parse(exportRequest, raw);
    const links = this.state.artifact_links.filter(
      (row) =>
        row.organization_id === ctx.organizationId &&
        row.world_id === worldId(ctx) &&
        row.subject_type === input.subject_type &&
        row.subject_id === input.subject_id,
    );
    const body = {
      id: `orgo-worlds-export:${input.subject_type}:${input.subject_id}`,
      profile: 'orgo-worlds.export/1.0.0',
      producer: { system: 'orgo-worlds', organization: ctx.organizationId },
      snapshot_at: now(),
      scope: { organization: ctx.organizationId, world: worldId(ctx) },
      subjects: [{ type: input.subject_type, id: input.subject_id }],
      items: links.map((link) => ({
        type: link.artifact_type,
        ref: link.artifact_id,
        digest: link.digest,
      })),
      intended_use: ['kristal_compilation'],
    };
    return {
      ...body,
      integrity: { algorithm: 'sha256', digest: `sha256:${ikSha256(body)}` },
    };
  }

  async linkArtifact(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:write');
    const input = parse(artifactLinkInput, raw);
    const scope = worldId(ctx);
    const digest = input.artifact.integrity?.digest ?? null;
    const existing = this.state.artifact_links.find(
      (row) =>
        row.organization_id === ctx.organizationId &&
        row.world_id === scope &&
        row.subject_type === input.subject_type &&
        row.subject_id === input.subject_id &&
        row.relation === input.relation &&
        row.artifact_owner === input.artifact.owner.system &&
        row.artifact_type === input.artifact.artifact_type &&
        row.artifact_id === input.artifact.artifact_id &&
        row.artifact_version === (input.artifact.version ?? ''),
    );
    if (existing) {
      if (existing.digest !== digest)
        throw new DomainError(
          'IK_ARTIFACT_LINK_CONFLICT',
          'Artifact identity is already linked with different integrity metadata',
          409,
        );
      return existing;
    }
    const row: ArtifactLinkRow = {
      id: randomUUID(),
      organization_id: ctx.organizationId,
      world_id: scope,
      subject_type: input.subject_type,
      subject_id: input.subject_id,
      relation: input.relation,
      artifact_owner: input.artifact.owner.system,
      artifact_owner_organization: input.artifact.owner.organization ?? '',
      artifact_owner_instance: input.artifact.owner.instance ?? '',
      artifact_type: input.artifact.artifact_type,
      artifact_id: input.artifact.artifact_id,
      artifact_version: input.artifact.version ?? '',
      digest,
      locator: input.artifact.locator?.ref ?? null,
      metadata: {
        content: input.artifact.content ?? null,
        scope: input.artifact.scope ?? null,
        provenance: input.artifact.provenance ?? null,
        access: input.artifact.access ?? null,
        ...input.metadata,
      },
      created_at: now(),
    };
    this.state.artifact_links.push(row);
    this.persist();
    return row;
  }

  async listArtifactLinks(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:read');
    const input = parse(exportRequest, raw);
    return this.state.artifact_links.filter(
      (row) =>
        row.organization_id === ctx.organizationId &&
        row.world_id === worldId(ctx) &&
        row.subject_type === input.subject_type &&
        row.subject_id === input.subject_id,
    );
  }

  async createBuildRecord(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:write');
    const input = parse(buildRecordInput, raw);
    const scope = worldId(ctx);
    const digest = ikSha256(input);
    const existing = this.state.build_records.find(
      (row) =>
        row.organization_id === ctx.organizationId &&
        row.world_id === scope &&
        row.build_id === input.build_id,
    );
    if (existing) {
      if (existing.record_hash !== digest)
        throw new DomainError('IK_BUILD_RECORD_CONFLICT', 'BuildRecord is immutable', 409);
      return existing;
    }
    const row: BuildRecordRow = {
      id: randomUUID(),
      organization_id: ctx.organizationId,
      world_id: scope,
      build_id: input.build_id,
      status: input.stages.some((stage) => ['FAIL', 'ERROR'].includes(stage.status))
        ? 'RECORDED_WITH_STAGE_FAILURES'
        : 'RECORDED',
      record: input,
      record_hash: digest,
      created_at: now(),
    };
    this.state.build_records.push(row);
    this.persist();
    return row;
  }

  async getBuildRecord(ctx: WorldsExecutionContext, buildId: string) {
    requirePermission(ctx, 'integrations:read');
    const row = this.state.build_records.find(
      (candidate) =>
        candidate.organization_id === ctx.organizationId &&
        candidate.world_id === worldId(ctx) &&
        candidate.build_id === buildId,
    );
    if (!row) throw new DomainError('NOT_FOUND', 'BuildRecord not found', 404);
    return row;
  }

  async appendReleaseRecord(ctx: WorldsExecutionContext, raw: unknown) {
    requirePermission(ctx, 'integrations:write');
    const input = parse(releaseRecordInput, raw);
    const scope = worldId(ctx);
    const revisions = this.state.release_records
      .filter(
        (row) =>
          row.organization_id === ctx.organizationId &&
          row.world_id === scope &&
          row.release_id === input.release_id,
      )
      .sort((a, b) => b.revision - a.revision);
    const latest = revisions[0];
    if (latest) {
      const previous = object(latest.record);
      const previousEvents = Array.isArray(previous.events) ? previous.events : [];
      if (
        previous.created_at !== input.created_at ||
        previous.created_by !== input.created_by ||
        previous.build_ref !== input.build_ref ||
        input.events.length < previousEvents.length ||
        ikSha256(input.events.slice(0, previousEvents.length)) !== ikSha256(previousEvents)
      )
        throw new DomainError(
          'IK_RELEASE_RECORD_HISTORY_CONFLICT',
          'ReleaseRecord revisions must append to existing event history',
          409,
        );
      const digest = ikSha256(input);
      if (latest.record_hash === digest) return latest;
    }
    const row: ReleaseRecordRow = {
      id: randomUUID(),
      organization_id: ctx.organizationId,
      world_id: scope,
      release_id: input.release_id,
      revision: (latest?.revision ?? 0) + 1,
      build_ref: input.build_ref,
      status: input.status,
      record: input,
      record_hash: ikSha256(input),
      created_at: now(),
    };
    this.state.release_records.push(row);
    this.persist();
    return row;
  }

  async getReleaseRecord(ctx: WorldsExecutionContext, releaseId: string) {
    requirePermission(ctx, 'integrations:read');
    const row = this.state.release_records
      .filter(
        (candidate) =>
          candidate.organization_id === ctx.organizationId &&
          candidate.world_id === worldId(ctx) &&
          candidate.release_id === releaseId,
      )
      .sort((a, b) => b.revision - a.revision)[0];
    if (!row) throw new DomainError('NOT_FOUND', 'ReleaseRecord not found', 404);
    return row;
  }

  semanticProjection(raw: unknown) {
    return ikSemanticProjection(parse(interactionEnvelope, raw));
  }
}
