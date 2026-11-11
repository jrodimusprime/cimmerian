#!/bin/sh
# The build stamp: a hash of the game's code (every js file but version.js itself). Written to js/version.js and onto
# every script URL in index.html (?v=), and the autoplay recordings are fetched with it, so a browser never runs one
# version's code against another's recorded runs. --print just prints it.
cd "$(dirname "$0")/.." || exit 1
v=$(cat $(ls js/*.js js/chars/*.js | grep -v '^js/version.js$' | sort) | shasum | cut -c1-10)
[ "$1" = "--print" ] && { echo "$v"; exit 0; }
printf "'use strict';\n// the build stamp (test/build_stamp.sh): a hash of the code; recordings and scripts are fetched with it\nconst BUILD = '%s';\n" "$v" > js/version.js
sed -i '' -E 's#src="(js/[^"?]+\.js)(\?v=[0-9a-f]+)?"#src="\1?v='"$v"'"#' index.html
echo "$v"
