#!/usr/bin/env python3
"""Generate the last 14 manifest rows while gen.py handles the first seven.

The supplied generator stays unchanged. Execute its definitions, then use its
own gen() for a disjoint tail in three threads. Existing files are still skipped.
Start this near the beginning of the serial run, and check that the tail has
finished before the serial run reaches row eight.
"""
import ast
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

path = Path(__file__).resolve().with_name('gen.py')
tree = ast.parse(path.read_text(), filename=str(path))
assert isinstance(tree.body[-1], ast.For)
tree.body.pop()
namespace = {'__file__': str(path), '__name__': 'tower_generation_definitions'}
exec(compile(tree, str(path), 'exec'), namespace)
items = [row for row in namespace['MANIFEST'] if row[0] in sys.argv[1:]] if sys.argv[1:] else namespace['MANIFEST'][7:]
print(f'Generating {len(items)} selected rows using the unchanged template function.', flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:
    for _ in pool.map(lambda item: namespace['gen'](*item), items):
        pass
print('Parallel tail finished.', flush=True)
