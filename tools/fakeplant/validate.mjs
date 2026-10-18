import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const manifest=read('fakeplant/fixture/MANIFEST.json');
const {createHash}=await import('node:crypto');
for(const [name,digest] of Object.entries(manifest.sha256)){
 const raw=fs.readFileSync(path.join(root,'fakeplant/fixture',name));
 if(createHash('sha256').update(raw).digest('hex')!==digest)throw Error('bad checksum: '+name);
}
const identity=read('world-packs/fakeplant/identity/koa-identity.json');
if(identity.schema!=='koa.tandem.identity-fixture/v1'||identity.universe_key!=='fakeplant'||identity.orgo_organization_slug!=='fakeplant'|| identity.fixture_sha256!==manifest.sha256['employes.json'] || identity.login_enabled!==false || identity.employee_count!==900)throw Error('bad tandem identity contract');
const people=read('fakeplant/fixture/employes.json').employees;
if(people.length!==900||new Set(people.map(x=>x.id)).size!==900||people.some(x=>!x.synthetic||x.login_enabled!==false))throw Error('bad people');
const pack=read('world-packs/fakeplant/world-pack.json');
if(pack.format!=='orgo.world.pack.v1'||pack.checkpoint_order.length!==18)throw Error('bad pack');
for(const cp of pack.checkpoint_order){
 const file=path.resolve(root,'world-packs/fakeplant',pack.checkpoints[cp].scenario);
 const obj=JSON.parse(fs.readFileSync(file,'utf8'));
 if(obj.schema_version!=='orgo.scenario.v1'||!obj.scenario.synthetic||obj.operations.length!==2)throw Error('bad scenario: '+cp);
}
console.log('PASS Orgo_Worlds: 18 scénarios v1, 900 identités, hashes fixture, sans écriture.');
console.log('Pour la validation officielle : node tools/world-scenario/cli.mjs validate-all fakeplant --orgo-root ../Orgo');
