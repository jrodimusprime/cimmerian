#!/bin/sh
# Replays the golden playthroughs of e1m2 and e1m3 headless and checks each final state hash.
cd "$(dirname "$0")" || exit 1
url="file://$(cd .. && pwd)/index.html?agent"
for t in playthrough.js playthrough_e1m3.js; do
  printf '%s: ' "$t"
  node cdp.mjs "$url" "$t" "${TMPDIR:-/tmp}/cimmerian-test" | grep -E "PASS|FAIL|EXCEPTION|harness error|\[level\]"
done
