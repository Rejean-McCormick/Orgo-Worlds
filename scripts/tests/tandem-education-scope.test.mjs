import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewSyntheticWorld,readSmallJson,validateIntent,parseStrictJson} from '../tandem-education/scope-review.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../tandem-education/fixtures');
const intentFile=path.join(root,'fete-sorciere.intent.synthetic.json');
const i=readSmallJson(intentFile), w=readSmallJson(path.join(root,'fete-sorciere.world.synthetic.json')).body;
const clone=v=>JSON.parse(JSON.stringify(v));
test('11-task Akor synthetic intent is coherent without granting any permission',()=>{
 const r=reviewSyntheticWorld(i.body,w,i.bytes);
 assert.equal(i.body.tasks.length,11);assert.equal(r.scope_consistent,true);
 for(const k of ['runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child'])assert.equal(r[k],false);
});
test('cross-tenant/world/release mismatch denied',()=>{
 for(const k of ['tenant_id','world_id','world_release_id']){
   const bad=clone(w);bad[k]='44444444-4444-4444-8444-444444444444';
   assert.throws(()=>reviewSyntheticWorld(i.body,bad,i.bytes),/mismatch/);
 }
});
test('archived world and non-current release denied',()=>{
 for(const [key,value] of [['world_status','archived'],['release_status','ready']]) {
  const bad=clone(w);bad[key]=value; assert.throws(()=>reviewSyntheticWorld(i.body,bad,i.bytes),/inactive/);
 }
});
test('forged authority or personal field cannot pass',()=>{
 for(const key of ['runtime_admitted','permissions_verified','dispatch_allowed']){
  const bad=clone(i.body);bad[key]=true;assert.throws(()=>validateIntent(bad),/authority/);
 }
 const bad=clone(i.body);bad.child_name='Alice';assert.throws(()=>validateIntent(bad),/fields/);
});
test('duplicate tasks and invented fields denied',()=>{
 const bad=clone(i.body);bad.tasks[1].task_ref=bad.tasks[0].task_ref;
 assert.throws(()=>validateIntent(bad),/duplicate/);
 const f=clone(w);f.membership_verified=true;assert.throws(()=>reviewSyntheticWorld(i.body,f,i.bytes),/fields/);
});

test('reject duplicate keys, escaped duplicate keys and excessive nesting',()=>{
  assert.throws(()=>parseStrictJson('{"tenant_id":"one","tenant_id":"two"}'),/Duplicate JSON key/);
  assert.throws(()=>parseStrictJson('{"task":{"a":1,"a":2}}'),/Duplicate JSON key/);
  assert.throws(()=>parseStrictJson('{"a":1,"\\u0061":2}'),/Duplicate JSON key/);
  assert.throws(()=>parseStrictJson('['.repeat(40)+'0'+']'.repeat(40)),/nesting too deep/);
  assert.deepEqual(parseStrictJson('{"nested":[{"ok":true}],"x":2}'),{nested:[{ok:true}],x:2});
});
