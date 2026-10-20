/** Local, read-only synthetic scope review. This MUST NOT be used as an ACL/admission service. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const FLAGS = ['runtime_admitted','teacher_authorized','permissions_verified','world_release_verified','dispatch_allowed','may_publish_to_child'];
function fail(message) { throw new Error('TANDEM_REVIEW_DENIED: '+message); }
function fields(obj, expected) {
 if (!obj || typeof obj!=='object' || Array.isArray(obj) ||
    Object.keys(obj).sort().join(',')!==[...expected].sort().join(',')) fail('unknown or missing fields');
}
function uuid(v) { return typeof v==='string' && UUID.test(v) && v!=='00000000-0000-0000-0000-000000000000'; }
export function validateIntent(v) {
 fields(v,['format','mode','authority','scenario_ref','workflow_ref','tenant_id','world_id','world_release_id',
     'source_sha256','preview_sha256','tasks',...FLAGS]);
 if(v.format!=='akor.tandem-execution-intent/1.0'||v.mode!=='synthetic'||v.authority!=='orgo') fail('not a synthetic Akor intent');
 for(const k of ['tenant_id','world_id','world_release_id']) if(!uuid(v[k])) fail('invalid UUID '+k);
 for(const k of ['source_sha256','preview_sha256']) if(typeof v[k]!=='string'||!SHA.test(v[k])) fail('invalid checksum');
 for(const k of FLAGS) if(v[k]!==false) fail('claim to authority: '+k);
 if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.scenario_ref)||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(v.workflow_ref)) fail('invalid scenario/workflow reference');
 if(!Array.isArray(v.tasks)||v.tasks.length<1||v.tasks.length>50) fail('invalid task count');
 const ids=new Set();
 for(const t of v.tasks) {
   fields(t,['task_ref','role_code']);
   if(typeof t.task_ref!=='string'||typeof t.role_code!=='string'||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(t.task_ref)||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(t.role_code)||ids.has(t.task_ref))fail('invalid or duplicate task');
   ids.add(t.task_ref);
 }
 return v;
}
export function reviewSyntheticWorld(intent, fixture, intentBytes) {
 validateIntent(intent);
 fields(fixture,['format','synthetic','tenant_id','world_id','world_release_id','world_status','release_status','classroom_ref']);
 if(fixture.format!=='orgo-worlds.synthetic-context/1.0'||fixture.synthetic!==true)fail('real World state not supported');
 for(const k of ['tenant_id','world_id','world_release_id']) if(!uuid(fixture[k])||fixture[k]!==intent[k])fail('cross-tenant/World/release mismatch');
 if(fixture.world_status!=='active'||fixture.release_status!=='current')fail('inactive World or release');
 if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(fixture.classroom_ref)) fail('invalid synthetic classroom');
 return { format:'orgo-worlds.tandem-scope-review/1.0', mode:'synthetic', authority:'orgo',
    scenario_ref:intent.scenario_ref, tenant_id:intent.tenant_id,
    world_id:intent.world_id,world_release_id:intent.world_release_id,
    intent_sha256:createHash('sha256').update(intentBytes).digest('hex'),
    scope_consistent:true, runtime_admitted:false, teacher_authorized:false,
    permissions_verified:false,world_release_verified:false,dispatch_allowed:false,
    may_publish_to_child:false};
}
/** Refuse duplicate keys at every nesting level before JSON.parse; bound depth. */
export function parseStrictJson(text) {
 let pos=0;
 const ws=()=>{while(pos<text.length && /\s/.test(text[pos]))pos++;};
 const readString=()=>{
   if(text[pos]!=='"')throw Error('JSON string expected');
   const start=pos++;
   for(;pos<text.length;pos++) {
     if(text[pos]==='\\') {pos++;continue;}
     if(text[pos]==='"') {pos++;return JSON.parse(text.slice(start,pos));}
   }
   throw Error('Incomplete JSON string');
 };
 function scan(depth){
   if(depth>32)throw Error('JSON nesting too deep');
   ws();
   if(text[pos]==='{'){
     pos++;ws();const seen=new Set();
     if(text[pos]==='}') {pos++;return;}
     while(true){
       ws();const key=readString();
       if(seen.has(key))throw Error('Duplicate JSON key: '+key);
       seen.add(key);ws();
       if(text[pos++]!==':')throw Error('JSON colon expected');
       scan(depth+1);ws();
       const sep=text[pos++];if(sep==='}')return;if(sep!==',')throw Error('JSON object delimiter expected');
     }
   }
   if(text[pos]==='['){
     pos++;ws();if(text[pos]===']'){pos++;return;}
     while(true){scan(depth+1);ws();const sep=text[pos++];if(sep===']')return;if(sep!==',')throw Error('JSON array delimiter expected');}
   }
   if(text[pos]==='"'){readString();return;}
   const value=text.slice(pos).match(/^(?:true|false|null|-(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
   if(!value)throw Error('Invalid JSON literal');
   pos+=value[0].length;
 }
 scan(0);ws();if(pos!==text.length)throw Error('Unexpected data after JSON');
 return JSON.parse(text);
}
export function readSmallJson(file) {
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>262144||stat.size===0)fail('untrusted file');
 const bytes=fs.readFileSync(file);
 // Strict decoder: refuse invalid UTF8 rather than silently replacement-decoding.
 const json=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 return {body:parseStrictJson(json),bytes};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 try {
   if(process.argv.length!==4)fail('Usage: node scope-review.mjs INTENT_JSON SYNTHETIC_WORLD_JSON');
   const i=readSmallJson(process.argv[2]), w=readSmallJson(process.argv[3]);
   process.stdout.write(JSON.stringify(reviewSyntheticWorld(i.body,w.body,i.bytes),null,2)+'\n');
 }catch(e){console.error('[REFUS]',e.message);process.exitCode=1;}
}
