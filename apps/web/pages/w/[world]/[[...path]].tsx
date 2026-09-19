import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import {
  BrowserWorldsClient,
  WorldSwitcher,
} from '../../../src/orgo/WorldSwitcher';

type Runtime = {
  world: { id: string; key: string; title: string; role: string | null; status: string };
  release: { id: string; number: number; label: string } | null;
};

export default function WorldPage() {
  const router = useRouter();
  const world = typeof router.query.world === 'string' ? router.query.world : '';
  const segments = (router.query.path as string[] | undefined) ?? [];
  const client = useMemo(() => new BrowserWorldsClient(world || undefined), [world]);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!world) return;
    client.request<Runtime>('runtime').then(setRuntime).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'World indisponible');
    });
  }, [client, world]);

  if (!world) return null;
  return (
    <>
      <Head>
        <title>Orgo Worlds · {runtime?.world.title ?? world}</title>
      </Head>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
        <WorldSwitcher client={client} actor={client.actor} worldKey={world} />
        <p style={{ marginTop: 32, textTransform: 'uppercase', letterSpacing: '.12em' }}>
          ORGO WORLDS · RUNTIME
        </p>
        <h1>{runtime?.world.title ?? world}</h1>
        {error ? <p role="alert">{error}</p> : null}
        <p>
          Status: {runtime?.world.status ?? 'chargement'} · Release:{' '}
          {runtime?.release ? `r${runtime.release.number} · ${runtime.release.label}` : '—'}
        </p>
        <p>Path: /{segments.join('/')}</p>
        <p>
          Cette surface est volontairement limitée au runtime Worlds standalone. Les écrans de
          l’application Orgo principale ne sont pas embarqués ici.
        </p>
      </main>
    </>
  );
}
