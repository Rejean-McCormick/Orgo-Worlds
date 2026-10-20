/** P3 server-side WORLD lookup contract (not an HTTP route or admission receipt).
 * Never use contextFromHeaders() or caller-provided roles as trusted authority.
 * The injected reader MUST be internal to the authenticated server and use its own store.
 * Always returns NON-ADMITTING readiness, even if internal World data matches.
 */
import {createHash} from 'node:crypto';
const HEX=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DENY=['runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child'];
const REQ=['format','mode','status','authority','scenario_ref','workflow_ref','tenant_id','world_id','world_release_id','intent_sha256','task_count',...DENY];
function fail(code){throw Error('TANDEM_P3_WORLD_DENIED: '+code);}
function strict(obj,fields){ if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).sort().join(',')!==[...fields].sort().join(','))fail('request fields'); }
function validUuid(x){return typeof x==='string'&&UUID.test(x)&&x!=='00000000-0000-0000-0000-000000000000';}
/** Only consume Akor's untrusted request as DATA, never as an authorization claim. */
export function validateAuthorityRequest(request){
 strict(request,REQ);
 if(request.format!=='akor.tandem-authority-request/1.0'||request.mode!=='synthetic'||request.authority!=='orgo'||request.status!=='AWAITING_SERVER_VERIFICATION')fail('untrusted request status');
 for(const key of DENY)if(request[key]!==false)fail('forged authority');
 for(const key of ['tenant_id','world_id','world_release_id'])if(!validUuid(request[key]))fail('invalid scope '+key);
 for(const key of ['scenario_ref','workflow_ref'])if(typeof request[key]!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(request[key]))fail('bad ref');
 if(typeof request.intent_sha256!=='string'||!HEX.test(request.intent_sha256)||!Number.isInteger(request.task_count)||request.task_count<1||request.task_count>50)fail('bad hash/count');
 return request;
}
/** Supply authenticated Orgo identity from session verification, NOT request headers.
 * reader is a server-owned async function which reads current World, release and membership.
 * This is a dry-run verification of scope ONLY, never teacher approval or permission.
 */
export async function inspectTrustedWorldScope(request, actor, reader){
 validateAuthorityRequest(request);
 if(!actor || typeof actor!=='object'||actor.actorType!=='user'||!validUuid(actor.actorUserId)||actor.organizationId!==request.tenant_id)fail('authenticated actor required');
 if(typeof reader!=='function')fail('trusted World reader absent');
 let state;
 try {state=await reader({organizationId:actor.organizationId,actorUserId:actor.actorUserId,worldId:request.world_id,releaseId:request.world_release_id});}
 catch{fail('World lookup unavailable');}
 if(!state||typeof state!=='object'||state.organizationId!==request.tenant_id||state.worldId!==request.world_id||state.releaseId!==request.world_release_id||state.worldStatus!=='active'||state.releaseStatus!=='current'||state.currentReleaseId!==request.world_release_id)fail('World or current release mismatch');
 if(!state.membership || state.membership.userId!==actor.actorUserId||state.membership.worldId!==request.world_id||state.membership.active!==true||!['owner','maintainer','member'].includes(state.membership.role))fail('no active World membership');
 return {
   format:'orgo-worlds.tandem-p3-scope-prerequisites/1.0',mode:'synthetic',status:'SCOPE_CHECKED_NOT_AUTHORIZED',
   authority:'orgo',tenant_id:request.tenant_id,world_id:request.world_id,world_release_id:request.world_release_id,
   actor_user_id:actor.actorUserId,intent_sha256:request.intent_sha256,scope_check_digest:createHash('sha256').update([request.tenant_id,request.world_id,request.world_release_id,actor.actorUserId,request.intent_sha256].join(':')).digest('hex'),
   world_membership_checked:true, teacher_authorized:false,permissions_verified:false,world_release_verified:false,
   runtime_admitted:false,dispatch_allowed:false,may_publish_to_child:false,
 };
}
