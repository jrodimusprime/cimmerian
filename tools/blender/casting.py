# The cast, as recipes: body macros, skin, hair and outfit for each character the
# campaign uses (README §8; the book's words for each are in game/js/chars/cast.js).
import bpy, os, math
import body, outfit, gear

MH = os.environ.get('MH_ASSETS', '')
SKIN = {
    'cauc_mid': 'sys/skins/middleage_caucasian_male',
    'cauc_young': 'sys/skins/young_caucasian_male',
    'cauc_old': 'sys/skins/old_caucasian_male',
    'afr_mid': 'sys/skins/middleage_african_male',
    'afr_young': 'sys/skins/young_african_male',
    'afr_old': 'sys/skins/old_african_male',
    'asian_mid': 'sys/skins/middleage_asian_male',
    'slavic_beard': 'skins/skins/jartur69_middleage_slavic_male_with_genitals_and_beard',
    'old_eurasian': 'skins/skins/onlytheghosts_old_eurasian_male',
    'african_mf': 'skins/skins/mindfront_skin_male_african_middleage',
}


def skin_image(key):
    d = os.path.join(MH, SKIN[key])
    cands = sorted(f for f in os.listdir(d) if f.endswith('.png') and not any(x in f.lower() for x in ('nrm', 'spec', 'normal', 'thumb', '_ao', 'bump')))
    return bpy.data.images.load(os.path.join(d, cands[0]), check_existing=True)


def alpha_material(obj):
    """Hair and brows keep their own CC0 texture, alpha-tested (glTF MASK), tinted."""
    import numpy as np
    img = bpy.data.images.load(obj['alpha_tex'], check_existing=False)
    w, hgt = img.size
    px = np.array(img.pixels[:], np.float32).reshape(hgt, w, 4)
    t = obj['alpha_tint']
    lum = px[..., :3].mean(-1, keepdims=True)
    px[..., :3] = np.clip(lum * np.array(t, np.float32) * 1.6, 0, 1)
    small = px[::2, ::2]
    img2 = bpy.data.images.new(obj.name + '_tex', small.shape[1], small.shape[0], alpha=True)
    img2.pixels.foreach_set(small.ravel()); img2.pack()
    m = bpy.data.materials.new(obj.name + '_mat'); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    it = m.node_tree.nodes.new('ShaderNodeTexImage'); it.image = img2
    m.node_tree.links.new(it.outputs[0], bsdf.inputs['Base Color'])
    m.node_tree.links.new(it.outputs[1], bsdf.inputs['Alpha'])
    try:
        m.blend_method = 'CLIP'
    except Exception:
        pass
    try:
        m.surface_render_method = 'DITHERED'
    except Exception:
        pass
    obj.data.materials.clear(); obj.data.materials.append(m)
    obj['nobake'] = 1


def eye_material(obj):
    """MakeHuman's CC0 eye texture, as it is (the iris is in its own UVs)."""
    img = bpy.data.images.load(obj['eye_tex'], check_existing=True)
    m = bpy.data.materials.new('eye_mat'); m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    it = m.node_tree.nodes.new('ShaderNodeTexImage'); it.image = img
    m.node_tree.links.new(it.outputs[0], bsdf.inputs['Base Color'])
    obj.data.materials.clear(); obj.data.materials.append(m)
    obj['nobake'] = 1


def human(spec):
    """Body, rig, rest pose, skin: the common start of every man in the cast."""
    h, rig = body.make_human(spec['macro'], spec.get('race', {'asian': 0.1, 'caucasian': 0.8, 'african': 0.1}))
    if spec.get('targets'):
        body.apply_targets(h, spec['targets'])
    assets = []
    for kind, (name, tint) in (('Hair', spec.get('hair', (None, None))), ('Eyebrows', spec.get('brows', (None, None)))):
        if name:
            d = os.path.join(MH, 'sys', kind.lower(), name)
            a = body.add_asset(h, os.path.join(d, name + '.mhclo'), kind)
            png = [f for f in os.listdir(d) if f.endswith('.png') and 'normal' not in f and 'ao' not in f.lower()]
            a['alpha_tex'] = os.path.join(d, png[0]); a['alpha_tint'] = tint; a.name = kind.lower()
            assets.append(a)
    eye = spec.get('eye', 'brown')
    if eye and not any(isinstance(i, dict) and i.get('glow') for i in spec.get('outfit', [])):
        d = os.path.join(MH, 'sys', 'eyes', 'low-poly')
        e = body.add_asset(h, os.path.join(d, 'low-poly.mhclo'), 'Eyes')
        e['eye_tex'] = os.path.join(MH, 'sys', 'eyes', 'materials', eye + '_eye.png'); e.name = 'eyes'
        assets.append(e)
    body.stand(rig, arm_out=spec.get('arm_out', 0.12))
    body.apply_rest(rig)
    helpers = body.split_helpers(h)
    body.fold_fingers(h, rig)
    for o in [h] + list(helpers.values()) + assets:
        body.clean_groups(o, rig)
        for m in list(o.modifiers):
            if m.type in ('SUBSURF', 'MASK'):
                o.modifiers.remove(m)
    for a in assets:
        if a.get('eye_tex'):
            eye_material(a)
        else:
            alpha_material(a)
    helpers['assets'] = assets
    h.name = 'body'
    neutral = (0.6, 0.54, 0.54) if 'afr' in (spec.get('skin') or '') else (0.88, 0.82, 0.8)   # 'black giants': keep Kush dark under the torchlight   # the palette pushes warm skin to gold: start it cooler
    tint = spec.get('skin_tint', neutral)
    outfit.assign(h, outfit.recipe('skin', base=tint, image=skin_image(spec['skin']) if spec.get('skin') else None,
                                   tile_kind=spec.get('skin_tile'), scale=10, grime=spec.get('dirt', 0.25)))
    h['tex_size'] = 1024
    return h, rig, helpers


OCCLUDERS = {'shirt', 'robe_top', 'robe', 'breeches', 'boots', 'gloves', 'skirt', 'fur', 'hood', 'helm'}


def hide_covered(h, cover):
    """Delete the body's skin wherever a garment covers it (rays out along the normal hit cloth or steel):
    nothing pokes through in any pose, and fewer triangles."""
    import bmesh
    from mathutils.bvhtree import BVHTree
    if not cover:
        return
    trees = []
    for c in cover:
        bm = bmesh.new(); bm.from_mesh(c.data); trees.append(BVHTree.FromBMesh(bm)); bm.free()
    bm = bmesh.new(); bm.from_mesh(h.data); bm.normal_update()
    hidden = set()
    for v in bm.verts:
        if all(t.ray_cast(v.co + v.normal * 0.001, v.normal, 0.2)[0] is not None for t in trees[:0]) and False:
            pass
        if any(t.ray_cast(v.co + v.normal * 0.001, v.normal, 0.2)[0] is not None for t in trees):
            hidden.add(v)
    kill = [f for f in bm.faces if all(v in hidden for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(h.data); bm.free()


def finish(objs, rig, body_ratio=0.38):
    """Smooth, bake, decimate."""
    for o in objs:
        outfit.shade_smooth(o)
    outfit.bake([o for o in objs if not o.get('nobake')])
    for o in objs:
        r = o.get('decimate', body_ratio if o.name == 'body' else (0.35 if len(o.data.polygons) > 4000 else 0.5 if len(o.data.polygons) > 1500 else 1.0))
        outfit.decimate(o, r)


def build(cid, spec):
    h, rig, helpers = human(spec)
    objs = [h] + helpers.pop('assets')
    for item in spec.get('outfit', []):
        objs += gear.make(item, h, rig, helpers, spec)
    for k, o in helpers.items():                    # unused helper geometry goes
        if o.name in bpy.data.objects and o not in objs:
            bpy.data.objects.remove(o, do_unlink=True)
    hide_covered(h, [o for o in objs if o.name.split('.')[0] in OCCLUDERS])
    finish(objs, rig)
    for o in objs:
        if o.parent is None:
            o.parent = rig
    return {'rig': rig, 'objs': objs}


M = lambda **k: k
W = {'asian': 0.05, 'caucasian': 0.9, 'african': 0.05}           # the west's men
K = {'asian': 0.2, 'caucasian': 0.55, 'african': 0.25}            # Koth and Shem: darker
B = {'asian': 0.0, 'caucasian': 0.05, 'african': 0.95}            # Kush: the black giants
HARD = {'forehead/forehead-scale-vert-decr': 0.7, 'eyebrows/eyebrows-trans-forward': 0.8, 'eyebrows/eyebrows-trans-down': 0.4, 'eyebrows/eyebrows-angle-down': 0.5,
        'chin/chin-width-incr': 0.7, 'chin/chin-prominent-incr': 0.5, 'chin/chin-bones-incr': 0.6, 'cheek/l-cheek-bones-incr': 0.6, 'cheek/r-cheek-bones-incr': 0.6,
        'cheek/l-cheek-volume-decr': 0.4, 'cheek/r-cheek-volume-decr': 0.4, 'head/head-square': 0.6, 'nose/nose-scale-horiz-incr': 0.3}
VULTURE = {'nose/nose-scale-vert-incr': 0.8, 'nose/nose-scale-depth-incr': 0.9, 'cheek/l-cheek-volume-decr': 1.0, 'cheek/r-cheek-volume-decr': 1.0,
           'cheek/l-cheek-bones-incr': 0.8, 'cheek/r-cheek-bones-incr': 0.8, 'eyebrows/eyebrows-trans-forward': 0.6, 'head/head-triangular': 0.6, 'chin/chin-prominent-incr': 0.4}
BIG0 = {'torso/torso-vshape-incr': 0.8, 'torso/torso-muscle-pectoral-incr': 0.7, 'torso/torso-muscle-dorsi-incr': 0.6,
       'arms/l-upperarm-muscle-incr': 0.7, 'arms/r-upperarm-muscle-incr': 0.7, 'arms/l-lowerarm-muscle-incr': 0.5, 'arms/r-lowerarm-muscle-incr': 0.5,
       'neck/measure-neck-circ-incr': 0.6}
BIG = dict(BIG0, **HARD)


def armoured(*extra, shirt=None, legs='dark_leather', boots='leather', gloves='dark_leather', belt=True):
    out = ['eyes', dict(kind='shirt', **{('kind_' if k == 'kind' else k): v for k, v in (shirt or {}).items()}), dict(kind='legs', col=legs), dict(kind='boots', col=boots)]
    if gloves:
        out.append(dict(kind='gloves', col=gloves))
    if belt:
        out.append(dict(kind='belt', at=0.0))
    return out + list(extra)


THING = {'arms/l-upperarm-scale-vert-incr': 1.0, 'arms/r-upperarm-scale-vert-incr': 1.0, 'arms/l-lowerarm-scale-vert-incr': 0.6, 'arms/r-lowerarm-scale-vert-incr': 0.6,
         'head/head-scale-depth-incr': 1.0, 'head/head-back-scale-depth-incr': 1.0, 'head/head-scale-vert-incr': 0.7, 'head/head-trans-forward': 1.0, 'head/head-age-incr': 1.0, 'head/head-fat-decr': 1.0,
         'mouth/mouth-scale-horiz-incr': 1.0, 'expression/units/caucasian/mouth-open': 1.0, 'nose/nose-scale-depth-decr': 1.0,
         'stomach/stomach-tone-decr': 1.0, 'torso/torso-muscle-dorsi-incr': 1.0, 'neck/measure-neck-circ-decr': 1.0}

CAST = {
    # ---- the king ----
    'conan': dict(macro=M(gender=1.0, age=0.45, muscle=1.0, weight=0.68, height=0.75, proportions=1.0), race=W, skin='cauc_mid',
                  skin_tint=(0.8, 0.68, 0.6), dirt=0.55, targets=BIG, hair=('long01', (0.05, 0.045, 0.04)), brows=('eyebrow001', (0.05, 0.04, 0.03)), eye='blue',
                  outfit=['loincloth', 'belt', 'eyes']),
    'conan_mail': dict(macro=M(gender=1.0, age=0.45, muscle=1.0, weight=0.68, height=0.75, proportions=1.0), race=W, skin='cauc_mid', targets=BIG,
                       skin_tint=(0.8, 0.68, 0.6), dirt=0.55, hair=('long01', (0.05, 0.045, 0.04)), brows=('eyebrow001', (0.05, 0.04, 0.03)),
                       outfit=armoured(dict(kind='helm', mask=False, crest=True, metal='dark_steel'), dict(kind='pauldrons', metal='dark_steel'),
                                       shirt=dict(col='blackmail', sleeves='wrist', skirt=0.35), legs='blackmail', gloves='black')),
    # ---- e0m1 ----
    'assassin': dict(macro=M(gender=1.0, age=0.4, muscle=0.6, weight=0.35, height=0.55), race=K, skin='cauc_mid',
                     outfit=armoured(dict(kind='hood', col='black', mask=True), dict(kind='cloak', col='black', length=0.9),
                                     shirt=dict(kind='leather', col='dark_leather', sleeves='wrist', skirt=0.3, scale=10), legs='black', boots='dark_leather')),
    'gromel': dict(macro=M(gender=1.0, age=0.5, muscle=0.9, weight=0.8, height=1.0, proportions=0.8), race=W, skin='cauc_mid', targets=BIG,
                   outfit=armoured(dict(kind='helm', mask=True, crest=True, metal='dark_steel', aventail_col='blackmail'), dict(kind='pauldrons', metal='dark_steel', spikes=True),
                                   dict(kind='tabard', col='black', length=0.45), shirt=dict(col='blackmail', sleeves='wrist', skirt=0.35), legs='blackmail', gloves='black')),
    'volmana': dict(macro=M(gender=1.0, age=0.6, muscle=0.7, weight=0.85, height=0.0, proportions=0.2), race=W, skin='cauc_mid',
                    outfit=armoured(dict(kind='helm', mask=True, point=0.05), dict(kind='pauldrons'), dict(kind='tabard', col='bronze', col2='night', pattern='halves'), dict(kind='shield', col='leather'),
                                    shirt=dict(sleeves='wrist', skirt=0.35))),
    'rinaldo': dict(macro=M(gender=1.0, age=0.35, muscle=0.35, weight=0.3, height=0.55), race=W, skin='cauc_young', hair=('short02', (0.25, 0.15, 0.08)),
                    brows=('eyebrow001', (0.2, 0.12, 0.06)),
                    outfit=armoured(dict(kind='cap', col='velvet'), shirt=dict(kind='cloth', col='velvet', sleeves='wrist', skirt=0.2, scale=12), legs='black', gloves=None)),
    'ascalante': dict(macro=M(gender=1.0, age=0.5, muscle=0.6, weight=0.3, height=0.85), race=W, skin='cauc_mid', targets=dict(HARD, **{'chin/chin-width-incr': 0.0, 'head/head-triangular': 0.5}), hair=('ponytail01', (0.06, 0.05, 0.04)),
                      brows=('eyebrow001', (0.06, 0.05, 0.04)),
                      outfit=armoured(dict(kind='cloak', col='velvet', length=0.95), shirt=dict(kind='cloth', col='velvet', sleeves='wrist', skirt=0.3, scale=12), legs='black', gloves=None)),
    'epemitreus': dict(macro=M(gender=1.0, age=1.0, muscle=0.2, weight=0.25, height=0.6), race=W, skin='cauc_old', skin_tint=(0.85, 0.85, 0.85),
                       outfit=['eyes', dict(kind='robe', col='linen', name='robe'), dict(kind='hood', col='white', deep=True), dict(kind='beard', col='white', length=0.22)]),
    # ---- e1m1 ----
    'kknight': dict(macro=M(gender=1.0, age=0.5, muscle=0.75, weight=0.6, height=0.65), race=K, skin='cauc_mid', targets=BIG,
                    outfit=armoured(dict(kind='helm', mask=True), dict(kind='pauldrons'), dict(kind='tabard', col='scarlet'), dict(kind='shield', col='blood'), shirt=dict(sleeves='wrist', skirt=0.35))),
    'oknight': dict(macro=M(gender=1.0, age=0.45, muscle=0.7, weight=0.5, height=0.65), race=W, skin='cauc_mid',
                    outfit=armoured(dict(kind='helm', mask=True, crest=True, plume='scarlet', metal='gilt', aventail_col='gilt'), dict(kind='tabard', col='gilt', col2='scarlet', pattern='bars'), dict(kind='shield', col='leather'),
                                    shirt=dict(col='gilt', sleeves='wrist', skirt=0.35))),
    'spearman': dict(macro=M(gender=1.0, age=0.45, muscle=0.6, weight=0.55, height=0.55), race=K, skin='asian_mid', brows=('eyebrow001', (0.04, 0.03, 0.03)),
                     outfit=armoured(dict(kind='helm', mask=False, point=0.07), dict(kind='tabard', col='scarlet', length=0.3), shirt=dict(sleeves='elbow', skirt=0.3), gloves=None)),
    'archer': dict(macro=M(gender=1.0, age=0.5, muscle=0.6, weight=0.65, height=0.25, proportions=0.3), race=K, skin='slavic_beard', skin_tint=(0.78, 0.66, 0.55),
                   brows=('eyebrow001', (0.03, 0.03, 0.05)),
                   outfit=armoured(dict(kind='hood', col='leather'), dict(kind='beard', col='blueblack', length=0.12), dict(kind='bracers'),
                                   shirt=dict(kind='leather', col='leather', sleeves='elbow', skirt=0.3, scale=10), gloves=None)),
    'pikeman': dict(macro=M(gender=1.0, age=0.5, muscle=0.85, weight=0.7, height=0.95), race=K, skin='cauc_mid', targets=BIG, brows=('eyebrow001', (0.04, 0.03, 0.03)),
                    outfit=armoured(dict(kind='helm', mask=False, kettle=True), shirt=dict(sleeves='elbow', skirt=0.4))),
    'strabonus': dict(macro=M(gender=1.0, age=0.6, muscle=0.55, weight=0.95, height=0.55, proportions=0.4), race=K, skin='asian_mid', skin_tint=(0.75, 0.62, 0.5),
                      targets={'stomach/stomach-pregnant-incr': 0.35, 'head/head-fat-incr': 0.7, 'head/head-square': 0.8, 'cheek/l-cheek-volume-incr': 0.6, 'cheek/r-cheek-volume-incr': 0.6, 'eyebrows/eyebrows-angle-down': 0.6}, brows=('eyebrow001', (0.03, 0.03, 0.03)),
                      outfit=armoured(dict(kind='helm', mask=False, crown=True, metal='steel'), dict(kind='beard', col='beard', length=0.05), dict(kind='cloak', col='scarlet'),
                                      dict(kind='tabard', col='scarlet'), dict(kind='pauldrons', metal='gilt'), shirt=dict(sleeves='wrist', skirt=0.35))),
    'amalrus': dict(macro=M(gender=1.0, age=0.45, muscle=0.4, weight=0.2, height=0.65), race=W, skin='cauc_young', targets={'head/head-triangular': 0.8, 'nose/nose-scale-horiz-decr': 0.5, 'eyebrows/eyebrows-angle-up': 0.4}, brows=('eyebrow001', (0.15, 0.1, 0.05)),
                    outfit=armoured(dict(kind='helm', mask=False, crown=True, metal='gilt', aventail_col='gilt'), dict(kind='cloak', col='scarlet'),
                                    dict(kind='tabard', col='gilt', col2='scarlet', pattern='bars'), shirt=dict(col='gilt', sleeves='wrist', skirt=0.35))),
    'tsotha': dict(macro=M(gender=1.0, age=0.85, muscle=0.25, weight=0.1, height=0.75), race={'asian': 0.4, 'caucasian': 0.5, 'african': 0.1}, targets=VULTURE,
                   skin='old_eurasian', skin_tint=(0.82, 0.8, 0.75), brows=('eyebrow001', (0.03, 0.03, 0.03)),
                   outfit=['eyes', dict(kind='robe', col='silk', flare=1.35), dict(kind='beard', col='grey_beard', length=0.1, width=0.35)]),
    # ---- e1m2 ----
    'giant': dict(macro=M(gender=1.0, age=0.45, muscle=1.0, weight=0.75, height=1.0, proportions=1.0), race=B, skin='afr_mid', targets=BIG, dirt=0.4,
                  brows=('eyebrow001', (0.02, 0.02, 0.02)), outfit=['loincloth', 'belt', 'eyes']),
    'shukeli': dict(macro=M(gender=0.8, age=0.6, muscle=0.0, weight=1.0, height=0.45), race={'asian': 0.3, 'caucasian': 0.6, 'african': 0.1}, skin='cauc_mid',
                    skin_tint=(0.9, 0.85, 0.7), targets={'stomach/stomach-pregnant-incr': 0.9, 'neck/neck-double-incr': 1.0},
                    outfit=['eyes', dict(kind='robe', col='ochre', flare=1.2, belly=0.3), dict(kind='belt', col='green', at=0.12, height=0.08)]),
    # ---- e1m4 ----
    'pelias': dict(macro=M(gender=1.0, age=0.55, muscle=0.25, weight=0.0, height=0.8), race=W, skin='cauc_old', skin_tint=(0.86, 0.84, 0.8),
                   targets={'forehead/forehead-scale-vert-incr': 1.0, 'cheek/l-cheek-volume-decr': 0.8, 'cheek/r-cheek-volume-decr': 0.8, 'head/head-oval': 0.6},
                   hair=('short02', (0.08, 0.07, 0.06)), brows=('eyebrow001', (0.06, 0.05, 0.05)),
                   outfit=['loincloth', 'eyes', dict(kind='beard', col='beard', length=0.04, width=0.7)]),
    # ---- e1m5 ----
    'axeman': dict(macro=M(gender=1.0, age=0.45, muscle=1.0, weight=0.7, height=1.0), race=B, skin='afr_young', targets=BIG,
                   outfit=['eyes', dict(kind='helm', mask=True, horns=True, metal='dark_steel'), dict(kind='skirt'), dict(kind='belt'), dict(kind='boots'),
                           dict(kind='pauldrons', metal='dark_steel', spikes=True), dict(kind='cloak', col='scarlet'), dict(kind='bracers', kind_='steel')]),
    'slave': dict(macro=M(gender=1.0, age=0.25, muscle=0.5, weight=0.35, height=0.45), race=B, skin='afr_young', brows=('eyebrow001', (0.02, 0.02, 0.02)),
                  outfit=['loincloth', 'eyes', 'collar']),
    # ---- e1m6 ----
    'arpello': dict(macro=M(gender=1.0, age=0.5, muscle=0.7, weight=0.8, height=0.75), race=W, skin='cauc_mid', targets=BIG,
                    outfit=armoured(dict(kind='helm', mask=True, plume='bronze'), dict(kind='pauldrons'), dict(kind='tabard', col='bronze', col2='black', pattern='halves'),
                                    shirt=dict(sleeves='wrist', skirt=0.35))),
    'pellian': dict(macro=M(gender=1.0, age=0.45, muscle=0.6, weight=0.6, height=0.55), race=W, skin='cauc_mid', brows=('eyebrow001', (0.1, 0.07, 0.04)),
                    outfit=armoured(dict(kind='helm', mask=False, kettle=True), dict(kind='tabard', col='bronze', col2='black', pattern='halves', length=0.3), dict(kind='shield', col='leather'),
                                    shirt=dict(sleeves='elbow', skirt=0.3))),
    'pellian_archer': dict(macro=M(gender=1.0, age=0.4, muscle=0.5, weight=0.45, height=0.5), race=W, skin='cauc_young', brows=('eyebrow001', (0.1, 0.07, 0.04)),
                           outfit=armoured(dict(kind='helm', mask=False, kettle=True), dict(kind='bracers'),
                                           shirt=dict(kind='leather', col='bronze', sleeves='elbow', skirt=0.3, scale=10), gloves=None)),
    # ---- e1m7 ----
    'trocero': dict(macro=M(gender=1.0, age=0.65, muscle=0.7, weight=0.65, height=0.7), race=W, skin='cauc_mid',
                    outfit=armoured(dict(kind='helm', mask=True, plume='night'), dict(kind='pauldrons'), dict(kind='tabard', col='night', col2='bronze', pattern='cross'), dict(kind='shield', col='night'),
                                    shirt=dict(sleeves='wrist', skirt=0.35))),
    'prospero': dict(macro=M(gender=1.0, age=0.4, muscle=0.8, weight=0.55, height=0.8), race=W, skin='cauc_young', brows=('eyebrow001', (0.12, 0.08, 0.05)),
                     outfit=armoured(dict(kind='helm', mask=False, crest=True), dict(kind='pauldrons'), dict(kind='tabard', col='night', col2='bronze', pattern='cross'),
                                     shirt=dict(sleeves='wrist', skirt=0.35))),
    'pknight': dict(macro=M(gender=1.0, age=0.45, muscle=0.7, weight=0.55, height=0.65), race=W, skin='cauc_mid',
                    outfit=armoured(dict(kind='helm', mask=True), dict(kind='tabard', col='night', col2='bronze', pattern='cross'), dict(kind='shield', col='night'), shirt=dict(sleeves='wrist', skirt=0.35))),
    'bossonian': dict(macro=M(gender=1.0, age=0.45, muscle=0.65, weight=0.6, height=0.6), race=W, skin='cauc_mid', brows=('eyebrow001', (0.1, 0.07, 0.04)),
                      outfit=armoured(dict(kind='helm', mask=False, kettle=True), dict(kind='bracers'),
                                      shirt=dict(kind='leather', col='green', sleeves='elbow', skirt=0.3, scale=10), gloves=None)),
    'gunderman': dict(macro=M(gender=1.0, age=0.4, muscle=0.75, weight=0.55, height=0.8), race=W, skin='cauc_young', hair=('long01', (0.55, 0.38, 0.17)),
                      brows=('eyebrow001', (0.45, 0.3, 0.12)),
                      outfit=armoured(dict(kind='helm', mask=False, kettle=True, aventail_col=None), dict(kind='tabard', col='grey_white', col2='scarlet', pattern='bars'),
                                      shirt=dict(sleeves='elbow', skirt=0.35))),
    # ---- the pits' nameless things (README §1: "monsters with dripping jaws agape", "the burning glare of hungry eyes")
    'thing': dict(macro=M(gender=1.0, age=0.9, muscle=0.85, weight=0.0, height=0.45, proportions=0.0), race={'asian': 0.3, 'caucasian': 0.4, 'african': 0.3},
                  skin=None, skin_tile='leather', skin_tint=(0.26, 0.26, 0.23), dirt=0.7, arm_out=0.2, targets=THING,
                  outfit=[dict(kind='eyes', glow=1.0), dict(kind='fangs', n=6, length=0.06), dict(kind='spurs', n=7), dict(kind='claws')]),
    'thing_b': dict(macro=M(gender=1.0, age=0.9, muscle=1.0, weight=0.35, height=0.6, proportions=0.0), race={'asian': 0.3, 'caucasian': 0.4, 'african': 0.3},
                    skin=None, skin_tile='leather', skin_tint=(0.26, 0.26, 0.23), dirt=0.7, arm_out=0.2, targets=dict(THING, **{'torso/torso-scale-depth-incr': 1.0, 'torso/torso-vshape-incr': 1.0}),
                    outfit=[dict(kind='eyes', glow=1.0), dict(kind='fangs', n=4, length=0.07), dict(kind='spurs', n=9, size=0.14), dict(kind='claws', length=0.1)]),
    'thing_c': dict(macro=M(gender=1.0, age=1.0, muscle=0.6, weight=0.0, height=0.3, proportions=0.0), race={'asian': 0.3, 'caucasian': 0.4, 'african': 0.3},
                    skin=None, skin_tile='leather', skin_tint=(0.26, 0.26, 0.23), dirt=0.7, arm_out=0.2,
                    targets=dict(THING, **{'arms/l-lowerarm-scale-vert-incr': 1.0, 'arms/r-lowerarm-scale-vert-incr': 1.0, 'head/head-scale-vert-incr': 1.0}),
                    outfit=[dict(kind='eyes', glow=1.0), dict(kind='fangs', n=8, length=0.05), dict(kind='spurs', n=4, size=0.07), dict(kind='claws', length=0.16)]),
    # ---- e0m1: "not unlike that of a gigantic baboon, but no such baboon ever walked the earth"
    'demon': dict(macro=M(gender=1.0, age=0.6, muscle=1.0, weight=0.9, height=1.0, proportions=0.0), race={'asian': 0.0, 'caucasian': 0.3, 'african': 0.7},
                  skin='afr_old', skin_tint=(0.4, 0.42, 0.46), dirt=0.5, arm_out=0.22,
                  targets=dict(BIG, **{'arms/l-upperarm-scale-vert-incr': 1.0, 'arms/r-upperarm-scale-vert-incr': 1.0, 'arms/l-lowerarm-scale-vert-incr': 1.0,
                                       'arms/r-lowerarm-scale-vert-incr': 1.0, 'legs/l-upperleg-scale-vert-decr': 1.0, 'legs/r-upperleg-scale-vert-decr': 1.0,
                                       'legs/l-lowerleg-scale-vert-decr': 0.8, 'legs/r-lowerleg-scale-vert-decr': 0.8, 'neck/measure-neck-height-decr': 1.0,
                                       'expression/units/caucasian/mouth-open': 0.8}),
                  outfit=[dict(kind='eyes', glow=1.0), dict(kind='fur', col='pelt', offset=0.03), dict(kind='muzzle', col='dark_leather'),
                          dict(kind='fangs', n=4, length=0.07, drop=0.11), dict(kind='claws', length=0.09)]),
}


def build_view_arm(side='r'):
    """Conan's own forearm and fist (CC0 body, his baked skin) for the first-person view-model,
    re-expressed in the game's hand frame: wrist at the origin, fingers toward -z, back of the hand +y."""
    import bmesh
    from mathutils import Vector
    spec = dict(CAST['conan']); spec['outfit'] = []
    h, rig, helpers = human(spec)
    for k, o in list(helpers.items()):
        if hasattr(o, 'name') and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    outfit.shade_smooth(h)
    outfit.bake([h])
    wrist = outfit.bone_head(rig, 'hand_' + side)
    d = (outfit.bone_tail(rig, 'hand_' + side) - wrist).normalized()
    out_side = Vector((1 if wrist.x > 0 else -1, 0, 0))
    n_back = (out_side - d * out_side.dot(d)).normalized()          # the back of the hand faces outward from the thigh
    across = d.cross(n_back)
    gi = [h.vertex_groups[g].index for g in ('lowerarm_' + side, 'hand_' + side)]
    bm = bmesh.new(); bm.from_mesh(h.data)
    dl = bm.verts.layers.deform.active
    keep = {v for v in bm.verts if sum(v[dl].get(i, 0) for i in gi) > 0.5}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v in keep for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    for v in bm.verts:
        q = v.co - wrist
        X, Y, Z = q.dot(across), q.dot(n_back), -q.dot(d)          # game frame
        v.co = Vector((X, -Z, Y))                                   # back to Blender's axes (the exporter turns them round again)
    bm.to_mesh(h.data); bm.free()
    for m in list(h.modifiers):
        h.modifiers.remove(m)
    h.parent = None
    h.name = 'vm_arm'
    return [h]
