"""Contrôle local des packs pédagogiques synthétiques, sans Orgo runtime."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from generate_review_worlds import ALLOWED, build

HERE = Path(__file__).resolve()
ORGO_WORLDS = HERE.parents[2]
def _kontexte_root():
    """Sur Windows, Orgo et Ékole vivent dans deux dossiers distincts."""
    candidates = (
        ORGO_WORLDS.parent / 'Kontexte',                   # workspace côte à côte
        ORGO_WORLDS.parents[1] / 'Ekole' / 'Kontexte',     # C:\mycode\Ekole\Kontexte
    )
    for candidate in candidates:
        if (candidate / 'src/kontexte/orgo.py').is_file():
            return candidate
    raise AssertionError('Dépôt Kontexte introuvable : ' + ', '.join(map(str, candidates)))


KONTEXTE = _kontexte_root()


class ReviewWorldPackTests(unittest.TestCase):
    def test_six_packs_are_traceable_and_not_live(self):
        with tempfile.TemporaryDirectory() as td:
            results = build(KONTEXTE, Path(td))
            self.assertEqual(len(results), len(ALLOWED))
            for mission in ALLOWED:
                target = Path(td) / ('ekole-' + mission)
                pack = json.loads((target / 'world-pack.json').read_text(encoding='utf-8'))
                scenario = json.loads((target / 'scenarios/REVUE.scenario.json').read_text(encoding='utf-8'))
                source = KONTEXTE / 'data/missions' / f'{mission}.json'
                self.assertEqual(pack['source']['sha256'], hashlib.sha256(source.read_bytes()).hexdigest())
                self.assertTrue(pack['world']['synthetic'])
                self.assertEqual(pack['checkpoints']['REVUE']['status'], 'synthetic_teacher_review_only')
                self.assertEqual(sum(action['type'] == 'CREATE_TASK' for action in scenario['operations'][0]['content']['rules'][0]['actions']), pack['source']['task_count'])
                self.assertNotIn('eleve_ref', json.dumps(scenario))

    def test_generated_files_have_lf_endings_on_every_platform(self):
        # Do not relax byte-for-byte comparison: fix the generator instead.
        with tempfile.TemporaryDirectory() as td:
            build(KONTEXTE, Path(td))
            for mission in ALLOWED:
                key = 'ekole-' + mission
                for rel in ('world-pack.json', 'scenarios/REVUE.scenario.json', 'README.md'):
                    generated = (Path(td) / key / rel).read_bytes()
                    self.assertNotIn(b'\r\n', generated, f'{key}/{rel}')
                    self.assertTrue(generated.endswith(b'\n'), f'{key}/{rel}')

    def test_committed_packs_identical_to_generator(self):
        with tempfile.TemporaryDirectory() as td:
            build(KONTEXTE, Path(td))
            for mission in ALLOWED:
                key = 'ekole-' + mission
                for rel in ('world-pack.json', 'scenarios/REVUE.scenario.json', 'README.md'):
                    actual = (ORGO_WORLDS / 'world-packs' / key / rel).read_bytes()
                    expected = (Path(td) / key / rel).read_bytes()
                    self.assertEqual(actual, expected, f'{key}/{rel}')


if __name__ == '__main__':
    unittest.main()
