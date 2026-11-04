"""Blender habitat expansion v43: 18 native meshes, separate moving parts.
Run from web repository: blender -b --factory-startup --python unity-v43/export_habitats.py -- /path/to/unity
Reuses the audited v42 palette/FBX/vertex-color export helpers, not the v42 build loop.
"""
from pathlib import Path
import sys, json, math
common=Path('unity-v42/export_native_props.py').read_text()
marker="for id,color,tower,shop in ["
assert common.count(marker)==1
exec(compile(common.split(marker)[0], 'v42_authoring_helpers', 'exec'))
OUT=UNITY/'Assets/Art/BlenderV43';OUT.mkdir(parents=True,exist_ok=True)
RECORDS.clear()
PALETTE.update({'sage':(.24,.53,.39),'glass':(.49,.80,.85),'glasslight':(.76,.93,.91),
 'river':(.28,.71,.80),'peach':(.98,.70,.57),'rock':(.47,.57,.59),'soil':(.44,.32,.25)})

def beam(a,b,width,c='wood'):
 a,b=Vector(a),Vector(b);d=b-a;o=cube((a+b)/2,(width,width,d.length),c,.015)
 o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def ring(radius,tube,c='cream',loc=(0,0,0),rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,
   location=loc,rotation=rot,major_radius=radius,minor_radius=tube)
 return tint(bpy.context.object,c)

def flower_at(x,y,z,c='pink',size=.12):
 for k in range(6):ico((x+size*cos(k*pi/3),y+size*sin(k*pi/3),z),(size,size*.73,size*.40),c,1)
 ico((x,y,z+.03),(size*.5,size*.5,size*.35),'gold',1)

def flower_arch():
 for x in [-1.12,1.12]:
  cube((x,0,.14),(.46,.46,.28),'stone',.08)
  beam((x,0,.14),(x,0,1.9),.14,'cream')
 for i in range(16):
  a=pi*i/16;b=pi*(i+1)/16
  beam((1.12*cos(a),0,1.85+.75*sin(a)),(1.12*cos(b),0,1.85+.75*sin(b)),.15,'cream')
 for i in range(15):
  a=pi*(i+.5)/15;x=1.13*cos(a);z=1.85+.75*sin(a)
  ico((x,-.03,z),(.21,.14,.17),'sage',1)
  flower_at(x,-.18,z,'pink' if i%2 else 'purple',.12)
 for x in (-1.1,1.1):
  for z in (.65,1.1,1.55):ico((x,-.06,z),(.19,.12,.18),'mint',1)

def glasshouse():
 cube((0,0,.12),(2.5,1.8,.24),'stone',.06)
 cube((0,0,.94),(2.34,1.65,1.55),'glass',.05)
 for x in (-1.16,-.58,0,.58,1.16):
  for y in (-.84,.84):beam((x,y,.2),(x,y,1.78),.055,'cream')
 for z in (.25,.92,1.75):
  for y in (-.85,.85):beam((-1.2,y,z),(1.2,y,z),.06,'cream')
 for x in (-1.18,1.18):
  for y in (-.4,0,.4):beam((x,y,.2),(x,y,1.75),.05,'cream')
 # Closed pitched roof with gently bevelled panes.
 for side in (-1,1):
  o=cube((0,side*.45,1.97),(2.48,1.08,.07),'glasslight',.025);o.rotation_euler.x=-side*.47
  for x in (-1.22,-.6,0,.6,1.22):beam((x,0,2.25),(x,side*.93,1.78),.06,'cream')
 beam((-1.28,0,2.25),(1.28,0,2.25),.09,'cream')
 cube((0,-.88,.78),(.65,.05,1.35),'mint',.03)
 cube((0,-.93,1.1),(.48,.03,.62),'glasslight',.025)
 for x in (-.95,.95):
  cyl((x,-1.07,.25),.23,.36,'coral',10)
  flower_at(x,-1.07,.58,'pink',.15)

def windmill_base():
 cyl((0,0,1.28),.82,2.4,'cream',12,r2=.63)
 cyl((0,0,.15),.97,.3,'stone',12)
 cyl((0,0,2.78),1.0,.85,'purple',12,r2=.04)
 cube((0,-.77,.55),(.38,.09,.9),'wood',.06)
 for a in [0,pi/2,pi,3*pi/2]:
  x=.7*cos(a);y=.7*sin(a);o=cube((x,y,1.78),(.23,.08,.40),'blue',.03);o.rotation_euler.z=a-pi/2
 for i in range(8):
  a=i*pi/4;ico((.95*cos(a),.95*sin(a),.15),(.26,.22,.13),'mint',1)

def windmill_sails():
 # Flat x/z plane, native Unity forward axis is the rotation axle.
 hub=cyl((0,0,0),.20,.22,'gold',12);hub.rotation_euler.x=pi/2
 for k in range(4):
  a=k*pi/2
  def p(x,z):return (x*cos(a)-z*sin(a),0,x*sin(a)+z*cos(a))
  beam(p(0,0),p(0,1.65),.065,'wood')
  cloth=cube(p(-.15,1.06),(.32,.035,1.12),'cream',.018);cloth.rotation_euler.y=-a
  for j in range(5):
   z=.55+j*.22;beam(p(-.30,z),p(.11,z),.075,'cream')
  beam(p(-.30,.50),p(-.30,1.55),.05,'wood')

def waterwheel():
 ring(1,.08,'wood',rot=(pi/2,0,0));ring(.92,.055,'gold',loc=(0,-.14,0),rot=(pi/2,0,0))
 for i in range(12):
  a=i*pi/6
  beam((0,0,0),(cos(a),0,sin(a)),.075,'wood')
  paddle=cube((cos(a),0,sin(a)),(.31,.46,.075),'wood',.025);paddle.rotation_euler.y=-a+pi/2
 hub=cyl((0,0,0),.18,.60,'gold',12);hub.rotation_euler.x=pi/2

def reeds():
 for i in range(8):
  x=.3*cos(i*2.4);y=.24*sin(i*2.4);h=.6+(i%4)*.14
  beam((x,y,0),(x+.06,y+.04,h),.025,'sage')
  o=ico((x+.06,y+.04,h),(.055,.055,.17),'wood',2)
  for s in (-1,1):
   leaf=ico((x+s*.12,y,.28),(.035,.04,.38),'mint',1);leaf.rotation_euler.y=s*.44

def lily():
 cyl((0,0,.025),.48,.04,'sage',24)
 for i in range(7):
  a=i*2*pi/7;ico((.12*cos(a),.12*sin(a),.13),(.11,.17,.10),'pink',2)
 ico((0,0,.20),(.075,.075,.085),'gold',2)

def pier():
 for i in range(10):cube((0,-1.25+i*.27,.39),(1.25,.25,.09),'wood',.022)
 for x in (-.55,.55):
  for y in (-1.2,1.2):
   cyl((x,y,.22),.08,.8,'wood',10)
   cyl((x,y,.62),.11,.1,'cream',10)
 for y in (-.7,.0,.7):cube((0,y,.29),(1.35,.12,.15),'wood',.01)

def boat():
 # Hollow plank-built toy rowboat, no misleading solid box hull.
 for side in (-1,1):
  for i in range(7):
   y=-.95+i*.32;x=side*(.46-.26*(abs(y)/.95)**2)
   o=cube((x,y,.23),(.1,.36,.38),'peach',.04);o.rotation_euler.z=side*y*.35
 for y in (-.5,.25):cube((0,y,.33),(.77,.20,.08),'wood',.025)
 ico((0,0,.07),(.43,1.04,.12),'wood',2)
 beam((-.52,-.7,.42),(.62,.65,.52),.045,'cream')

def coastal_rocks():
 for i in range(7):
  a=i*2.4;ico((.8*cos(a),.5*sin(a),.22+.12*(i%3)),(.53,.43,.35+.1*(i%2)),'rock',1)
  if i%2==0:ico((.8*cos(a),.5*sin(a),.54),(.44,.36,.055),'mint',1)

def crystal():
 for i in range(5):
  a=i*2.4;x=.25*cos(a);y=.25*sin(a);h=.45+.12*(i%3)
  ob=cyl((x,y,h/2),.115,h,'purple' if i%2 else 'blue',6,r2=.07);ob.rotation_euler.y=.15*cos(a)
  cyl((x,y,h+.10),.09,.23,'purple' if i%2 else 'blue',6,r2=0)
 ico((0,0,.06),(.48,.38,.1),'stone',1)

def lantern():
 ring(.13,.028,'gold',loc=(0,0,.72),rot=(pi/2,0,0))
 cube((0,0,.36),(.35,.35,.5),'gold',.055)
 for x in (-.19,.19):
  for y in (-.19,.19):beam((x,y,.12),(x,y,.62),.04,'wood')
 cyl((0,0,.67),.31,.21,'purple',4,r2=0).rotation_euler.z=pi/4

def mushroom_seat():
 cyl((0,0,.25),.22,.5,'cream',12)
 ico((0,0,.53),(.63,.60,.20),'coral',2)
 for i in range(6):
  a=i*pi/3;ico((.33*cos(a),.33*sin(a),.69),(.075,.075,.022),'cream',1)

def wing():
 ico((.22,0,.12),(.30,.04,.23),'pink',2)
 ico((.18,0,-.15),(.23,.04,.19),'purple',2)
 for i in range(3):ico((.24+i*.05,-.045,.05+i*.04),(.035,.02,.04),'gold',1)

def ripple():
 ring(.5,.018,'glasslight');ring(.73,.011,'glasslight')

def stream():
 # Curved ribbon geometry with visible thickness, not a screenshot plane.
 verts=[];faces=[]
 for i in range(17):
  t=i/16;x=.16*sin(t*pi*2);z=1.7*(1-t)
  verts.extend([(x-.25,-.02,z),(x+.25,-.02,z),(x-.25,.05,z),(x+.25,.05,z)])
  if i:
   p=(i-1)*4;q=i*4;faces += [(p,q,q+1,p+1),(p+2,p+3,q+3,q+2),(p,p+2,q+2,q),(p+1,q+1,q+3,p+3)]
 mesh=bpy.data.meshes.new('Water ribbon');mesh.from_pydata(verts,[],faces);mesh.update()
 ob=bpy.data.objects.new('Water ribbon',mesh);bpy.context.collection.objects.link(ob);tint(ob,'river')
 for i in range(5):cube((.05*sin(i),-.065,.25+i*.28),(.12,.012,.1),'glasslight',.01)

def orchard():
 source('nature','tree_oak',scale=1)
 for i in range(9):
  a=i*2.4;ico((.27*cos(a),.27*sin(a),.72+.12*(i%3)),(.065,.065,.068),'coral',2)

def stone_path():
 for i in range(6):
  ob=ico((.15*sin(i*1.3),-.9+i*.36,.06),(.34,.23,.05),'stone',1)
  ico((.40*cos(i),-.9+i*.36,.06),(.13,.1,.035),'mint',1)

SPEC=[('flower_arch',flower_arch,3.0,2.7,.72),('glasshouse',glasshouse,3.1,2.65,2.5),
 ('windmill_base',windmill_base,2.6,4.0,2.6),('windmill_sails',windmill_sails,3.2,3.2,.35),
 ('waterwheel',waterwheel,1.85,1.85,.55),('pond_reeds',reeds,.90,1.0,.75),
 ('lily_flower',lily,.65,.22,.65),('wooden_pier',pier,1.25,.68,2.8),
 ('rowboat',boat,1.05,.48,2.0),('coastal_rocks',coastal_rocks,2.5,.8,1.8),
 ('crystal_cluster',crystal,.85,1.0,.7),('hanging_lantern',lantern,.48,.85,.48),
 ('mushroom_seat',mushroom_seat,.9,.55,.9),('butterfly_wing',wing,.60,.5,.075),
 ('water_ring',ripple,1.6,.022,1.6),('stream_ribbon',stream,.65,2.0,.10),
 ('orchard_tree',orchard,2.2,3.2,2.1),('garden_path',stone_path,1.2,.10,2.6)]
for id,fn,w,h,d in SPEC:build(id,fn,w,h,d)
for row in RECORDS:row['id']=row['id'].replace('World/','Habitat/');row['source']='Blender authored habitat, shared Kenney-compatible palette; orchard uses licensed v41 tree'
for originals in PROTOS.values():
 for ob in originals:
  if ob.name in bpy.data.objects:bpy.data.objects.remove(ob,do_unlink=True)
master=UNITY/'SourceArt/BlenderV43';master.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(master/'habitat-elements-v43.blend'),compress=True)
(OUT/'manifest.json').write_text(json.dumps({'version':43,'source_version':42,'assets':RECORDS},ensure_ascii=False,indent=2)+'\n')
print('V43_HABITAT_EXPORT_PASS',len(RECORDS),'models',sum(x['triangles'] for x in RECORDS),'triangles',flush=True)
