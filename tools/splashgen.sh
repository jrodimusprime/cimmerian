#!/bin/sh
# splashgen (README §6): public-domain scans in art/src -> palette-locked splash plates in game/art.
#   1. crop to the plate (the paper margin of the scan goes)
#   2. grade: greyscale, levels so the ink is ink and the paper is bone
#   3. map onto the game palette's ramps (README §7) with error-diffusion dither
#   4. one scarlet accent where the eye should land
# Needs ImageMagick 7 (`magick`). Run from the repo root: sh tools/splashgen.sh
set -e
SRC=art/src OUT=game/art TMP=$(mktemp -d)
# a ramp of 16 shades between two anchors, gamma 1.15, as game/js/textures.js makeRamp() builds them
ramp() { python3 - "$1" "$2" <<'PY'
import sys
a, b = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in sys.argv[1:3]]
print(' '.join('xc:#%02x%02x%02x' % tuple(round(a[k] + (b[k] - a[k]) * (i / 15) ** 1.15) for k in range(3)) for i in range(16)))
PY
}
magick $(ramp '#0b0a09' '#e8dcc0') +append "$TMP/ink.png"
magick $(ramp '#0b0a09' '#e8dcc0') $(ramp '#2a0606' '#c4302b') $(ramp '#5a1a00' '#ffd27a') +append "$TMP/fire.png"

# Piranesi plates: crop, grade to ink-on-bone, dither to the ink ramp, scarlet accent (centre x,y in plate fractions)
plate() { # src out crop accentx accenty
  magick "$SRC/$1" -crop "$3" +repage -colorspace gray -level 6%,88% -resize 1600x1600\> \
    -dither FloydSteinberg -remap "$TMP/ink.png" "$TMP/p.png"
  W=$(magick identify -format %w "$TMP/p.png"); H=$(magick identify -format %h "$TMP/p.png")
  CX=$(python3 -c "print(round($W*$4))"); CY=$(python3 -c "print(round($H*$5))"); R=$(python3 -c "print(round(min($W,$H)*0.16))")
  magick -size ${W}x${H} xc:black -fill white -draw "circle $CX,$CY $((CX+R)),$CY" -blur 0x$((R/2)) "$TMP/m.png"
  magick "$TMP/p.png" \( +clone -fill '#c4302b' -colorize 100 \) -compose multiply -composite "$TMP/t.png"
  # the tinted plate, with the soft circle as its alpha, laid over the plain one
  magick "$TMP/t.png" "$TMP/m.png" -alpha off -compose CopyOpacity -composite "$TMP/ta.png"
  magick "$TMP/p.png" "$TMP/ta.png" -compose over -composite -quality 84 "$OUT/$2"
}
# Martin's Pandemonium: already ink and fire; lock it to the ink, scarlet and fire ramps
magick "$SRC/martin_pandemonium.jpg" -modulate 95,115 -dither FloydSteinberg -remap "$TMP/fire.png" -quality 86 "$OUT/title.jpg"
# Level plates (README §6): each level opens on a public-domain plate, treated as the title card is. crop gives
# the part of the picture that suits the level (WxH+X+Y as fractions of the source), then the plate is fitted
# to the screen's shape and locked to the game's ramps. Piranesi's etchings to ink with a scarlet accent;
# the paintings to the ink, scarlet and fire ramps like Martin's Pandemonium.
level() { # src out cropW cropH cropX cropY kind
  SW=$(magick identify -format %w "$SRC/$1"); SH=$(magick identify -format %h "$SRC/$1")
  G=$(python3 -c "print('%dx%d+%d+%d' % (round($SW*$3), round($SH*$4), round($SW*$5), round($SH*$6)))")
  if [ "$7" = etch ]; then
    magick "$SRC/$1" -crop "$G" +repage -resize 1600x900^ -gravity center -extent 1600x900 -colorspace gray -level 8%,90% \
      -dither FloydSteinberg -remap "$TMP/ink.png" -quality 84 "$OUT/$2"
  else
    magick "$SRC/$1" -crop "$G" +repage -resize 1600x900^ -gravity center -extent 1600x900 -modulate 92,110 \
      -dither FloydSteinberg -remap "$TMP/fire.png" -quality 84 "$OUT/$2"
  fi
}
level altdorfer_issus.jpg e1m1.jpg 1.0 0.42 0 0.40 paint            # the Battle of Issus: the host, the sun going down
level piranesi_drawbridge.jpg e1m2.jpg 0.80 0.40 0.10 0.40 etch      # Carceri VII: the pits under the hill
level piranesi_well.jpg e1m3.jpg 0.86 0.80 0.07 0.08 etch            # Carceri XIII, the Well
level piranesi_smoking_fire.jpg e1m4.jpg 0.80 0.42 0.10 0.40 etch    # Carceri VI: smoke and dark below
level martin_belshazzar.jpg e1m5.jpg 1.0 1.0 0 0 paint              # Martin: a hall of the citadel by night
level bruegel_babel.jpg e1m6.jpg 0.80 0.80 0.12 0.0 paint           # Bruegel: the tower over the city
level martin_joshua.jpg e1m7.jpg 1.0 1.0 0 0 paint                  # Martin: the host on the plain under the storm
level martin_pharaoh.jpg e1m8.jpg 0.96 0.92 0.02 0.04 paint         # Martin: the host drowning in the waters
level cole_desolation.jpg end.jpg 1.0 1.0 0 0 paint                 # Cole: desolation at sunset, the moon rising
rm -rf "$TMP"
ls -la "$OUT"
