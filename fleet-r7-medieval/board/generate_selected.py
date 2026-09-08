#!/usr/bin/env python3
"""Run selected rows through the unchanged generation function in gen.py."""
import argparse
import ast
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("names", nargs="+")
args = parser.parse_args()
path = HERE / "gen.py"
tree = ast.parse(path.read_text(), str(path))
assert isinstance(tree.body[-1], ast.For)
tree.body.pop()
namespace = {"__file__": str(path), "__name__": "board_generation_template"}
exec(compile(tree, str(path), "exec"), namespace)
rows = {row[0]: row for row in namespace["MANIFEST"]}
for name in args.names:
    if name not in rows:
        raise SystemExit("Unknown asset: " + name)
    namespace["gen"](*rows[name])
