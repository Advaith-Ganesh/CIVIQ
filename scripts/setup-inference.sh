#!/usr/bin/env sh
set -eu
PYTHON_BIN="${PYTHON_BIN:-python3}"
"$PYTHON_BIN" -c 'import sys; assert sys.version_info >= (3,10), "Use Python 3.10 or newer (3.12 tested)."'
"$PYTHON_BIN" -m venv .venv
.venv/bin/python -m pip install -r inference/requirements.lock.txt
.venv/bin/python inference/download_models.py
printf '%s\n' 'Cached official weights. Start npm run ai:start, then load models from AI Lab.'
