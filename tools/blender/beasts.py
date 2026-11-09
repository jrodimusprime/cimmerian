# The beasts that aren't men: built from a skeleton of points with Blender's skin
# modifier (a smooth quad hull round the bones), subdivided, rigged with automatic
# weights, textured with the same baked recipes as the cast.
import bpy, bmesh, math
from mathutils import Vector
import outfit as O
from gear import COL, _tube, _sphere, _join, _solid


def hull(name, verts, edges, radii, subdiv=2):
    """A skin-modifier body: verts and edges are the skeleton, radii (rx, ry) per vert."""
    me = bpy.data.meshes.new(name); obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    me.from_pydata([Vector(v) for v in verts], edges, [])
    sk = obj.modifiers.new('skin', 'SKIN')
    for i, r in enumerate(radii):
        me.skin_vertices[0].data[i].radius = r
    me.skin_vertices[0].data[0].use_root = True
    sub = obj.modifiers.new('sub', 'SUBSURF'); sub.levels = subdiv; sub.render_levels = subdiv
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        O.apply_mod(obj, m)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def armature(name, bones):
    """bones: [(name, head, tail, parent)] in object space."""
    arm = bpy.data.armatures.new(name); rig = bpy.data.objects.new(name, arm); bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for n, hd, tl, par in bones:
        b = arm.edit_bones.new(n); b.head = Vector(hd); b.tail = Vector(tl)
        if par:
            b.parent = eb[par]
        eb[n] = b
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def bind(obj, rig):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')


def horse(gaunt=False):
    """A war-horse; or, gaunt, Tsotha's steed: 'a gaunt weird-looking steed whose stride no natural horse could match'."""
    L = 1.2 if gaunt else 1.0                                  # legs: longer on the steed
    k = 0.72 if gaunt else 1.0                                 # girth
    V, E, R = [], [], []
    def add(p, r, link=None):
        V.append(p); R.append(r)
        if link is not None:
            E.append((link, len(V) - 1))
        return len(V) - 1
    hip = 1.45 * L - 0.05
    root = add((0, 0.0, hip), (0.44 * k, 0.5 * k))                         # the barrel
    rump = add((0, 0.7, hip + 0.03), (0.42 * k, 0.46 * k), root)
    tailr = add((0, 1.0, hip - 0.05), (0.12 * k, 0.14 * k), rump)
    chest = add((0, -0.62, hip + 0.06), (0.4 * k, 0.5 * k), root)
    neck0 = add((0, -0.95, hip + 0.18), (0.28 * k, 0.4 * k), chest)
    neck1 = add((0, -1.28, hip + 0.48), (0.19 * k, 0.3 * k), neck0)
    poll = add((0, -1.45, hip + 0.7), (0.14 * k, 0.17), neck1)
    jaw = add((0, -1.66, hip + 0.56), (0.13, 0.17), poll)
    muz = add((0, -1.98, hip + 0.3), (0.095, 0.11), jaw)
    legs = {}
    for side, sx in (('l', 1), ('r', -1)):
        for end, y0 in (('f', -0.6), ('h', 0.72)):
            top = add((sx * 0.2 * k, y0, hip - 0.22), (0.17 * k, 0.24 * k), chest if end == 'f' else rump)
            knee_y = y0 - 0.02 if end == 'f' else y0 + 0.12
            a = add((sx * 0.2 * k, knee_y, hip - 0.62 * L), (0.09 * k + 0.015, 0.11 * k + 0.015), top)
            b = add((sx * 0.2 * k, y0 + (0.0 if end == 'f' else 0.1), 0.42 * L), (0.055, 0.06), a)
            c = add((sx * 0.2 * k, y0 - 0.02 + (0.0 if end == 'f' else 0.08), 0.13), (0.065, 0.07), b)
            d = add((sx * 0.2 * k, y0 - 0.06 + (0.0 if end == 'f' else 0.08), 0.0), (0.075, 0.08), c)
            legs[end + side] = (top, a, b, c, d)
    body = hull('horse', V, E, R)
    # mane and tail: tubes of hair
    mane_pts = [Vector(V[i]) + Vector((0, 0.08, 0.16)) for i in (neck0, neck1, poll)]
    mane = _tube('mane', mane_pts, [0.07, 0.09, 0.06], seg=6)
    tail = _tube('tail', [Vector(V[tailr]), Vector((0, 1.2, hip - 0.35)), Vector((0, 1.25, hip - 0.75)), Vector((0, 1.22, hip - 1.05))], [0.07, 0.08, 0.06, 0.02], seg=8)
    ears = [_tube('ear', [Vector(V[poll]) + Vector((sx * 0.06, 0.02, 0.06)), Vector(V[poll]) + Vector((sx * 0.07, 0.04, 0.19))], [0.03, 0.005], seg=5) for sx in (-1, 1)]
    hair = _join([mane, tail] + ears, 'hair')
    eyes = []
    for sx in (-1, 1):
        e = _sphere('eye', Vector(V[jaw]) + Vector((sx * 0.085, 0.06, 0.06)), 0.025, seg=10, ring=6)
        eyes.append(e)
    # the rig: spine, neck, head, tail, legs
    def P(i):
        return Vector(V[i])
    bones = [('body', P(root), P(root) + Vector((0, 0, 0.3)), None),
             ('neck', P(neck0), P(poll), 'body'), ('head', P(poll), P(muz), 'neck'), ('tail', P(tailr), P(tailr) + Vector((0, 0.3, -0.5)), 'body')]
    for key, (top, a, b, c, d) in legs.items():
        bones += [('leg_' + key + '_u', P(top), P(a), 'body'), ('leg_' + key + '_m', P(a), P(b), 'leg_' + key + '_u'), ('leg_' + key + '_l', P(b), P(d), 'leg_' + key + '_m')]
    rig = armature('horse_rig', bones)
    O.smart_uv(body, angle=50)
    hide = (0.62, 0.6, 0.54) if gaunt else (0.36, 0.22, 0.13)
    O.assign(body, O.recipe('hide', base=hide, tile_kind='leather', scale=5, grime=0.4))
    O.smart_uv(hair)
    O.assign(hair, O.recipe('hair', base=COL['hair'] if not gaunt else (0.12, 0.12, 0.12), tile_kind='fur', scale=5, grime=0.2))
    for e in eyes:
        O.smart_uv(e)
        O.assign(e, O.recipe('eye', base=(0.9, 0.3, 0.05) if gaunt else (0.03, 0.02, 0.02), grime=0, glow=1.0 if gaunt else 0.0))
    body['tex_size'] = 1024; hair['tex_size'] = 256
    parts = [body, hair] + eyes
    if gaunt:                                                  # ribs through the hide, a knobbed spine
        ribs = []
        for i in range(7):
            y = -0.45 + i * 0.13
            for sx in (-1, 1):
                ribs.append(_tube('rib', [Vector((sx * 0.3, y, hip + 0.22)), Vector((sx * 0.34, y + 0.03, hip - 0.02)), Vector((sx * 0.28, y + 0.05, hip - 0.28))], [0.018, 0.022, 0.014], seg=5))
        rb = _join(ribs, 'ribs'); O.smart_uv(rb)
        O.assign(rb, O.recipe('ribs', base=COL['bone'], grime=0.5)); rb['tex_size'] = 256
        parts.append(rb)
    else:                                                      # a war-horse's tack: caparison, saddle, bridle and reins
        cap = body.copy(); cap.data = body.data.copy(); cap.name = 'caparison'; bpy.context.collection.objects.link(cap)
        bm = bmesh.new(); bm.from_mesh(cap.data)
        keep = lambda c: c.z > hip - 0.42 and -0.85 < c.y < 0.95
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(keep(v.co) for v in f.verts)], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.normal_update()
        for v in bm.verts:
            v.co += v.normal * 0.025
            if v.co.z < hip - 0.25:                             # the hem hangs straight down, a little out
                v.co.z -= 0.18
        bm.to_mesh(cap.data); bm.free()
        _solid(cap, 0.008)
        while cap.data.uv_layers:
            cap.data.uv_layers.remove(cap.data.uv_layers[0])
        O.assign(cap, O.recipe('caparison', base=COL['scarlet'], tile_kind='cloth', scale=8, grime=0.55))
        cap['tex_size'] = 512; cap['ao'] = 0.15
        saddle = _sphere('saddle', Vector((0, -0.12, hip + 0.36)), 0.26, dims=(1.0, 1.5, 0.35), seg=16, ring=8)
        horn = _tube('horn', [Vector((0, -0.42, hip + 0.38)), Vector((0, -0.46, hip + 0.52))], [0.05, 0.03], seg=6)
        sd = _join([saddle, horn], 'saddle')
        O.assign(sd, O.recipe('saddle', base=COL['dark_leather'], tile_kind='leather', scale=4, grime=0.4, edge_wear=0.5))
        mz = Vector(V[muz]); pl = Vector(V[poll]); jw = Vector(V[jaw])
        straps = [_tube('nose', [mz + Vector((math.cos(t) * 0.1, 0.03, math.sin(t) * 0.11)) for t in [k / 12 * 2 * math.pi for k in range(13)]], [0.012] * 13, seg=4),
                  _tube('cheek', [pl + Vector((-0.12, 0, 0.02)), jw + Vector((-0.12, 0.02, -0.02)), mz + Vector((-0.1, 0.03, 0))], [0.012] * 3, seg=4),
                  _tube('cheek', [pl + Vector((0.12, 0, 0.02)), jw + Vector((0.12, 0.02, -0.02)), mz + Vector((0.1, 0.03, 0))], [0.012] * 3, seg=4),
                  _tube('reins', [mz + Vector((0.1, 0.03, 0)), Vector((0.12, -0.75, hip + 0.35)), Vector((0, -0.45, hip + 0.5)), Vector((-0.12, -0.75, hip + 0.35)), mz + Vector((-0.1, 0.03, 0))], [0.008] * 5, seg=4)]
        br = _join(straps, 'bridle')
        O.assign(br, O.recipe('bridle', base=COL['dark_leather'], tile_kind='leather', scale=4, grime=0.3))
        for o in (sd, br):
            O.smart_uv(o); o['tex_size'] = 256
        parts += [cap, sd, br]
    for p in parts:
        _outward(p)
        bind(p, rig)
    O.bake([p for p in parts])
    return rig, parts


def build_beast(cid):
    if cid in ('horse', 'steed'):
        return horse(gaunt=cid == 'steed')
    raise KeyError(cid)


# ---- static parts: posed piece by piece in the game ------------------------------------------
def _metablob(name, balls, res=0.06):
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res
    ob = bpy.data.objects.new(name + '_mb', mb); bpy.context.collection.objects.link(ob)
    for (x, y, z, r, (sx, sy, sz)) in balls:
        e = mb.elements.new(); e.co = (x, y, z); e.radius = r; e.type = 'ELLIPSOID'; e.size_x, e.size_y, e.size_z = sx, sy, sz
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    obj = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(obj)
    bpy.data.objects.remove(ob, do_unlink=True)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def _outward(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data); bm.free()


def _done(parts, tex=512):
    for p in parts:
        _outward(p)
        if not p.data.uv_layers:
            O.smart_uv(p, angle=55)
        p['tex_size'] = p.get('tex_size', tex)
    O.bake(parts, ao_strength=0.6)
    return parts


def weeper_body():
    import random
    rnd = random.Random(3)
    balls = [(0, 0, 0.9, 1.3, (1.1, 1.0, 0.8))]
    for k in range(14):                                     # the quaking mass: lumps on lumps, no two alike
        a = rnd.random() * 6.28; r = 0.6 + rnd.random() * 0.6
        balls.append((math.cos(a) * r, math.sin(a) * r * 0.9, 0.5 + rnd.random() * 0.9, 0.45 + rnd.random() * 0.35, (1, 1, 0.8)))
    b = _metablob('weeper_body', balls, res=0.09)
    O.assign(b, O.recipe('jelly', base=(0.62, 0.74, 0.6), tile_kind='leather', scale=2, grime=0.45, glow=0.2))
    return _done([b], 1024)


def weeper_tentacle():
    pts = [Vector((0, 0, 0)), Vector((0, -0.35, -0.05)), Vector((0, -0.62, -0.18)), Vector((0, -0.8, -0.35))]
    t = _tube('weeper_tentacle', pts, [0.22, 0.17, 0.11, 0.03], seg=12)
    sub = t.modifiers.new('s', 'SUBSURF'); sub.levels = 2; O.apply_mod(t, sub)
    for p in t.data.polygons:
        p.use_smooth = True
    # suckers along the underside
    suck = [_sphere('sucker', pts[0].lerp(pts[3], k / 6) + Vector((0, 0, -0.12 + 0.02 * k)), 0.035, seg=8, ring=5) for k in range(1, 6)]
    j = _join([t] + suck, 'weeper_tentacle')
    O.assign(j, O.recipe('tent', base=(0.6, 0.72, 0.58), tile_kind='leather', scale=3, grime=0.45, glow=0.15))
    return _done([j], 256)


def weeper_head():
    """'a frog-like head ... great unstable eyes ... obscene blubbery lips'"""
    head = _metablob('head', [(0, 0, 0.25, 1.0, (1.15, 1.0, 0.72)), (0, -0.3, 0.1, 0.8, (1.25, 0.9, 0.55))], res=0.05)
    O.assign(head, O.recipe('frog', base=(0.78, 0.8, 0.62), tile_kind='leather', scale=4, grime=0.45))
    lips = _tube('lips', [Vector((math.cos(t) * 0.5, -0.42 - math.sin(t) * 0.2, 0.0)) for t in [k / 24 * math.pi for k in range(25)]], [0.06] * 25, seg=10)
    O.assign(lips, O.recipe('lips', base=(0.55, 0.2, 0.18), tile_kind='leather', scale=3, grime=0.3))
    eyes = []
    for sx in (-1, 1):
        e = _sphere('eye', Vector((sx * 0.36, -0.22, 0.55)), 0.17, dims=(1, 1, 1.1), seg=16, ring=10)
        O.assign(e, O.recipe('eye', base=(0.95, 0.72, 0.15), grime=0.2, glow=0.8))
        pupil = _sphere('pupil', Vector((sx * 0.36, -0.37, 0.56)), 0.05, dims=(0.5, 0.3, 1.4), seg=10, ring=6)
        O.assign(pupil, O.recipe('pupil', base=(0.02, 0.02, 0.02), grime=0))
        eyes += [e, pupil]
    return _done([head, lips] + eyes, 512)


def yothga_stem():
    pts = [Vector((0, 0, -0.1)), Vector((0.04, 0.02, 0.3)), Vector((-0.05, 0.06, 0.7)), Vector((0.03, 0.0, 1.05)), Vector((0, -0.05, 1.35))]
    st = _tube('stem', pts, [0.2, 0.17, 0.15, 0.16, 0.2], seg=14)
    sub = st.modifiers.new('s', 'SUBSURF'); sub.levels = 2; O.apply_mod(st, sub)
    roots = [_tube('root', [Vector((0, 0, 0)), Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, -0.02)), Vector((math.cos(a) * 0.65, math.sin(a) * 0.62, -0.06))], [0.1, 0.06, 0.01], seg=8)
             for a in [k / 7 * 6.28 + 0.3 for k in range(7)]]
    j = _join([st] + roots, 'yothga_stem')
    for p in j.data.polygons:
        p.use_smooth = True
    O.assign(j, O.recipe('stem', base=(0.7, 0.72, 0.6), tile_kind='leather', scale=3, grime=0.55, edge_wear=0.3))
    return _done([j], 512)


def _leaf(at, d, side, length):
    me = bpy.data.meshes.new('leaf'); ob = bpy.data.objects.new('leaf', me); bpy.context.collection.objects.link(ob)
    w = length * 0.28
    tip = at + d * length; mid = at + d * length * 0.4 + Vector((0, 0, 0.02))
    me.from_pydata([at, mid + side * w, tip, mid - side * w, mid + Vector((0, 0, 0.015))], [], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])
    return ob


def yothga_tendril():
    pts = [Vector((0, k / 6 * -1.6, 0.04 * math.sin(k))) for k in range(7)]
    t = _tube('tendril', pts, [0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.008], seg=8)
    leaves = []
    for k in range(1, 6):
        for sx in (-1, 1):
            leaves.append(_leaf(pts[k] + Vector((sx * 0.04, 0, 0)), Vector((sx * 0.8, -0.5, 0.25)).normalized(), Vector((0, 1, 0)), 0.22 - k * 0.02))
    lv = _join(leaves, 'leaves'); _solid(lv, 0.004)
    O.assign(t, O.recipe('tendril', base=(0.62, 0.68, 0.52), tile_kind='leather', scale=4, grime=0.4))
    O.assign(lv, O.recipe('leaf', base=(0.2, 0.32, 0.16), tile_kind='leather', scale=3, grime=0.4))
    return _done([t, lv], 256)


def yothga_bloom():
    """'the petals of the livid blossoms spread like the hood of a cobra'"""
    petals = []
    for k in range(6):
        a = -1.3 + k / 5 * 2.6
        me = bpy.data.meshes.new('petal'); ob = bpy.data.objects.new('petal', me); bpy.context.collection.objects.link(ob)
        rows, cols = 5, 4
        V = []
        for r in range(rows + 1):
            for c in range(cols + 1):
                u = r / rows; v = (c / cols - 0.5)
                rad = 0.04 + u * 0.24; ang = a + v * 0.5 * (1 - u * 0.3)
                V.append(Vector((math.sin(ang) * rad, -0.08 * u * u - 0.02 + 0.06 * abs(v) * u, math.cos(ang) * rad)))
        F = [(r * (cols + 1) + c, r * (cols + 1) + c + 1, (r + 1) * (cols + 1) + c + 1, (r + 1) * (cols + 1) + c) for r in range(rows) for c in range(cols)]
        me.from_pydata(V, [], F)
        petals.append(ob)
    p = _join(petals, 'petals'); _solid(p, 0.006)
    sub = p.modifiers.new('s', 'SUBSURF'); sub.levels = 1; O.apply_mod(p, sub)
    throat = _sphere('throat', Vector((0, -0.02, 0)), 0.07, seg=12, ring=8)
    O.assign(p, O.recipe('bloom', base=(0.72, 0.1, 0.16), tile_kind='leather', scale=2, grime=0.3, glow=0.35))
    O.assign(throat, O.recipe('throat', base=(0.12, 0.02, 0.04), grime=0.1))
    return _done([p, throat], 256)


def eagle_body():
    b = _metablob('eagle_body', [(0, 0, 0, 0.32, (1, 1.8, 0.9)), (0, -0.48, 0.1, 0.17, (1, 1.2, 1)), (0, 0.5, -0.02, 0.18, (1, 1.5, 0.6))], res=0.035)
    O.assign(b, O.recipe('feathers', base=(0.32, 0.2, 0.1), tile_kind='scales', scale=8, grime=0.3))
    head = _sphere('head', Vector((0, -0.62, 0.15)), 0.12, dims=(0.9, 1.1, 1), seg=16, ring=10)
    O.assign(head, O.recipe('white', base=(0.85, 0.82, 0.72), tile_kind='fur', scale=6, grime=0.2))
    beak = _tube('beak', [Vector((0, -0.72, 0.15)), Vector((0, -0.84, 0.12)), Vector((0, -0.88, 0.06))], [0.045, 0.03, 0.002], seg=8)
    O.assign(beak, O.recipe('beak', base=(0.85, 0.65, 0.2), grime=0.2))
    tail = []
    for k in range(9):
        a = -0.5 + k / 8 * 1.0
        tail.append(_leaf(Vector((0, 0.7, -0.02)), Vector((math.sin(a), 1, 0)).normalized(), Vector((1, 0, 0)), 0.42))
    tl = _join(tail, 'tail'); _solid(tl, 0.01)
    O.assign(tl, O.recipe('tailf', base=(0.3, 0.19, 0.1), tile_kind='scales', scale=4, grime=0.3))
    eyes = [_sphere('eye', Vector((sx * 0.07, -0.68, 0.19)), 0.022, seg=8, ring=6) for sx in (-1, 1)]
    for e in eyes:
        O.assign(e, O.recipe('eye', base=(0.95, 0.6, 0.1), grime=0, glow=0.6))
    talons = []
    for sx in (-1, 1):
        for k in range(3):
            talons.append(_tube('talon', [Vector((sx * 0.12, -0.05, -0.2)), Vector((sx * 0.13 + (k - 1) * 0.04, -0.2, -0.38)), Vector((sx * 0.13 + (k - 1) * 0.05, -0.27, -0.36))], [0.025, 0.012, 0.002], seg=6))
    tn = _join(talons, 'talons'); O.assign(tn, O.recipe('talon', base=(0.75, 0.6, 0.2), grime=0.3))
    return _done([b, head, beak, tl, tn] + eyes, 512)


def eagle_wing():
    """a wing along +x: the arm, and its primaries splayed at the tip"""
    feathers = []
    for k in range(16):
        u = k / 15
        root = Vector((0.1 + u * 1.7, 0, 0.02 * math.sin(u * 3)))
        length = 0.55 - 0.15 * u + (0.25 if u > 0.7 else 0)
        d = Vector((0.15 + u * 0.8 if u > 0.7 else 0.1, 1, 0)).normalized()
        feathers.append(_leaf(root, d, Vector((1, -0.15, 0)).normalized(), length))
    fe = _join(feathers, 'wing'); _solid(fe, 0.012)
    arm = _tube('arm', [Vector((0, 0, 0)), Vector((0.8, 0.02, 0.03)), Vector((1.6, 0.05, 0.02)), Vector((1.9, 0.08, 0.0))], [0.09, 0.07, 0.04, 0.015], seg=8)
    j = _join([fe, arm], 'eagle_wing')
    O.assign(j, O.recipe('wingf', base=(0.3, 0.19, 0.1), tile_kind='scales', scale=6, grime=0.3))
    return _done([j], 512)


STATIC = {'weeper_body': weeper_body, 'weeper_tentacle': weeper_tentacle, 'weeper_head': weeper_head,
          'yothga_stem': yothga_stem, 'yothga_tendril': yothga_tendril, 'yothga_bloom': yothga_bloom,
          'eagle_body': eagle_body, 'eagle_wing': eagle_wing}


# ---- weapons: built along +z from the grip (glTF +y), edge across x, as the game's hand mounts expect
def _blade(name, z0, z1, w, t=0.006, tip=0.12, fuller=True):
    me = bpy.data.meshes.new(name); ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    bm = bmesh.new()
    rows = 8; prev = None
    for r in range(rows + 1):
        u = r / rows; z = z0 + (z1 - tip - z0) * u
        ww = w * (1 - 0.25 * u)
        ring = [bm.verts.new((x, y, z)) for x, y in ((-ww, 0), (0, -t), (ww, 0), (0, t))]
        if prev:
            for k in range(4):
                bm.faces.new((prev[k], prev[(k + 1) % 4], ring[(k + 1) % 4], ring[k]))
        prev = ring
    tipv = bm.verts.new((0, 0, z1))
    for k in range(4):
        bm.faces.new((prev[k], prev[(k + 1) % 4], tipv))
    bm.faces.new(list(reversed([v for v in bm.verts if abs(v.co.z - z0) < 1e-6])))
    bm.to_mesh(me); bm.free()
    return ob


def _sword_parts(L=0.88, w=0.028, grip=0.1, cross=0.09):
    blade = _blade('blade', 0.12, L, w)
    O.assign(blade, O.recipe('blade', base=COL['steel'], tile_kind='steel', scale=3, grime=0.3, edge_wear=1.0))
    g = _tube('grip', [Vector((0, 0, -0.015)), Vector((0, 0, grip))], [0.017, 0.016], seg=8)
    O.assign(g, O.recipe('grip', base=COL['dark_leather'], tile_kind='leather', scale=8, grime=0.3))
    cg = _tube('cross', [Vector((-cross, 0, 0.11)), Vector((0, 0, 0.115)), Vector((cross, 0, 0.11))], [0.012, 0.016, 0.012], seg=6)
    pm = _sphere('pommel', Vector((0, 0, -0.035)), 0.026, dims=(1, 0.7, 1), seg=10, ring=6)
    hilt = _join([cg, pm], 'hilt')
    O.assign(hilt, O.recipe('hilt', base=COL['iron'], tile_kind='steel', scale=3, grime=0.4, edge_wear=0.8))
    return [blade, g, hilt]


def w_sword():
    return _done(_sword_parts(), 256)


def w_greatsword():
    parts = _sword_parts(L=1.3, w=0.034, grip=0.2, cross=0.13)
    for p in parts:
        if p.name.startswith('grip'):
            p.data.transform(__import__('mathutils').Matrix.Translation((0, 0, -0.08)))
    return _done(parts, 256)


def w_dagger():
    return _done(_sword_parts(L=0.33, w=0.02, grip=0.08, cross=0.045), 128)


def _haft(z0, z1, r=0.02):
    h = _tube('haft', [Vector((0, 0, z0)), Vector((0, 0, (z0 + z1) / 2)), Vector((0, 0, z1))], [r, r * 1.1, r], seg=8)
    O.assign(h, O.recipe('haft', base=(0.3, 0.2, 0.12), tile_kind='leather', scale=2, grime=0.4))
    return h


def w_axe():
    """'long-shafted axes': a black haft and a broad bearded head, edge forward"""
    h = _haft(-0.9, 1.3)
    me = bpy.data.meshes.new('head'); ob = bpy.data.objects.new('head', me); bpy.context.collection.objects.link(ob)
    # the profile in the y-z plane (forward is -y), extruded thin in x
    prof = [(0.02, 0.95), (-0.05, 0.98), (-0.2, 0.9), (-0.24, 1.06), (-0.22, 1.28), (-0.05, 1.22), (0.02, 1.25)]
    bm = bmesh.new()
    a = [bm.verts.new((-0.008, y, z)) for y, z in prof]; b = [bm.verts.new((0.008, y, z)) for y, z in prof]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for k in range(len(prof)):
        bm.faces.new((a[k], a[(k + 1) % len(prof)], b[(k + 1) % len(prof)], b[k]))
    bm.to_mesh(me); bm.free()
    O.assign(ob, O.recipe('axehead', base=COL['steel'], tile_kind='steel', scale=3, grime=0.35, edge_wear=1.0))
    spike = _tube('spike', [Vector((0, 0, 1.28)), Vector((0, 0, 1.46))], [0.022, 0.001], seg=6)
    O.assign(spike, O.recipe('spike', base=COL['steel'], tile_kind='steel', scale=3, grime=0.3))
    return _done([h, ob, spike], 256)


def _spearhead(z0, z1, w=0.035):
    head = _blade('spearhead', z0, z1, w, t=0.008, tip=(z1 - z0) * 0.55)
    O.assign(head, O.recipe('spearhead', base=COL['steel'], tile_kind='steel', scale=3, grime=0.3, edge_wear=1.0))
    sock = _tube('socket', [Vector((0, 0, z0 - 0.08)), Vector((0, 0, z0 + 0.01))], [0.022, 0.02], seg=8)
    O.assign(sock, O.recipe('socket', base=COL['iron'], tile_kind='steel', scale=3, grime=0.4))
    return [head, sock]


def w_spear():
    return _done([_haft(-0.7, 1.55, 0.018)] + _spearhead(1.55, 1.92), 256)


def w_pike():
    return _done([_haft(-1.6, 2.4, 0.019)] + _spearhead(2.4, 2.78, 0.03), 256)


def w_bow():
    """a recurve held upright, the belly toward the archer"""
    pts = []
    for k in range(13):
        t = k / 12 * 2 - 1
        pts.append(Vector((0, -(0.1 * (1 - t * t) - 0.04 * abs(t) ** 6), t * 0.62)))
    limb = _tube('limb', pts, [0.012 + 0.008 * (1 - abs(k / 6 - 1)) for k in range(13)], seg=6)
    O.assign(limb, O.recipe('limb', base=(0.35, 0.22, 0.12), tile_kind='leather', scale=3, grime=0.35))
    string = _tube('string', [pts[0], pts[-1]], [0.0025, 0.0025], seg=4)
    O.assign(string, O.recipe('string', base=COL['linen'], grime=0.2))
    return _done([limb, string], 128)


STATIC.update({'w_sword': w_sword, 'w_greatsword': w_greatsword, 'w_dagger': w_dagger, 'w_axe': w_axe, 'w_spear': w_spear, 'w_pike': w_pike, 'w_bow': w_bow})


# ---- Satha's head and jaw: placed by the game on her spine (forward is glTF +z = Blender -y; up is glTF +y = Blender +z)
def G(x, y, z):
    """glTF coordinates -> Blender coordinates."""
    return (x, -z, y)


def satha_head():
    """'the great shimmering white form': a broad flat skull, heavy brow-shields over burning eyes"""
    balls = [(*G(0, 0.5, 0.35), 0.95, (1.35, 1.25, 0.5)), (*G(0, 0.48, 1.05), 0.6, (1.15, 0.8, 0.42)), (*G(0, 0.45, -0.4), 0.75, (1.15, 0.9, 0.6))]
    sk = _metablob('satha_skull', balls, res=0.05)
    O.assign(sk, O.recipe('satha_scales', base=(0.86, 0.85, 0.78), tile_kind='scales', scale=7, grime=0.35, edge_wear=0.3))
    parts = [sk]
    for sx in (-1, 1):
        brow = _sphere('brow', Vector(G(sx * 0.5, 0.72, 0.6)), 0.22, dims=(1.2, 1.1, 0.4), seg=14, ring=8)
        O.assign(brow, O.recipe('brow', base=(0.8, 0.8, 0.72), tile_kind='scales', scale=4, grime=0.4))
        eye = _sphere('eye', Vector(G(sx * 0.62, 0.62, 0.66)), 0.11, dims=(0.8, 1, 0.9), seg=12, ring=8)
        O.assign(eye, O.recipe('eye', base=(1.0, 0.75, 0.15), grime=0.1, glow=1.0))
        pupil = _sphere('pupil', Vector(G(sx * 0.7, 0.62, 0.68)), 0.05, dims=(0.4, 1.4, 0.4), seg=8, ring=6)
        O.assign(pupil, O.recipe('slit', base=(0.02, 0.02, 0.02), grime=0))
        fang = _tube('fang', [Vector(G(sx * 0.36, 0.32, 1.2)), Vector(G(sx * 0.37, 0.06, 1.23)), Vector(G(sx * 0.35, -0.06, 1.18))], [0.05, 0.03, 0.002], seg=8)
        O.assign(fang, O.recipe('fang', base=(0.92, 0.9, 0.8), grime=0.2))
        parts += [brow, eye, pupil, fang]
    roof = _sphere('roof', Vector(G(0, 0.3, 0.6)), 0.5, dims=(1.3, 1.3, 0.2), seg=16, ring=8)
    O.assign(roof, O.recipe('mouth', base=(0.55, 0.08, 0.08), tile_kind='leather', scale=3, grime=0.3))
    parts.append(roof)
    return _done(parts, 512)


def satha_jaw():
    j = _metablob('satha_jaw', [(*G(0, 0.2, 0.45), 0.85, (1.15, 1.2, 0.3)), (*G(0, 0.18, -0.2), 0.6, (1.2, 0.6, 0.4))], res=0.05)
    O.assign(j, O.recipe('belly', base=(0.78, 0.8, 0.66), tile_kind='scales', scale=5, grime=0.35))
    tongue = _tube('tongue', [Vector(G(0, 0.28, 0.0)), Vector(G(0, 0.3, 0.8)), Vector(G(0.06, 0.32, 1.35)), Vector(G(0, 0.34, 1.55))], [0.08, 0.06, 0.03, 0.005], seg=8)
    O.assign(tongue, O.recipe('tongue', base=(0.5, 0.06, 0.08), grime=0.2))
    return _done([j, tongue], 256)


STATIC.update({'satha_head': satha_head, 'satha_jaw': satha_jaw})


def presence():
    """'something bodiless' floating up out of the well: a wavering column of pallor, drawn translucent"""
    import random
    rnd = random.Random(11)
    balls = []
    for k in range(22):
        t = k / 21
        z = -2 + t * 8.4
        r = 1.1 * math.sin(math.pi * min(1, t * 1.2)) + 0.25
        balls.append((rnd.uniform(-0.3, 0.3) * r, rnd.uniform(-0.3, 0.3) * r, z, r, (1, 1, 1.3)))
        if k % 3 == 0 and 0.15 < t < 0.85:                 # wisps trailing off it
            a = rnd.random() * 6.28
            balls.append((math.cos(a) * r * 1.1, math.sin(a) * r * 1.1, z - 0.4, r * 0.35, (1, 1, 2.2)))
    p = _metablob('presence', balls, res=0.16)
    O.assign(p, O.recipe('vapour', base=(0.75, 0.78, 0.74), tile_kind='fur', scale=2, grime=0.5, glow=0.4))
    return _done([p], 256)


STATIC.update({'presence': presence})
