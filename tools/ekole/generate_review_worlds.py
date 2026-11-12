#!/usr/bin/env python3
"""Génère les packs *synthétiques de revue* depuis Kontexte.

Ne crée pas de World actif. N'accède à aucun réseau, aucun enfant, aucun
jeton Orgo/Konnaxion. Le déploiement est hors de portée de cet outil.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ALLOWED=(
    'grand-menage-chez-mamie', 'mystere-de-la-bibliotheque',
    'pique-nique-des-saisons', 'rallye-des-metiers',
    'randonnee-a-velo', 'spectacle-des-histoires',
)


def _write_utf8_lf(path: Path, content: str) -> None:
    """Write reproducible UTF-8 bytes on Windows and Unix (without CRLF translation)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content.encode('utf-8'))


def generator(kontexte:Path):
    p=kontexte/'src/kontexte/orgo.py'
    # Import as package so Kontexte's own verified checks remain authoritative.
    import sys
    sys.path.insert(0,str(kontexte/'src'))
    from kontexte.orgo import synthetic_review_workflow_fixture
    return synthetic_review_workflow_fixture


def build(kontexte:Path,target:Path,*,write=True):
    function=generator(kontexte)
    results=[]
    for mission_id in ALLOWED:
        source=kontexte/'data/missions'/f'{mission_id}.json'
        if not source.is_file() or source.is_symlink():raise ValueError('Mission source absente')
        raw=source.read_bytes()
        mission=json.loads(raw)
        if mission.get('id')!=mission_id or mission.get('synthetic') is not True:
            raise ValueError('Source non synthétique')
        safety=mission.get('safety',{})
        if safety.get('publication_default')!='private' or safety.get('real_spending') is not False or safety.get('real_taxes') is not False:
            raise ValueError('Garanties structurées insuffisantes')
        scenario=function(mission)
        if not scenario['scenario']['synthetic']:
            raise ValueError('Erreur d’autorité dans la génération')
        # Defense in depth: never store private clue bodies in Orgo review.
        text=json.dumps(scenario,ensure_ascii=False)
        for item in mission.get('fragments',[]):
            content=item.get('content',{})
            if any(isinstance(v,str) and v and v in text for v in content.values()):
                raise ValueError('Un contenu privé serait exporté')
        world_key='ekole-'+mission_id
        pack={'format':'orgo.world.pack.v1',
          'world':{'key':world_key,'title':'Ékole — '+mission['title']['fr-CA']+' (revue seulement)',
                  'description':'Pack de revue synthétique, jamais un World scolaire autorisé.',
                  'synthetic':True,'release':'review-pack-2026-11-11'},
          'target':{'product':'Orgo','injector_schema':'orgo.scenario.v1',
                    'default_api_url':'http://127.0.0.1:4000/api/v3','organization_key':None,
                    'write_boundary':'Orgo/tools/scenario-injector only'},
          'source':{'repo':'Kontexte','mission':f'data/missions/{mission_id}.json',
                    'version':mission['version'],'sha256':hashlib.sha256(raw).hexdigest(),
                    'task_count':len(mission['steps']),'private_fragments_included':False},
          'checkpoint_order':['REVUE'],
          'checkpoints':{'REVUE':{'scenario':'scenarios/REVUE.scenario.json',
                                   'mutates_orgo':True,'status':'synthetic_teacher_review_only'}},
          'invariants':['No child identity or assignment','No live World runtime created',
                        'No private fragment body delivered',
                        'Only the official Orgo Scenario Injector may write Orgo',
                        'Design dependencies are not execution gates']}
        root=target/world_key
        files={'world-pack.json':pack,'scenarios/REVUE.scenario.json':scenario}
        if write:
            for rel,data in files.items():
                p=root/rel;p.parent.mkdir(parents=True,exist_ok=True)
                _write_utf8_lf(p, json.dumps(data,ensure_ascii=False,indent=2)+'\n')
            _write_utf8_lf(root/'README.md', '# '+mission['title']['fr-CA']+' — pack de revue\n\n'
                'Fixture **synthétique seulement**. Le plan propose '+str(len(mission['steps']))+
                ' tâches de revue à un opérateur Orgo. Aucun World, accès élève, attribution ou indice privé n’est créé.\n')
        results.append({'world_key':world_key,'task_count':len(mission['steps']),
                        'source_sha256':pack['source']['sha256']})
    return results


def main(argv=None):
    p=argparse.ArgumentParser(description='Générateur de packs Orgo_Worlds de revue uniquement')
    p.add_argument('--kontexte',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args(argv)
    print(json.dumps(build(a.kontexte,a.out),ensure_ascii=False,indent=2))
if __name__=='__main__':main()
