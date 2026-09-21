import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';

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

export type WorldRole = 'owner' | 'maintainer' | 'member' | 'viewer';

export type WorldsExecutionContext = {
  organizationId: string;
  userId: string;
  permissions: string[];
  worldKey?: string;
  worldId?: string;
  worldTitle?: string;
  worldStatus?: string;
  worldRole?: WorldRole | null;
  worldReleaseId?: string;
  worldReleaseNumber?: number;
  idempotencyKey?: string;
  correlationId?: string;
};

export type HeaderBag = Record<string, string | string[] | undefined>;

function header(headers: HeaderBag, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(raw) ? raw[0] : raw;
}

export function contextFromHeaders(headers: HeaderBag): WorldsExecutionContext {
  const permissions = (
    header(headers, 'x-orgo-permissions') ?? process.env.ORGO_WORLDS_PERMISSIONS ?? '*'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const releaseNumber = Number(header(headers, 'x-orgo-world-release-number') || '');
  return {
    organizationId:
      header(headers, 'x-orgo-organization-id') ??
      process.env.ORGO_WORLDS_ORGANIZATION_ID ??
      'local',
    userId: header(headers, 'x-orgo-user-id') ?? process.env.ORGO_WORLDS_USER_ID ?? '00000000-0000-4000-8000-000000000001',
    permissions,
    worldKey: header(headers, 'x-orgo-world-key') ?? undefined,
    worldId: header(headers, 'x-orgo-world-id') ?? undefined,
    worldReleaseId: header(headers, 'x-orgo-world-release-id') ?? undefined,
    worldReleaseNumber: Number.isFinite(releaseNumber) && releaseNumber > 0 ? releaseNumber : undefined,
    idempotencyKey: header(headers, 'idempotency-key') ?? undefined,
    correlationId: header(headers, 'x-correlation-id') ?? undefined,
  };
}

export function requirePermission(ctx: WorldsExecutionContext, permission: string) {
  if (!ctx.permissions.includes('*') && !ctx.permissions.includes(permission))
    throw new DomainError('FORBIDDEN', `Missing permission: ${permission}`, 403);
}

type Release = {
  id: string;
  world_id: string;
  release_number: number;
  status: 'ready' | 'current' | 'frozen' | 'archived';
  label: string;
  config: Record<string, unknown>;
  content_hash: string;
  created_at: string;
  promoted_at?: string | null;
};

type Membership = {
  id: string;
  world_id: string;
  user_id: string;
  role: WorldRole;
  is_active: boolean;
};

type World = {
  id: string;
  organization_id: string;
  key: string;
  title: string;
  description: string;
  status: 'active' | 'archived';
  visibility: 'organization' | 'private';
  is_default: boolean;
  current_release_id: string | null;
  created_at: string;
};

type Store = {
  version: 1;
  worlds: World[];
  releases: Release[];
  memberships: Membership[];
};

const MANAGE_ROLES = new Set<WorldRole>(['owner', 'maintainer']);

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function now() {
  return new Date().toISOString();
}

@Injectable()
export class WorldsService {
  private readonly file =
    process.env.ORGO_WORLDS_STATE_FILE ?? path.resolve(process.cwd(), 'runtime', 'orgo-worlds-state.json');
  private state: Store;

  constructor() {
    this.state = this.load();
  }

  private load(): Store {
    if (fs.existsSync(this.file)) {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Store;
      if (parsed?.version === 1) return parsed;
    }
    const worldId = randomUUID();
    const releaseId = randomUUID();
    const created = now();
    const initial: Store = {
      version: 1,
      worlds: [
        {
          id: worldId,
          organization_id: process.env.ORGO_WORLDS_ORGANIZATION_ID ?? 'local',
          key: 'main',
          title: 'Main World',
          description: 'Standalone Orgo Worlds control plane.',
          status: 'active',
          visibility: 'organization',
          is_default: true,
          current_release_id: releaseId,
          created_at: created,
        },
      ],
      releases: [
        {
          id: releaseId,
          world_id: worldId,
          release_number: 1,
          status: 'current',
          label: 'Initial',
          config: {},
          content_hash: digest({ world: 'main', release: 1 }),
          created_at: created,
          promoted_at: created,
        },
      ],
      memberships: [
        {
          id: randomUUID(),
          world_id: worldId,
          user_id: process.env.ORGO_WORLDS_USER_ID ?? '00000000-0000-4000-8000-000000000001',
          role: 'owner',
          is_active: true,
        },
      ],
    };
    this.persist(initial);
    return initial;
  }

  private persist(state = this.state) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private world(ctx: WorldsExecutionContext, key: string): World {
    const world = this.state.worlds.find(
      (candidate) => candidate.organization_id === ctx.organizationId && candidate.key === key,
    );
    if (!world) throw new DomainError('WORLD_NOT_FOUND', `World not found: ${key}`, 404);
    if (!this.canRead(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World access denied', 403);
    return world;
  }

  private membership(world: World, userId: string) {
    return this.state.memberships.find(
      (membership) =>
        membership.world_id === world.id && membership.user_id === userId && membership.is_active,
    );
  }

  private canRead(ctx: WorldsExecutionContext, world: World) {
    return (
      world.visibility === 'organization' ||
      ctx.permissions.includes('*') ||
      ctx.permissions.includes('worlds:manage') ||
      Boolean(this.membership(world, ctx.userId))
    );
  }

  private canManage(ctx: WorldsExecutionContext, world: World) {
    if (ctx.permissions.includes('*') || ctx.permissions.includes('worlds:manage')) return true;
    const membership = this.membership(world, ctx.userId);
    return Boolean(membership && MANAGE_ROLES.has(membership.role));
  }

  private view(ctx: WorldsExecutionContext, world: World, detail = false) {
    const releases = this.state.releases
      .filter((release) => release.world_id === world.id)
      .sort((a, b) => b.release_number - a.release_number);
    const current = releases.find((release) => release.id === world.current_release_id) ?? null;
    const role = this.membership(world, ctx.userId)?.role ?? null;
    return {
      ...world,
      role,
      current_release: current,
      counts: {
        tasks: 0,
        cases: 0,
        signals: 0,
        memberships: this.state.memberships.filter((membership) => membership.world_id === world.id).length,
      },
      ...(detail ? { releases } : {}),
    };
  }

  list(ctx: WorldsExecutionContext) {
    return this.state.worlds
      .filter((world) => world.organization_id === ctx.organizationId && this.canRead(ctx, world))
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((world) => this.view(ctx, world));
  }

  create(
    ctx: WorldsExecutionContext,
    input: { key: string; title: string; description?: string; visibility?: 'organization' | 'private' },
  ) {
    requirePermission(ctx, 'worlds:manage');
    if (this.state.worlds.some((world) => world.organization_id === ctx.organizationId && world.key === input.key))
      throw new DomainError('WORLD_EXISTS', `World already exists: ${input.key}`, 409);
    const worldId = randomUUID();
    const releaseId = randomUUID();
    const created = now();
    const release: Release = {
      id: releaseId,
      world_id: worldId,
      release_number: 1,
      status: 'current',
      label: 'Initial',
      config: {},
      content_hash: digest({ key: input.key, release: 1 }),
      created_at: created,
      promoted_at: created,
    };
    const world: World = {
      id: worldId,
      organization_id: ctx.organizationId,
      key: input.key,
      title: input.title,
      description: input.description ?? '',
      status: 'active',
      visibility: input.visibility ?? 'private',
      is_default: false,
      current_release_id: releaseId,
      created_at: created,
    };
    this.state.worlds.push(world);
    this.state.releases.push(release);
    this.state.memberships.push({
      id: randomUUID(),
      world_id: world.id,
      user_id: ctx.userId,
      role: 'owner',
      is_active: true,
    });
    this.persist();
    return this.view(ctx, world, true);
  }

  get(ctx: WorldsExecutionContext, key: string) {
    return this.view(ctx, this.world(ctx, key), true);
  }

  releases(ctx: WorldsExecutionContext, key: string) {
    const world = this.world(ctx, key);
    return this.state.releases
      .filter((release) => release.world_id === world.id)
      .sort((a, b) => b.release_number - a.release_number);
  }

  createRelease(
    ctx: WorldsExecutionContext,
    key: string,
    input: { label?: string; config?: Record<string, unknown> },
  ) {
    const world = this.world(ctx, key);
    if (!this.canManage(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World manage access denied', 403);
    if (world.status === 'archived') throw new DomainError('WORLD_ARCHIVED', 'Archived World is immutable', 409);
    const current = this.state.releases.filter((release) => release.world_id === world.id);
    const number = Math.max(0, ...current.map((release) => release.release_number)) + 1;
    const config = input.config ?? {};
    const release: Release = {
      id: randomUUID(),
      world_id: world.id,
      release_number: number,
      status: 'ready',
      label: input.label?.trim() || `Release ${number}`,
      config,
      content_hash: digest({ world: world.key, release: number, config }),
      created_at: now(),
      promoted_at: null,
    };
    this.state.releases.push(release);
    this.persist();
    return release;
  }

  promote(ctx: WorldsExecutionContext, key: string, releaseId: string) {
    const world = this.world(ctx, key);
    if (!this.canManage(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World manage access denied', 403);
    const target = this.state.releases.find(
      (release) => release.id === releaseId && release.world_id === world.id,
    );
    if (!target) throw new DomainError('RELEASE_NOT_FOUND', 'Release not found', 404);
    if (target.status === 'archived') throw new DomainError('RELEASE_ARCHIVED', 'Archived release cannot be promoted', 409);
    for (const release of this.state.releases.filter((item) => item.world_id === world.id)) {
      if (release.status === 'current') release.status = 'frozen';
    }
    target.status = 'current';
    target.promoted_at = now();
    world.current_release_id = target.id;
    this.persist();
    return target;
  }

  memberships(ctx: WorldsExecutionContext, key: string) {
    const world = this.world(ctx, key);
    if (!this.canManage(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World manage access denied', 403);
    return this.state.memberships.filter((membership) => membership.world_id === world.id);
  }

  setMembership(
    ctx: WorldsExecutionContext,
    key: string,
    userId: string,
    input: { role: WorldRole; is_active?: boolean },
  ) {
    const world = this.world(ctx, key);
    if (!this.canManage(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World manage access denied', 403);
    let membership = this.state.memberships.find(
      (candidate) => candidate.world_id === world.id && candidate.user_id === userId,
    );
    if (!membership) {
      membership = {
        id: randomUUID(),
        world_id: world.id,
        user_id: userId,
        role: input.role,
        is_active: input.is_active ?? true,
      };
      this.state.memberships.push(membership);
    } else {
      membership.role = input.role;
      membership.is_active = input.is_active ?? membership.is_active;
    }
    this.persist();
    return membership;
  }

  archive(ctx: WorldsExecutionContext, key: string) {
    const world = this.world(ctx, key);
    if (world.is_default) throw new DomainError('WORLD_DEFAULT', 'Default World cannot be archived', 409);
    if (!this.canManage(ctx, world)) throw new DomainError('WORLD_ACCESS_DENIED', 'World manage access denied', 403);
    world.status = 'archived';
    this.persist();
    return this.view(ctx, world, true);
  }

  runtime(ctx: WorldsExecutionContext) {
    const key = ctx.worldKey ?? 'main';
    const world = this.world(ctx, key);
    const current = this.state.releases.find((release) => release.id === world.current_release_id) ?? null;
    return {
      world: {
        id: world.id,
        key: world.key,
        title: world.title,
        role: this.membership(world, ctx.userId)?.role ?? null,
        status: world.status,
      },
      release: current
        ? { id: current.id, number: current.release_number, label: current.label }
        : null,
    };
  }
}
