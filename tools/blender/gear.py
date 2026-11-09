# Outfit items: each makes one or more objects fitted to the body and rigged.
import bpy, bmesh, math
from mathutils import Vector, Matrix
import outfit as O

COL = {
    'iron': (0.32, 0.32, 0.35), 'steel': (0.36, 0.37, 0.41), 'dark_steel': (0.26, 0.26, 0.3), 'gilt': (0.78, 0.6, 0.28),
    'leather': (0.36, 0.24, 0.15), 'dark_leather': (0.3, 0.2, 0.13), 'linen': (0.68, 0.62, 0.5), 'black': (0.15, 0.14, 0.15),
    'scarlet': (0.55, 0.08, 0.06), 'blood': (0.3, 0.03, 0.02), 'hair': (0.07, 0.06, 0.05), 'beard': (0.2, 0.15, 0.11), 'grey_beard': (0.42, 0.4, 0.38), 'pelt': (0.22, 0.2, 0.19), 'bone': (0.78, 0.72, 0.6),
    'night': (0.12, 0.15, 0.26), 'bronze': (0.62, 0.42, 0.18), 'green': (0.16, 0.24, 0.12), 'grey_white': (0.66, 0.64, 0.6),
    'velvet': (0.3, 0.05, 0.08), 'silk': (0.5, 0.06, 0.05), 'tawny': (0.55, 0.38, 0.17), 'blackmail': (0.38, 0.38, 0.42), 'ochre': (0.55, 0.44, 0.24), 'dark_gilt': (0.55, 0.42, 0.2), 'white': (0.8, 0.76, 0.68), 'blueblack': (0.03, 0.035, 0.06),
}


def make(item, h, rig, helpers, spec):
    if isinstance(item, str):
        item = {'kind': item}
    fn = globals()['g_' + item['kind']]
    out = fn(h, rig, helpers, spec, **{('kind' if k == 'kind_' else k): v for k, v in item.items() if k != 'kind'})
    return out if isinstance(out, list) else [out]


def _finish(obj, rig, mat, body=None, rigid=None, tex=512):
    if mat is not None:
        O.assign(obj, mat)
    if rigid:
        O.parent_rigid(obj, rig, rigid)
    else:
        if body is not None and not len(obj.vertex_groups):
            O.transfer_weights(obj, body)
        O.skin_to(obj, rig)
    obj['tex_size'] = tex
    return obj


# ---- cloth and armour cut from the body ----------------------------------------------
def g_eyes(h, rig, helpers, spec, glow=0.0):
    out = []
    if not glow and spec.get('eye', 'brown'):        # a real eye asset is fitted instead (casting.human)
        return out
    for k in ('eye_l', 'eye_r'):
        e = helpers.get(k)
        if not e:
            continue
        out.append(_finish(e, rig, O.recipe('eye', base=(0.08, 0.06, 0.05) if not glow else (0.9, 0.3, 0.05), grime=0, glow=glow), rigid='head', tex=64))
    return out


def g_mane(h, rig, helpers, spec, length=0.22, col='hair'):
    """Square-cut black mane: a shell of the scalp, thickened and drawn down over brow and neck."""
    head = O.bone_head(rig, 'head')
    hz = head.z
    obj = O.region_shell(h, 'mane', ['head'], offset=0.012, min_weight=0.5,
                         keep=lambda co: co.z > hz + 0.06 and not (co.y < head.y - 0.06 and co.z < hz + 0.17))
    bm = bmesh.new(); bm.from_mesh(obj.data)
    top = max(v.co.z for v in bm.verts)
    for v in bm.verts:
        # hair hangs: verts at the back and sides are dragged down toward the shoulders
        back = max(0.0, (v.co.y - head.y) / 0.1)
        side = abs(v.co.x - head.x) / 0.09
        drop = length * min(1.0, back * 0.8 + side * 0.4) * (1 - (v.co.z - hz - 0.06) / max(top - hz - 0.06, 0.01)) ** 0.5
        v.co.z -= drop
        v.co += v.normal * (0.02 + 0.015 * back)
    bm.to_mesh(obj.data); bm.free()
    sol = obj.modifiers.new('t', 'SOLIDIFY'); sol.thickness = 0.02; sol.offset = 1
    O.apply_mod(obj, sol)
    return _finish(obj, rig, O.recipe('hair', base=COL[col], tile_kind='fur', scale=6, grime=0.1), body=h)


def _plane_strip(name, pts_top, pts_bot, rows=6, pleats=0.0, sub=3):
    """A hanging cloth panel: a grid between a top edge and a bottom edge (lists of points),
    subdivided across, with pleats that deepen toward the hem."""
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    # densify across: `sub` columns between each pair of given points
    def dense(pts):
        out = []
        for i in range(len(pts) - 1):
            for k in range(sub):
                out.append(pts[i].lerp(pts[i + 1], k / sub))
        out.append(pts[-1])
        return out
    pts_top, pts_bot = dense(pts_top), dense(pts_bot)
    cols = len(pts_top)
    grid = []
    for r in range(rows + 1):
        t = r / rows
        row = []
        for c in range(cols):
            p = pts_top[c].lerp(pts_bot[c], t)
            if pleats:
                across = (pts_top[-1] - pts_top[0]).normalized(); down = (pts_bot[c] - pts_top[c]).normalized()
                n = across.cross(down).normalized()
                p = p + n * pleats * (0.3 + t) * math.sin(c / max(1, cols - 1) * math.pi * (cols - 1) / sub * 1.3)
            row.append(bm.verts.new(p))
        grid.append(row)
    for r in range(rows):
        for c in range(cols - 1):
            bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]))
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            ri = next(i for i, row in enumerate(grid) if l.vert in row); ci = grid[ri].index(l.vert)
            l[uv].uv = (ci / (cols - 1), 1 - ri / rows)
    bm.to_mesh(me); bm.free()
    return obj


def _weights_blend(obj, rig, top_bone, low_bones, z_top, z_bot):
    """Top of a hanging panel rides `top_bone`; lower down it follows `low_bones` (averaged)."""
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    gt = obj.vertex_groups.new(name=top_bone)
    gl = [obj.vertex_groups.new(name=b) for b in low_bones]
    for v in obj.data.vertices:
        t = min(1, max(0, (z_top - v.co.z) / max(z_top - z_bot, 1e-3))) * 0.7
        gt.add([v.index], 1 - t, 'REPLACE')
        for g in gl:
            g.add([v.index], t / len(gl), 'REPLACE')
    O.skin_to(obj, rig)


def g_flaps(h, rig, helpers, spec, col='linen', length=0.34, width=0.13, back=True, tile='cloth', name='flap'):
    """Cloth hanging from the belt, front and back, to the thighs."""
    pel = O.bone_head(rig, 'pelvis')
    out = []
    # the body's extent at belt height, front and back
    zb = pel.z + 0.02
    ys = [v.co.y for v in h.data.vertices if abs(v.co.z - zb) < 0.02 and abs(v.co.x) < 0.1]
    yf, yb = min(ys) - 0.025, max(ys) + 0.025
    for sgn, y0 in ((-1, yf), (1, yb)) if back else ((-1, yf),):
        top = [Vector((x, y0, zb)) for x in (-width, -width / 2, 0, width / 2, width)]
        bot = [Vector((x * 1.08, y0 + sgn * 0.05, zb - length)) for x in (-width, -width / 2, 0, width / 2, width)]
        o = _plane_strip(name + ('_f' if sgn < 0 else '_b'), top, bot, pleats=0.008, sub=2)
        sol = o.modifiers.new('t', 'SOLIDIFY'); sol.thickness = 0.008; O.apply_mod(o, sol)
        O.assign(o, O.recipe(name, base=COL[col], tile_kind=tile, scale=3, grime=0.6))
        _weights_blend(o, rig, 'pelvis', ['thigh_l', 'thigh_r'], zb, zb - length)
        o['tex_size'] = 256
        out.append(o)
    return out


def g_loincloth(h, rig, helpers, spec, col='linen'):
    pel_z = O.bone_head(rig, 'pelvis').z
    obj = O.region_shell(h, 'loincloth', ['pelvis', 'thigh_l', 'thigh_r'], offset=0.01,
                         keep=lambda co: pel_z - 0.13 < co.z < pel_z + 0.08, min_weight=0.25)
    out = [_finish(obj, rig, O.recipe('loin', base=COL[col], tile_kind='cloth', scale=14, grime=0.6))]
    out += g_flaps(h, rig, helpers, spec, col=col, length=0.3, width=0.11)
    return out


def g_belt(h, rig, helpers, spec, col='dark_leather', height=0.06, at=0.05):
    pel_z = O.bone_head(rig, 'pelvis').z + at
    obj = O.region_shell(h, 'belt', ['pelvis', 'spine_01'], offset=0.022, min_weight=0.2,
                         keep=lambda co: pel_z - height / 2 < co.z < pel_z + height / 2)
    sol = obj.modifiers.new('t', 'SOLIDIFY'); sol.thickness = 0.01; O.apply_mod(obj, sol)
    # a bronze buckle at the front
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.to_mesh(obj.data); bm.free()
    return _finish(obj, rig, O.recipe('belt', base=COL[col], tile_kind='leather', scale=6, grime=0.3, edge_wear=0.4))


# ---- measurements ----------------------------------------------------------------------
def head_box(h, rig):
    gi = h.vertex_groups['head'].index
    pts = [v.co for v in h.data.vertices if any(g.group == gi and g.weight > 0.6 for g in v.groups)]
    xs, ys, zs = [p.x for p in pts], [p.y for p in pts], [p.z for p in pts]
    return dict(cx=(min(xs) + max(xs)) / 2, cy=(min(ys) + max(ys)) / 2, top=max(zs), chin=min(zs), front=min(ys), back=max(ys),
                hw=(max(xs) - min(xs)) / 2, hd=(max(ys) - min(ys)) / 2)


def eye_centres(helpers):
    out = []
    for k in ('eye_l', 'eye_r'):
        e = helpers.get(k)
        if e and len(e.data.vertices):
            n = len(e.data.vertices)
            out.append(sum((v.co for v in e.data.vertices), Vector()) / n)
    return out


def _cut_near(obj, centres, rad, squash=1.0):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    def near(p, c):                                      # in the face's plane: depth doesn't matter, the hole goes through
        dx, dz = p.x - c.x, (p.z - c.z) / squash
        return dx * dx + dz * dz < rad * rad and p.y < c.y + 0.03
    kill = [f for f in bm.faces if any(near(f.calc_center_median(), c) for c in centres)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(obj.data); bm.free()


def _sphere(name, centre, r, dims=(1, 1, 1), seg=24, ring=16):
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=ring, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * dims[0], v.co.y * dims[1], v.co.z * dims[2])) + centre
    bm.to_mesh(me); bm.free()
    return obj


def _keep(obj, pred):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    kill = [v for v in bm.verts if not pred(v.co)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(obj.data); bm.free()


def _solid(obj, t, off=1.0):
    s = obj.modifiers.new('t', 'SOLIDIFY'); s.thickness = t; s.offset = off; s.use_even_offset = False; s.use_quality_normals = True
    O.apply_mod(obj, s)


def _join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def _tube(name, path, radii, seg=10):
    """A tube along a polyline (horns, crests, plumes)."""
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    bm = bmesh.new(); rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        a = d.orthogonal().normalized(); b = d.cross(a)
        rings.append([bm.verts.new(p + (a * math.cos(t) + b * math.sin(t)) * radii[i]) for t in [k / seg * 2 * math.pi for k in range(seg)]])
    for i in range(len(rings) - 1):
        for k in range(seg):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % seg], rings[i + 1][(k + 1) % seg], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bm.to_mesh(me); bm.free()
    return obj


# ---- helms and masks ----------------------------------------------------------------------
def face_mask(h, rig, helpers, *, top_frac=0.62, chin_drop=0.0, eye_r=0.022, mouth=True, name='mask'):
    """A steel mask cast from the face itself, eyes cut out: the knight's face is metal."""
    hb = head_box(h, rig)
    ztop = hb['chin'] + (hb['top'] - hb['chin']) * top_frac
    obj = O.region_shell(h, name, ['head'], offset=0.024, min_weight=0.3, smooth=7,
                         keep=lambda co: co.y < hb['cy'] - hb['hd'] * 0.15 and co.z < ztop and co.z > hb['chin'] - chin_drop)
    eyes = eye_centres(helpers)
    if eyes:
        _cut_near(obj, eyes, eye_r * 1.25, squash=0.55)
        if mouth:
            m = (eyes[0] + eyes[1]) / 2 + Vector((0, -0.01, -0.075))
            _cut_near(obj, [m + Vector((dx, 0, 0)) for dx in (-0.012, 0, 0.012)], 0.008)
    _solid(obj, 0.004)
    return obj


def dome(h, rig, *, brow=0.55, grow=0.018, name='dome', point=0.0, closed=False):
    """The bowl of a helm: the skull above the brow, pushed out, optionally drawn up to a point.
    `closed`: it comes down the back and sides to the jaw as well, for a mask to close the front."""
    hb = head_box(h, rig)
    zb = hb['chin'] + (hb['top'] - hb['chin']) * brow
    def keep(co):
        if co.z > zb:
            return True
        return closed and co.z > hb['chin'] - 0.01 and co.y > hb['cy'] - hb['hd'] * 0.25
    cz = (hb['top'] + hb['chin']) / 2 + 0.02
    obj = _sphere(name, Vector((hb['cx'], hb['cy'] + 0.005, cz)), 1.0, dims=(hb['hw'] + grow + 0.012, hb['hd'] + grow + 0.008, (hb['top'] - cz) + grow), seg=32, ring=20)
    _keep(obj, keep)
    if point:
        bm = bmesh.new(); bm.from_mesh(obj.data)
        for v in bm.verts:
            t = max(0, (v.co.z - zb) / (hb['top'] - zb))
            v.co.z += point * t ** 2.2
            v.co.x = hb['cx'] + (v.co.x - hb['cx']) * (1 - 0.35 * t ** 2 * point / 0.1)
            v.co.y = hb['cy'] + (v.co.y - hb['cy']) * (1 - 0.35 * t ** 2 * point / 0.1)
        bm.to_mesh(obj.data); bm.free()
    _solid(obj, 0.006)
    return obj, zb, hb


def ring_band(name, hb, z, height, r_grow=0.03, seg=28):
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    rings = []
    for zz in (z - height / 2, z + height / 2):
        rings.append([bm.verts.new((hb['cx'] + math.cos(t) * (hb['hw'] + r_grow), hb['cy'] + math.sin(t) * (hb['hd'] + r_grow), zz))
                      for t in [k / seg * 2 * math.pi for k in range(seg)]])
    for k in range(seg):
        bm.faces.new((rings[0][k], rings[0][(k + 1) % seg], rings[1][(k + 1) % seg], rings[1][k]))
    bm.to_mesh(me); bm.free()
    _solid(obj, 0.006)
    return obj


def brim(name, hb, z, width, droop=0.02, seg=32):
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    inner = [bm.verts.new((hb['cx'] + math.cos(t) * (hb['hw'] + 0.02), hb['cy'] + math.sin(t) * (hb['hd'] + 0.02), z)) for t in [k / seg * 2 * math.pi for k in range(seg)]]
    outer = [bm.verts.new((hb['cx'] + math.cos(t) * (hb['hw'] + 0.02 + width), hb['cy'] + math.sin(t) * (hb['hd'] + 0.02 + width), z - droop)) for t in [k / seg * 2 * math.pi for k in range(seg)]]
    for k in range(seg):
        bm.faces.new((inner[k], inner[(k + 1) % seg], outer[(k + 1) % seg], outer[k]))
    bm.to_mesh(me); bm.free()
    _solid(obj, 0.006)
    return obj


def aventail(h, rig, hb, zb, col='iron'):
    """Mail hanging from the helm to the shoulders, round the neck and the jaw."""
    nz = O.bone_head(rig, 'neck_01').z
    obj = O.region_shell(h, 'aventail', ['neck_01', 'head', 'spine_03', 'clavicle_l', 'clavicle_r'], offset=0.022, min_weight=0.25,
                         keep=lambda co: nz - 0.07 < co.z < zb + 0.02 and not (co.y < hb['cy'] - hb['hd'] * 0.2 and co.z > hb['chin']))
    _solid(obj, 0.006)
    return _finish(obj, rig, O.recipe('aventail', base=COL[col], tile_kind='mail', scale=26, grime=0.4), body=h)


def g_helm(h, rig, helpers, spec, style='mask', metal='steel', mask=True, horns=False, crown=False, plume=None, crest=False, kettle=False,
           point=0.0, aventail_col='iron'):
    out = []
    d, zb, hb = dome(h, rig, point=point, brow=0.6 if mask else 0.66, closed=mask, grow=0.032 if mask else 0.024)
    parts = [d]
    parts.append(ring_band('band', hb, zb + 0.012, 0.03, r_grow=0.024))
    eyes = eye_centres(helpers)
    if mask:
        parts.append(face_mask(h, rig, helpers, top_frac=0.68))
        for e in eyes:                                        # a raised brow over each eye-hole (the Vendel helms' eyebrows)
            c = e + Vector((0, -0.045, 0.03)); sx = 1 if e.x > hb['cx'] else -1
            parts.append(_tube('browridge', [c + Vector((-sx * 0.035, 0.01, -0.006)), c + Vector((0, -0.004, 0.006)), c + Vector((sx * 0.04, 0.012, -0.01))], [0.007, 0.009, 0.006], seg=5))
    else:                                                     # an open helm: a nasal and cheek-plates
        nas = _tube('nasal', [Vector((hb['cx'], hb['front'] - 0.022, zb + 0.02)), Vector((hb['cx'], hb['front'] - 0.026, zb - 0.06))], [0.009, 0.007], seg=4)
        parts.append(nas)
        ez = sum(e.z for e in eyes) / len(eyes) if eyes else zb - 0.03
        cheeks = O.region_shell(h, 'cheeks', ['head'], offset=0.026, min_weight=0.3,
                                keep=lambda co: abs(co.x - hb['cx']) > hb['hw'] * 0.55 and hb['chin'] + 0.02 < co.z < ez - 0.01 and co.y < hb['cy'] + hb['hd'] * 0.3)
        _solid(cheeks, 0.004)
        parts.append(cheeks)
    for k in range(14):                                       # rivets round the band
        t = k / 14 * 2 * math.pi
        parts.append(_sphere('rivet', Vector((hb['cx'] + math.cos(t) * (hb['hw'] + 0.03), hb['cy'] + math.sin(t) * (hb['hd'] + 0.03), zb + 0.012)), 0.006, seg=6, ring=4))
    if kettle:
        parts.append(brim('brim', hb, zb + 0.005, 0.07, droop=0.035))
    if crest:
        path = [Vector((hb['cx'], hb['front'] + 0.02 - 0.01 * k, 0)) for k in range(1)]
        cr = _tube('crest', [Vector((hb['cx'], hb['front'] + 0.01, hb['top'] - 0.02)), Vector((hb['cx'], hb['cy'], hb['top'] + 0.035 + point)),
                             Vector((hb['cx'], hb['back'] + 0.0, hb['top'] - 0.03))], [0.012, 0.018, 0.012], seg=6)
        parts.append(cr)
    if crown:
        parts.append(ring_band('circlet', hb, zb + 0.04, 0.035, r_grow=0.032))
        for k in range(10):
            t = k / 10 * 2 * math.pi
            base = Vector((hb['cx'] + math.cos(t) * (hb['hw'] + 0.034), hb['cy'] + math.sin(t) * (hb['hd'] + 0.034), zb + 0.055))
            parts.append(_tube('spike', [base, base + Vector((math.cos(t) * 0.01, math.sin(t) * 0.01, 0.06))], [0.012, 0.001], seg=4))
    if horns:
        for sx in (-1, 1):
            b = Vector((hb['cx'] + sx * (hb['hw'] + 0.01), hb['cy'], zb + 0.06))
            path = [b, b + Vector((sx * 0.07, -0.01, 0.03)), b + Vector((sx * 0.13, -0.03, 0.1)), b + Vector((sx * 0.14, -0.02, 0.2)), b + Vector((sx * 0.1, 0.01, 0.27))]
            parts.append(_tube('horn', path, [0.034, 0.03, 0.022, 0.013, 0.002], seg=8))
    helm = _join(parts, 'helm')
    O.smart_uv(helm)
    mat = O.recipe('helm', base=COL[metal], tile_kind='steel', scale=4, grime=0.35, edge_wear=0.8)
    out.append(_finish(helm, rig, mat, rigid='head', tex=512))
    if crown:
        pass
    if plume:
        p0 = Vector((hb['cx'], hb['cy'] + 0.02, hb['top'] + point + 0.01))
        pl = _tube('plume', [p0, p0 + Vector((0, 0.06, 0.08)), p0 + Vector((0, 0.18, 0.06)), p0 + Vector((0, 0.27, -0.05))], [0.02, 0.035, 0.03, 0.006], seg=6)
        O.smart_uv(pl)
        out.append(_finish(pl, rig, O.recipe('plume', base=COL[plume], tile_kind='fur', scale=3, grime=0.2), rigid='head', tex=128))
    if aventail_col:
        out.append(aventail(h, rig, hb, zb, aventail_col))
    return out


def g_hood(h, rig, helpers, spec, col='leather', mask=False, mask_col='black', deep=True):
    """A hood whose face is a shadow; with `mask`, a cloth drawn across the lower face."""
    hb = head_box(h, rig)
    nz = O.bone_head(rig, 'neck_01').z
    obj = O.region_shell(h, 'hood', ['head', 'neck_01', 'spine_03', 'clavicle_l', 'clavicle_r'], offset=0.035, min_weight=0.25, smooth=8,
                         keep=lambda co: co.z > nz - 0.12 and not (co.y < hb['cy'] - hb['hd'] * 0.35 and hb['chin'] - 0.02 < co.z < hb['top'] - 0.03))
    bm = bmesh.new(); bm.from_mesh(obj.data)
    for v in bm.verts:                                   # the cowl rises to a peak and juts over the brow
        if v.co.z > hb['top'] - 0.05:
            v.co.z += 0.03
        if deep and v.co.y < hb['cy'] and v.co.z > hb['chin'] + 0.1:
            v.co.y -= 0.03
    bm.to_mesh(obj.data); bm.free()
    _solid(obj, 0.008)
    out = [_finish(obj, rig, O.recipe('hood', base=COL[col], tile_kind='cloth', scale=10, grime=0.55), body=h)]
    # the shadow inside the cowl: a dark card in front of the face
    if mask:
        m = face_mask(h, rig, helpers, top_frac=0.5, eye_r=0.0, mouth=False, name='clothmask')
        out.append(_finish(m, rig, O.recipe('clothmask', base=COL[mask_col], tile_kind='cloth', scale=10, grime=0.3), rigid='head', tex=256))
    return out


def g_cap(h, rig, helpers, spec, col='velvet', brim_w=0.06, feather='bone'):
    """Rinaldo's slouch cap, pulled down above his eyes."""
    d, zb, hb = dome(h, rig, brow=0.62, grow=0.03)
    b = brim('brim', hb, zb + 0.01, brim_w, droop=0.05)
    bm = bmesh.new(); bm.from_mesh(b.data)
    for v in bm.verts:                                  # pulled down at the front
        if v.co.y < hb['cy']:
            v.co.z -= 0.04 * (hb['cy'] - v.co.y) / hb['hd']
    bm.to_mesh(b.data); bm.free()
    cap = _join([d, b], 'cap'); O.smart_uv(cap)
    out = [_finish(cap, rig, O.recipe('cap', base=COL[col], tile_kind='cloth', scale=8, grime=0.5), rigid='head', tex=256)]
    if feather:
        p0 = Vector((hb['cx'] + hb['hw'] * 0.7, hb['cy'] + 0.02, zb + 0.06))
        f = _tube('feather', [p0, p0 + Vector((0.03, 0.08, 0.1)), p0 + Vector((0.05, 0.2, 0.12))], [0.01, 0.018, 0.002], seg=4)
        O.smart_uv(f)
        out.append(_finish(f, rig, O.recipe('feather', base=COL[feather], tile_kind='fur', scale=3, grime=0.3), rigid='head', tex=64))
    return out


# ---- body armour and clothes ---------------------------------------------------------------
TORSO = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r', 'neck_01']


def g_shirt(h, rig, helpers, spec, kind='mail', col='iron', sleeves='elbow', skirt=0.25, offset=0.02, name='shirt', scale=24, collar=0.04):
    """A hauberk (kind='mail'), jerkin ('leather') or tunic ('cloth'): torso, sleeves, and a skirt to the thigh."""
    groups = list(TORSO) + (['upperarm_l', 'upperarm_r'] if sleeves else []) + (['lowerarm_l', 'lowerarm_r'] if sleeves == 'wrist' else []) + ['thigh_l', 'thigh_r']
    pel = O.bone_head(rig, 'pelvis'); nz = O.bone_head(rig, 'neck_01').z
    el = O.bone_head(rig, 'lowerarm_l').z
    knee = O.bone_head(rig, 'calf_l').z
    zlow = pel.z - (pel.z - knee) * skirt / 0.45 if skirt else pel.z - 0.05
    def keep(co):
        if co.z > nz + collar:
            return False
        if co.z < zlow:
            return False
        if sleeves == 'elbow' and abs(co.x) > 0.24 and co.z < el - 0.02:
            return False
        return True
    obj = O.region_shell(h, name, groups, offset=offset, min_weight=0.2, keep=keep, smooth=6 if kind != 'cloth' else 10)
    _solid(obj, 0.006)
    tk = {'mail': 'mail', 'leather': 'leather', 'cloth': 'cloth'}[kind]
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind=tk, scale=scale, grime=0.45, edge_wear=0.3 if kind == 'mail' else 0), body=h, tex=1024)


def g_tabard(h, rig, helpers, spec, col='scarlet', col2=None, pattern=None, length=0.42, width=0.17, name='tabard'):
    """Livery over the mail: a panel front and back from the shoulders, hanging past the belt."""
    nz = O.bone_head(rig, 'neck_01').z; pel = O.bone_head(rig, 'pelvis')
    obj = O.region_shell(h, name, list(TORSO), offset=0.045, min_weight=0.2, smooth=14,
                         keep=lambda co: abs(co.x) < width and pel.z - 0.02 < co.z < nz - 0.03)
    _solid(obj, 0.004)
    st = (pattern, COL[col2], 0.045 if pattern == 'cross' else 6) if pattern else None
    out = [_finish(obj, rig, O.recipe(name, base=COL[col], tile_kind='cloth', scale=12, grime=0.25, stripes=st), body=h)]
    fl = g_flaps(h, rig, helpers, spec, col=col, length=length, width=width * 0.8, name=name + '_skirt')
    if pattern == 'bars' or pattern == 'halves':
        for f in fl:
            O.assign(f, O.recipe(name + '_sk', base=COL[col], tile_kind='cloth', scale=3, grime=0.6, stripes=st))
    return out + fl


def g_legs(h, rig, helpers, spec, col='dark_leather', kind='cloth', name='breeches'):
    knee = O.bone_head(rig, 'calf_l').z; pel = O.bone_head(rig, 'pelvis').z
    obj = O.region_shell(h, name, ['thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'pelvis'], offset=0.01, min_weight=0.3, smooth=4,
                         keep=lambda co: 0.12 < co.z < pel + 0.03)
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind=kind, scale=16, grime=0.5), body=h, tex=512)


def g_boots(h, rig, helpers, spec, col='leather', height=0.42, name='boots'):
    obj = O.region_shell(h, name, ['calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'], offset=0.014, min_weight=0.3,
                         keep=lambda co: co.z < height)
    _solid(obj, 0.006)
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind='leather', scale=8, grime=0.55, edge_wear=0.5), body=h, tex=512)


def g_bracers(h, rig, helpers, spec, col='leather', kind='leather', name='bracers'):
    obj = O.region_shell(h, name, ['lowerarm_l', 'lowerarm_r'], offset=0.012, min_weight=0.5)
    _solid(obj, 0.005)
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind=kind, scale=8, grime=0.5, edge_wear=0.6), body=h, tex=256)


def g_gloves(h, rig, helpers, spec, col='dark_leather', name='gloves'):
    obj = O.region_shell(h, name, ['hand_l', 'hand_r'], offset=0.006, min_weight=0.4)
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind='leather', scale=8, grime=0.4), body=h, tex=256)


def g_pauldrons(h, rig, helpers, spec, metal='steel', spikes=False):
    out = []
    for side in ('l', 'r'):
        c = O.bone_head(rig, 'upperarm_' + side)
        sx = 1 if c.x > 0 else -1
        parts = []
        for k in range(3):                                # three lames, each overlapping the one below, stepping down the arm
            p = _sphere('lame', c + Vector((sx * (0.025 + 0.012 * k), 0, 0.03 - 0.035 * k)), 0.078 - 0.004 * k, dims=(1.1, 1.08, 0.55), seg=20, ring=12)
            _keep(p, lambda co, cz=c.z + 0.03 - 0.035 * k: co.z > cz - 0.02)
            parts.append(p)
        if spikes:
            for k in range(3):
                base = c + Vector((sx * 0.06, (k - 1) * 0.045, 0.08))
                parts.append(_tube('sp', [base, base + Vector((sx * 0.05, 0, 0.07))], [0.014, 0.001], seg=5))
        pj = _join(parts, 'pauldron_' + side)
        _solid(pj, 0.006)
        O.smart_uv(pj)
        out.append(_finish(pj, rig, O.recipe('pauldron', base=COL[metal], tile_kind='steel', scale=4, grime=0.35, edge_wear=0.8), rigid='upperarm_' + side, tex=256))
    return out


def g_robe(h, rig, helpers, spec, col='silk', col2=None, sleeves=True, name='robe', hem=0.06, flare=1.25, belly=0.0, drape=True):
    """A robe to the ankles: the body's shell above the waist, a bell of cloth below it."""
    pel = O.bone_head(rig, 'pelvis'); nz = O.bone_head(rig, 'neck_01').z
    groups = list(TORSO) + (['upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'] if sleeves else [])
    top = O.region_shell(h, name + '_top', groups, offset=0.06 + belly * 0.04, min_weight=0.2, smooth=40,
                         keep=lambda co: pel.z - 0.02 < co.z < nz + 0.02 and not (abs(co.x) > 0.3 and co.z < pel.z + 0.2 and False))
    # the skirt: a lathe from the waist to the ankle, elliptical like the hips, widening to the hem
    hips = [v.co for v in h.data.vertices if abs(v.co.z - (pel.z - 0.02)) < 0.03]
    hips = hips + [v.co for v in h.data.vertices if abs(v.co.z - (pel.z + 0.08)) < 0.03]
    hx = max(abs(p.x) for p in hips) + 0.03; hy0 = min(p.y for p in hips) - 0.02; hy1 = max(p.y for p in hips) + 0.02
    cy = (hy0 + hy1) / 2; hyr = (hy1 - hy0) / 2
    band = [v.co for v in h.data.vertices if pel.z - 0.25 < v.co.z < pel.z + 0.12]
    def body_r(a, z):                                    # the body's radius at this angle and height, from the robe's centre
        best = 0.0
        for p in band:
            if abs(p.z - z) > 0.03:
                continue
            ang = math.atan2(p.y - cy, p.x)
            if abs((ang - a + math.pi) % (2 * math.pi) - math.pi) < 0.2:
                best = max(best, math.hypot(p.x, p.y - cy))
        return best or math.hypot(math.cos(a) * hx, math.sin(a) * hyr)
    me = bpy.data.meshes.new(name); sk = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(sk)
    bm = bmesh.new(); seg, rows = 36, 12
    rings = []
    for r in range(rows + 1):
        t = r / rows; z = (pel.z + 0.06) * (1 - t) + hem * t
        k = 1 + (flare - 1) * t ** 1.4 + belly * max(0, 1 - t * 3)
        fold = lambda a: 1 + 0.07 * t ** 1.2 * math.sin(a * 9) + 0.03 * t * math.sin(a * 5 + 1)
        ring = []
        for a in [j / seg * 2 * math.pi for j in range(seg)]:
            ex, ey = math.cos(a) * hx * k * fold(a), math.sin(a) * hyr * k * (1.0 + 0.1 * t) * fold(a)
            if t < 0.35:                                     # near the waist the cloth hugs the body, measured round it
                rb = body_r(a, z) + 0.022
                w = 1 - t / 0.35
                el = math.hypot(ex, ey) or 1
                ex, ey = ex * (w * rb / el + (1 - w)), ey * (w * rb / el + (1 - w))
            ring.append(bm.verts.new((ex, cy + ey, z)))
        rings.append(ring)
    for r in range(rows):
        for j in range(seg):
            bm.faces.new((rings[r][j], rings[r][(j + 1) % seg], rings[r + 1][(j + 1) % seg], rings[r + 1][j]))
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            ri = next(i for i, ring in enumerate(rings) if l.vert in ring); ji = rings[ri].index(l.vert)
            l[uv].uv = (ji / seg, 1 - ri / rows)
    bm.to_mesh(me); bm.free()
    if drape:                                            # let it fall: hold the waistband, the rest settles over hips and belly
        bm = bmesh.new(); bm.from_mesh(sk.data)
        for v in bm.verts:                               # start it loose: widen everything below the band
            t = max(0.0, (pel.z + 0.06 - v.co.z) / (pel.z + 0.06 - hem))
            v.co.x *= 1 + 0.08 * t; v.co.y = cy + (v.co.y - cy) * (1 + 0.08 * t)
        bm.to_mesh(sk.data); bm.free()
        sub = sk.modifiers.new('s', 'SUBSURF'); sub.levels = 1; O.apply_mod(sk, sub)
        O.drape(sk, [h], lambda co: co.z > pel.z + 0.03, frames=60)
    _solid(sk, 0.008)
    st = ('bars', COL[col2], 10) if col2 else None
    mat = O.recipe(name, base=COL[col], tile_kind='cloth', scale=14, grime=0.45, stripes=st)
    a = _finish(top, rig, mat, body=h, tex=1024)
    O.assign(sk, O.recipe(name + '_sk', base=COL[col], tile_kind='cloth', scale=6, grime=0.55, stripes=st))
    _weights_blend(sk, rig, 'pelvis', ['thigh_l', 'thigh_r'], pel.z, hem)
    sk['tex_size'] = 512
    return [a, sk]


def g_cloak(h, rig, helpers, spec, col='scarlet', length=1.05, width=0.25):
    nz = O.bone_head(rig, 'neck_01').z; sp = O.bone_head(rig, 'spine_03')
    ys = [v.co.y for v in h.data.vertices if abs(v.co.z - (nz - 0.08)) < 0.03]
    yb = max(ys) + 0.04
    top = [Vector((x, yb - 0.04 * (1 - abs(x) / width) ** 2 + 0.02, nz - 0.03 - 0.06 * (abs(x) / width) ** 2)) for x in (-width, -width / 2, 0, width / 2, width)]
    bot = [Vector((x * 1.3, yb + 0.12, nz - length)) for x in (-width, -width / 2, 0, width / 2, width)]
    o = _plane_strip('cloak', top, bot, rows=14, pleats=0.025)
    # hang it a hand's breadth off the back, then let it fall onto the shoulders and back
    for v in o.data.vertices:
        v.co.y += 0.04
    O.drape(o, [h], lambda co: co.z > nz - 0.06, frames=45, mass=0.35)
    _solid(o, 0.008)
    O.assign(o, O.recipe('cloak', base=COL[col], tile_kind='cloth', scale=4, grime=0.6))
    _weights_blend(o, rig, 'spine_03', ['pelvis'], nz - 0.03, nz - length)
    o['tex_size'] = 512
    return o


def g_collar(h, rig, helpers, spec, col='iron'):
    nz = O.bone_head(rig, 'neck_01')
    obj = O.region_shell(h, 'collar', ['neck_01', 'spine_03'], offset=0.018, min_weight=0.3, keep=lambda co: nz.z + 0.01 < co.z < nz.z + 0.05)
    _solid(obj, 0.012)
    return _finish(obj, rig, O.recipe('collar', base=COL[col], tile_kind='steel', scale=4, grime=0.5, edge_wear=0.7), body=h, tex=128)


def g_beard(h, rig, helpers, spec, col='beard', length=0.1, name='beard', width=1.0):
    """A beard grown from the jaw: the lower face's shell, drawn down and out."""
    hb = head_box(h, rig)
    eyes = eye_centres(helpers)
    mz = (eyes[0].z if eyes else hb['chin'] + 0.12) - 0.065
    obj = O.region_shell(h, name, ['head', 'neck_01'], offset=0.008, min_weight=0.3,
                         keep=lambda co: co.z < mz and co.y < hb['cy'] + 0.02 and co.z > hb['chin'] - 0.06 and abs(co.x - hb['cx']) < hb['hw'] * width)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    for v in bm.verts:
        t = max(0, (mz - v.co.z) / 0.12)
        v.co.z -= length * t ** 1.3
        v.co.y -= 0.02 * t
    bm.to_mesh(obj.data); bm.free()
    _solid(obj, 0.006)
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind='fur', scale=16, grime=0.15), rigid='head', tex=256)


def g_skirt(h, rig, helpers, spec, col='iron', kind='mail', length=0.3):
    """A mail skirt from the waist (the black guards wear it under bare chests)."""
    pel = O.bone_head(rig, 'pelvis')
    obj = O.region_shell(h, 'skirt', ['pelvis', 'thigh_l', 'thigh_r', 'spine_01'], offset=0.02, min_weight=0.2,
                         keep=lambda co: pel.z - length < co.z < pel.z + 0.09)
    _solid(obj, 0.006)
    return _finish(obj, rig, O.recipe('skirt', base=COL[col], tile_kind=kind, scale=24, grime=0.45), body=h, tex=512)


def g_shield(h, rig, helpers, spec, col='scarlet', col2='black', r=0.36, boss='iron'):
    """A round shield of painted planks, rimmed and bossed, on the left forearm."""
    fa = O.bone_head(rig, 'lowerarm_l'); hand = O.bone_head(rig, 'hand_l')
    mid = fa.lerp(hand, 0.55)
    sx = 1 if mid.x > 0 else -1
    me = bpy.data.meshes.new('shield'); obj = bpy.data.objects.new('shield', me); bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=36, radius=r)
    for v in bm.verts:                                   # dished a little, facing out from the arm
        d = math.hypot(v.co.x, v.co.y) / r
        v.co.z = -0.04 * d * d
    bm.to_mesh(me); bm.free()
    _solid(obj, 0.022)
    rim = _tube('rim', [Vector((math.cos(t) * r, math.sin(t) * r, -0.04)) for t in [k / 36 * 2 * math.pi for k in range(37)]], [0.014] * 37, seg=6)
    bossm = _sphere('boss', Vector((0, 0, 0.02)), 0.075, dims=(1, 1, 0.6), seg=16, ring=10)
    _keep(bossm, lambda co: co.z > 0.0)
    O.assign(obj, O.recipe('shield', base=COL[col], tile_kind='leather', scale=3, grime=0.55, edge_wear=0.9))
    O.assign(rim, O.recipe('rim', base=COL['iron'], tile_kind='steel', scale=3, grime=0.4, edge_wear=0.8))
    O.assign(bossm, O.recipe('boss', base=COL['steel'], tile_kind='steel', scale=3, grime=0.3, edge_wear=0.9))
    sh = _join([obj, rim, bossm], 'shield')
    O.smart_uv(sh)
    # stand it on the forearm's outside, facing out and a little forward
    # at rest the face looks forward and down along the hanging forearm, so that in the guard pose
    # (forearm raised forward) it faces the enemy
    n = Vector((sx * 0.25, -math.cos(1.25), -math.sin(1.25))).normalized()
    q = Vector((0, 0, 1)).rotation_difference(n)
    sh.data.transform(q.to_matrix().to_4x4())
    sh.data.transform(Matrix.Translation(mid + n * 0.07))
    st = ('bars', COL[col2], 9) if col2 else None
    mat = None
    return _finish(sh, rig, mat, rigid='lowerarm_l', tex=512)


# ---- the pits' things and the slave of the Ring ---------------------------------------------
def g_fangs(h, rig, helpers, spec, n=4, length=0.05, col='bone', drop=0.075, lower=True):
    hb = head_box(h, rig); eyes = eye_centres(helpers)
    mz = (sum(e.z for e in eyes) / len(eyes) if eyes else hb['chin'] + 0.12) - drop
    fy = min(v.co.y for v in h.data.vertices if abs(v.co.z - mz) < 0.02 and abs(v.co.x - hb['cx']) < 0.02) + 0.004
    parts = []
    for k in range(n):
        x = hb['cx'] + (k - (n - 1) / 2) * 0.016
        y = fy + 0.008 * abs(k - (n - 1) / 2)
        top = Vector((x, y, mz + 0.008))
        parts.append(_tube('fang', [top, top + Vector((0, -0.004, -length * (1.0 if k in (0, n - 1) else 0.6)))], [0.006, 0.0005], seg=5))
        if lower:
            bot = Vector((x * 0.98 + hb['cx'] * 0.02, y + 0.01, mz - 0.045))
            parts.append(_tube('fang', [bot, bot + Vector((0, -0.004, length * 0.6))], [0.005, 0.0005], seg=5))
    f = _join(parts, 'fangs'); O.smart_uv(f)
    return _finish(f, rig, O.recipe('fangs', base=COL[col], grime=0.3), rigid='head', tex=64)


def g_spurs(h, rig, helpers, spec, n=7, size=0.09, col='bone'):
    """Bony spurs down the spine, each riding its own vertebra."""
    out = []
    bones = ['spine_01', 'spine_02', 'spine_03', 'neck_01']
    zs = [O.bone_head(rig, b).z for b in bones]
    for i, b in enumerate(bones[:3]):
        z0, z1 = zs[i], zs[i + 1]
        parts = []
        for k in range(max(1, n // 3)):
            z = z0 + (z1 - z0) * (k + 0.5) / max(1, n // 3)
            ring = [v.co for v in h.data.vertices if abs(v.co.z - z) < 0.015 and abs(v.co.x) < 0.03]
            if not ring:
                continue
            yb = max(p.y for p in ring)
            base = Vector((0, yb - 0.01, z))
            s = size * (0.7 + 0.6 * ((k + i) % 2))
            parts.append(_tube('spur', [base, base + Vector((0, s * 0.8, s * 0.6))], [0.018, 0.001], seg=5))
        if parts:
            j = _join(parts, 'spurs_' + b); O.smart_uv(j)
            out.append(_finish(j, rig, O.recipe('spur', base=COL[col], grime=0.5, edge_wear=0.4), rigid=b, tex=64))
    return out


def g_claws(h, rig, helpers, spec, length=0.12, col='bone'):
    out = []
    for side in ('l', 'r'):
        t = O.bone_tail(rig, 'hand_' + side); hd = O.bone_head(rig, 'hand_' + side)
        d = (t - hd).normalized()
        sx = 1 if hd.x > 0 else -1
        parts = []
        for k in range(4):
            base = t + Vector((0, -0.03 + k * 0.02, -0.02))
            parts.append(_tube('claw', [base, base + d * length * 0.6 + Vector((0, -0.04, 0)), base + d * length + Vector((0, -0.07, 0.01))], [0.009, 0.006, 0.0005], seg=5))
        j = _join(parts, 'claws_' + side); O.smart_uv(j)
        out.append(_finish(j, rig, O.recipe('claw', base=COL[col], grime=0.4), rigid='hand_' + side, tex=64))
    return out


def g_fur(h, rig, helpers, spec, col='hair', offset=0.02, name='fur', bare_face=True):
    """A pelt over everything but the face, hands and feet."""
    hb = head_box(h, rig)
    obj = O.region_shell(h, name, ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'clavicle_r',
                                   'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r'],
                         offset=offset, min_weight=0.3,
                         keep=lambda co: not (bare_face and co.y < hb['cy'] - hb['hd'] * 0.2 and co.z > hb['chin'] - 0.02))
    bm = bmesh.new(); bm.from_mesh(obj.data)
    import random
    rnd = random.Random(7)
    for v in bm.verts:                                   # shaggy: every hair-tuft pushed out a different way, longest on the shoulders
        mane = max(0.0, 1 - abs(v.co.z - O.bone_head(rig, 'spine_03').z) / 0.25)
        v.co += v.normal * offset * (0.3 + rnd.random() * (1.2 + 2.5 * mane))
    bm.to_mesh(obj.data); bm.free()
    return _finish(obj, rig, O.recipe(name, base=COL[col], tile_kind='fur', scale=14, grime=0.4), body=h, tex=1024)


def g_muzzle(h, rig, helpers, spec, col='hair', length=0.17):
    """The baboon's long dog-muzzle, thrust out of the face, lips peeled back."""
    hb = head_box(h, rig); eyes = eye_centres(helpers)
    ez = sum(e.z for e in eyes) / len(eyes) if eyes else hb['chin'] + 0.12
    root = Vector((hb['cx'], hb['front'] + 0.03, ez - 0.05))
    path = [root, root + Vector((0, -length * 0.5, -0.01)), root + Vector((0, -length, -0.02))]
    m = _tube('muzzle', path, [0.075, 0.062, 0.042], seg=14)
    nose = _sphere('nose', path[-1] + Vector((0, -0.01, 0.012)), 0.022, seg=10, ring=6)
    j = _join([m, nose], 'muzzle'); O.smart_uv(j)
    return _finish(j, rig, O.recipe('muzzle', base=COL[col], tile_kind='leather', scale=4, grime=0.5), rigid='head', tex=256)
