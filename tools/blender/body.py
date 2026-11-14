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


def stand(rig, arm_out=0.1, fist=1.0, grip=True):   # (fist 0: open, for grip() to close)
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


def hand_frame(rig, side):
    """The game's hand frame (armature space), from the posed rig: the wrist, and the axes X across the knuckles, Y out of
    the back of the hand, Z back up the forearm (the fingers point -Z). Taken from the forearm, not the hand: the hand
    bends at the wrist to square the grip across it (deviate), and the game holds the forearm along +Z."""
    la, pb = rig.pose.bones['lowerarm_' + side], rig.pose.bones['hand_' + side]
    wrist, d = pb.head.copy(), (la.tail - la.head).normalized()
    out_side = Vector((1 if wrist.x > 0 else -1, 0, 0))
    back = (out_side - d * out_side.dot(d)).normalized()
    return wrist, d.cross(back), back, -d


def deviate(rig, side):
    """Bend the hand at the wrist toward the little finger until the line of the knuckles (index to ring) runs straight
    across the forearm, as a hand closing on a hilt does: the grip then lies across the fist, square to the arm."""
    pb = rig.pose.bones['hand_' + side]
    wrist, X, Y, Z = hand_frame(rig, side)
    M0 = pb.matrix.copy()
    def slope(a):
        pb.matrix = Matrix.Translation(wrist) @ Matrix.Rotation(a, 4, Y) @ Matrix.Translation(-wrist) @ M0
        _update()
        k = rig.pose.bones['ring_01_' + side].head - rig.pose.bones['index_01_' + side].head
        return k.dot(Z) / k.length
    lo, hi = -0.6, 0.6
    if slope(lo) * slope(hi) > 0:
        slope(0.0); return 0.0
    for _ in range(40):
        m = (lo + hi) / 2
        if slope(lo) * slope(m) <= 0: hi = m
        else: lo = m
    slope((lo + hi) / 2)
    print('GRIP wrist bent %.2f rad' % ((lo + hi) / 2))
    return (lo + hi) / 2


def grip_seat(rig, side, radius, thick=0.0098):
    """Where a hilt of this radius lies in the closing hand, in the hand frame (metres): across the bases of the fingers,
    in the crease of the palm behind the knuckles, its middle under the middle of the hand."""
    wrist, X, Y, Z = hand_frame(rig, side)
    hf = lambda p: Vector(((p - wrist).dot(X), (p - wrist).dot(Y), (p - wrist).dot(Z)))
    k = [hf(rig.pose.bones['%s_01_%s' % (f, side)].head) for f in ('index', 'middle', 'ring', 'pinky')]
    mx = (k[0].x + k[3].x) / 2
    my = sum(v.y for v in k[:3]) / 3; mz = sum(v.z for v in k[:3]) / 3
    return (mx, my - (radius + thick + 0.006), mz + 0.013)


def grip(rig, side, at, radius, thick=0.0098):
    """Close one hand round a hilt: a cylinder across the palm (axis X of the hand frame, centre `at` in it, metres).
    As a real hand closes: every joint of a finger curls together (the middle joint most), each about the axis of its own
    bone that swings the finger toward the hilt (measured from the rig, not assumed: the way They Fell curls its hands);
    when a segment meets the hilt the joints behind it stop and the ones beyond close on round it. Then the thumb is
    reached (a few CCD passes) onto the outside of the index finger, over the grip."""
    wrist, X, Y, Z = hand_frame(rig, side)
    if at is None:
        at = grip_seat(rig, side, radius, thick)
    print('GRIP seat (hand frame, m) [%.4f, %.4f, %.4f]' % tuple(at))
    c = wrist + X * at[0] + Y * at[1] + Z * at[2]
    def off(p):                                       # how far p lies outside the hilt's surface (+ outside)
        q = p - c
        return (q - X * q.dot(X)).length - radius
    RATE, MAX = (1.0, 1.3, 0.85), (1.65, 1.95, 1.35)
    for f in ('index', 'middle', 'ring', 'pinky'):
        bones = [rig.pose.bones.get('%s_0%d_%s' % (f, k, side)) for k in (1, 2, 3)]
        if not all(bones):
            continue
        rest, axes = [], []
        for pb in bones:
            pb.rotation_mode = 'QUATERNION'
            rest.append(pb.rotation_quaternion.copy())
        for i, pb in enumerate(bones):                   # the turn that brings the fingertip toward the hilt's axis, and not sideways
            t0 = bones[2].tail.copy()
            def end_off(a):
                pb.rotation_quaternion = rest[i] @ Quaternion(a, 0.15); _update()
                return off(bones[2].tail) + 2 * abs((bones[2].tail - t0).dot(X))
            axes.append(min([Vector(a) for a in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1))], key=end_off))
            pb.rotation_quaternion = rest[i]; _update()
        ang, frozen = [0.0, 0.0, 0.0], 0                 # joints below `frozen` have met the hilt and stay
        for step in range(200):
            moved = False
            for i in range(frozen, 3):
                if ang[i] < MAX[i]:
                    ang[i] = min(MAX[i], ang[i] + 0.012 * RATE[i]); moved = True
                bones[i].rotation_quaternion = rest[i] @ Quaternion(axes[i], ang[i])
            _update()
            for i in range(frozen, 3):                   # a segment touching the grip: it and everything before it stop
                pb = bones[i]
                if min(off(pb.head.lerp(pb.tail, u)) for u in (0.35, 0.7, 1.0)) <= thick * (0.85 if i == 2 else 1.0):
                    frozen = i + 1
            if frozen >= 3 or not moved:
                break
        print('GRIP', f, [round(x, 2) for x in ang])
    # The thumb wraps the other way round the hilt and its pad comes to rest on the outside of the index finger's middle
    # segment. Its root (the metacarpal, in the ball of the thumb) swings across the palm about two axes; its two joints
    # are hinges, each bending one way only, about the axis of its own bone that folds it toward the palm. The four angles
    # are searched (coordinate descent) for the pose that puts the pad there while nothing of the thumb passes through the
    # hilt or the curled fingers.
    tb = [rig.pose.bones.get('thumb_0%d_%s' % (k, side)) for k in (1, 2, 3)]
    ix = rig.pose.bones.get('index_02_' + side)
    if all(tb) and ix:
        TH = 0.0105                                       # the thumb's half-thickness
        for pb in tb:
            pb.rotation_mode = 'QUATERNION'
        rest = [pb.rotation_quaternion.copy() for pb in tb]
        def hinge(i):                                     # the local axis that folds this joint toward the hilt
            pb = tb[i]
            def end_off(a):
                pb.rotation_quaternion = rest[i] @ Quaternion(a, 0.2); _update(); return off(tb[2].tail)
            ax = min([Vector(a) for a in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1))], key=end_off)
            pb.rotation_quaternion = rest[i]; _update()
            return ax
        h1, h2 = hinge(1), hinge(2)
        mid = ix.head.lerp(ix.tail, 0.72); q = mid - c; q = q - X * q.dot(X)   # (toward its last joint: as far as a thumb reaches round a hilt)
        target = mid + q.normalized() * (thick + TH) * 0.95 - X * 0.003          # the pad on the index finger's back, over the grip
        fingers = [rig.pose.bones.get('%s_0%d_%s' % (f, k, side)) for f in ('index', 'middle') for k in (1, 2, 3)]
        def seg_d(p, a, b):
            ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared)); return (a + ab * t - p).length
        def pose(v):
            tb[0].rotation_quaternion = rest[0] @ Quaternion((1, 0, 0), v[0]) @ Quaternion((0, 0, 1), v[1]) @ Quaternion((0, 1, 0), v[4])
            tb[1].rotation_quaternion = rest[1] @ Quaternion(h1, v[2])
            tb[2].rotation_quaternion = rest[2] @ Quaternion(h2, v[3])
            _update()
        def cost(v):
            pose(v)
            pad = tb[2].head.lerp(tb[2].tail, 0.75)
            e = (pad - target).length ** 2 * 1e4
            for pb in tb[1:]:
                for u in (0.2, 0.5, 0.8, 1.0):
                    p = pb.head.lerp(pb.tail, u)
                    e += max(0.0, TH + 0.001 - off(p)) ** 2 * 4e5            # through the hilt
                    if pb is tb[1] or u < 0.6:                                 # through the fingers (the pad itself may touch)
                        for fb in fingers:
                            e += max(0.0, thick + TH - 0.002 - seg_d(p, fb.head, fb.tail)) ** 2 * 4e5
            return e
        LO, HI = (-1.5, -1.5, -0.15, -0.15, -0.8), (1.5, 1.5, 1.4, 1.5, 0.8)
        import random
        rnd = random.Random(7)
        starts = [(0, 0, 0.4, 0.5, 0)] + [tuple(rnd.uniform(LO[i], HI[i]) for i in range(5)) for _ in range(16)]
        best, bc = None, 1e18
        for s0 in starts:
            v = list(s0); cv = cost(v); step = 0.2
            while step > 0.005:
                moved = False
                for i in range(5):
                    for d in (step, -step):
                        w = list(v); w[i] = max(LO[i], min(HI[i], w[i] + d)); cw = cost(w)
                        if cw < cv:
                            v, cv, moved = w, cw, True
                if not moved:
                    step *= 0.5
            if cv < bc:
                best, bc = v, cv
        pose(best)
        print('GRIP thumb', [round(x, 2) for x in best], 'cost %.3f pad to target %.4f' % (bc, (tb[2].head.lerp(tb[2].tail, 0.75) - target).length))
    import os
    if os.environ.get('GRIP_DUMP'):
        hf = lambda p: tuple(round((p - wrist).dot(a) * 1000) for a in (X, Y, Z))
        print('GRIP c', hf(c), 'r', radius)
        for f in ('thumb', 'index', 'middle', 'pinky'):
            for k in (1, 2, 3):
                pb = rig.pose.bones.get('%s_0%d_%s' % (f, k, side))
                if pb: print('GRIP', pb.name, hf(pb.head), '->', hf(pb.tail), 'off', round(off(pb.tail) * 1000), 'mid', round(off(pb.head.lerp(pb.tail, 0.5)) * 1000))


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
