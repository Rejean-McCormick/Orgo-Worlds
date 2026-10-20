/** P5: internal Worlds signing primitive ONLY. No HTTP route, key store or dispatch.
 * A process-owned Ed25519 key and an authenticated server-to-server caller are
 * mandatory in any future deployed integration. The proof grants no privileges.
 */
import {sign, createPrivateKey} from 'node:crypto';
import {inspectTrustedWorldScope} from './authority-prerequisites.mjs';
const NONCE=/^[A-Za-z0-9_-]{43}$/;
const KID=/^[a-z0-9][a-z0-9-]{0,63}$/;
function deny(m){throw Error('WORLDS_P5_WITNESS_DENIED: '+m);}
const keys=o=>o&&typeof o==='object'&&!Array.isArray(o)?Object.keys(o).sort().join(','):'';
function privateEd25519(key){
  try {const k = typeof key === 'string' ? createPrivateKey(key): key;
    return k?.type === 'private' && k.asymmetricKeyType==='ed25519' ? k:null;
  }catch{return null;}
}
/** Server-only; the actor must come from authenticated Orgo session context,
 * not from a World HTTP header or an Akor input. Challenge supplied by Orgo.
 * This module is not wired to any controller or service in P5.
 */
export async function issueP5WorldWitness({request,actor,worldsService,signingKey,keyId,challenge,nowMs=Date.now()}={}){
  if(!worldsService || typeof worldsService.readTandemEducationScopeInternal!=='function')deny('trusted WorldsService missing');
  const key=privateEd25519(signingKey);
  if(!key)deny('server-owned Ed25519 private signing key required');
  if(typeof keyId!=='string'||!KID.test(keyId)||typeof challenge!=='string'||!NONCE.test(challenge))deny('key id or challenge invalid');
  if(!Number.isSafeInteger(nowMs)||nowMs<=0)deny('clock invalid');
  let state;
  await inspectTrustedWorldScope(request,actor,async query=>{
    state=await worldsService.readTandemEducationScopeInternal({
      organizationId:query.organizationId,actorUserId:query.actorUserId,
      worldId:query.worldId,releaseId:query.releaseId,
    });
    return state;
  });
  // No client-controlled extras, no rights, no PII, no teacher-approval assertion.
  const payload={
    format:'orgo-worlds.tandem-scope-witness/1.0',issuer:'orgo-worlds',audience:'orgo-education-preflight',
    challenge,organizationId:request.tenant_id,worldId:request.world_id,
    releaseId:request.world_release_id,currentReleaseId:state.currentReleaseId,
    actorUserId:actor.actorUserId,intentSha256:request.intent_sha256,
    worldStatus:state.worldStatus,releaseStatus:state.releaseStatus,
    membership:{userId:state.membership.userId,worldId:state.membership.worldId,
      active:state.membership.active,role:state.membership.role},
    issuedAtMs:nowMs,expiresAtMs:nowMs+10000,
  };
  if(keys(payload.membership)!=='active,role,userId,worldId')deny('invalid member contract');
  const bytes=Buffer.from(JSON.stringify(payload),'utf8');
  return {format:'orgo-worlds.tandem-signed-witness/1.0',algorithm:'Ed25519',
    key_id:keyId,payload_b64u:bytes.toString('base64url'),signature_b64u:sign(null,bytes,key).toString('base64url')};
}
