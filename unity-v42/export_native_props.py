"""Blender authoring pipeline: v41 CC0 sources -> 39 native Unity FBX props.
Run from web repo: blender -b --factory-startup --python unity-v42/export_native_props.py -- /path/to/unity
No learning data, Unity collision paths, or existing artwork is overwritten.
"""
import bpy, math, random, json, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix
from math import pi, sin, cos
random.seed(42)
ROOT=Path.cwd(); SOURCE=ROOT/'assets/blender-v41/source'
UNITY=Path(sys.argv[sys.argv.index('--')+1])
OUT=UNITY/'Assets/Art/BlenderV42'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
PROTOS={}; PIXELS={}; RECORDS=[]
PALETTE={'cream':(0.96,0.88,0.71),'wall':(.94,.91,.82),'stone':(.67,.73,.80),'wood':(.43,.26,.18),
 'pink':(.91,.47,.65),'purple':(.56,.43,.78),'mint':(.32,.68,.53),'gold':(.94,.69,.27),
 'blue':(.35,.62,.86),'coral':(.92,.47,.36),'white':(.97,.97,.89),'water':(.23,.67,.77)}
MATS={}
def mat(name):
 if name not in MATS:
  m=bpy.data.materials.new('V42_'+name); m.diffuse_color=(*PALETTE.get(name,(.6,.6,.6)),1)
  if m.use_nodes:
   bsdf=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
   if bsdf:bsdf.inputs['Base Color'].default_value=m.diffuse_color
  MATS[name]=m
 return MATS[name]
def tint(o,c):
 o.data.materials.clear();o.data.materials.append(mat(c));return o
def cube(loc,size,c='wall',bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);tint(o,c)
 if bevel:
  mod=o.modifiers.new('crafted edges','BEVEL');mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def ico(loc,size,c='mint',subdiv=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv,radius=1,location=loc);o=bpy.context.object;o.scale=size;tint(o,c);return o
def cyl(loc,radius,depth,c='wood',vertices=12,r2=None):
 if r2 is None:bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
 else:bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=r2,depth=depth,location=loc)
 return tint(bpy.context.object,c)
def source(pack,key,loc=(0,0,0),scale=1,rot=0):
 token=(pack,key)
 if token not in PROTOS:
  before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(SOURCE/pack/(key+'.glb')))
  new=[o for o in bpy.data.objects if o not in before];PROTOS[token]=new
  for o in new:o.hide_render=True
 originals=PROTOS[token];copies={}
 anchor=bpy.data.objects.new('source',None);bpy.context.collection.objects.link(anchor)
 anchor.location=loc;anchor.scale=(scale,)*3;anchor.rotation_euler.z=rot
 for o in originals:
  c=o.copy();c.hide_render=False;bpy.context.collection.objects.link(c);copies[o]=c
 for o in originals:
  c=copies[o];c.parent=copies.get(o.parent,anchor);c.matrix_parent_inverse=o.matrix_parent_inverse.copy();c.matrix_basis=o.matrix_basis.copy()
 return anchor
def local_objects(before):
 protos={o for group in PROTOS.values() for o in group}
 return [o for o in bpy.data.objects if o not in before and o not in protos]
def sample_color(mesh,poly,loop_index):
 if not mesh.materials:return (.8,.8,.8,1)
 m=mesh.materials[min(poly.material_index,len(mesh.materials)-1)]
 if m is None:return (.8,.8,.8,1)
 color=tuple(m.diffuse_color)
 if m.use_nodes:
  bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if bs:
   color=tuple(bs.inputs['Base Color'].default_value)
   links=bs.inputs['Base Color'].links
   if links and links[0].from_node.type=='TEX_IMAGE' and mesh.uv_layers.active:
    img=links[0].from_node.image
    if img and img.size[0]>0:
     if img.name not in PIXELS:PIXELS[img.name]=list(img.pixels)
     uv=mesh.uv_layers.active.data[loop_index].uv
     x=max(0,min(img.size[0]-1,int(uv.x*img.size[0])));y=max(0,min(img.size[1]-1,int(uv.y*img.size[1])))
     p=(y*img.size[0]+x)*4;color=tuple(PIXELS[img.name][p:p+4])
 return (*color[:3],1)
def bake_export(id,objects,width,height,depth,origin='Blender composition from v41 Kenney CC0'):
 bpy.context.view_layer.update();verts=[];faces=[];colors=[];smooth=[]
 deps=bpy.context.evaluated_depsgraph_get()
 for obj in objects:
  if obj.type!='MESH':continue
  ev=obj.evaluated_get(deps);mesh=ev.to_mesh();offset=len(verts)
  verts.extend(tuple(ev.matrix_world@v.co) for v in mesh.vertices)
  for p in mesh.polygons:
   faces.append(tuple(offset+i for i in p.vertices));smooth.append(p.use_smooth)
   colors.extend(sample_color(mesh,p,li) for li in p.loop_indices)
  ev.to_mesh_clear()
 if not verts:raise RuntimeError('Empty exported mesh '+id)
 mn=Vector(tuple(min(p[i] for p in verts) for i in range(3)));mx=Vector(tuple(max(p[i] for p in verts) for i in range(3)))
 dims=mx-mn;center=(mn+mx)/2
 # Geometry is dimensioned to the existing navigation envelope, not copied as a full island.
 result=[((p[0]-center.x)*width/max(dims.x,.001),(p[1]-center.y)*depth/max(dims.y,.001),(p[2]-mn.z)*height/max(dims.z,.001)) for p in verts]
 mesh=bpy.data.meshes.new('BlenderV42_'+id);mesh.from_pydata(result,[],faces);mesh.update()
 for i,p in enumerate(mesh.polygons):p.use_smooth=smooth[i]
 attr=mesh.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for i,c in enumerate(colors):attr.data[i].color_srgb=c
 mesh.color_attributes.active_color=attr
 ob=bpy.data.objects.new(id,mesh);bpy.context.collection.objects.link(ob)
 # A single material and vertex colors avoid hundreds of material instances on mobile.
 mesh.materials.append(mat('white'))
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
 file=OUT/(id+'.fbx')
 bpy.ops.export_scene.fbx(filepath=str(file),use_selection=True,object_types={'MESH'},bake_anim=False,
   add_leaf_bones=False,axis_forward='-Z',axis_up='Y',apply_unit_scale=True,
   apply_scale_options='FBX_SCALE_UNITS',colors_type='SRGB',use_triangles=True,mesh_smooth_type='FACE')
 tris=sum(len(p.vertices)-2 for p in mesh.polygons)
 RECORDS.append({'id':'World/'+id,'file':file.name,'width':width,'height':height,'depth':depth,
   'triangles':tris,'vertices':len(mesh.vertices),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'source':origin})
 # Keep the native assets in one editable Blender file in a separated gallery.
 ob.location=(len(RECORDS)%8*5,len(RECORDS)//8*6,0)
 for o in objects:
  if o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
 print('V42_EXPORTED',id,tris,'triangles',flush=True)
def build(id,fn,w,h,d):
 before=set(bpy.data.objects);fn();bake_export(id,local_objects(before),w,h,d)
def window(x,y,z,side=False):
 o=cube((x,y,z),(.43,.075,.62),'blue',.06)
 cube((x,y-.04,z),(.04,.06,.65),'cream',.01)
 cube((x,y-.04,z),(.45,.06,.04),'cream',.01)
 if side:
  pass

def house(color='purple',tower=False,shop=False):
 # A closed four-sided house; unlike the v41 preview no floating wall or roof planes.
 cube((0,0,.10),(2.0,1.6,.20),'stone',.07)
 cube((0,0,.9),(1.85,1.48,1.5),'wall',.055)
 for x in (-.91,.91):
  for y in (-.71,.71):cube((x,y,.91),(.10,.10,1.55),'wood',.015)
 for z in (.35,1.55):cube((0,-.765,z),(1.9,.08,.09),'wood',.012)
 cube((0,-.78,.65),(.5,.1,1.0),'wood',.085)
 ico((.15,-.85,.62),(.045,.035,.045),'gold',2)
 window(-.62,-.78,1.13);window(.62,-.78,1.13)
 for x in (-.95,.95):cube((x,.18,1.03),(.08,.48,.58),'blue',.04)
 roof=cyl((0,0,2.0),1.65,.95,color,vertices=4,r2=.035);roof.rotation_euler.z=pi/4;roof.scale.y=.82
 cube((.58,.26,2.0),(.23,.24,.75),'stone',.025)
 cube((0,-1.0,.06),(.85,.42,.12),'stone',.03)
 for x in (-.88,.88):
  cyl((x,-.95,.16),.18,.28,'coral',10)
  for k in range(3):ico((x+.08*cos(k*2.1),-1.0+.07*sin(k*2.1),.42),(.13,.12,.14),color,1)
 if shop:
  for i in range(5):cube((-.68+i*.34,-1.0,1.35),(.33,.5,.11),color if i%2 else 'cream',.01)
 if tower:
  cyl((.82,.45,1.60),.29,2.5,'stone',12)
  cyl((.82,.45,3.05),.43,.7,color,12,r2=.015)

def castle():
 source('castle','tower-square',(0,0,0),1.4)
 source('castle','tower-square-top',(0,0,1.65),1.4)
 cyl((0,0,3.0),1.04,1.15,'purple',4,r2=.02).rotation_euler.z=pi/4
 for x in (-1.0,1.0):
  cyl((x,.4,1.25),.32,2.5,'stone',12);cyl((x,.4,2.85),.46,.85,'pink',12,r2=.02)
 cube((0,-.72,.7),(.58,.15,1.1),'wood',.1)
 window(0,-.74,1.63);ico((0,0,3.75),(.15,.15,.24),'gold',1)

def tree(key,color):
 source('nature',key)
 # Keep original tree structure; a complementary crown bloom links it to the fairy palette.
 if color!='mint':
  for x,y,z in [(-.18,.12,.86),(.12,.1,1.0),(0,-.17,.9)]:ico((x,y,z),(.18,.18,.16),color,1)

def flowers(color):
 for i in range(5):
  a=i*2.4;x=.29*cos(a);y=.25*sin(a);h=.28+.12*(i%3)
  cyl((x,y,h/2),.025,h,'mint',6)
  for j in range(5):ico((x+.08*cos(j*1.26),y+.08*sin(j*1.26),h),(.085,.075,.045),color,1)
  ico((x,y,h+.02),(.04,.04,.04),'gold',1)

def gazebo():
 cyl((0,0,.1),1.1,.2,'stone',8)
 for i in range(6):
  a=i*pi/3;cyl((.82*cos(a),.82*sin(a),1.0),.07,1.8,'cream',8)
 cyl((0,0,2.05),1.27,.7,'mint',6,r2=0)

def lamp():
 cyl((0,0,1.0),.07,2,'wood',10);cyl((0,0,.1),.22,.2,'stone',10)
 cube((0,0,2.0),(.36,.36,.48),'gold',.06)
 cyl((0,0,2.38),.35,.28,'purple',4,r2=0).rotation_euler.z=pi/4

def waterfall():
 for i in range(3):cube((.15*i,.15*i,.35+.48*i),(1.3-.15*i,.9,.65),'stone',.12)
 cube((0,-.28,1.07),(.42,.08,1.46),'water',.035)
 cyl((0,-.5,.12),.9,.16,'water',20)
 for i in range(5):ico((-.3+i*.15,-.51,.25),(.15,.13,.09),'white',1)

def pond():
 cyl((0,0,.12),1,.24,'stone',20)
 cyl((0,0,.25),.87,.07,'water',24)
 for i in range(8):
  a=i*pi/4;ico((.88*cos(a),.88*sin(a),.28),(.15,.17,.13),'cream',1)

def butterfly():
 ico((0,0,.15),(.07,.05,.28),'wood',2)
 for s in (-1,1):
  ico((s*.24,0,.25),(.25,.05,.25),'pink',2)
  ico((s*.20,0,-.02),(.19,.05,.18),'purple',2)

def bench():
 for y in (-.18,0,.18):cube((0,y,.62),(1.3,.16,.09),'wood',.02)
 for x in (-.47,.47):
  cube((x,0,.3),(.10,.48,.62),'stone',.02);cube((x,.27,.85),(.07,.07,.8),'wood',.012)
 for z in (.9,1.1):cube((0,.27,z),(1.3,.09,.12),'wood',.02)

def gift():
 cube((0,0,.4),(1,.73,.8),'purple',.08)
 cube((0,0,.85),(1.06,.78,.2),'pink',.06)
 cube((0,-.38,.45),(.15,.06,.85),'gold',.01)
 cube((0,0,.98),(.13,.8,.06),'gold',.01)

def sign():
 cyl((0,0,.8),.08,1.6,'wood',8)
 cube((0,0,1.6),(1.25,.13,.42),'cream',.06)
 ico((0,-.1,1.6),(.12,.035,.12),'purple',1)

def mailbox():
 cyl((0,0,.63),.09,1.26,'wood',8)
 cube((0,0,1.32),(.72,.5,.55),'pink',.07)
 cube((0,-.27,1.32),(.44,.04,.06),'wood',.006)
 cyl((0,0,1.7),.52,.3,'purple',4,r2=0).rotation_euler.z=pi/4

for id,color,tower,shop in [('house_flower','pink',False,False),('house_leaf','mint',False,False),('house_moon','purple',True,False),('house_library','blue',True,False),('house_shop','coral',False,True),('house_cake','gold',False,False),('post_office','pink',False,False)]:
 build(id,lambda c=color,t=tower,s=shop:house(c,t,s),2.65,3.55,2.0)
build('learning_castle',castle,2.8,4.29,2.1)
for id,key,c in [('tree_oak','tree_oak','mint'),('tree_blush','tree_detailed','pink'),('tree_lilac','tree_detailed','purple'),('tree_gold','tree_default','gold'),('tree_mint','tree_oak','mint'),('tree_fir','tree_pineTallA_detailed','mint')]:
 build(id,lambda k=key,c=c:tree(k,c),2.8 if id!='tree_fir' else 2.0,4.02,2.65 if id!='tree_fir' else 2.0)
for c in ['pink','purple','white','gold','blue','coral']:
 id='flowers_'+{'purple':'lilac','gold':'sun'}.get(c,c)
 build(id,lambda c=c:flowers(c),1.1,.98,.85)
for id,fn,w,h,d in [
 ('family_gazebo',gazebo,2.8,3.85,2.6),('lamp',lamp,.9,3.0,.9),('pond',pond,2.2,.6,1.6),
 ('waterfall',waterfall,2.1,2.55,1.7),('butterfly',butterfly,1.6,1.4,.4),('bench',bench,2.25,1.65,1.0),
 ('gift_chest',gift,1.8,1.5,1.35),('signpost',sign,1.65,2.4,.4),('mailbox',mailbox,1.2,2.1,.8),
 ('bridge_wood',lambda:source('nature','bridge_wood'),3.0,1.0,1.6),
 ('bridge_stone',lambda:source('castle','bridge-straight'),2.7,1.0,1.6),
 ('fountain',lambda:source('fantasy-town','fountain-round-detail'),2.2,1.2,2.2),
 ('fence',lambda:source('nature','fence_simple'),2.4,1.3,.32),
 ('mushroom',lambda:source('nature','mushroom_redGroup'),1.5,1.4,1.1),
 ('grass_tuft',lambda:source('nature','grass_leafs'),1.1,.65,.8),
 ('banner',lambda:source('castle','flag'),1.2,2.5,.4),
 ('stepping_stones',lambda:[ico((x,y,.07),(.28,.20,.06),'stone',1) for x,y in [(-.4,-.3),(0,0),(.35,.3)]],1.7,.12,1.4),
 ('picnic_basket',lambda:(cube((0,0,.25),(.8,.58,.5),'wood',.09),cube((0,0,.53),(.85,.6,.1),'cream',.04)),1.3,.8,1.0),
 ('balloon',lambda:(ico((0,0,1.4),(.5,.5,.65),'pink',2),cyl((0,0,.6),.02,1.2,'cream',6)),1.3,2.6,1.1)]:
 build(id,fn,w,h,d)
for originals in PROTOS.values():
 for o in originals:
  if o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
native_source=UNITY/'SourceArt/BlenderV42';native_source.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(native_source/'native-props-v42.blend'),compress=True)
manifest={'version':42,'source_version':41,'palette':'Kenney CC0 + matching authored storybook geometry', 'assets':RECORDS}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V42_EXPORT_COMPLETE',len(RECORDS),'props',sum(r['triangles'] for r in RECORDS),'catalog triangles',flush=True)
