#!/bin/sh
set -eu

cd "$(dirname "$0")"
exec npx vp dev --host 0.0.0.0 --port 5175 --strictPort
