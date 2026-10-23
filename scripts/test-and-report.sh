#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
echo
echo "HTML-отчёт покрытия: $(pwd)/coverage/index.html"
