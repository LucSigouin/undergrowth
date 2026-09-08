#!/usr/bin/env python3
"""Make the exact small copies with sips, preserving alpha."""
import pathlib
import subprocess
import sys

sys.dont_write_bytecode = True
from gen import DOWNSCALE

HERE = pathlib.Path(__file__).resolve().parent
for name, size in DOWNSCALE.items():
    source = HERE / name
    output = HERE / f'{source.stem}@{size}.png'
    if source.exists() and (not output.exists() or source.stat().st_mtime > output.stat().st_mtime):
        subprocess.run(['sips', '-z', str(size), str(size), str(source), '--out', str(output)], check=True)
