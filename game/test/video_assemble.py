# Assembles the walkthrough frames (test/video.js) into an H.264 MP4 with Blender's sequencer (no ffmpeg needed).
#   Blender -b --python video_assemble.py -- <frames dir> <out.mp4> e1m2 e1m1 e1m3 ...
import bpy, os, sys

argv = sys.argv[sys.argv.index('--') + 1:]
frames, out, order = argv[0], argv[1], argv[2:]
sc = bpy.context.scene
sc.sequence_editor_create()
r = sc.render
r.resolution_x, r.resolution_y, r.resolution_percentage = 1280, 720, 100
r.fps = 30
r.image_settings.file_format = 'FFMPEG'
r.ffmpeg.format = 'MPEG4'
r.ffmpeg.codec = 'H264'
r.ffmpeg.constant_rate_factor = 'MEDIUM'
r.ffmpeg.ffmpeg_preset = 'GOOD'
r.filepath = out
start = 1
for tag in order:
    files = sorted(f for f in os.listdir(frames) if f.startswith(tag + '_') and f.endswith('.jpg'))
    if not files:
        continue
    st = sc.sequence_editor.sequences.new_image(tag, os.path.join(frames, files[0]), 1, start)
    for f in files[1:]:
        st.elements.append(f)
    start += len(files)
    print(tag, len(files))
sc.frame_start, sc.frame_end = 1, start - 1
bpy.ops.render.render(animation=True)
print('wrote', out, start - 1, 'frames')
