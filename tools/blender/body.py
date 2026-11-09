# The body: a CC0 MakeHuman body from MPFB, rigged with the game-engine skeleton,
# stood up straight with arms hanging and fists closed (the game's rest pose),
# its finger bones folded into the hands so 23 bones drive it.
import bpy, math, bmesh
from mathutils import Vector, Matrix, Quaternion
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.rigservice import RigService

FINGERS = ['index', 'middle', 'ring', 'pinky', 'thumb']


def make_human(macro, race):
    m = TargetService.get_default_macro_info_dict()
    m.update(macro)
    m['race'] = race
    h = HumanService.create_human(macro_detail_dict=m)
    rig = HumanService.add_builtin_rig(h, 'game_engine')
    return h, rig


def _update():
    bpy.context.view_layer.update()


def aim_bone(rig, name, target):
    """Rotate a pose bone about its head so it points along `target` (armature space)."""
    pb = rig.pose.bones[name]
    M = pb.matrix.copy()
    head = M.translation.copy()
    d = (pb.tail - pb.head).normalized()
    q = d.rotation_difference(Vector(target).normalized())
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ M
    _update()


def curl(rig, name, angle):
    """Curl a finger bone about its own x axis."""
    pb = rig.pose.bones[name]
    pb.rotation_mode = 'XYZ'
    pb.rotation_euler = (angle, 0, 0)
    _update()


def stand(rig, arm_out=0.1, fist=1.0, grip=True):
    """Arms hanging at the sides (a little out from the hips), elbows straight, fists closed."""
    for side, sx in (('l', 1), ('r', -1)):
        # which side is which in x: read it from the rig rather than assume
        x = rig.pose.bones['upperarm_' + side].head.x
        s = 1 if x > 0 else -1
        aim_bone(rig, 'upperarm_' + side, (s * math.sin(arm_out), 0.0, -math.cos(arm_out)))
        aim_bone(rig, 'lowerarm_' + side, (s * math.sin(arm_out), -0.02, -math.cos(arm_out)))
        aim_bone(rig, 'hand_' + side, (s * math.sin(arm_out) * 0.5, -0.05, -1))
        for f in FINGERS:
            for k in (1, 2, 3):
                bn = '%s_0%d_%s' % (f, k, side)
                if bn in rig.pose.bones:
                    a = (0.5 if f == 'thumb' else 1.25 + 0.1 * k) * fist
                    curl(rig, bn, a)
    # legs straight down, feet a little apart
    for side in ('l', 'r'):
        x = rig.pose.bones['thigh_' + side].head.x
        aim_bone(rig, 'thigh_' + side, (0.03 * (1 if x > 0 else -1), 0, -1))
        aim_bone(rig, 'calf_' + side, (0.01 * (1 if x > 0 else -1), 0.01, -1))


def apply_rest(rig):
    RigService.apply_pose_as_rest_pose(rig)


def fold_fingers(body, rig):
    """Merge every finger's weights into its hand, then drop the finger bones."""
    for side in ('l', 'r'):
        hand = body.vertex_groups.get('hand_' + side)
        for f in FINGERS:
            for k in (1, 2, 3):
                g = body.vertex_groups.get('%s_0%d_%s' % (f, k, side))
                if not g:
                    continue
                for v in body.data.vertices:
                    for ge in v.groups:
                        if ge.group == g.index and ge.weight > 0:
                            hand.add([v.index], ge.weight, 'ADD')
                body.vertex_groups.remove(g)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for b in list(rig.data.edit_bones):
        if any(b.name.startswith(f + '_') for f in FINGERS):
            rig.data.edit_bones.remove(b)
    bpy.ops.object.mode_set(mode='OBJECT')


def split_helpers(body):
    """Pull the helper geometry (skirt, tights, eyes) out into their own objects; drop the rest."""
    out = {}
    want = {'helper-skirt': 'skirt', 'helper-tights': 'tights', 'helper-l-eye': 'eye_l', 'helper-r-eye': 'eye_r'}
    for gname, key in want.items():
        g = body.vertex_groups.get(gname)
        if not g:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = body
        body.select_set(True)
        dup = body.copy(); dup.data = body.data.copy(); bpy.context.collection.objects.link(dup)
        dup.name = key
        gi = dup.vertex_groups[gname].index
        bm = bmesh.new(); bm.from_mesh(dup.data)
        dl = bm.verts.layers.deform.active
        kill = [v for v in bm.verts if not (dl and gi in v[dl] and v[dl][gi] > 0.5)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bm.to_mesh(dup.data); bm.free()
        for m in list(dup.modifiers):
            if m.type == 'MASK':
                dup.modifiers.remove(m)
        out[key] = dup
    # the body itself: only the 'body' group survives
    gi = body.vertex_groups['body'].index
    bm = bmesh.new(); bm.from_mesh(body.data)
    dl = bm.verts.layers.deform.active
    kill = [v for v in bm.verts if not (dl and gi in v[dl] and v[dl][gi] > 0.5)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(body.data); bm.free()
    for m in list(body.modifiers):
        if m.type == 'MASK':
            body.modifiers.remove(m)
    return out


def clean_groups(obj, rig):
    """Keep only the deform-bone groups (MPFB adds hundreds of helper/joint groups)."""
    keep = {b.name for b in rig.data.bones}
    for g in list(obj.vertex_groups):
        if g.name not in keep:
            obj.vertex_groups.remove(g)


TARGETS = None


def apply_targets(h, targets):
    """Extra shape targets on top of the macros: {'torso/torso-vshape-incr': 1.0, ...}."""
    import os
    from bl_ext.blender_org.mpfb.services.locationservice import LocationService
    root = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(TargetService.__module__.replace('.', '/')))), '')
    base = None
    for cand in [os.path.join(os.path.dirname(__import__('bl_ext.blender_org.mpfb', fromlist=['x']).__file__), 'data', 'targets')]:
        if os.path.isdir(cand):
            base = cand
    for name, w in targets.items():
        TargetService.load_target(h, os.path.join(base, name + '.target.gz'), weight=w)


def add_asset(h, mhclo, asset_type):
    """A CC0 MakeHuman asset (hair, eyebrows), fitted to this body and weighted to its rig."""
    obj = HumanService.add_mhclo_asset(mhclo, h, asset_type=asset_type, subdiv_levels=0, material_type='MAKESKIN')
    return obj
