/** P6-P12: server-only *contract* for a future mutually authenticated transport.
 * The transport adapter MUST create peerContext from TLS verification, not JSON.
 * This module opens no socket and cannot authorize a classroom or Orgo dispatch.
 */
import {issueP5WorldWitness} from './p5-signed-world-witness.mjs';
const FP=/^[0-9a-f]{64}$/;
const ID=/^[a-z][a-z0-9-]{0,63}$/;
function deny(reason){throw Error('WORLDS_P6_BRIDGE_DENIED: '+reason);}
function exact(object,fields){return object&&typeof object==='object'&&!Array.isArray(object)&&Object.keys(object).sort().join(',')===[...fields].sort().join(',');}
/** `peerContext` and `actor` supplied by the future server-only adapter/Orgo identity.
 * This is not a published transport, and plain HTTP must never call it.
 */
export function createP6TrustedWorldBridge({worldsService,signingKey,keyId,allowedOrgoPeers}={}){
 if(!worldsService||typeof worldsService.readTandemEducationScopeInternal!=='function')deny('Worlds store unavailable');
 if(!(allowedOrgoPeers instanceof Map)||!allowedOrgoPeers.size)deny('pinned peer registry required');
 for(const [name,fp] of allowedOrgoPeers){if(typeof name!=='string'||!ID.test(name)||typeof fp!=='string'||!FP.test(fp))deny('invalid peer registry');}
 return async function internalWitness({authorityRequest,actor,challenge,peerContext,nowMs=Date.now()}={}){
   if(!exact(peerContext,['authenticated','channel','peerName','peerFingerprintSha256','verifiedAtMs']))deny('peer must be constructed by trusted transport');
   if(peerContext.authenticated!==true||peerContext.channel!=='mutual-tls'||!ID.test(peerContext.peerName)||!FP.test(peerContext.peerFingerprintSha256))deny('unauthenticated transport');
   if(allowedOrgoPeers.get(peerContext.peerName)!==peerContext.peerFingerprintSha256)deny('untrusted peer certificate');
   if(!Number.isSafeInteger(nowMs)||!Number.isSafeInteger(peerContext.verifiedAtMs)||peerContext.verifiedAtMs>nowMs||nowMs-peerContext.verifiedAtMs>30000)deny('stale peer context');
   if(!exact(actor,['actorType','source','actorUserId','organizationId','permissions'])||actor.actorType!=='user'||actor.source!=='api'||!Array.isArray(actor.permissions))deny('server-session actor required');
   if(!exact(authorityRequest,['format','mode','status','authority','scenario_ref','workflow_ref','tenant_id','world_id','world_release_id','intent_sha256','task_count','runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child']))deny('unexpected authority request fields');
   if(actor.organizationId!==authorityRequest.tenant_id)deny('actor tenant mismatch');
   return issueP5WorldWitness({request:authorityRequest,actor,worldsService,signingKey,keyId,challenge,nowMs});
 };
}
