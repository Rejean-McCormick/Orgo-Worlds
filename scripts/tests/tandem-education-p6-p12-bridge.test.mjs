import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,createHash} from 'node:crypto';
import {createP6TrustedWorldBridge} from '../tandem-education/p6-p12-trusted-bridge.mjs';
const s={tenant:'11111111-1111-4111-8111-111111111111',world:'22222222-2222-4222-8222-222222222222',release:'33333333-3333-4333-8333-333333333333',actor:'44444444-4444-4444-8444-444444444444'};
const actor={actorType:'user',source:'api',actorUserId:s.actor,organizationId:s.tenant,permissions:['education:admit']};
const req={format:'akor.tandem-authority-request/1.0',mode:'synthetic',status:'AWAITING_SERVER_VERIFICATION',authority:'orgo',scenario_ref:'fete-sorciere',workflow_ref:'fete-sorciere-v1',tenant_id:s.tenant,world_id:s.world,world_release_id:s.release,intent_sha256:'a'.repeat(64),task_count:11,...Object.fromEntries(['runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child'].map(k=>[k,false]))};
const state={organizationId:s.tenant,worldId:s.world,releaseId:s.release,currentReleaseId:s.release,worldStatus:'active',releaseStatus:'current',membership:{userId:s.actor,worldId:s.world,active:true,role:'member'}};
const key=generateKeyPairSync('ed25519'),fp=createHash('sha256').update(randomBytes(32)).digest('hex'),nowMs=1780000000000,challenge=randomBytes(32).toString('base64url');
const peer={authenticated:true,channel:'mutual-tls',peerName:'orgo-education',peerFingerprintSha256:fp,verifiedAtMs:nowMs-1000};
const gateway=()=>createP6TrustedWorldBridge({worldsService:{readTandemEducationScopeInternal:async()=>structuredClone(state)},signingKey:key.privateKey,keyId:'p6-ephemeral',allowedOrgoPeers:new Map([['orgo-education',fp]])});
test('bridge only signs via pinned, fresh, server-established mutual TLS contract',async()=>{
 const env=await gateway()({authorityRequest:req,actor,challenge,peerContext:peer,nowMs});
 assert.equal(env.algorithm,'Ed25519');assert.equal(env.key_id,'p6-ephemeral');
});
test('reject unverified peer, wrong key, stale proof and header-derived extras',async()=>{
 for(const bad of [null,{...peer,authenticated:false},{...peer,channel:'http'}, {...peer,peerFingerprintSha256:'0'.repeat(64)},{...peer,verifiedAtMs:nowMs-30001},{...peer,'x-orgo-user-id':s.actor}]){
  await assert.rejects(gateway()({authorityRequest:req,actor,challenge,peerContext:bad,nowMs}));
 }
});
test('reject untrusted actor, mismatched tenant, forged permission flags and archived World',async()=>{
 await assert.rejects(gateway()({authorityRequest:{...req,teacher_authorized:true},actor,challenge,peerContext:peer,nowMs}));
 await assert.rejects(gateway()({authorityRequest:req,actor:{...actor,organizationId:s.world},challenge,peerContext:peer,nowMs}));
 await assert.rejects(gateway()({authorityRequest:req,actor:{...actor,source:'header'},challenge,peerContext:peer,nowMs}));
 const bad=createP6TrustedWorldBridge({worldsService:{readTandemEducationScopeInternal:async()=>({...state,worldStatus:'archived'})},signingKey:key.privateKey,keyId:'p6-ephemeral',allowedOrgoPeers:new Map([['orgo-education',fp]])});
 await assert.rejects(bad({authorityRequest:req,actor,challenge,peerContext:peer,nowMs}));
});
test('missing signing key / missing trusted adapter denies, no standalone route',async()=>{
 assert.throws(()=>createP6TrustedWorldBridge({}),/denied/i);
 await assert.rejects(createP6TrustedWorldBridge({worldsService:{readTandemEducationScopeInternal:()=>state},signingKey:null,keyId:'p6',allowedOrgoPeers:new Map([['orgo-education',fp]])})({authorityRequest:req,actor,challenge,peerContext:peer,nowMs}));
});
