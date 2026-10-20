import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {inspectTrustedWorldScope,validateAuthorityRequest} from '../tandem-education/authority-prerequisites.mjs';
import {createHash} from 'node:crypto';
const intent=JSON.parse(fs.readFileSync(new URL('../tandem-education/fixtures/fete-sorciere.intent.synthetic.json',import.meta.url),'utf8'));
const uuid=(v)=>v;
const actor={actorType:'user',actorUserId:'44444444-4444-4444-8444-444444444444',organizationId:intent.tenant_id};
const request={format:'akor.tandem-authority-request/1.0',mode:'synthetic',status:'AWAITING_SERVER_VERIFICATION',authority:'orgo',scenario_ref:intent.scenario_ref,workflow_ref:intent.workflow_ref,tenant_id:intent.tenant_id,world_id:intent.world_id,world_release_id:intent.world_release_id,intent_sha256:createHash('sha256').update(JSON.stringify(intent)).digest('hex'),task_count:intent.tasks.length, runtime_admitted:false,teacher_authorized:false,permissions_verified:false,world_release_verified:false,dispatch_allowed:false,may_publish_to_child:false};
const state={organizationId:request.tenant_id,worldId:request.world_id,releaseId:request.world_release_id,worldStatus:'active',releaseStatus:'current',currentReleaseId:request.world_release_id,membership:{worldId:request.world_id,userId:actor.actorUserId,role:'member',active:true}};
const ok=()=>structuredClone(state);
test('trusted in-process World reader checks scope, never authorizes teacher or Orgo',async()=>{
 let calls=0;let r=await inspectTrustedWorldScope(request,actor,async expected=>{calls++;assert.equal(expected.actorUserId,actor.actorUserId);return ok();});
 assert.equal(calls,1);assert.equal(r.status,'SCOPE_CHECKED_NOT_AUTHORIZED');assert.equal(r.world_membership_checked,true);
 for(let k of ['runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child'])assert.equal(r[k],false);
});
test('no trusted port or no authenticated user is DENIED',async()=>{
 await assert.rejects(inspectTrustedWorldScope(request,actor,null));
 await assert.rejects(inspectTrustedWorldScope(request,{...actor,actorType:'system'},ok));
 await assert.rejects(inspectTrustedWorldScope(request,{...actor,organizationId:'55555555-5555-4555-8555-555555555555'},ok));
});
test('World membership, current release, status and tenant enforced',async()=>{
 for(const patch of [ {organizationId:'00000000-0000-4000-8000-000000000001'}, {worldStatus:'archived'}, {releaseStatus:'frozen'}, {currentReleaseId:'00000000-0000-4000-8000-000000000001'}, {membership:null}, {membership:{...state.membership,active:false}}, {membership:{...state.membership,userId:'00000000-0000-4000-8000-000000000001'}}, {membership:{...state.membership,role:'viewer'}}]){
   await assert.rejects(inspectTrustedWorldScope(request,actor,async()=>({...ok(),...patch}))); }
});
test('untrusted request cannot declare positive rights, hidden child data, wrong World',async()=>{
 for(const patch of [{teacher_authorized:true},{permissions_verified:true},{dispatch_allowed:true},{child_name:'someone'},{world_id:'untrusted'}]){
 assert.throws(()=>validateAuthorityRequest({...request,...patch}));}
});
test('reader failures DENY',async()=>{await assert.rejects(inspectTrustedWorldScope(request,actor,async()=>{throw Error('down')}));});
