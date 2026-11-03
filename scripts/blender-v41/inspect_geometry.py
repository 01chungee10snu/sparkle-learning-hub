import bpy, pathlib
from mathutils import Vector
root=pathlib.Path(bpy.data.filepath).parent if bpy.data.filepath else pathlib.Path.cwd()
src=root/"assets/blender-v41/source"
items=[
("fantasy-town","wall-door"),("fantasy-town","wall-window-glass"),("fantasy-town","roof-gable"),
("fantasy-town","windmill"),("fantasy-town","watermill"),("fantasy-town","fountain-round-detail"),
("fantasy-town","stall-green"),("castle","tower-square"),("castle","tower-square-roof"),
("nature","tree_detailed"),("nature","tree_oak"),("nature","flower_redB"),("nature","mushroom_redGroup")
]
for pack,name in items:
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(src/pack/(name+".glb")))
 new=[o for o in bpy.data.objects if o not in before]
 geo=[o for o in new if o.type=='MESH']
 if geo:
  bbox=[o.matrix_world@Vector(corner) for o in geo for corner in o.bound_box]
  bounds=[(round(min(p[i] for p in bbox),2),round(max(p[i] for p in bbox),2)) for i in range(3)]
 else:bounds=[]
 print("ASSET",pack,name,len(new),len(geo),bounds,flush=True)
 for o in new:bpy.data.objects.remove(o,do_unlink=True)
