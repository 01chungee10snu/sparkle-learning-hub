"""v46 complete remaining visual set. Actual Blender geometry -> FBX/Unity render.
Usage (web root): blender -b --factory-startup --python unity-v46/export_cohesive.py -- UNITY_PATH
No learner data is read; source-descriptors is a read-only public content snapshot.
"""
from pathlib import Path
# Load verified original shape helpers only; do not execute the old export loops.
helper=Path('unity-v45/export_interiors.py').read_text().split('\nROOMS=')[0]
exec(compile(helper,'unity-v45/export_interiors.py','exec'),globals())
for module in ['cohesive_geometry','cohesive_marine','cohesive_careers']:
 exec(compile(Path('unity-v46/'+module+'.py').read_text(),module+'.py','exec'),globals())
from collections import defaultdict
OUT=UNITY/'Assets/Art/CohesiveV46';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=UNITY/'SourceArt/CohesiveV46';SOURCE.mkdir(parents=True,exist_ok=True)
RECORDS=[];GALLERY=[];DESCRIPTORS=json.loads(Path('unity-v46/source-descriptors.json').read_text())
ONLY=set()
if '--only' in sys.argv:ONLY=set(sys.argv[sys.argv.index('--only')+1].split(','))

def bake46(key,fn,group,webkey=None,aliases=None,height=None,maxdim=None,raycount=5):
 if ONLY and key not in ONLY:return
 before=set(bpy.data.objects);meaning=fn();parts=list(set(bpy.data.objects)-before)
 bpy.context.view_layer.update();dep=bpy.context.evaluated_depsgraph_get()
 verts=[];faces=[];colors=[];normals=[];groups=[];pivots={}
 for o in parts:
  if o.type!='MESH':continue
  ev=o.evaluated_get(dep);me=ev.to_mesh();off=len(verts);world=ev.matrix_world;nm=world.to_3x3().inverted().transposed()
  part=o.get('piece','Body');pivots[part]=Vector(o.get('pivot',(0,0,0)))
  verts.extend(tuple(world@v.co) for v in me.vertices)
  for f in me.polygons:
   faces.append(tuple(off+i for i in f.vertices));groups.append(part)
   col=tuple(me.materials[f.material_index].diffuse_color) if me.materials else (.8,.8,.8,1)
   for li in f.loop_indices:colors.append(col);normals.append(tuple((nm@me.corner_normals[li].vector).normalized()))
  ev.to_mesh_clear()
 if not verts:raise ValueError('Empty asset '+key)
 lo=Vector([min(v[i] for v in verts) for i in range(3)]);hi=Vector([max(v[i] for v in verts) for i in range(3)]);size=hi-lo
 scale=height/size.z if height else maxdim/max(size) if maxdim else 1.0
 shift=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 verts=[tuple((Vector(v)-shift)*scale) for v in verts]
 tree=BVHTree.FromPolygons([Vector(v) for v in verts],faces,all_triangles=False)
 reach=min(size)*scale*.35;cache={};cornerAo=[];li=0
 for face in faces:
  for vi in face:
   n=Vector(normals[li]);p=Vector(verts[vi]);token=(vi,round(n.x,2),round(n.y,2),round(n.z,2));li+=1
   if token not in cache:
    tangent=n.orthogonal().normalized();bit=n.cross(tangent);occ=0
    for j in range(raycount):
     a=j*2.399963;zz=sqrt((j+.5)/raycount);rr=sqrt(1-zz*zz);d=(tangent*cos(a)*rr+bit*sin(a)*rr+n*zz).normalized()
     hit=tree.ray_cast(p+n*.006,d,reach)
     if hit[0] is not None:occ+=1-min(1,hit[3]/reach)*.5
    cache[token]=max(.45,1-.60*occ/raycount)
   cornerAo.append(cache[token])
 root=bpy.data.objects.new(key,None);bpy.context.collection.objects.link(root)
 made=[];li=0;chunks={}
 for face,part in zip(faces,groups):
  g=chunks.setdefault(part,{'verts':[],'faces':[],'colors':[],'normals':[]})
  pivot=(pivots[part]-shift)*scale;offset=len(g['verts'])
  g['verts'].extend(tuple(Vector(verts[vi])-pivot) for vi in face)
  g['faces'].append(tuple(range(offset,offset+len(face))))
  for _ in face:
   c=colors[li];g['colors'].append((c[0],c[1],c[2],cornerAo[li]));g['normals'].append(normals[li]);li+=1
 for part,g in chunks.items():
  mesh=bpy.data.meshes.new('Cohesive46_'+part);mesh.from_pydata(g['verts'],[],g['faces']);mesh.update()
  for p in mesh.polygons:p.use_smooth=True
  mesh.normals_split_custom_set(g['normals'])
  attr=mesh.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER');mesh.color_attributes.active_color=attr
  for i,c in enumerate(g['colors']):attr.data[i].color_srgb=c
  mesh.materials.append(material('pearl'))
  ob=bpy.data.objects.new(part,mesh);bpy.context.collection.objects.link(ob);ob.parent=root;ob.location=(pivots[part]-shift)*scale;made.append(ob)
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for ob in made:ob.select_set(True)
 bpy.context.view_layer.objects.active=root
 file=OUT/(key.replace('/','_')+'.fbx')
 bpy.ops.export_scene.fbx(filepath=str(file),use_selection=True,object_types={'MESH','EMPTY'},bake_anim=False,add_leaf_bones=False,axis_forward='-Z',axis_up='Y',apply_unit_scale=True,apply_scale_options='FBX_SCALE_UNITS',colors_type='SRGB',use_triangles=True,mesh_smooth_type='FACE')
 triangles=sum(len(f)-2 for f in faces)
 record={'id':key,'file':file.name,'webGroup':group,'webKey':webkey or key.split('/')[-1],'aliases':aliases or [],'runtime':bool(aliases) or key.startswith('Marine/'),'width':size.x*scale,'height':size.z*scale,'depth':size.y*scale,'triangles':triangles,'vertices':len(verts),'pieces':list(chunks),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'ao':'offline hemisphere rays in vertex alpha','meaning':meaning if isinstance(meaning,str) or (isinstance(meaning,list) and all(isinstance(v,str) for v in meaning)) else ''}
 RECORDS.append(record);root.location=((len(RECORDS)-1)%12*5,(len(RECORDS)-1)//12*5,0);GALLERY.append(root)
 for o in parts:bpy.data.objects.remove(o,do_unlink=True)
 print('V46_EXPORT',key,triangles,'triangles',flush=True)
 (OUT/'manifest.partial.json').write_text(json.dumps({'version':46,'assets':RECORDS},ensure_ascii=False,indent=2)+'\n')

def bird(c='tan'):
 sphere((0,0,.80),(.57,.43,.67),c,26,18);sphere((0,-.04,1.21),(.52,.42,.40),'pearl',24,16)
 for side in (-1,1):
  sphere((side*.22,-.425,1.24),(.06,.03,.085),'eye',14,10)
  sphere((side*.21,-.45,1.28),(.019,.01,.025),'pearl',10,6)
  sphere((side*.49,-.02,.80),(.16,.30,.40),c,18,12)
  beam((side*.22,0,.24),(side*.23,-.10,.1),.035,'wood',10)
 cylinder((0,-.48,1.04),.10,.20,'gold',12,r2=.005).rotation_euler.x=pi/2
 group_call(lambda:book(scale=.40,color='purple'),(0,-.38,.35))

def fox_model():
 pet('cat')
 for o in bpy.data.objects:
  if o.type=='MESH' and o.name.startswith('Sphere') and o.location.x==0 and o.location.z<1:o.data.materials[0]=material('orange')

def feather():
 curve_tube('quill',[(-.4,0,.1),(-.15,0,.58),(.2,0,1.2),(.34,0,1.65)],.035,'gold')
 for i in range(8):
  z=.45+i*.14;x=-.25+i*.07
  for side in (-1,1):o=sphere((x+side*.14,0,z),(.28,.055,.095),'lilac' if i%2 else 'wing',14,8);o.rotation_euler.y=side*.4

def inkpot():
 cylinder((0,0,.35),.42,.60,'navy',24,r2=.31);cylinder((0,0,.70),.24,.12,'gold',20)
 group_call(brush,(0,0,.80),.7,rotate=.45)

def star_tinted(color):
 before=set(bpy.data.objects);star()
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH':o.data.materials.clear();o.data.materials.append(material(color))

def leaf_emblem():
 sphere((0,0,.28),(.65,.33,.12),'leaf',22,14)
 beam((-.65,0,.40),(.63,0,.40),.025,'goldLight')
 for i in range(5):
  x=-.43+i*.20
  for side in (-1,1):beam((x,0,.40),(x+.12,side*.20,.38),.013,'leafDark',8)

def crown_emblem():
 cylinder((0,0,.20),.55,.32,'gold',28)
 for i in range(7):
  a=i*2*pi/7;cylinder((.48*cos(a),.48*sin(a),.52),.13,.50,'gold',12,r2=.01)
  sphere((.48*cos(a),.48*sin(a),.77),(.075,.075,.075),'goldLight',10,6)
 for i in range(5):
  a=pi+i*pi/4;sphere((.55*cos(a),.55*sin(a),.28),(.07,.05,.07),'pink' if i%2 else 'blue',12,8)

def closed_bud():
 pot()
 beam((0,0,.65),(0,0,1.24),.035,'leaf')
 for i in range(4):
  a=i*pi/2;sphere((.065*cos(a),.065*sin(a),1.28),(.11,.11,.19),'pink',14,10)

def icon_emblem(key):
 if key in ['home','map','records','parent','settings','listen','hint','close','check','heart','friend','moon','sun','wardrobe','arrow','play','pause','career','growth','garden','pond','ocean','shop']:
  cylinder((0,0,.1),.82,.16,'gold',32);cylinder((0,0,.22),.73,.12,'page',32)
 if key=='home':group_call(tool_house,(0,0,.26),.72)
 elif key=='map':group_call(scroll,(0,0,.22),.65);beam((-.4,-.2,.40),(.35,.25,.4),.03,'blue')
 elif key in ['records','parent']:group_call(lambda:book(opened=True),(0,0,.30),.65)
 elif key=='settings':
  torus((0,0,.42),.38,.12,'silver');
  for i in range(8):a=i*pi/4;o=box((.5*cos(a),.5*sin(a),.42),(.21,.21,.20),'silver',.04);o.rotation_euler.z=a
 elif key=='listen':group_call(tool_headphones,(0,0,.30),.75)
 elif key=='hint':group_call(lambda:lamp((0,0,0)),(0,0,.25),.8)
 elif key in ['close','check','arrow','play','pause']:
  if key=='close':
   for side in (-1,1):beam((-.37,side*.37,.40),(.37,-side*.37,.4),.075,'coral',12)
  elif key=='check':curve_tube('check',[(-.42,0,.40),(-.10,-.28,.40),(.44,.34,.40)],.08,'teal',12)
  elif key=='arrow':curve_tube('arrow',[(-.5,0,.4),(.5,0,.4),(.20,.27,.4)],.065,'blue');beam((.5,0,.4),(.2,-.27,.4),.065,'blue')
  elif key=='pause':
   for x in (-.22,.22):box((x,0,.45),(.17,.7,.17),'blue',.05)
  else:mesh_obj('play', [(-.27,-.36,.45),(-.27,.36,.45),(.4,0,.45)],[(0,1,2)],'teal')
 elif key=='heart':group_call(tool_heart,(0,0,.25),.65)
 elif key=='friend':group_call(lambda:pet('rabbit'),(0,0,.25),.65)
 elif key=='moon':
  for i in range(12):a=-pi*.7+i*pi*1.4/11;sphere((.37*cos(a),.37*sin(a),.40),(.13,.13,.08),'gold',12,8)
 elif key=='sun':sphere((0,0,.45),(.38,.38,.1),'goldLight',20,12)
 elif key=='wardrobe':group_call(tool_dress,(0,0,.25),.65)
 elif key=='career':group_call(tool_briefcase,(0,0,.3),.7)
 elif key=='growth':group_call(lambda:pot(),(0,0,.3),.6)
 elif key=='garden':group_call(watering,(0,0,.3),.55)
 elif key in ['pond','ocean']:
  sphere((0,0,.32),(.62,.62,.1),'aqua',20,12);group_call(fish_tool,(0,0,.32),.55)
 elif key=='shop':group_call(chest,(0,0,.3),.65)
 else:raise ValueError(key)

# CHARACTERS: full 3D meshes + the identical portrait renders.
bake46('Character/tae',lambda:fairy('tae'),'characters','tae',['Characters/taehee_original'],height=3.8,raycount=6)
bake46('Character/se',lambda:fairy('se'),'characters','se',['Characters/sehee_original'],height=3.65,raycount=6)
for key,fn,aliases in [
 ('npc_bunny',lambda:pet('rabbit'),['World/npc_bunny']),('npc_cat',lambda:pet('cat'),['World/npc_cat']),
 ('npc_owl',lambda:owl('lilac',True),['World/npc_owl']),('npc_squirrel',squirrel,['World/npc_squirrel']),
 ('npc_butterfly',butterfly_model,['World/butterfly']),('npc_teacher',lambda:bird('tan'),['Bebsu/brown']),
 ('npc_scholar',lambda:bird('pink'),['Bebsu/pink']),('npc_turtle',lambda:turtle_model({'id':'sea-turtle'}),[]),
 ('npc_fox',lambda:pet('dog'),[])]:
 bake46('Character/'+key,fn,'characters',key,aliases,height=3.2 if key!='npc_butterfly' else 2.0)

# Every collected species gets an individual, verified ID and shape family.
for row in DESCRIPTORS['marine']:
 bake46('Marine/'+row['id'],lambda r=row:marine_builder(r),'marine',row['id'],[],maxdim=1.65,raycount=4)

# UI objects and native reward meshes share authored geometry.
icon_defs={
 'star':(star,['Rewards/star_yellow']), 'crystal':(lambda:gem((0,0,.65),1),[]),
 'flower':(lambda:pot(flower=True),['Rewards/bloom']), 'feather':(feather,[]),'ink':(inkpot,[]),
 'seed':(lambda:sphere((0,0,.25),(.30,.20,.43),'wood',18,12),['Rewards/seed']),
 'water':(lambda:watering(),[]),'book':(lambda:book(opened=True),['Rewards/badge_book']),
 'scroll':(scroll,[]),'trophy':(trophy,[]),'chest':(chest,['Rewards/gift']),
 'crown':(crown_emblem,['Rewards/badge_crown']),'leaf':(leaf_emblem,['Rewards/badge_leaf']),
 'magic_dust':(lambda:[group_call(star,(x,0,z),scale) for x,z,scale in [(-.48,.2,.33),(.40,.65,.45),(0,1.23,.24)]],['Rewards/magic_dust']),
 'globe':(globe,[]),'sprout':(pot,['Rewards/sprout']),'bud':(closed_bud,['Rewards/bud']),
 'star_blue':(lambda:star_tinted('blue'),['Rewards/star_blue']),
 'star_purple':(lambda:star_tinted('purple'),['Rewards/star_purple']),
 'star_rainbow':(lambda:star_tinted('pink'),['Rewards/star_rainbow']),
}
for key in ['home','map','garden','pond','ocean','shop','career','growth','listen','hint','close','check','settings','records','parent','heart','friend','moon','sun','wardrobe','arrow','play','pause']:
 icon_defs[key]=(lambda k=key:icon_emblem(k),['Rewards/heart'] if key=='heart' else [])
for key,(fn,aliases) in icon_defs.items():
 bake46('Icon/'+key,fn,'icons',key,aliases,maxdim=1.7,raycount=4)
# Small life and growth scenery that previously retained flat original sprites.
for key,col in [('flowers_blue','blue'),('flowers_coral','coral'),('flowers_lilac','lilac'),('flowers_pink','pink'),('flowers_sun','gold'),('flowers_white','pearl')]:
 def make_patch(color=col):
  for i in range(3):
   x=-.5+i*.48;beam((x,0,0),(x,0,.42+i*.1),.025,'leaf')
   for j in range(5):a=j*pi*2/5;sphere((x+.10*cos(a),.1*sin(a),.46+i*.1),(.105,.08,.055),color,10,6)
   sphere((x,0,.50+i*.1),(.055,.055,.035),'goldLight',10,6)
 bake46('Scenery/'+key,make_patch,'scenery',key,['World/'+key],maxdim=1.5,raycount=3)

for i,row in enumerate(DESCRIPTORS['careers']):
 bake46('Career/'+row['id'],lambda r=row,i=i:career_miniature(r,i),'careers',row['id'],[],maxdim=3.4,raycount=3)

bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'cohesive-world-v46.blend'),compress=True)
manifest={'version':46,'versionTag':'cohesive-v46-20261105','source':'Original Blender geometry, distinct species and profession tools; no question/ownership mutations','assets':RECORDS,'marineExpected':64,'careersExpected':100,'fullExport':not bool(ONLY)}
(OUT/('manifest.preview.json' if ONLY else 'manifest.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('V46_ALL_EXPORTED',len(RECORDS),sum(r['triangles'] for r in RECORDS),flush=True)
