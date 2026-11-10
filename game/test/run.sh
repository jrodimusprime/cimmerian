#!/bin/sh
# Replays the golden playthroughs of every level headless and checks each final state hash.
cd "$(dirname "$0")" || exit 1
url="file://$(cd .. && pwd)/index.html?agent"
for t in playthrough_e1m1.js playthrough.js playthrough_e1m3.js playthrough_e1m4.js playthrough_e1m5.js playthrough_e1m6.js playthrough_e1m7.js playthrough_e1m8.js; do
  printf '%s: ' "$t"
  node cdp.mjs "$url" "$t" "${TMPDIR:-/tmp}/cimmerian-test" | grep -E "PASS|FAIL|EXCEPTION|harness error|\[level\]"
done
