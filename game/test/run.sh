#!/bin/sh
# Replays the golden e1m2 solution headless and checks the final state hash.
cd "$(dirname "$0")" && node cdp.mjs "file://$(cd .. && pwd)/index.html?agent" playthrough.js "${TMPDIR:-/tmp}/cimmerian-test" | grep -E "PASS|FAIL|EXCEPTION|harness error"
