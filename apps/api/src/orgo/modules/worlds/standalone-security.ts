/**
 * Standalone Orgo_Worlds uses caller-supplied identity/ACL headers; they are NOT
 * authentication. Until main Orgo provides a verified actor, this API is a
 * local-only developer tool, never a VPS/public service.
 */
export const LOCAL_WORLDS_ORIGINS = Object.freeze([
  'http://127.0.0.1:3100',
  'http://localhost:3100',
]);

export function assertSafeStandaloneBinding(env: Record<string, string | undefined>): string {
  const mode = (env.NODE_ENV ?? 'development').trim();
  if (mode !== 'development' && mode !== 'test') {
    throw new Error('ORGO_WORLDS_UNTRUSTED_HEADERS: standalone identity headers forbidden outside local development');
  }
  const host = (env.ORGO_WORLDS_API_HOST ?? '127.0.0.1').trim().toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1' && host !== '[::1]') {
    throw new Error('ORGO_WORLDS_PUBLIC_BIND_DENIED: standalone API must bind to loopback only');
  }
  return host;
}

export function assertSafeStandaloneRequest(remoteAddress: string | undefined, origin: string | undefined): void {
  const peer = (remoteAddress ?? '').toLowerCase();
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer)) {
    throw new Error('ORGO_WORLDS_NONLOCAL_PEER: remote connections forbidden');
  }
  if (origin !== undefined && !LOCAL_WORLDS_ORIGINS.includes(origin)) {
    throw new Error('ORGO_WORLDS_UNTRUSTED_ORIGIN: browser origin not authorized');
  }
}
