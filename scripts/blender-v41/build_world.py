#!/usr/bin/env python3
"""Blender-built 3D magic village: authored geometry + curated Kenney CC0 models."""
import bpy, math, random, pathlib, json
from mathutils import Vector
from math import sin, cos, pi
random.seed(41)
ROOT=pathlib.Path.cwd()
SRC=ROOT/"assets/blender-v41/source"
OUT=ROOT/"assets/blender-v41"
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.frame_start=1;scene.frame_end=240;scene.render.fps=30
def mat(name,hexv,alpha=1,glow=0):
    rgb=tuple(int(hexv[i:i+2],16)/255 for i in (1,3,5))
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,alpha)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*rgb,1)
    bsdf.inputs["Roughness"].default_value=.77
    if alpha<1:
        bsdf.inputs["Alpha"].default_value=alpha
        m.surface_render_method='DITHERED'
    if glow:
        bsdf.inputs["Emission Color"].default_value=(*rgb,1)
        bsdf.inputs["Emission Strength"].default_value=glow
    return m
grass=mat("Meadow mint green","#85c68c")
cliff=mat("Warm sandstone","#b8a78e")
base=mat("Blue slate cliff","#8195a2")
pathmat=mat("Golden sand walkways","#f4d8ac")
water=mat("Transparent lagoon","#49b9d0",.8)
foam=mat("Mint lagoon shine","#a8eadb",.85)
pink=mat("Pink fairy glitter","#f8a5c0")
gold=mat("Golden stardust","#f6d57e",glow=.4)
lavender=mat("Lavender magic","#a28dde")
white=mat("Cloud ivory","#fff4d8")
ink=mat("Deep blue ink","#345b72")
invisible=mat("Picking collision only","#ffffff",alpha=.005)
def assign(o,m):
    if o.type=='MESH':
        o.data.materials.clear();o.data.materials.append(m)
    return o
def box(name,loc,size,material,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    assign(o,material)
    if bevel:
        mod=o.modifiers.new("Rounded storybook shape","BEVEL")
        mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def sphere(name,loc,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;assign(o,material)
    for face in o.data.polygons:face.use_smooth=True
    return o
def disk(name,loc,scale,material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=1,depth=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;assign(o,material)
    return o
def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
    o.parent=parent;o.location=loc
    return o
def ribbon(name,pts,width):
    verts=[];faces=[]
    for i,(x,y) in enumerate(pts):
        a=Vector(pts[max(0,i-1)]);b=Vector(pts[min(len(pts)-1,i+1)])
        d=(b-a).normalized()
        p=Vector((-d.y,d.x))*width*.5
        verts.extend([(x-p.x,y-p.y,.863),(x+p.x,y+p.y,.863)])
        if i:faces.append((i*2-2,i*2,i*2+1,i*2-1))
    mesh=bpy.data.meshes.new("Path ribbon");mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);assign(o,pathmat)
    return o
PROTOS={}
def proto(pack,key):
    token=(pack,key)
    if token not in PROTOS:
        old=set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(SRC/pack/(key+".glb")))
        PROTOS[token]=[o for o in bpy.data.objects if o not in old]
    return PROTOS[token]
def asset(pack,key,loc,scale=1,heading=0,parent=None):
    originals=proto(pack,key)
    anchor=empty(pack+" / "+key,loc,parent)
    anchor.rotation_euler.z=heading
    anchor.scale=(scale,)*3
    mapping={}
    for obj in originals:
        clone=obj.copy()
        if obj.type=='MESH':clone.data=obj.data
        bpy.context.collection.objects.link(clone);mapping[obj]=clone
    for obj in originals:
        clone=mapping[obj];clone.parent=mapping.get(obj.parent,anchor)
        clone.matrix_parent_inverse=obj.matrix_parent_inverse.copy()
        clone.matrix_basis=obj.matrix_basis.copy()
    return anchor
def poi(name,coord):
    root=empty("POI_"+name,(coord[0],coord[1],.78))
    picker=disk("PICK_"+name,(0,0,2.2),(2.0,2.0,4),invisible)
    picker.parent=root
    return root

# Rounded floating island with ocean coves and traversable-looking paths.
box("Island lower blue rock",(0,0,-2.2),(37.5,29.1,3.8),base,.9)
box("Island warm sandstone",(0,0,-.72),(38.3,29.9,2.7),cliff,.85)
box("Island lush meadow",(0,0,.13),(39,30.5,1.38),grass,.8)
paths=[
    [(-12,-8),(-8,-4),(-4,-2),(0,0),(5,1),(13,4)],
    [(-14,7),(-10,5),(-5,3),(0,0),(5,-4),(11,-8)],
    [(-9,10),(-6,7),(0,1),(5,6),(10,10)],
    [(-4,-10),(1,-7),(0,0),(1,6),(3,11)]
]
for i,p in enumerate(paths):ribbon("Golden garden trail "+str(i),p,1.25)
sphere("Lagoon water at pond",(11,-8,.78),(4.05,2.9,.16),water)
sphere("Lagoon shimmering turquoise",(11,-8,.9),(3.5,2.25,.07),foam)
sphere("Ocean water outlet",(17,-10,.75),(3.2,4.2,.17),water)
for j in range(17):
    a=j*2*pi/17
    sphere("Shore stone",(11+3.9*cos(a),-8+2.9*sin(a),.88),(.32,.23,.18),cliff)
locations={
    "math":(-11,2),"korean":(-9,9),"english":(-2,10),
    "hanja":(8,9),"kma":(14,4),"practice":(-13,-8),
    "academy":(-1,1),"growth":(8,-3),"pond":(11,-8),
    "ocean":(17,-10),"career":(-4,-10),
    "garden":(-15,9),"plaza":(3,-8)
}
POIS={id:poi(id,loc) for id,loc in locations.items()}
def tower(id,gem,size):
    p=POIS[id]
    asset("castle","tower-square",(0,0,0),size,parent=p)
    asset("castle","tower-square-mid-windows",(0,0,size*.73),size*.91,parent=p)
    asset("castle","tower-square-top-roof",(0,0,size*1.4),size,parent=p)
    halo=sphere("Magical crystal", (0,0,size*3),(.35,.35,.47),gem)
    halo.parent=p
def house(id,roof,size):
    p=POIS[id]
    asset("fantasy-town","wall-door",(0,0,0),size,parent=p)
    asset("fantasy-town","wall-window-shutters",(0,0,size*.92),size,parent=p)
    asset("fantasy-town",roof,(0,0,size*1.04),size*1.1,parent=p)
    asset("fantasy-town","lantern",(1,-1,1.9),size*.35,parent=p)
tower("math",lavender,2.7)
house("korean","roof-gable",3.2)
asset("fantasy-town","tree-high-round",(0,0,0),3.6,parent=POIS["english"])
asset("fantasy-town","wall-wood-window-shutters",(1,1,0),2.2,parent=POIS["english"])
asset("fantasy-town","roof-high",(1,1,1.9),2.5,parent=POIS["english"])
house("hanja","roof-high",3.1)
tower("kma",gold,2.7)
asset("castle","gate",(0,0,0),2.45,parent=POIS["practice"])
asset("fantasy-town","stall-red",(-1,0,0),2.4,parent=POIS["practice"])
tower("academy",pink,3.5)
tower("growth",grass,2.55)
asset("fantasy-town","fountain-round-detail",(0,0,.06),2.3,parent=POIS["pond"])
asset("nature","bridge_wood",(-2.1,0,.3),1.7,parent=POIS["pond"])
asset("fantasy-town","watermill",(-.8,0,0),1.85,parent=POIS["ocean"])
asset("castle","flag",(0,0,2.4),1.35,parent=POIS["ocean"])
asset("fantasy-town","windmill",(0,0,1.7),1.65,parent=POIS["career"])
asset("fantasy-town","wall-wood",(0,0,0),2.5,parent=POIS["career"])
asset("nature","tree_oak",(0,0,0),2.85,parent=POIS["garden"])
asset("fantasy-town","fountain-square-detail",(0,0,.05),1.7,parent=POIS["plaza"])
# Scene dressing shares Blender mesh datablocks to lower transfer size.
for i in range(28):
    x=random.uniform(-17.0,16.5);y=random.uniform(-12.3,12.5)
    if min((x-p[0])**2+(y-p[1])**2 for p in locations.values()) < 14:continue
    asset("nature",random.choice(["tree_detailed","tree_oak","tree_default","tree_pineRoundD"]),
          (x,y,.85),random.uniform(1.65,2.85),random.uniform(-3,3))
for i in range(48):
    x=random.uniform(-18,18);y=random.uniform(-13,13)
    if min((x-p[0])**2+(y-p[1])**2 for p in locations.values()) < 4:continue
    asset("nature",random.choice(["flower_redB","flower_purpleA","flower_yellowC",
                                  "plant_bushDetailed","mushroom_redGroup"]),
          (x,y,.78),random.uniform(.9,1.65),random.uniform(0,6.28))

# Authored clusters add a varied, living silhouette around the outer island.
for i in range(24):
    a=i*2*pi/24
    x,y=16.8*cos(a),12.4*sin(a)
    if min((x-q[0])**2+(y-q[1])**2 for q in locations.values()) < 6:continue
    asset("nature", "tree_detailed" if i%3 else "tree_pineTallA_detailed",
          (x,y,.85),2.5 if i%3 else 2.85, random.uniform(0,pi*2))
    for j in range(3):
        angle=a+(j-1)*.13
        fx,fy=x-1.2*cos(angle),y-1.2*sin(angle)
        asset("nature",["flower_redB","flower_purpleA","flower_yellowC"][j],
              (fx,fy,.82),1.3+j*.16, random.uniform(0,pi*2))
# Visible glowing portals help a child distinguish play destinations.
for id,gem in [("math",lavender),("korean",pink),("english",grass),
               ("hanja",gold),("kma",gold),("practice",pink),
               ("academy",lavender),("growth",grass),("career",gold)]:
    stone=sphere("Magical portal jewel / "+id,(0,-2.1,1.25),(.34,.35,.55),gem)
    stone.parent=POIS[id]
    baseplate=disk("Doorstep story ring / "+id,(0,-2.1,.21),(.75,.75,.12),white)
    baseplate.parent=POIS[id]

# Blender-keyframed animation: fairy butterflies and actual swimming pond creatures.
def keyframe_animation(group,object,steps):
    for frame,xyz,rotation in steps:
        object.location=xyz;object.rotation_euler.z=rotation
        object.keyframe_insert(data_path='location',frame=frame,group=group)
        object.keyframe_insert(data_path='rotation_euler',frame=frame,group=group)
def butterfly(name,origin,wingmat,offset):
    parent=empty("ANIM_"+name)
    body=sphere("Fairy butterfly body",(0,0,0),(.17,.075,.085),ink);body.parent=parent
    for direction in (-1,1):
        wing=sphere("Butterfly flutter wing",(0,direction*.19,.06),(.21,.19,.05),wingmat)
        wing.parent=parent;wing.rotation_euler.x=direction*.25
    frames=[]
    for k in range(9):
        t=2*pi*k/8
        frames.append((1+30*k,(
            origin[0]+.95*sin(t+offset),origin[1]+.8*cos(t+offset),
            origin[2]+.25*sin(2*t+offset)),t))
    keyframe_animation(name,parent,frames)
butterfly("butterfly_pink",(-6,2.5,3.6),pink,.2)
butterfly("butterfly_lavender",(6,1,4),lavender,1.2)
for i in range(4):
    fish=empty("ANIM_fish_"+str(i))
    body=sphere("Animated pond fish",(0,0,0),(.28,.13,.15),pink if i%2 else gold);body.parent=fish
    tail=sphere("Fish tail fin",(-.25,0,.02),(.12,.09,.12),lavender);tail.parent=fish
    frames=[]
    for k in range(9):
        t=2*pi*k/8+i*.21
        frames.append((1+30*k,(11+2*cos(t),-8+1.5*sin(t),.94+.10*sin(t*2)),t+pi/2))
    keyframe_animation("pond swim",fish,frames)
for i in range(11):
    a=i*2*pi/11
    sphere("Floating magic sparkle",(-1+2.7*cos(a),1+2.7*sin(a),5.5+.3*sin(3*a)),(.12,.12,.13),gold)
# Preserve editable source: sun/fill area lights, orthographic photographic camera.
bpy.ops.object.camera_add(location=(36,-43,42))
cam=bpy.context.object;cam.name="Hero camera";cam.data.type="ORTHO";cam.data.ortho_scale=53
def look_at(o,point):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
look_at(cam,(0,0,.7));scene.camera=cam
def light(name,loc,power,size,rgb):
    bpy.ops.object.light_add(type='AREA',location=loc)
    o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK'
    o.data.size=size;o.data.color=rgb;look_at(o,(0,0,0))
light("Warm sun key light",(24,-31,40),4100,17,(1,.92,.80))
light("Pastel sky bounce",(-27,19,34),2300,24,(.79,.87,1))
scene.world=bpy.data.worlds.new("Clear pastel spring sky")
scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value=(.37,.68,.8,1)
bg.inputs["Strength"].default_value=.75
scene.render.engine='CYCLES'
scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUT/"blender-world-poster.png")
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
# Prototypes were imported only to give copies identical mesh and CC0 palette data.
for originals in PROTOS.values():
    for obj in originals:
        if obj.name in bpy.data.objects:bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"sparkle-magic-world-v41.blend"),compress=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT/"sparkle-magic-world-v41.glb"),export_format="GLB",
    export_yup=True,export_animations=True,export_lights=False,export_cameras=False)
print("GLB_EXPORT_OK", (OUT/"sparkle-magic-world-v41.glb").stat().st_size,flush=True)
bpy.ops.render.render(write_still=True)
print("RENDER_OK",scene.render.filepath,flush=True)
