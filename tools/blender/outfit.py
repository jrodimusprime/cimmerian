# Materials, baking and the outfit-making helpers: every surface gets a "recipe"
# (a node tree drawn to an emission socket), Cycles bakes it and the figure's
# ambient occlusion into one texture per object, and the export carries those.
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector, Matrix

ASSETS = os.environ.get('MH_ASSETS', '')


# ---- tiles: small seamless patterns painted in numpy -------------------------------
def _img_from(arr, name):
    h, w = arr.shape[:2]
    img = bpy.data.images.new(name, w, h, alpha=True)
    rgba = np.ones((h, w, 4), np.float32)
    rgba[..., :arr.shape[2]] = arr
    img.pixels.foreach_set(rgba.ravel())
    img.pack()
    return img


def _noise(n, seed, octaves=4):
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        k = 2 ** (o + 2)
        g = rng.random((k, k)).astype(np.float32)
        # bilinear upsample, wrapping, so the tile stays seamless
        xs = np.arange(n) * k / n
        x0 = np.floor(xs).astype(int); fx = xs - x0; x1 = (x0 + 1) % k
        a = g[np.ix_(x0, x0)] * (1 - fx)[None, :] + g[np.ix_(x0, x1)] * fx[None, :]
        b = g[np.ix_(x1, x0)] * (1 - fx)[None, :] + g[np.ix_(x1, x1)] * fx[None, :]
        out += amp * (a * (1 - fx)[:, None] + b * fx[:, None])
        tot += amp; amp *= 0.5
    return out / tot


def tile_mail(n=128, rings=8):
    """Riveted mail: rows of interlocking rings, each lit from above, gaps black."""
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / n * rings
    row = np.floor(y)
    fx = (x + (row % 2) * 0.5) % 1.0
    fy = y % 1.0
    d = np.sqrt((fx - 0.5) ** 2 + ((fy - 0.5) * 1.15) ** 2)
    ring = np.clip(1 - np.abs(d - 0.34) / 0.13, 0, 1)
    lit = 0.55 + 0.45 * np.clip((0.5 - fy) * 2 + 0.3, 0, 1)
    v = 0.12 + ring ** 0.7 * lit
    nz = _noise(n, 3)
    v = v * (0.8 + 0.4 * nz)
    return np.stack([v * 1.05, v * 1.05, v * 1.1], -1)


def tile_cloth(n=128, threads=24):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / n * threads
    warp = 0.5 + 0.5 * np.sin(x * math.pi * 2) * np.sign(np.sin(y * math.pi))
    weft = 0.5 + 0.5 * np.sin(y * math.pi * 2) * np.sign(np.sin(x * math.pi))
    v = 0.75 + 0.15 * (warp - weft) + 0.25 * (_noise(n, 5) - 0.5)
    return np.stack([v, v, v], -1)


def tile_leather(n=128):
    v = 0.7 + 0.35 * (_noise(n, 9, 6) - 0.5) - 0.15 * np.clip(_noise(n, 11, 3) - 0.6, 0, 1)
    return np.stack([v, v, v], -1)


def tile_steel(n=128):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / n
    brush = 0.08 * np.sin(y * 300 + _noise(n, 2, 3) * 6)
    v = 0.78 + brush + 0.25 * (_noise(n, 4, 5) - 0.5)
    pits = (_noise(n, 13, 6) > 0.72) * 0.25
    v = v - pits
    return np.stack([v, v, v * 1.02], -1)


def tile_fur(n=128):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / n
    strands = 0.5 + 0.5 * np.sin((x * 40 + _noise(n, 7, 4) * 10) * math.pi)
    v = 0.4 + 0.5 * strands * (0.6 + 0.4 * _noise(n, 8, 5))
    return np.stack([v, v, v], -1)


def tile_scales(n=128, k=10):
    y, x = np.mgrid[0:n, 0:n].astype(np.float32) / n * k
    row = np.floor(y)
    fx = (x + (row % 2) * 0.5) % 1.0
    fy = y % 1.0
    d = np.sqrt((fx - 0.5) ** 2 + (fy * 0.9) ** 2)
    v = np.clip(1.0 - d * 1.3, 0, 1) ** 0.6 * (fy > 0.0)
    v = 0.35 + 0.65 * v
    return np.stack([v, v, v], -1)


TILES = {'mail': tile_mail, 'cloth': tile_cloth, 'leather': tile_leather, 'steel': tile_steel, 'fur': tile_fur, 'scales': tile_scales}
_tile_cache = {}


def tile(kind):
    if kind not in _tile_cache:
        _tile_cache[kind] = _img_from(TILES[kind](), 'tile_' + kind)
    return _tile_cache[kind]


# ---- recipe materials: what gets baked ----------------------------------------------
def recipe(name, *, base=(0.5, 0.5, 0.5), tile_kind=None, scale=12.0, image=None, grime=0.35, edge_wear=0.0,
           stripes=None, glow=0.0, uv_mode='UV'):
    """A node tree whose emission is the surface colour: a tint, an optional tiled pattern
    (UV-mapped), an optional image (UV), large-scale grime in object space."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    em = N.new('ShaderNodeEmission')
    L.new(em.outputs[0], out.inputs['Surface'])
    tc = N.new('ShaderNodeTexCoord')
    lin = lambda c: tuple(max(0.0, x) ** 2.2 for x in c)       # the palette is written in display (sRGB) values; the nodes are linear
    col = N.new('ShaderNodeRGB'); col.outputs[0].default_value = (*lin(base), 1)
    cur = col.outputs[0]
    if image is not None:
        it = N.new('ShaderNodeTexImage'); it.image = image
        L.new(tc.outputs['UV'], it.inputs[0])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        L.new(it.outputs[0], mul.inputs[6]); L.new(cur, mul.inputs[7]); cur = mul.outputs[2]
    if tile_kind:
        mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale)
        L.new(tc.outputs['UV'] if uv_mode == 'UV' else tc.outputs['Object'], mp.inputs[0])
        it = N.new('ShaderNodeTexImage'); it.image = tile(tile_kind); it.interpolation = 'Cubic'
        L.new(mp.outputs[0], it.inputs[0])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        L.new(it.outputs[0], mul.inputs[6]); L.new(cur, mul.inputs[7]); cur = mul.outputs[2]
    if stripes:                                           # heraldry: a second colour in bands or a cross, in UV space
        kind, c2, freq = stripes
        sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
        if kind == 'bars':
            mth = N.new('ShaderNodeMath'); mth.operation = 'MULTIPLY'; mth.inputs[1].default_value = freq
            L.new(sep.outputs[2], mth.inputs[0])
            fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'; L.new(mth.outputs[0], fr.inputs[0])
            gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5; L.new(fr.outputs[0], gt.inputs[0])
            fac = gt.outputs[0]
        elif kind == 'halves':
            gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.0; L.new(sep.outputs[0], gt.inputs[0])
            fac = gt.outputs[0]
        else:                                             # 'cross': a broad cross on the chest
            ax = N.new('ShaderNodeMath'); ax.operation = 'ABSOLUTE'; L.new(sep.outputs[0], ax.inputs[0])
            lx = N.new('ShaderNodeMath'); lx.operation = 'LESS_THAN'; lx.inputs[1].default_value = freq; L.new(ax.outputs[0], lx.inputs[0])
            ay = N.new('ShaderNodeMath'); ay.operation = 'SUBTRACT'; ay.inputs[1].default_value = 1.32; L.new(sep.outputs[2], ay.inputs[0])
            ab = N.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L.new(ay.outputs[0], ab.inputs[0])
            ly = N.new('ShaderNodeMath'); ly.operation = 'LESS_THAN'; ly.inputs[1].default_value = freq; L.new(ab.outputs[0], ly.inputs[0])
            mx = N.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; L.new(lx.outputs[0], mx.inputs[0]); L.new(ly.outputs[0], mx.inputs[1])
            fac = mx.outputs[0]
        c2n = N.new('ShaderNodeRGB'); c2n.outputs[0].default_value = (*lin(c2), 1)
        mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MIX'
        L.new(fac, mix.inputs[0]); L.new(cur, mix.inputs[6])
        if tile_kind:
            mul2 = N.new('ShaderNodeMix'); mul2.data_type = 'RGBA'; mul2.blend_type = 'MULTIPLY'; mul2.inputs[0].default_value = 1.0
            L.new(c2n.outputs[0], mul2.inputs[6]); L.new(mul.outputs[2] if False else it.outputs[0], mul2.inputs[7])
            L.new(mul2.outputs[2], mix.inputs[7])
        else:
            L.new(c2n.outputs[0], mix.inputs[7])
        cur = mix.outputs[2]
    if grime > 0:                                         # stains, at the scale of a body, in object space
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.5; nz.inputs['Detail'].default_value = 8
        L.new(tc.outputs['Object'], nz.inputs[0])
        rmp = N.new('ShaderNodeMapRange'); rmp.inputs[1].default_value = 0.45; rmp.inputs[2].default_value = 0.8
        rmp.inputs[3].default_value = 1.0; rmp.inputs[4].default_value = 1.0 - grime
        L.new(nz.outputs[0], rmp.inputs[0])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        L.new(cur, mul.inputs[6]); L.new(rmp.outputs[0], mul.inputs[7]); cur = mul.outputs[2]
    if edge_wear > 0:                                     # bright worn edges where the surface turns (pointiness)
        geo = N.new('ShaderNodeNewGeometry')
        rmp = N.new('ShaderNodeMapRange'); rmp.inputs[1].default_value = 0.52; rmp.inputs[2].default_value = 0.6
        rmp.inputs[3].default_value = 1.0; rmp.inputs[4].default_value = 1.0 + edge_wear
        L.new(geo.outputs['Pointiness'], rmp.inputs[0])
        mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
        L.new(cur, mul.inputs[6]); L.new(rmp.outputs[0], mul.inputs[7]); cur = mul.outputs[2]
    L.new(cur, em.inputs['Color'])
    m['glow'] = glow
    return m


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# ---- baking -----------------------------------------------------------------------
def _bake_target(obj, img):
    for slot in obj.material_slots:
        nt = slot.material.node_tree
        n = nt.nodes.get('bake_target') or nt.nodes.new('ShaderNodeTexImage')
        n.name = 'bake_target'; n.image = img
        nt.nodes.active = n


def bake(objs, size=1024, ao_strength=0.7, ao_samples=24, margin=8):
    """Bake each object's recipe and the whole figure's AO; give each a final material."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.render.bake.margin = margin
    for obj in objs:
        if not obj.data.uv_layers:
            smart_uv(obj)
        sz = obj.get('tex_size', size)
        col = bpy.data.images.new(obj.name + '_col', sz, sz, alpha=False)
        aoi = bpy.data.images.new(obj.name + '_ao', sz, sz, alpha=False); aoi.colorspace_settings.name = 'Non-Color'
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True); bpy.context.view_layer.objects.active = obj
        _bake_target(obj, col)
        sc.cycles.samples = 1
        bpy.ops.object.bake(type='EMIT')
        _bake_target(obj, aoi)
        sc.cycles.samples = ao_samples
        bpy.ops.object.bake(type='AO')
        c = np.array(col.pixels[:], np.float32).reshape(sz, sz, 4)
        a = np.array(aoi.pixels[:], np.float32).reshape(sz, sz, 4)[..., :1]
        ao = 1.0 - obj.get('ao', ao_strength) * (1.0 - a)
        c[..., :3] = np.clip(c[..., :3] * ao, 0, 1)
        final = bpy.data.images.new(obj.name + '_tex', sz, sz, alpha=False)
        final.pixels.foreach_set(c.ravel()); final.pack()
        glow = max((s.material.get('glow', 0.0) for s in obj.material_slots), default=0.0)
        m = bpy.data.materials.new(obj.name + '_mat'); m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        it = m.node_tree.nodes.new('ShaderNodeTexImage'); it.image = final
        m.node_tree.links.new(it.outputs[0], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.8
        if glow > 0:
            bsdf.inputs['Emission Color'].default_value = (1, 1, 1, 1)
            bsdf.inputs['Emission Strength'].default_value = glow
        obj.data.materials.clear(); obj.data.materials.append(m)


def smart_uv(obj, angle=66, margin=0.02):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


# ---- geometry helpers ---------------------------------------------------------------
def region_shell(src, name, groups, *, offset=0.012, min_weight=0.35, keep=None, thickness=0.0, smooth=0):
    """A garment cut from the body: the faces whose vertices belong to `groups` (bone
    weights), pushed out along the normals. It keeps the body's UVs and weights."""
    obj = src.copy(); obj.data = src.data.copy(); obj.name = name
    bpy.context.collection.objects.link(obj)
    for m in list(obj.modifiers):
        if m.type != 'ARMATURE':
            obj.modifiers.remove(m)
    idx = [obj.vertex_groups[g].index for g in groups if g in obj.vertex_groups]
    bm = bmesh.new(); bm.from_mesh(obj.data)
    dl = bm.verts.layers.deform.active
    inside = set()
    for v in bm.verts:
        w = sum(v[dl].get(i, 0.0) for i in idx) if dl else 0.0
        if w >= min_weight and (keep is None or keep(v.co)):
            inside.add(v)
    kill = [f for f in bm.faces if not all(v in inside for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    # cloth doesn't carry the body's anatomy: relax the shell (boundary pinned) so it hangs, not clings
    if smooth:
        inner = [v for v in bm.verts if not v.is_boundary]
        for _ in range(smooth):
            bmesh.ops.smooth_vert(bm, verts=inner, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        # smoothing shrinks: anything that sank toward (or into) the body goes back out to `offset` above its skin
        from mathutils.bvhtree import BVHTree
        sb = bmesh.new(); sb.from_mesh(src.data); sb.normal_update()
        tree = BVHTree.FromBMesh(sb)
        for v in inner:
            loc, nrm, idx, dist = tree.find_nearest(v.co)
            if loc is None:
                continue
            d = (v.co - loc).dot(nrm)
            floor = offset if smooth < 20 else offset * 0.55        # loose cloth may sag toward the body, not into it
            if d < floor:
                v.co = v.co + v.normal * (floor - d)
        sb.free()
        for _ in range(max(3, smooth // 4)):                               # and smooth away any spikes that push made
            bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        bm.normal_update()
    bm.to_mesh(obj.data); bm.free()
    if thickness > 0:
        sol = obj.modifiers.new('thick', 'SOLIDIFY'); sol.thickness = thickness; sol.offset = 1.0
        apply_mod(obj, sol)
    return obj


def apply_mod(obj, mod):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    # the armature modifier must not be applied: move this one to the top and apply it alone
    while obj.modifiers.find(mod.name) > 0:
        bpy.ops.object.modifier_move_up(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def transfer_weights(dst, src):
    """Copy skin weights from the body onto a garment, nearest face by face."""
    for g in src.vertex_groups:
        if g.name not in dst.vertex_groups:
            dst.vertex_groups.new(name=g.name)
    dt = dst.modifiers.new('wt', 'DATA_TRANSFER')
    dt.object = src
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'
    dt.layers_vgroup_select_dst = 'NAME'
    apply_mod(dst, dt)


def parent_rigid(obj, rig, bone):
    """Ride one bone rigidly (helmets, pauldrons, shields)."""
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    g = obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    obj.parent = rig
    for m in list(obj.modifiers):
        if m.type == 'ARMATURE':
            obj.modifiers.remove(m)
    am = obj.modifiers.new('rig', 'ARMATURE'); am.object = rig


def skin_to(obj, rig):
    obj.parent = rig
    if not any(m.type == 'ARMATURE' for m in obj.modifiers):
        am = obj.modifiers.new('rig', 'ARMATURE'); am.object = rig


def decimate(obj, ratio):
    if ratio >= 0.999:
        return
    d = obj.modifiers.new('dec', 'DECIMATE'); d.ratio = ratio; d.use_collapse_triangulate = True
    apply_mod(obj, d)


def shade_smooth(obj, angle=50):
    for p in obj.data.polygons:
        p.use_smooth = True
    try:
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True); bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        pass


def bone_head(rig, name):
    return rig.matrix_world @ rig.data.bones[name].head_local


def bone_tail(rig, name):
    return rig.matrix_world @ rig.data.bones[name].tail_local


def drape(cloth, colliders, pin_pred, frames=36, mass=0.25, shrink=0.0):
    """Let a garment fall under gravity onto the body and freeze it there: real folds, real drape.
    `pin_pred(co)` picks the vertices held fixed (a waistband, a collar)."""
    sc = bpy.context.scene
    pin = cloth.vertex_groups.get('pin') or cloth.vertex_groups.new(name='pin')
    pin.add([v.index for v in cloth.data.vertices if pin_pred(v.co)], 1.0, 'REPLACE')
    for c in colliders:
        cm = c.modifiers.new('collide', 'COLLISION')
        c.collision.thickness_outer = 0.012
        c.collision.cloth_friction = 8
    arm = [m for m in cloth.modifiers if m.type == 'ARMATURE']
    for m in arm:
        m.show_viewport = False
    cm = cloth.modifiers.new('cloth', 'CLOTH')
    st = cm.settings
    st.quality = 6; st.mass = mass; st.air_damping = 1.5
    st.tension_stiffness = 12; st.compression_stiffness = 12; st.bending_stiffness = 0.6
    st.vertex_group_mass = 'pin'
    st.shrink_min = shrink
    cm.collision_settings.distance_min = 0.008
    cm.collision_settings.use_self_collision = False
    cm.point_cache.frame_start = 1; cm.point_cache.frame_end = frames
    sc.frame_start = 1; sc.frame_end = frames
    for f in range(1, frames + 1):
        sc.frame_set(f)
    bpy.ops.object.select_all(action='DESELECT')
    cloth.select_set(True); bpy.context.view_layer.objects.active = cloth
    while cloth.modifiers.find('cloth') > 0:
        bpy.ops.object.modifier_move_up(modifier='cloth')
    bpy.ops.object.modifier_apply(modifier='cloth')
    for m in arm:
        m.show_viewport = True
    for c in colliders:
        c.modifiers.remove(c.modifiers['collide'])
    sc.frame_set(1)
