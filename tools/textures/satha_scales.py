# Satha's hide: a tileable scale map for her body tube (game/textures/satha_skin.png, 128x128 grey).
# u runs round the body (u = 0 and 1 are the belly, 0.5 the spine), v runs toward the tail.
# Overlapping keeled dorsal scales in staggered rows, broad ventral scutes on the belly, a faint
# saddle mottling down the back. The game tints it pearl-white (game.js) and the palette snaps it.
#   python3 satha_scales.py out.pgm  (then: magick out.pgm game/textures/satha_skin.png)
import math, sys
N, SS = 128, 4                        # output size, supersampling
W = N * SS
COLS, ROWS = 14, 12                   # dorsal scales round the body and along one tile
BELLY = 0.12                          # half-width of the belly plates, in u
def hsh(i, j, k=0):
    h = (i * 374761393 + j * 668265263 + k * 2147483647) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0
def vnoise(x, y, p):                  # periodic value noise, period p
    xi, yi = math.floor(x), math.floor(y); fx, fy = x - xi, y - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    g = lambda a, b: hsh(a % p, b % p, 7)
    return (g(xi, yi) * (1 - sx) + g(xi + 1, yi) * sx) * (1 - sy) + (g(xi, yi + 1) * (1 - sx) + g(xi + 1, yi + 1) * sx) * sy
def dorsal(u, v):
    # staggered rows; each scale an almond pointing tailward (+v), its front tucked under the row ahead
    r = v * ROWS; row = math.floor(r); fv = r - row
    c = u * COLS + (0.5 if row % 2 else 0.0); col = math.floor(c); fu = c - col
    best = None
    for dr, dc in ((0, 0), (-1, 0), (-1, 1), (-1, -1), (0, 1), (0, -1)):   # this scale or the one overlapping from the row ahead
        rr = row + dr
        cc = u * COLS + (0.5 if rr % 2 else 0.0)
        ci = math.floor(cc) + (dc if dr else 0)
        x = cc - ci - 0.5                    # -0.5..0.5 across the scale
        y = (r - rr) - 0.05                  # 0 at its root, 1 at its tip
        if y < -0.1 or y > 1.35:
            continue
        t = min(1, max(0, (y + 0.1) / 1.45))                 # a rounded diamond, widest past its middle
        half = 0.56 * (t / 0.58 if t < 0.58 else (1 - t) / 0.42) ** 0.75 + 0.02
        inside = half - abs(x)
        if inside <= 0:
            continue
        if best is None or rr > best[0]:     # the scale from the later row lies on top
            best = (rr, ci, x, y, inside, half)
    if best is None:
        return 0.45
    rr, ci, x, y, inside, half = best
    edge = min(1, inside / 0.11)                         # dark rim where it meets the next
    shade = 0.78 + 0.22 * min(1, max(0, y / 1.1))        # the root lies in the shadow of the scale above it
    keel = 1 - 0.1 * max(0, 1 - abs(x) / 0.05) * min(1, y)   # a faint keel down the middle
    tone = 0.94 + 0.08 * (hsh(rr, ci, 3) - 0.5)          # every scale a little different
    return (0.5 + 0.5 * edge) * shade * keel * tone
def belly(u, v):
    du = min(u, 1 - u)                                    # distance from the belly line
    r = v * ROWS; row = math.floor(r); y = r - row  # broad transverse plates
    lip = 1 - 0.4 * max(0, 1 - (1 - y) / 0.12)            # the rear lip of each plate casts a line
    root = 0.85 + 0.15 * min(1, y / 0.4)
    side = 1 - 0.25 * max(0, (du - BELLY * 0.7) / (BELLY * 0.3))
    return 1.02 * lip * root * side
out = bytearray()
img = [[0.0] * W for _ in range(W)]
for py in range(W):
    v = (py + 0.5) / W
    for px in range(W):
        u = (px + 0.5) / W
        du = min(u, 1 - u)
        d = dorsal(u, v)
        if du < BELLY + 0.03:
            b = belly(u, v); t = min(1, max(0, (du - BELLY + 0.03) / 0.06))
            d = b * (1 - t) + d * t
        sad = vnoise(u * 3, v * 4, 3) * vnoise(u * 6 + 2, v * 8 + 1, 6)   # faint saddles down the back
        back = math.exp(-((u - 0.5) / 0.22) ** 2)
        d *= 1 - 0.22 * sad * back
        img[py][px] = d
for y in range(N):
    for x in range(N):
        s = sum(img[y * SS + j][x * SS + i] for j in range(SS) for i in range(SS)) / (SS * SS)
        out.append(max(0, min(255, int(s * 235))))
open(sys.argv[1], 'wb').write(b'P5\n%d %d\n255\n' % (N, N) + bytes(out))
