import bpy, sys
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
bpy.ops.wm.read_factory_settings(use_empty=True)
macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.5, muscle=0.9, weight=0.6, height=0.7, proportions=0.8)
macro['race'] = {'asian': 0.0, 'caucasian': 0.8, 'african': 0.2}
h = HumanService.create_human(macro_detail_dict=macro)
rig = HumanService.add_builtin_rig(h, 'game_engine')
print('HUMAN', h.name, len(h.data.vertices), 'RIG', rig and rig.name, rig and len(rig.data.bones))
print('BONES', [b.name for b in rig.data.bones])
print('GROUPS', len(h.vertex_groups), [g.name for g in h.vertex_groups][:30])
print('SK', [k.name for k in h.data.shape_keys.key_blocks][:20] if h.data.shape_keys else None)
print('DIMS', h.dimensions[:])
