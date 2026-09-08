#!/usr/bin/env python3
"""Run the unchanged project gates from the project root and keep lane logs."""
import json
import os
from pathlib import Path
import subprocess
import sys

LANE = Path(__file__).resolve().parent
ROOT = LANE.parents[1]
LOGS = LANE / 'logs'
LOGS.mkdir(exist_ok=True)
CACHE = str(Path(os.environ.get('TMPDIR', '/tmp')) / 'npmcache')
STATIC = [
    ('test', ['npm', '--cache', CACHE, 'test']),
    ('golden', ['node', 'tests/golden.mjs']),
    ('balance', ['node', 'tests/balance-gate.mjs']),
    ('format', ['npm', '--cache', CACHE, 'run', 'format:check']),
    ('theme', ['node', 'fleet-r7-medieval/check-theme.mjs']),
    ('integrated-r6', ['node', 'fleet-r6-art/check-integrated.mjs']),
    ('integrated-r7', ['node', 'fleet-r7-medieval/check-integrate-r7.mjs']),
]
BROWSER = [(name, ['node', f'tests/{script}.mjs']) for name, script in [
    ('layout', 'layout-gate'), ('browser', 'browser'), ('mobile', 'mobile-layout')
]]
mode = sys.argv[1]
checks = STATIC if mode == 'static' else BROWSER
env = os.environ.copy()
env['GARDEN_URL'] = 'http://localhost:5177'
if mode == 'browser':
    env['NODE_OPTIONS'] = f'--import={LANE / "artifact-paths.mjs"}'
results = []
for name, command in checks:
    print(f'Running {name}', flush=True)
    run = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True)
    output = run.stdout + run.stderr
    (LOGS / f'{name}.log').write_text(output)
    accepted = run.returncode == 0
    if name == 'integrated-r6':
        lines = [line for line in output.splitlines() if line.startswith('  - ')]
        accepted = run.returncode == 1 and len(lines) == 1 and lines[0].startswith('  - src/game.js differs from ad32fda;')
    results.append({'name': name, 'command': command, 'exit': run.returncode, 'accepted': accepted})
    (LOGS / f'{mode}-results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(f'{name}: exit {run.returncode}, accepted {accepted}\n{output[-2500:]}', flush=True)
    (LANE / 'REPORT.md').touch()
raise SystemExit(0 if all(row['accepted'] for row in results) else 1)
