import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const pack=JSON.parse(readFileSync(resolve(root,'world-packs/ekole-fete-sorciere/world-pack.json'),'utf8'));
const scenario=JSON.parse(readFileSync(resolve(root,'world-packs/ekole-fete-sorciere/scenarios/REVUE.scenario.json'),'utf8'));

test('World pack de revue, sans admission de séance',()=>{
 assert.equal(pack.world.synthetic,true);
 assert.equal(pack.checkpoints.REVUE.status,'synthetic_teacher_review_only');
 assert.equal(pack.source.task_count,11);
 assert.equal(pack.source.private_fragments_included,false);
 assert.equal(pack.target.write_boundary,'Orgo/tools/scenario-injector only');
 assert.equal(scenario.scenario.epistemic_status,'synthetic_demo_fixture');
});
test('Onze tâches de revue, aucun destinataire enfant et aucun indice secret',()=>{
 const publish=scenario.operations.find(o=>o.op==='publish_workflow');
 const actions=publish.content.rules[0].actions;
 const tasks=actions.filter(a=>a.type==='CREATE_TASK');
 assert.equal(tasks.length,11);
 for(const a of tasks){
  assert.equal(a.input.metadata.synthetic,true);
  assert.equal(a.input.metadata.pending_workflow_review,true);
  assert.equal(a.input.metadata.private_fragments_embedded,false);
  assert.ok(!('owner_user_id' in a.input));
 }
 const json=JSON.stringify(scenario);
 assert.doesNotMatch(json,/Une feuille produit|55 Klownkoins|student_ref|student_name|teacher_authorized/);
});
