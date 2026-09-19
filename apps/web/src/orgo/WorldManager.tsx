import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, BrowserWorldsClient, type Actor } from "./WorldSwitcher";

type Release = {
  id: string;
  release_number: number;
  status: string;
  label: string;
  content_hash: string;
  promoted_at?: string | null;
};
type Counts = { tasks: number; cases: number; signals: number; memberships?: number };
type World = {
  id: string;
  key: string;
  title: string;
  description: string;
  status: string;
  visibility: "organization" | "private";
  is_default: boolean;
  role?: string | null;
  current_release: Release | null;
  counts?: Counts;
  releases?: Release[];
};
type Membership = {
  id: string;
  user_id: string;
  role: "owner" | "maintainer" | "member" | "viewer";
  is_active: boolean;
  user?: { email?: string; display_name?: string };
};

const sessionClient = () => new BrowserWorldsClient();

function errText(error: unknown) {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Erreur inattendue";
}

export function WorldManager() {
  const client = useMemo(sessionClient, []);
  const [actor, setActor] = useState<Actor | null>(null);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [detail, setDetail] = useState<World | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadWorlds = useCallback(async () => {
    const list = await client.request<World[]>("control/worlds");
    setWorlds(list);
    setSelectedKey((current) => current || list[0]?.key || "");
  }, [client]);

  const loadDetail = useCallback(async (key: string) => {
    if (!key) return;
    const [world, members] = await Promise.all([
      client.request<World>(`control/worlds/${encodeURIComponent(key)}`),
      client
        .request<Membership[]>(`control/worlds/${encodeURIComponent(key)}/memberships`)
        .catch(() => [] as Membership[]),
    ]);
    setDetail(world);
    setMemberships(members);
  }, [client]);

  useEffect(() => {
    setActor(client.actor);
    void loadWorlds().catch((e) => setError(errText(e)));
  }, [client, loadWorlds]);

  useEffect(() => {
    if (!actor || !selectedKey) return;
    loadDetail(selectedKey).catch((e) => setError(errText(e)));
  }, [actor, selectedKey, loadDetail]);

  async function mutate(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await loadWorlds();
      if (selectedKey) await loadDetail(selectedKey);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!actor) {
    return <main className="world-manager-shell"><p>{error || "Chargement…"}</p></main>;
  }
  const hasWorldAdmin = actor.permissions.includes("*") || actor.permissions.includes("worlds:manage");
  const canManageSelected =
    hasWorldAdmin || detail?.role === "owner" || detail?.role === "maintainer";

  return (
    <main className="world-manager-shell">
      <header className="world-manager-header">
        <div>
          <p className="eyebrow">ORGO WORLDS · CONTROL PLANE</p>
          <h1>World Manager</h1>
          <p>Créer, publier et administrer les Worlds sans toucher directement aux données runtime.</p>
        </div>
        <button onClick={() => window.location.assign(`/w/${encodeURIComponent(selectedKey || "main")}`)}>
          Retour au World
        </button>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="world-manager-grid">
        <section className="panel world-catalog">
          <div className="panel-heading"><strong>Worlds</strong><span>{worlds.length}</span></div>
          {worlds.map((world) => (
            <button
              key={world.id}
              className={`world-card ${world.key === selectedKey ? "selected" : ""}`}
              onClick={() => setSelectedKey(world.key)}
            >
              <strong>{world.title}</strong>
              <span className="mono">{world.key}</span>
              <small>{world.status} · {world.visibility} · r{world.current_release?.release_number ?? "—"}</small>
            </button>
          ))}
          {hasWorldAdmin && <details className="world-create" open={worlds.length === 0}>
            <summary>Nouveau World</summary>
            <form onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const key = String(data.get("key") || "");
              void mutate(async () => {
                await client.request("control/worlds", "POST", {
                  key,
                  title: data.get("title"),
                  description: data.get("description"),
                  visibility: data.get("visibility"),
                });
                setSelectedKey(key);
              });
            }}>
              <label>Clé<input name="key" pattern="[a-z0-9][a-z0-9-]{0,62}[a-z0-9]?" required placeholder="atelier-nord" /></label>
              <label>Titre<input name="title" required /></label>
              <label>Description<textarea name="description" rows={3} /></label>
              <label>Visibilité<select name="visibility" defaultValue="private"><option value="private">Privé</option><option value="organization">Organisation</option></select></label>
              <button className="primary" disabled={busy}>Créer</button>
            </form>
          </details>}
        </section>

        <section className="world-detail-stack">
          {!detail ? <div className="panel padded">Sélectionnez un World.</div> : <>
            <section className="panel padded">
              <div className="world-detail-heading">
                <div><p className="eyebrow">{detail.key}</p><h2>{detail.title}</h2><p>{detail.description || "Aucune description."}</p></div>
                <span className={`badge state-${detail.status}`}>{detail.status}</span>
              </div>
              <div className="world-metrics">
                <div><strong>{detail.counts?.signals ?? 0}</strong><span>Signaux</span></div>
                <div><strong>{detail.counts?.cases ?? 0}</strong><span>Dossiers</span></div>
                <div><strong>{detail.counts?.tasks ?? 0}</strong><span>Tâches</span></div>
                <div><strong>r{detail.current_release?.release_number ?? "—"}</strong><span>Release courante</span></div>
              </div>
              {canManageSelected && !detail.is_default && detail.status !== "archived" && (
                <button className="danger-link" disabled={busy} onClick={() => {
                  if (window.confirm(`Archiver ${detail.title} ?`)) void mutate(() => client.request(`control/worlds/${encodeURIComponent(detail.key)}/archive`, "POST"));
                }}>Archiver le World</button>
              )}
            </section>

            <section className="panel padded">
              <div className="section-title"><div><h2>Releases</h2><p>Une promotion change uniquement la release courante pour les nouveaux travaux.</p></div></div>
              {canManageSelected && <form className="inline-create" onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                let config: Record<string, unknown> = {};
                const raw = String(data.get("config") || "").trim();
                try { if (raw) config = JSON.parse(raw); } catch { setError("La configuration doit être un objet JSON valide."); return; }
                void mutate(() => client.request(`control/worlds/${encodeURIComponent(detail.key)}/releases`, "POST", { label: data.get("label"), config }));
                event.currentTarget.reset();
              }}>
                <input name="label" placeholder="Release suivante" />
                <input name="config" placeholder='{"policy":"v2"}' />
                <button disabled={busy}>Créer</button>
              </form>}
              <div className="release-list">
                {(detail.releases ?? []).map((release) => (
                  <div key={release.id} className="release-row">
                    <div><strong>r{release.release_number} · {release.label}</strong><small className="mono">{release.content_hash.slice(0, 16)}</small></div>
                    <span>{release.status}</span>
                    {canManageSelected && release.id !== detail.current_release?.id && release.status !== "archived" && (
                      <button disabled={busy} onClick={() => void mutate(() => client.request(`control/worlds/${encodeURIComponent(detail.key)}/releases/${release.id}/promote`, "POST"))}>Promouvoir</button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="panel padded">
              <h2>Membres</h2>
              <p>Les rôles sont locaux au World. L’identité et les permissions globales restent celles d’Orgo Worlds.</p>
              {canManageSelected && <form className="inline-create" onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const userId = String(data.get("user_id") || "");
                void mutate(() => client.request(`control/worlds/${encodeURIComponent(detail.key)}/memberships/${encodeURIComponent(userId)}`, "PUT", { role: data.get("role"), is_active: true }));
                event.currentTarget.reset();
              }}>
                <input name="user_id" required placeholder="UUID utilisateur" />
                <select name="role" defaultValue="member"><option>owner</option><option>maintainer</option><option>member</option><option>viewer</option></select>
                <button disabled={busy}>Ajouter / modifier</button>
              </form>}
              <div className="membership-list">
                {memberships.map((membership) => (
                  <div key={membership.id} className="membership-row">
                    <div><strong>{membership.user?.display_name || membership.user?.email || membership.user_id}</strong><small className="mono">{membership.user_id}</small></div>
                    <span>{membership.role}</span><span>{membership.is_active ? "actif" : "inactif"}</span>
                  </div>
                ))}
              </div>
            </section>
          </>}
        </section>
      </div>
    </main>
  );
}
