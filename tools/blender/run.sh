#!/bin/sh
# Build cast models in headless Blender with MPFB (see README in this folder).
#   MPFB_ENV:  a Blender user-resources dir with the MPFB extension installed
#   MH_ASSETS: unzipped CC0 MakeHuman asset packs (system assets, skins02)
cd "$(dirname "$0")" || exit 1
: "${MPFB_ENV:?set MPFB_ENV}"; : "${MH_ASSETS:?set MH_ASSETS}"
BLENDER_USER_RESOURCES="$MPFB_ENV" MH_ASSETS="$MH_ASSETS" HORSE_BLEND="$HORSE_BLEND" GOBLIN_BLEND="$GOBLIN_BLEND" PHOTO_TEX="$PHOTO_TEX" COBRA_BLEND="$COBRA_BLEND" SWP_OBJ="$SWP_OBJ" /Applications/Blender.app/Contents/MacOS/Blender -b --python build.py -- "$@" 2>&1 | grep -E "^BUILT|^FAILED|Error|error:|Traceback|  File|^\w+Error" 
