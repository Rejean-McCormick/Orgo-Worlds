import { useEffect, useMemo, useState } from 'react';

export type Actor = {
  id: string;
  organizationId: string;
  permissions: string[];
  worldKey?: string;
};

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BrowserWorldsClient {
  readonly actor: Actor;
  private readonly apiBase: string;

  constructor(public readonly worldKey?: string) {
    this.apiBase = (process.env.NEXT_PUBLIC_ORGO_WORLDS_API ?? 'http://127.0.0.1:4100/api').replace(/\/$/, '');
    this.actor = {
      id:
        process.env.NEXT_PUBLIC_ORGO_WORLDS_USER_ID ??
        '00000000-0000-4000-8000-000000000001',
      organizationId: process.env.NEXT_PUBLIC_ORGO_WORLDS_ORGANIZATION_ID ?? 'local',
      permissions: (process.env.NEXT_PUBLIC_ORGO_WORLDS_PERMISSIONS ?? '*')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      worldKey,
    };
  }

  async request<T = unknown>(
    route: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.apiBase}/${route.replace(/^\/+/, '')}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Orgo-Organization-Id': this.actor.organizationId,
        'X-Orgo-User-Id': this.actor.id,
        'X-Orgo-Permissions': this.actor.permissions.join(','),
        ...(this.worldKey ? { 'X-Orgo-World-Key': this.worldKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      throw new ApiError(
        typeof record.code === 'string' ? record.code : `HTTP_${response.status}`,
        typeof record.message === 'string' ? record.message : `Request failed (${response.status})`,
        response.status,
      );
    }
    return payload as T;
  }
}

type ReleaseSummary = {
  id: string;
  release_number: number;
  status: string;
};

type WorldSummary = {
  id: string;
  key: string;
  title: string;
  status: string;
  current_release: ReleaseSummary | null;
};

const RECENTS = 'orgo-worlds:recent';

function recentKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function remember(key: string) {
  if (typeof window === 'undefined') return;
  const next = [key, ...recentKeys().filter((value) => value !== key)].slice(0, 8);
  window.localStorage.setItem(RECENTS, JSON.stringify(next));
}

function appPath() {
  if (typeof window === 'undefined') return '/';
  const match = /^\/w\/[^/]+(\/.*)?$/.exec(window.location.pathname);
  return match?.[1] || (window.location.pathname === '/worlds' ? '/' : window.location.pathname);
}

export function WorldSwitcher({
  client,
  actor,
  worldKey,
}: {
  client?: BrowserWorldsClient;
  actor?: Actor;
  worldKey?: string;
}) {
  const resolvedClient = useMemo(
    () => client ?? new BrowserWorldsClient(worldKey),
    [client, worldKey],
  );
  const resolvedActor = actor ?? resolvedClient.actor;
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const currentKey = worldKey ?? resolvedActor.worldKey ?? 'main';

  useEffect(() => {
    let cancelled = false;
    resolvedClient
      .request<WorldSummary[]>('control/worlds')
      .then((rows) => {
        if (!cancelled) setWorlds(rows);
      })
      .catch(() => {
        if (!cancelled) setWorlds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedClient]);

  const ordered = useMemo(() => {
    const recents = recentKeys();
    const rank = new Map(recents.map((key, index) => [key, index]));
    return [...worlds].sort((a, b) => {
      const ar = rank.get(a.key);
      const br = rank.get(b.key);
      if (ar !== undefined || br !== undefined) {
        if (ar === undefined) return 1;
        if (br === undefined) return -1;
        return ar - br;
      }
      return a.title.localeCompare(b.title);
    });
  }, [worlds]);

  if (!loading && worlds.length === 0) return null;
  return (
    <div className="world-switcher">
      <span className="world-switcher-label">World</span>
      <select
        aria-label="World actif"
        value={currentKey}
        disabled={loading}
        onChange={(event) => {
          const key = event.target.value;
          if (!key || key === currentKey) return;
          remember(key);
          const path = appPath();
          window.location.assign(`/w/${encodeURIComponent(key)}${path === '/' ? '' : path}`);
        }}
      >
        {ordered.map((world) => (
          <option
            key={world.id}
            value={world.key}
            disabled={world.status === 'archived' || !world.current_release}
          >
            {world.title} · r{world.current_release?.release_number ?? '—'}
          </option>
        ))}
      </select>
      <button
        className="world-manager-link"
        type="button"
        onClick={() => window.location.assign('/worlds')}
      >
        Gérer
      </button>
    </div>
  );
}
