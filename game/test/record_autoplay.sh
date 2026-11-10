#!/bin/sh
# Records every golden run's inputs into game/autoplay/<level>.json: cheat mode's "Let the AI play this level"
# replays them tick by tick. Re-run after any change to a level or its bot.
cd "$(dirname "$0")" || exit 1
url="file://$(cd .. && pwd)/index.html?agent"
for pair in e1m1:playthrough_e1m1.js e1m2:playthrough.js e1m3:playthrough_e1m3.js e1m4:playthrough_e1m4.js e1m5:playthrough_e1m5.js e1m6:playthrough_e1m6.js e1m7:playthrough_e1m7.js e1m8:playthrough_e1m8.js; do
  l=${pair%%:*}; t=${pair#*:}
  (printf '%s: ' "$l"; CIM_RECORD="../autoplay/$l.json" node cdp.mjs "$url" "$t" "${TMPDIR:-/tmp}/cim-rec-$l" | grep -E "PASS|FAIL") &
done
wait
