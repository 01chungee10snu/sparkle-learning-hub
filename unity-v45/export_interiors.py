"""v45: real Blender-authored content interiors and tactile learning/UI objects.
Uses v44's original geometry helpers + ray-tested vertex AO; no child data.
Run from web repo: blender -b --python unity-v45/export_interiors.py -- UNITY_PATH
"""
from pathlib import Path
# Reuse the exact verified original geometry and AO/FBX authoring pipeline, not its build loop.
helper=Path('unity-v44/export_storybook.py').read_text().split('\nfor id,c,shop')[0]
exec(compile(helper,'unity-v44/export_storybook.py','exec'),globals())
OUT=UNITY/'Assets/Art/InteriorsV45';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=UNITY/'SourceArt/InteriorsV45';SOURCE.mkdir(parents=True,exist_ok=True)
RECORDS.clear();GALLERY.clear()
P.update({'mint':'63b796','coral':'e18e78','navy':'314963','sage':'71977e','ink':'304954','page':'fff5d9','lilac':'bba2d4','aqua':'70ced5','aquaDark':'428c9b','clay':'c38164','tan':'cfaa7d','sand':'efce9d'})

def torus(at,major,minor,c,rotation=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=24,minor_segments=8,location=at,rotation=rotation)
 o=bpy.context.object;paint(o,c)
 for p in o.data.polygons:p.use_smooth=True
 return o

def book(at=(0,0,0),scale=1,color='purple',opened=False):
 before=set(bpy.data.objects)
 if opened:
  for side in (-1,1):
   cover=box((side*.48,0,.13),(.95,1.30,.15),color,.06);cover.rotation_euler.y=side*.13
   pages=box((side*.46,0,.25),(.87,1.20,.16),'page',.04);pages.rotation_euler.y=side*.13
   for i in range(4):box((side*.46,.35-i*.20,.355),(.58,.025,.012),'tan',.003)
  beam((0,-.66,.20),(0,.66,.20),.055,'gold',10)
 else:
  box((0,0,.17),(1,.72,.34),'page',.045)
  for z in (0,.36):box((0,0,z),(1.06,.78,.09),color,.035)
  box((-.5,0,.19),(.11,.79,.37),color,.03)
  for x in (-.35,.35):box((x,0,.415),(.035,.78,.012),'gold',.005)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def globe(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 cylinder((0,0,.1),.55,.20,'gold',24);beam((0,0,.1),(0,0,.65),.08,'gold')
 sphere((0,0,1.12),(.60,.60,.60),'blue',24,16)
 ring=torus((0,0,1.12),.73,.05,'gold',(pi/2,.2,.25))
 torus((0,0,1.12),.608,.012,'cream')
 for x,y,z in [(-.24,-.48,1.23),(.25,-.46,1.38),(.35,-.44,.99),(-.19,-.53,.94)]:sphere((x,y,z),(.18,.07,.16),'leaf',12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def abacus(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 for x in (-.86,.86):beam((x,0,.08),(x,0,1.65),.085,'wood')
 for z in (.12,1.65):beam((-.93,0,z),(.93,0,z),.08,'wood')
 for r in range(4):
  z=.38+r*.32;beam((-.81,0,z),(.81,0,z),.025,'gold')
  for i in range(5):sphere((-.62+i*.30,0,z),(.12,.14,.12),['pink','blue','gold','teal'][r],12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def scales(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 box((0,0,.10),(1.1,.60,.20),'purple',.06);beam((0,0,.2),(0,0,1.65),.07,'gold')
 beam((-.85,0,1.5),(.85,0,1.5),.055,'gold')
 for side in (-1,1):
  for x in (-.25,.25):beam((side*.8,0,1.5),(side*.8+x,0,.72),.015,'gold')
  cylinder((side*.8,0,.7),.40,.09,'goldLight',18)
 sphere((0,0,1.72),(.12,.12,.12),'gold',12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def scroll(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 box((0,0,.10),(1.4,1.7,.11),'page',.08)
 for y in (-.82,.82):
  beam((-.80,y,.14),(.80,y,.14),.13,'cream',16)
  for x in (-.90,.90):sphere((x,y,.14),(.13,.17,.17),'gold',12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def brush(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 beam((-.6,0,.12),(.55,0,.12),.065,'wood',12)
 beam((.48,0,.12),(.68,0,.12),.075,'gold',12)
 o=cylinder((.85,0,.12),.10,.37,'ink',12,r2=.01);o.rotation_euler.y=pi/2
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def trophy(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 box((0,0,.12),(.8,.65,.24),'purple',.06);beam((0,0,.2),(0,0,.65),.10,'gold')
 cylinder((0,0,.95),.43,.65,'gold',24,r2=.54)
 for x in (-.53,.53):torus((x,0,1.04),.26,.055,'gold',(pi/2,0,0))
 sphere((0,0,1.32),(.48,.48,.045),'goldLight',18,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def gem(at=(0,0,0),scale=1,color='blue'):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=at)
 o=bpy.context.object;o.scale=(scale*.38,scale*.28,scale*.65);paint(o,color)

def star(at=(0,0,0),scale=1):
 pts=[]
 for i in range(10):
  a=pi/2+i*pi/5;r=1 if i%2==0 else .47;pts.append((cos(a)*r*scale,sin(a)*r*scale))
 v=[(at[0]+x,at[1]+y,at[2]+z) for z in (0,.22*scale) for x,y in pts]
 f=[tuple(range(9,-1,-1)),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
 o=mesh_obj('sculpted reward star',v,f,'goldLight');m=o.modifiers.new('soft star edges','BEVEL');m.width=.06*scale;m.segments=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)

def pot(at=(0,0,0),scale=1,flower=False):
 before=set(bpy.data.objects)
 cylinder((0,0,.28),.33,.56,'clay',20,r2=.43);cylinder((0,0,.57),.46,.12,'clay',20)
 cylinder((0,0,.62),.38,.03,'darkWood',20)
 beam((0,0,.63),(0,0,1.25),.035,'leafDark')
 sphere((-.19,0,.93),(.25,.10,.12),'leaf',12,8);sphere((.19,0,1.04),(.25,.10,.13),'leaf',12,8)
 if flower:
  for i in range(6):a=i*pi/3;sphere((.19*cos(a),.19*sin(a),1.31),(.16,.16,.08),'pink',12,8)
  sphere((0,0,1.35),(.12,.12,.10),'goldLight',12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def watering(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 cylinder((0,0,.42),.44,.75,'teal',20,r2=.37)
 torus((-.47,0,.55),.39,.065,'gold',(pi/2,0,0))
 beam((.32,0,.25),(.98,0,.88),.12,'teal');cylinder((.98,0,.9),.21,.10,'goldLight',16)
 torus((0,0,.82),.36,.04,'gold')
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def hourglass(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 for z in (.08,1.38):cylinder((0,0,z),.42,.14,'gold',18)
 for a in (0,pi*2/3,pi*4/3):beam((.36*cos(a),.36*sin(a),.1),(.36*cos(a),.36*sin(a),1.38),.045,'wood')
 cylinder((0,0,.42),.34,.60,'aqua',20,r2=.06);cylinder((0,0,1.02),.06,.60,'aqua',20,r2=.34)
 cylinder((0,0,.22),.29,.20,'sand',20,r2=.01)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def chest(at=(0,0,0),scale=1):
 before=set(bpy.data.objects)
 box((0,0,.45),(1.25,.88,.80),'purple',.08);box((0,0,.93),(1.34,.97,.20),'violet',.08)
 for x in (-.45,.45):box((x,-.46,.5),(.09,.04,.8),'gold',.015);box((x,0,1.05),(.09,.95,.045),'gold',.01)
 box((0,-.5,.77),(.22,.08,.29),'goldLight',.03)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def shelf(x,y,color='wood',books=True):
 box((x,y,2.0),(2.1,.65,3.8),color,.08)
 for z in (.45,1.5,2.55,3.6):
  box((x,y-.11,z),(2.02,.70,.13),'goldLight',.025)
  if books:
   for i in range(6):
    h=.53+.1*(i%3);box((x-.79+i*.31,y-.40,z+.09+h/2),(.22,.40,h),['purple','red','blue','teal','yellow','pink'][i],.025)
    box((x-.79+i*.31,y-.62,z+.29),(.16,.015,.028),'gold',.003)

def lamp(at,scale=1):
 before=set(bpy.data.objects)
 cylinder((0,0,.06),.35,.12,'gold',16);beam((0,0,.1),(0,0,.95),.04,'gold')
 cylinder((0,0,1.05),.43,.5,'yellowLight',20,r2=.21)
 sphere((0,0,.9),(.13,.13,.16),'cream',12,8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def desk():
 box((0,-.65,1.55),(5.7,2.35,.22),'wood',.12)
 box((0,-.65,1.70),(5.4,2.17,.10),'tan',.07)
 for x in (-2.35,2.35):
  for y in (-1.45,.15):box((x,y,.80),(.22,.22,1.5),'wood',.05)
 # The blank work mat supports live readable text above it in the game UI.
 box((0,-.70,1.78),(2.55,1.45,.045),'page',.08)

def shell(at,scale=1):
 for i in range(7):
  a=-.70+i*.23;o=sphere((at[0]+.22*sin(a),at[1]+.15*cos(a),at[2]),(.11*scale,.52*scale,.16*scale),'pink' if i%2 else 'cream',12,8);o.rotation_euler.z=-a

def room_base(accent='purple',openair=False):
 box((0,0,-.15),(13,9.4,.45),'wood',.18)
 for ix in range(13):box((-6+ix,0,.11),(.975,9.0,.11),'tan' if ix%3 else 'sand',.025)
 if not openair:
  box((0,4.45,3.20),(13,.30,6.5),'ivory',.12)
  for z in (.60,5.7):box((0,4.22,z),(12.8,.13,.18),accent,.03)
  # Side walls are cut away so both portrait and landscape cameras can see tools.
  for x in (-6.32,6.32):
   box((x,2.1,1.38),(.25,4.9,2.8),'wall',.08)
   box((x,2.1,2.85),(.33,4.9,.15),accent,.04)
  for x in (-3.9,3.9):
   arch_panel(x,4.22,2.4,2.15,2.8,.12,'wood')
   arch_panel(x,4.11,2.57,1.9,2.51,.08,'aqua')
   beam((x,4.01,2.6),(x,4.01,4.85),.035,'cream')
   beam((x-.85,4.01,3.7),(x+.85,4.01,3.7),.035,'cream')
   box((x,3.98,2.38),(2.5,.42,.16),'goldLight',.05)
 else:
  for x in (-5.9,5.9):
   for y in (-2.8,3.8):beam((x,y,0),(x,y,3.0),.10,'wood')
  for x in (-5.9,5.9):beam((x,-2.8,2.7),(x,3.8,2.7),.065,'wood')
 # Inset rug/plinth with a sculpted trim.
 box((0,-.9,.22),(6.3,4.6,.10),accent,.16)
 box((0,-.9,.28),(6.0,4.3,.06),'cream',.15)
 for x in (-5.3,5.3):pot((x,3.3,.2),1.15,True)

def room(key):
 accent={'math':'blue','korean':'purple','english':'leaf','hanja':'red','challenge':'violet','practice':'coral','pond':'aqua','ocean':'blue','garden':'mint','shop':'pink','career':'teal','growth':'purple','commons':'purple'}[key]
 outdoor=key in ('english','pond','garden')
 room_base(accent,outdoor)
 if key in ('pond','ocean'):
  # No unowned fish are shown in the room. Owned creatures retain their original state/rendering.
  cylinder((0,-.5,.51),3.0,.45,'stone',40);o=cylinder((0,-.5,.77),2.75,.08,'water',40);o.scale.y=.65
  for i in range(12):a=i*pi/6;sphere((2.9*cos(a),-.5+1.9*sin(a),.77),(.28,.22,.16),'cream',12,8)
  for x in (-4.5,4.5):
   for n in range(4):beam((x+n*.14,1.3,.2),(x+n*.14,1.3,1.2+n*.12),.03,'leafDark');sphere((x+n*.14,1.3,1.25+n*.12),(.09,.09,.22),'wood',10,6)
  for i in range(4):box((-2.8+i*.6,-2.8,.69),(.59,1.7,.12),'wood',.03)
  shell((-4,-1.2,.5),1.0);lamp((4,-2.2,.24),1.4)
  if key=='ocean':
   for x in (-3.7,0,3.7):
    ring=torus((x,4.14,3.6),1.1,.15,'gold',(pi/2,0,0));sphere((x,4.23,3.6),(1.03,.06,1.03),'blue',24,16)
   globe((4,1.6,.25),1.3)
 else:
  desk();lamp((2.0,-.3,1.8),.80)
  if key=='math':
   abacus((-4.4,1.4,.25),1.6);scales((3.5,2,.25),1.55)
   for i in range(4):box((-1.9+i*.42,0,1.98),(.35,.35,.35),['red','blue','gold','teal'][i],.06)
   box((-2.1,-1.45,1.83),(1.6,.25,.08),'goldLight',.03)
  elif key in ('korean','commons'):
   shelf(-4.2,2.5);shelf(4.2,2.5);book((-1.7,-.5,1.85),.95,opened=True)
   for i in range(3):book((0.7,0,1.85+i*.27),.7,['red','teal','blue'][i])
  elif key=='english':
   for x in (-4.7,4.7):
    cylinder((x,3.2,1.4),.20,2.6,'trunk',14)
    for dx,z in [(-.6,3.1),(0,3.7),(.7,3.3)]:sphere((x+dx,3.2,z),(1.1,.85,.85),'leaf',16,10)
   globe((-1.65,-.4,1.85),.82);book((.15,.1,1.85),.65,'blue')
   box((0,3.7,2.5),(2.8,.20,1.8),'wood',.12);box((0,3.53,2.5),(2.5,.11,1.5),'page',.1)
  elif key=='hanja':
   scroll((-1.1,-.6,1.88),1.0);brush((.65,-1.4,1.87),.85);cylinder((1.1,.1,1.94),.30,.16,'ink',18)
   for x in (-4.5,-4.0,4.1,4.6):
    beam((x,2.6,.15),(x,2.6,4.0),.08,'sage')
    for z in (1,2,3):torus((x,2.6,z),.085,.018,'gold')
   box((0,4.03,3.5),(2.25,.12,2.9),'page',.06)
  elif key in ('challenge','growth'):
   trophy((-1.6,-.25,1.85),.9);hourglass((.55,-.45,1.85),.8)
   for x in (-4.8,4.8):
    cylinder((x,2.8,2.3),.4,4.5,'ivory',24)
    for z in (.35,4.5):cylinder((x,2.8,z),.57,.20,'gold',24)
   for x in (-1.7,1.7):box((x,4.0,3.7),(.9,.1,2.5),'purple',.06)
   o=star((0,3.8,4.1),.7); # horizontal embossed ornament kept as decor
  elif key=='practice':
   abacus((-4.4,1.5,.25),1.3);book((-1.9,-.7,1.85),.65,'teal')
   for i in range(6):box((-.2+(i%3)*.48,-.2,1.98+(i//3)*.4),(.4,.4,.4),['pink','blue','gold'][i%3],.06)
  elif key=='garden':
   for x in (-5.5,5.5):
    for y in (0,2,4):beam((x,y,0),(x,y,4.5),.055,'cream')
   for y in (0,2,4):beam((-5.5,y,4.5),(0,y,6.3),.07,'cream');beam((0,y,6.3),(5.5,y,4.5),.07,'cream')
   watering((-1.7,-.4,1.85),.75);pot((.20,.1,1.85),.62,True)
   for x in (-4.3,4.3):
    box((x,2,.45),(2.1,2.6,.7),'wood',.08)
    for y in (1.2,2.2):pot((x,y,.85),.7,True)
  elif key=='shop':
   shelf(-4.3,2.4,books=False);shelf(4.3,2.4,books=False)
   for x in (-4.3,4.3):
    for z in (.6,1.65,2.7):chest((x,2.25,z),.6)
   chest((-1.4,-.5,1.85),.9);gem((.65,-.4,2.15),.7,'teal')
   for i in range(5):cylinder((.2+i*.20,-1.0,1.90),.13,.055,'gold',12)
  elif key=='career':
   for x in (-4.5,4.5):
    box((x,2.2,.8),(1.9,1.8,1.6),'ivory',.09);box((x,2.2,1.64),(2.1,2,.13),'gold',.04)
   globe((-4.5,2.2,1.75),.95);trophy((4.5,2.2,1.75),1.15)
   book((-1.6,-.5,1.85),.85,'teal',True);brush((.6,-1,1.88),.85)

# Literal learning objects: independently authored meshes, never answer-dependent.
def pet(kind='cat'):
 fur='cream' if kind!='dog' else 'tan'
 sphere((0,.1,.57),(.40,.38,.48),fur,18,12)
 sphere((0,-.05,1.20),(.47,.40,.42),fur,20,14)
 for x in (-.25,.25):sphere((x,-.12,.18),(.20,.27,.17),fur,14,10)
 for x in (-.18,.18):
  sphere((x,-.425,1.25),(.075,.042,.09),'ink',14,10)
  sphere((x-.02,-.46,1.28),(.022,.012,.025),'white' if 'white' in P else 'cream',10,6)
 sphere((0,-.46,1.09),(.19,.09,.12),'page',14,10)
 sphere((0,-.55,1.12),(.065,.035,.05),'pink',12,8)
 if kind=='cat':
  for x in (-.29,.29):
   cylinder((x,-.02,1.64),.20,.40,fur,3,r2=.01)
   sphere((x,-.14,1.64),(.095,.025,.12),'pink',12,8)
  beam((.30,.34,.48),(.58,.35,.92),.10,fur,12);sphere((.58,.35,.92),(.11,.11,.13),fur,12,8)
 elif kind=='dog':
  for x in (-.45,.45):sphere((x,-.02,1.10),(.16,.19,.40),'wood',14,10)
  beam((.24,.37,.52),(.52,.5,.76),.08,'wood')
 else:
  for x in (-.23,.23):
   sphere((x,0,1.91),(.16,.15,.52),fur,16,12);sphere((x,-.13,1.94),(.082,.028,.35),'pink',12,8)
  sphere((0,.47,.5),(.19,.19,.20),'cream',14,10)
def fish_tool():
 sphere((0,0,.55),(.65,.25,.36),'gold',20,14)
 for z in (.36,.72):sphere((-.65,0,z),(.29,.07,.25),'coral',14,10)
 sphere((.32,-.235,.64),(.08,.035,.09),'ink',14,10)
 sphere((.34,-.265,.67),(.022,.012,.025),'cream',10,8)
 sphere((.10,0,.92),(.26,.06,.16),'coral',12,8)
 sphere((.1,-.25,.45),(.23,.07,.10),'yellowLight',12,8)
def strawberry():
 sphere((0,0,.50),(.40,.36,.48),'red',18,14)
 cylinder((0,0,.20),.26,.32,'red',20,r2=.01)
 for i in range(5):
  a=i*pi*2/5;o=sphere((.17*cos(a),.17*sin(a),.95),(.23,.12,.055),'leaf',12,8);o.rotation_euler.z=a
 for z,r in ((.34,.31),(.57,.38),(.78,.29)):
  for a in (-2.5,-1.8,-1.05,-.35):sphere((r*cos(a),r*sin(a)-.018,z),(.025,.02,.045),'yellowLight',8,6)
def banana():
 points=[(-.60,0,.68),(-.43,0,.36),(-.16,0,.20),(.18,0,.22),(.43,0,.44),(.54,0,.75)]
 for i in range(len(points)-1):beam(points[i],points[i+1],.14 if i in (0,4) else .20,'yellowLight',14)
 for at in points[1:-1]:sphere(at,(.20,.17,.20),'yellowLight',12,8)
 beam(points[-1],(.58,0,.92),.08,'wood')
def carrot():
 cylinder((0,0,.52),.03,.95,'coral',20,r2=.23)
 for x in (-.18,0,.18):beam((0,0,1.0),(x,.03,1.42),.06,'leaf',10)
 for z in (.4,.65,.83):box((-.06,-.18,z),(.14,.025,.025),'goldLight',.008)
def cup():
 cylinder((0,0,.45),.33,.8,'blue',24,r2=.40);torus((0,0,.86),.40,.055,'cream')
 cylinder((0,0,.86),.34,.025,'darkWood',24)
 torus((.45,0,.52),.26,.07,'blue',(pi/2,0,0))
def ball():
 sphere((0,0,.55),(.54,.54,.54),'blue',24,16)
 torus((0,0,.55),.54,.035,'gold',(pi/2,.45,0));torus((0,0,.55),.54,.035,'pink')

ROOMS=['math','korean','english','hanja','challenge','practice','pond','ocean','garden','shop','career','growth','commons']
for key in ROOMS:
 bake('room_'+key,lambda k=key:room(k),13.5,7.3,10.0)
 RECORDS[-1]['id']='Interior/'+key
# Individual manipulatives and tools are reused in room effects and true rendered UI icons.
OBJECTS={
 'book':lambda:book(opened=True),'scroll':scroll,'abacus':abacus,'balance':scales,
 'globe':globe,'brush':brush,'trophy':trophy,'hourglass':hourglass,'chest':chest,
 'watering':watering,'sprout':pot,'flower':lambda:pot(flower=True),'star':star,
 'crystal':lambda:gem((0,0,.65),1),'shell':lambda:shell((0,0,.15)),
 'seed':lambda:sphere((0,0,.25),(.30,.20,.43),'wood',16,10),
 'cube':lambda:box((0,0,.45),(.9,.9,.9),'blue',.13),
 'apple':lambda:(sphere((0,0,.45),(.43,.40,.43),'red',18,12),beam((0,0,.75),(.03,0,1.05),.045,'trunk'),sphere((.20,0,.95),(.22,.09,.07),'leaf',12,8)),
 'lantern':lambda:lamp((0,0,0)),
 'sun':lambda:(sphere((0,0,.12),(.48,.48,.14),'goldLight',18,10),[gem((.68*cos(i*pi/4),.68*sin(i*pi/4),.15),.24,'gold') for i in range(8)]),
 'note':lambda:(beam((-.15,0,.15),(-.15,0,1.0),.055,'purple'),sphere((-.31,0,.15),(.25,.11,.16),'purple',14,10),box((.14,0,.99),(.60,.11,.14),'purple',.04))
}
# Preserve physically meaningful silhouettes; books/brushes must not become cubes.
PROP_SIZES={
 'book':(2.1,.42,1.45),'scroll':(2.0,.35,1.9),'abacus':(1.9,1.8,.36),
 'balance':(2.3,1.8,.9),'globe':(1.5,1.8,1.45),'brush':(2.0,.25,.24),
 'trophy':(1.7,1.8,1.1),'hourglass':(1.0,1.7,1.0),'chest':(1.8,1.4,1.3),
 'watering':(1.9,1.4,1.0),'sprout':(1.0,1.5,1.0),'flower':(1.0,1.5,1.0),
 'star':(1.8,.25,1.8),'crystal':(1.0,1.8,.8),'shell':(1.3,.45,1.4),
 'seed':(.65,.90,.45),'cube':(1.2,1.2,1.2),'apple':(1.1,1.4,1.05),
 'lantern':(1.0,1.5,1.0),'sun':(1.8,.4,1.8),'note':(1.2,1.6,.3)
}
OBJECTS.update({'cat':lambda:pet('cat'),'dog':lambda:pet('dog'),'rabbit':lambda:pet('rabbit'),'fish':fish_tool,'strawberry':strawberry,'banana':banana,'carrot':carrot,'cup':cup,'ball':ball,'tree':lambda:tree('oak','leaf')})
PROP_SIZES.update({'cat':(1.3,1.8,1.1),'dog':(1.5,1.8,1.2),'rabbit':(1.1,2.1,1.0),'fish':(1.9,.95,.6),'strawberry':(1.1,1.4,1.0),'banana':(1.7,1.2,.45),'carrot':(.55,1.7,.50),'cup':(1.4,1.2,1.1),'ball':(1.2,1.2,1.2),'tree':(1.5,2.0,1.4)})
for key,fn in OBJECTS.items():
 bake('prop_'+key,fn,*PROP_SIZES[key])
 RECORDS[-1]['id']='Prop/'+key
# 3D blank tactile panel used as a frame, not baked instructional text.
def frame():
 box((0,0,.06),(6,4,.12),'page',.20)
 for y in (-2,2):box((0,y,.13),(6.2,.25,.25),'wood',.09);box((0,y,.29),(5.95,.04,.035),'gold',.015)
 for x in (-3,3):box((x,0,.13),(.25,4,.25),'wood',.09)
 for x in (-2.95,2.95):
  for y in (-1.95,1.95):sphere((x,y,.28),(.15,.15,.09),'goldLight',12,8)
bake('prop_frame',frame,6,0.40,4)
RECORDS[-1]['id']='Prop/frame'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'interior-sets-v45.blend'),compress=True)
(OUT/'manifest.json').write_text(json.dumps({'version':45,'rooms':ROOMS,'assets':RECORDS,'source':'Original Blender geometry, FBX + vertex AO; readable learning data stays live'},indent=2)+'\n')
print('V45_INTERIORS_EXPORTED',len(ROOMS),'rooms',len(RECORDS)-len(ROOMS),'props',sum(x['triangles'] for x in RECORDS),'triangles',flush=True)
