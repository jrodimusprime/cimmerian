# Build cast models: blender -b --python tools/blender/build.py -- <id> [<id> ...]
# Each character's recipe is in casting.py; output goes to game/models/cast/<id>.glb.
import bpy, sys, os, importlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import body, outfit, gear, casting, beasts
for m in (body, outfit, gear, casting, beasts):
    importlib.reload(m)

OUT = os.path.join(HERE, '..', '..', 'game', 'models', 'cast')
os.makedirs(OUT, exist_ok=True)


def build(cid):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    outfit._tile_cache.clear()
    if cid in beasts.STATIC or cid == 'vm_arm':
        parts = casting.build_view_arm() if cid == 'vm_arm' else beasts.STATIC[cid]()
        bpy.ops.object.select_all(action='DESELECT')
        for p in parts:
            p.select_set(True)
        path = os.path.join(OUT, cid + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_animations=False, export_yup=True,
                                  export_apply=True, export_image_format='JPEG', export_jpeg_quality=86, export_materials='EXPORT')
        print('BUILT', cid, path, 'faces', sum(len(p.data.polygons) for p in parts))
        return
    if cid in ('horse', 'steed'):
        rig, parts = beasts.build_beast(cid)
    else:
        rig = casting.build(cid, casting.CAST[cid])['rig']
    # export: the rig and every mesh parented to it
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in rig.children_recursive:
        o.select_set(True)
    path = os.path.join(OUT, cid + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_animations=False,
                              export_skins=True, export_morph=False, export_yup=True, export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=86, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT')
    tris = sum(len(o.data.polygons) for o in rig.children_recursive if o.type == 'MESH')
    print('BUILT', cid, path, 'faces', tris)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for cid in (args or list(casting.CAST.keys())):
        try:
            build(cid)
        except Exception as e:
            import traceback; traceback.print_exc()
            print('FAILED', cid, e)
