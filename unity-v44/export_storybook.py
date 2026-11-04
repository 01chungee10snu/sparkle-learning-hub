"""Real Blender -> Unity art replacement, reference-driven (not image generation).
Produces rounded architecture, individual roof shingles, arched joinery, foliage,
and ray-tested vertex ambient occlusion. No gameplay/progress mutations.
Run from web repo: blender -b --factory-startup --python unity-v44/export_storybook.py -- UNITY_PATH
"""
import bpy, math, random, json, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi,sqrt
random.seed(44)
ROOT=Path.cwd(); UNITY=Path(sys.argv[sys.argv.index('--')+1]).resolve()
OUT=UNITY/'Assets/Art/BlenderV44';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=UNITY/'SourceArt/BlenderV44';SOURCE.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
P={
 'ivory':'f6e5c0','wall':'e9cc9d','stone':'d8bf96','stoneDark':'ba9779','cream':'fff2cf',
 'gold':'f2b84c','goldLight':'ffdc83','wood':'a66439','darkWood':'78432e','door':'b77b42',
 'blue':'438fc1','blueLight':'73bee0','teal':'54b6b2','purple':'9772bc','violet':'7553a4',
 'pink':'e987ad','rose':'cf5e89','red':'d97159','redLight':'ee9574','yellow':'e8ab37',
 'yellowLight':'f8cc59','green':'70ac45','leaf':'8dc754','leafLight':'a9d769',
 'leafDark':'4a8e44','trunk':'9a603b','water':'53c2dc','glass':'589da9','shadow':'644e40'
}
M={}; RECORDS=[]; GALLERY=[]
def rgb(name):
 h=P.get(name,name).lstrip('#');return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def material(name):
 if name not in M:
  m=bpy.data.materials.new('Story44_'+name);m.diffuse_color=(*rgb(name),1)
  if m.use_nodes:m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=m.diffuse_color
  M[name]=m
 return M[name]
def paint(o,c):o.data.materials.append(material(c));return o

def mesh_obj(name,verts,faces,c,smooth=False):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);paint(o,c)
 if smooth:
  for p in mesh.polygons:p.use_smooth=True
 return o

def box(at,size,c='ivory',bevel=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=bpy.context.object;o.name='rounded_'+c
 o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);paint(o,c)
 if bevel:
  mod=o.modifiers.new('crafted_soft_edges','BEVEL');mod.width=min(bevel,min(size)*.32);mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
  # Flat main faces and rounded edge strips retain a crisp toy-like silhouette.
  for p in o.data.polygons:p.use_smooth=True
  mod=o.modifiers.new('weighted_normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
  bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

def sphere(at,scale,c='leaf',segments=14,rings=8):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=at)
 o=bpy.context.object;o.scale=scale;paint(o,c)
 for p in o.data.polygons:p.use_smooth=True
 return o

def cylinder(at,r,depth,c='ivory',n=24,r2=None):
 if r2 is None:bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r,depth=depth,location=at)
 else:bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r2,depth=depth,location=at)
 o=bpy.context.object;paint(o,c)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o

def beam(a,b,r,c='wood',n=10):
 a,b=Vector(a),Vector(b);d=b-a;o=cylinder((a+b)/2,r,d.length,c,n)
 o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def arch_panel(x,y,z,w,h,depth,c):
 # Flat front towards -Y, semicircular head. z is the bottom edge.
 r=w/2;spring=h-r
 border=[(-r,0),(r,0),(r,spring)]
 border += [(r*cos(a),spring+r*sin(a)) for a in [i*pi/10 for i in range(1,11)]]
 verts=[(x+u,y+d,z+v) for d in (-depth/2,depth/2) for u,v in border]
 n=len(border);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
 return mesh_obj('arched_'+c,verts,faces,c)

def arch_frame(x,y,z,w,h,c='gold',thick=.065):
 r=w/2;spring=h-r
 beam((x-r,y,z),(x-r,y,z+spring),thick,c)
 beam((x+r,y,z),(x+r,y,z+spring),thick,c)
 for i in range(12):
  a=i*pi/12;b=(i+1)*pi/12
  beam((x+r*cos(a),y,z+spring+r*sin(a)),(x+r*cos(b),y,z+spring+r*sin(b)),thick,c,8)
 beam((x-r,y,z),(x+r,y,z),thick,c)

def window(x,y,z,w=.42,h=.68):
 arch_panel(x,y+.02,z,w+.12,h+.1,.07,'stoneDark')
 arch_panel(x,y-.035,z+.025,w,h,.08,'glass')
 arch_frame(x,y-.095,z+.02,w,h,'cream',.035)
 box((x,y-.10,z+h*.40),(.035,.045,h*.74),'wood',.008)
 box((x,y-.10,z+h*.40),(w,.045,.035),'wood',.008)
 box((x,y-.11,z-.01),(w+.16,.17,.09),'goldLight',.02)

def door(x,y,z,w=.61,h=1.04):
 arch_panel(x,y,z,w+.18,h+.11,.14,'stoneDark')
 arch_panel(x,y-.09,z+.04,w,h,.10,'door')
 arch_frame(x,y-.18,z+.04,w,h,'gold',.065)
 for xx in [-.20,-.10,0,.10,.20]:
  if abs(xx)<w/2-.04:box((x+xx,y-.15,z+.45),(.014,.025,.72),'darkWood',.003)
 sphere((x+w*.22,y-.215,z+h*.4),(.035,.026,.035),'goldLight',10,6)
 box((x,y-.28,z-.015),(w+.36,.5,.12),'stone',.03)

# A real extruded rounded roof shingle, mapped to a slope or a conical surface.
def shingle(corners,thickness,c):
 # corners are a convex polygon; thickness is a world-space extrusion vector.
 v=[tuple(p) for p in corners]+[tuple(Vector(p)+Vector(thickness)) for p in corners]
 n=len(corners);f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 for i in range(n):f.append((i,(i+1)%n,(i+1)%n+n,i+n))
 return mesh_obj('individual_roof_shingle',v,f,c)

def gable_roof(at,width,depth,height,c='blue'):
 x,y,z=at;half=width/2
 # Solid roof body gives the silhouette; tiles overlap over the sloping faces.
 v=[(x-half,y-depth/2,z),(x+half,y-depth/2,z),(x,y-depth/2,z+height),
    (x-half,y+depth/2,z),(x+half,y+depth/2,z),(x,y+depth/2,z+height)]
 mesh_obj('complete_gable_roof',v,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],c)
 shades={'blue':['blue','blueLight','blue','teal'],'red':['red','redLight','red','rose'],
         'purple':['purple','violet','purple','pink'],'yellow':['yellow','yellowLight','gold','yellow']}[c]
 rows=6;cols=8
 for side in (-1,1):
  for row in range(rows):
   u0=row/rows;u1=min(1.07,(row+1.18)/rows)
   # u=0 at ridge, u=1 at eave; round lower corners in local tile coordinates.
   for col in range(cols):
    yy=y-depth/2+(col+.5)*depth/cols
    span=depth/cols*.98
    boundary=[(-.49,0),(.49,0),(.49,.76),(.35,.96),(0,1.03),(-.35,.96),(-.49,.76)]
    pts=[]
    for a,b in boundary:
     u=u0+(u1-u0)*b
     pts.append((x+side*half*u,yy+a*span,z+height*(1-u)+.045+(rows-row)*.006))
    shingle(list(reversed(pts)) if side>0 else pts,(side*.008,0,.032),shades[(row*3+col)%len(shades)])
 for side in (-1,1):
  beam((x,y-depth/2-.03,z+height+.08),(x+side*half*1.06,y-depth/2-.03,z-.04),.065,'goldLight',10)
  beam((x,y+depth/2+.03,z+height+.08),(x+side*half*1.06,y+depth/2+.03,z-.04),.065,'wood',10)
 beam((x,y-depth*.55,z+height+.08),(x,y+depth*.55,z+height+.08),.09,'gold',12)
 for side in (-1,1):beam((x+side*half,y-depth/2,z),(x+side*half,y+depth/2,z),.075,'wood',10)

def cone_roof(at,r,height,color='rainbow',rows=7):
 x,y,z=at
 cylinder((x,y,z+height/2),r*.97,height,'purple',40,r2=.015)
 palette=['pink','purple','blue','teal','gold'] if color=='rainbow' else [color,{'blue':'blueLight','pink':'rose','purple':'violet','yellow':'goldLight','teal':'blueLight'}.get(color,color)]
 for j in range(rows):
  f0=j/rows;f1=min(.97,(j+1.18)/rows);r0=r*(1-f0)**.82
  n=max(6,round(2*pi*r0/.34))
  for k in range(n):
   mid=(k+.5*(j%2))*2*pi/n;da=pi/n*.975
   vertices=[];faces=[]
   # Tessellated curved shell, not one non-planar polygon: no self-intersection/flicker.
   for layer in (0,1):
    for v in range(4):
     t=v/3;f=f1+(f0-f1)*t
     for u in range(5):
      q=(u-2)/2
      ff=f-(.024*(1-q*q) if v==3 else 0)
      angle=mid+q*da*(.92 if v==3 else 1)
      radius=r*max(.012,1-ff)**.82+.035+j*.014+layer*.024
      vertices.append((x+radius*cos(angle),y+radius*sin(angle),z+height*ff))
   for layer in (0,1):
    for v in range(3):
     for u in range(4):
      a=layer*20+v*5+u;face=(a,a+1,a+6,a+5)
      faces.append(tuple(reversed(face)) if layer==1 else face)
   border=[0,1,2,3,4,9,14,19,18,17,16,15,10,5]
   for i,a in enumerate(border):
    b=border[(i+1)%len(border)];faces.append((a,b,b+20,a+20))
   mesh_obj('curved_scalloped_tile',vertices,faces,palette[(k+j*2)%len(palette)],True)
 cylinder((x,y,z+height+.10),.10,.32,'gold',16,r2=.014)
 sphere((x,y,z+height+.27),(.08,.08,.10),'goldLight',12,6)

# Classic cottages: real closed walls, joinery and shingled roofs, not wall planes.
def cottage(roof='blue',shop=False,dormer=True):
 box((0,0,.12),(2.35,1.84,.24),'stone',.08)
 box((0,0,1.02),(2.16,1.68,1.65),'ivory',.065)
 for x in (-1.045,1.045):
  for y in (-.80,.80):box((x,y,1.02),(.115,.115,1.72),'wood',.02)
 for z in (.32,1.72):box((0,-.87,z),(2.25,.12,.105),'wood',.02)
 door(-.26,-.91,.26,.62,1.13);window(.66,-.90,.87,.41,.62)
 # Additional arched side windows as whole independent groups.
 before=set(bpy.data.objects);window(0,-.91,.92,.45,.65)
 for o in set(bpy.data.objects)-before:
  o.matrix_world=Matrix.Translation((1.06,.16,0))@Matrix.Rotation(pi/2,4,'Z')@Matrix.Translation((0,.91,0))@o.matrix_world
 gable_roof((0,0,1.85),2.57,1.99,1.07,roof)
 box((.73,.40,2.70),(.29,.30,.90),'stone',.035)
 box((.73,.40,3.14),(.37,.38,.11),'cream',.025)
 box((.73,.40,3.20),(.22,.23,.017),'darkWood',.01)
 # Front gable dormer/attic window remains legible at game camera distance.
 window(0,-1.015,1.98,.37,.47)
 if shop:
  for i in range(7):
   box((-.83+i*.27,-1.15,1.52),(.26,.70,.10),roof if i%2==0 else 'cream',.025).rotation_euler.x=.17
   cylinder((-.83+i*.27,-1.50,1.43),.128,.22,roof if i%2==0 else 'cream',12).rotation_euler.x=pi/2
 for x in (-.88,.91):
  cylinder((x,-1.04,.35),.18,.32,'red',12,r2=.22)
  for k in range(4):sphere((x+.1*cos(k*1.57),-1.04+.07*sin(k*1.57),.61),(.12,.1,.13),'leaf',10,6)
  for k in range(3):sphere((x+.1*cos(k*2.1),-1.09,.69+k*.015),(.055,.04,.055),'pink',8,6)
 # Corner stone accents make facades read as finished masonry.
 for z in (.57,1.05,1.5):box((-1.065,-.88,z),(.25,.065,.13),'wall',.03)

def turret(x,y,z,r,h,roof='rainbow',rows=6):
 cylinder((x,y,z+h/2),r,h,'ivory',32)
 cylinder((x,y,z+.16),r*1.08,.32,'stone',32)
 cylinder((x,y,z+h*.70),r*1.1,.18,'gold',32)
 cylinder((x,y,z+h-.12),r*1.12,.30,'wall',32)
 for k in range(9):
  a=k*2*pi/9
  box((x+r*1.05*cos(a),y+r*1.05*sin(a),z+h+.12),(.23,.23,.32),'cream',.045).rotation_euler.z=a
 cone_roof((x,y,z+h+.22),r*1.24,r*2.45,roof,rows)
 window(x,y-r-.03,z+h*.33,r*.53,h*.31)
 # Partial block courses, shallow relief with genuinely beveled corners.
 for row in range(3):
  for k in range(8):
   a=(k+.5*(row%2))*pi/4
   if sin(a)<-.8:continue
   o=box((x+(r+.008)*cos(a),y+(r+.008)*sin(a),z+.38+row*h*.19),(.18,.065,.095),'wall',.02);o.rotation_euler.z=a-pi/2

def castle():
 # A complete soft masonry castle with a large scalloped rainbow spire.
 cylinder((0,0,.13),1.76,.26,'stone',48)
 cylinder((0,0,1.04),1.45,1.83,'ivory',48)
 cylinder((0,0,1.97),1.56,.22,'goldLight',48)
 turret(0,.25,1.77,.87,1.83,'rainbow',7)
 for x,y,c in [(-1.11,-.72,'blue'),(1.11,-.72,'pink'),(-1.0,.82,'purple'),(1.0,.82,'teal')]:
  turret(x,y,.13,.40,1.85,c,5)
 door(0,-1.51,.23,.85,1.27)
 for i in range(4):box((0,-1.84-i*.18,.36-i*.075),(1.17,.26,.15),'cream',.03)
 for side in (-1,1):
  window(side*.68,-1.30,.76,.3,.54)
  box((side*.74,-1.40,1.64),(.21,.055,.47),'purple',.018)
  sphere((side*.74,-1.45,1.65),(.075,.025,.075),'gold',8,6)
 for k in range(12):
  a=k*2*pi/12;box((1.45*cos(a),1.45*sin(a),2.18),(.25,.25,.34),'cream',.04).rotation_euler.z=a
 beam((0,.25,6.10),(0,.25,6.72),.028,'gold',8)
 mesh_obj('waving_flag',[(0,.25,6.66),(.65,.28,6.59),(.48,.22,6.42),(0,.25,6.45)],[(0,1,2,3)],'pink')

def tree(kind='oak',bloom='leaf'):
 cylinder((0,0,.72),.14,1.44,'trunk',14,r2=.10)
 beam((0,0,.95),(.4,.12,1.55),.075,'trunk')
 beam((0,0,.85),(-.35,-.08,1.38),.065,'trunk')
 if kind=='pine':
  for z,r in [(1.03,.72),(1.55,.57),(1.99,.40)]:
   o=cylinder((0,0,z),r,.95,'leafDark' if z<1.4 else bloom,24,r2=.06)
   mod=o.modifiers.new('soft_pine_rim','BEVEL');mod.width=.08;mod.segments=3
   bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 else:
  for x,y,z,r in [(0,0,1.73,.67),(-.45,0,1.46,.46),(.43,.13,1.53,.48),(.02,.38,1.51,.48),(0,-.34,1.52,.46)]:
   sphere((x,y,z),(r,r*.88,r*.83),bloom,16,10)
  for i in range(7):
   a=i*2.4;sphere((.40*cos(a),.39*sin(a),1.98+.12*sin(a)),(.17,.15,.14), 'leafLight' if bloom=='leaf' else bloom,10,6)

def hedge():
 box((0,0,.29),(2.2,.56,.58),'leafDark',.18)
 for i in range(8):sphere((-.95+i*.27,0,.54),(.23,.30,.20),'leaf',10,6)

def flowerbed():
 box((0,0,.12),(1.75,.65,.24),'stone',.07)
 for i in range(6):
  x=-.68+i*.27;sphere((x,0,.30),(.25,.26,.19),'leafDark',10,6)
  for k in range(3):sphere((x+.09*cos(k*2.1),.07*sin(k*2.1),.47),(.10,.08,.065),['pink','purple','yellowLight'][i%3],8,6)

def market():
 box((0,0,.5),(1.65,.80,1.0),'wood',.04)
 box((0,-.05,1.03),(1.80,1.0,.12),'goldLight',.035)
 for x in (-.75,.75):beam((x,.31,0),(x,.31,2.05),.05,'wood')
 for k in range(8):
  x=-.82+k*.235
  v=[(x,.44,2.08),(x+.23,.44,2.08),(x+.23,-.74,1.73),(x,-.74,1.73)]
  shingle(v,(0,0,.045),'pink' if k%2==0 else 'cream')
 for x in (-.55,0,.55):
  box((x,0,1.15),(.44,.54,.18),'darkWood',.02)
  for j in range(5):sphere((x+.11*cos(j*2.4),.14*sin(j*2.4),1.30),(.09,.08,.09),['red','yellow','leaf'][round((x+.55)/.55)],10,6)

def arch_bridge(stone=False):
 c='stone' if stone else 'wood'
 for i in range(14):
  t=(i+.5)/14;x=-1.8+t*3.6;z=.18+.53*sin(t*pi)
  o=box((x,0,z),(.27,1.65,.14), 'cream' if stone else 'gold',.025)
  o.rotation_euler.y=-math.atan(.53*pi/3.6*cos(t*pi))
 for side in (-1,1):
  for i in range(7):
   t=i/6;x=-1.8+t*3.6;z=.18+.53*sin(t*pi)
   box((x,side*.78,z+.35),(.12,.12,.72),c,.025)
   sphere((x,side*.78,z+.73),(.11,.11,.095),'goldLight',10,6)
  for i in range(18):
   t=i/18;t1=(i+1)/18
   beam((-1.8+t*3.6,side*.78,.91+.53*sin(t*pi)),(-1.8+t1*3.6,side*.78,.91+.53*sin(t1*pi)),.065,c,10)

# Merge evaluated geometry while retaining custom corner normals; bake AO offline.
def bake(id,fn,width,height,depth):
 before=set(bpy.data.objects);fn();parts=list(set(bpy.data.objects)-before)
 bpy.context.view_layer.update();dep=bpy.context.evaluated_depsgraph_get()
 verts=[];faces=[];colors=[];normals=[]
 for o in parts:
  if o.type!='MESH':continue
  ev=o.evaluated_get(dep);me=ev.to_mesh();offset=len(verts);world=ev.matrix_world;nm=world.to_3x3().inverted().transposed()
  verts.extend(tuple(world@v.co) for v in me.vertices)
  for f in me.polygons:
   faces.append(tuple(offset+i for i in f.vertices))
   color=tuple(me.materials[f.material_index].diffuse_color) if me.materials else (.8,.8,.8,1)
   for li in f.loop_indices:
    colors.append(color);normals.append(tuple((nm@me.corner_normals[li].vector).normalized()))
  ev.to_mesh_clear()
 lo=Vector([min(v[i] for v in verts) for i in range(3)]);hi=Vector([max(v[i] for v in verts) for i in range(3)])
 size=hi-lo;scale=Vector((width/size.x,depth/size.y,height/size.z));center=(lo+hi)/2
 verts=[((v[0]-center.x)*scale.x,(v[1]-center.y)*scale.y,(v[2]-lo.z)*scale.z) for v in verts]
 normals=[tuple(Vector((n[0]/scale.x,n[1]/scale.y,n[2]/scale.z)).normalized()) for n in normals]
 mesh=bpy.data.meshes.new('Story44_'+id);mesh.from_pydata(verts,[],faces);mesh.update()
 for p in mesh.polygons:p.use_smooth=True
 mesh.normals_split_custom_set(normals)
 # Short-distance hemisphere rays, stored in vertex-color alpha. Runtime has no AO texture cost.
 tree=BVHTree.FromPolygons([Vector(v) for v in verts],faces,all_triangles=False)
 attr=mesh.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER');mesh.color_attributes.active_color=attr
 cache={};raycount=10;reach=min(width,height,depth)*.35
 for poly in mesh.polygons:
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index;n=Vector(normals[li]);p=Vector(verts[vi]);key=(vi,round(n.x,2),round(n.y,2),round(n.z,2))
   if key not in cache:
    tangent=n.orthogonal().normalized();bit=n.cross(tangent);occ=0.0
    for j in range(raycount):
     a=j*2.399963;zz=sqrt((j+.5)/raycount);rr=sqrt(1-zz*zz)
     d=(tangent*(cos(a)*rr)+bit*(sin(a)*rr)+n*zz).normalized()
     hit=tree.ray_cast(p+n*.009,d,reach)
     if hit[0] is not None:occ+=1-min(1,hit[3]/reach)*.6
    cache[key]=max(.35,1-.70*occ/raycount)
   c=colors[li];ao=cache[key];attr.data[li].color_srgb=(c[0],c[1],c[2],ao)
 obj=bpy.data.objects.new(id,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(material('cream'))
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 file=OUT/(id+'.fbx')
 bpy.ops.export_scene.fbx(filepath=str(file),use_selection=True,object_types={'MESH'},bake_anim=False,
  add_leaf_bones=False,axis_forward='-Z',axis_up='Y',apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',
  colors_type='SRGB',use_triangles=True,mesh_smooth_type='FACE')
 triangles=sum(len(p.vertices)-2 for p in mesh.polygons)
 RECORDS.append({'id':'World/'+id,'file':file.name,'width':width,'height':height,'depth':depth,'triangles':triangles,
   'vertices':len(mesh.vertices),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'ao':'10 hemisphere rays, vertex alpha','source':'Original Blender geometry; user image used as visual reference, not a runtime background'})
 obj.location=(len(RECORDS)%6*10,len(RECORDS)//6*11,0);GALLERY.append(obj)
 for o in parts:bpy.data.objects.remove(o,do_unlink=True)
 print('V44_EXPORT',id,triangles,'tris',flush=True)

for id,c,shop in [('house_flower','red',False),('house_leaf','yellow',False),('house_moon','purple',False),('house_library','blue',False),('house_shop','red',True),('house_cake','yellow',True),('post_office','red',False)]:
 bake(id,lambda c=c,s=shop:cottage(c,s),2.70,3.63,2.0)
bake('learning_castle',castle,2.80,4.45,2.10)
bake('hero_castle',castle,7.20,8.80,5.80)
for id,c in [('tree_oak','leaf'),('tree_mint','leaf'),('tree_blush','pink'),('tree_lilac','purple'),('tree_gold','leafLight')]:
 bake(id,lambda c=c:tree('oak',c),2.30,3.65,2.15)
bake('tree_fir',lambda:tree('pine','leaf'),1.85,3.7,1.85)
bake('storybook_hedge',hedge,2.2,.65,.65)
bake('storybook_flowerbed',flowerbed,1.75,.55,.68)
bake('market_stall',market,2.2,2.4,1.6)
bake('bridge_wood',arch_bridge,3.8,1.4,2.1)
bake('bridge_stone',lambda:arch_bridge(True),3.8,1.4,2.1)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'storybook-assets-v44.blend'),compress=True)
(OUT/'manifest.json').write_text(json.dumps({'version':44,'assets':RECORDS,'reference':'User-supplied reference, quality target only','source':'Blender-authored geometry; no generated image used as game render'},indent=2)+'\n')
print('V44_EXPORT_DONE',len(RECORDS),sum(r['triangles'] for r in RECORDS),flush=True)
