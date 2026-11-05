"""Original v46 soft-toy geometry and semantically separated motion pivots."""
P.update({'skin':'f3c9a7','skinWarm':'d9a57e','skinDeep':'a36d4c','blush':'efa9aa','hair':'7a4c43','hairLight':'bd8071','hairViolet':'8b749e','eye':'263d52','eyeBlue':'537b9b','wing':'d6ecec','wingPink':'f8d1de','pearl':'fff9e8','silver':'adccd5','olive':'5c8564','orange':'f08e45','charcoal':'45515a','navy':'314963','page':'fff5d9','lilac':'bba2d4','aqua':'70ced5','aquaDark':'428c9b','clay':'c38164','tan':'cfaa7d','sand':'efce9d','mint':'63b796','coral':'e18e78','sage':'71977e','ink':'304954'})

def tagged(before,name,pivot=None):
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH':o['piece']=name;o['pivot']=tuple(pivot or (0,0,0))

def group_call(fn,at=(0,0,0),scale=1,rotate=0,piece=None):
 before=set(bpy.data.objects);fn(); rot=Matrix.Rotation(rotate,4,'Z')
 for o in set(bpy.data.objects)-before:
  o.location=Vector(at)+rot.to_3x3()@(o.location*scale)
  o.scale*=scale;o.rotation_euler.z+=rotate
  if piece:o['piece']=piece
 return set(bpy.data.objects)-before

def curve_tube(name,pts,r,c,segments=10):
 for i in range(len(pts)-1):beam(pts[i],pts[i+1],r,c,segments)
 for p in pts[1:-1]:sphere(p,(r,r,r),c,10,6)

def face(at=(0,0,0),scale=1,skin='skin',eyes='eyeBlue',animal=False):
 before=set(bpy.data.objects)
 for side in (-1,1):
  x=side*.20
  sphere((x,-.448,.09),(.115,.035,.16),'eye',20,12)
  sphere((x,-.479,.07),(.082,.022,.108),eyes,16,10)
  sphere((x,-.497,.088),(.047,.014,.083),'eye',14,10)
  sphere((x-.027,-.511,.144),(.034,.012,.038),'pearl',12,8)
  sphere((x+.035,-.505,.035),(.015,.009,.018),'pearl',10,6)
  sphere((side*.36,-.37,-.085),(.10,.026,.047),'blush',12,8)
  beam((side*.13,-.443,.30),(side*.29,-.403,.31),.020,'hair',10)
 sphere((0,-.478,-.03),(.065,.065,.06),skin,14,10)
 curve_tube('smile',[(-.075,-.451,-.18),(0,-.472,-.205),(.075,-.451,-.18)],.013,'hair',8)
 for o in set(bpy.data.objects)-before:o.location=Vector(at)+o.location*scale;o.scale*=scale

def fairy(who='tae'):
 color='pink' if who=='tae' else 'lilac';hair='hairLight' if who=='tae' else 'hairViolet'
 before=set(bpy.data.objects)
 sphere((0,0,1.20),(.31,.23,.43),color,20,14)
 cylinder((0,0,.79),.56,.65,color,32,r2=.27)
 for i in range(9):
  a=2*pi*i/9;p=sphere((.37*cos(a),.29*sin(a),.71),(.22,.16,.33),'rose' if who=='tae' and i%3==0 else color,14,10)
  p.rotation_euler.y=.20*cos(a);p.rotation_euler.x=-.15*sin(a)
 torus((0,0,1.13),.27,.045,'gold')
 sphere((0,-.24,1.23),(.12,.04,.12),'pearl',12,8)
 tagged(before,'Body')
 for side,name in [(-1,'LegL'),(1,'LegR')]:
  before=set(bpy.data.objects);beam((side*.17,0,.60),(side*.17,-.015,.18),.085,'skin',12)
  sphere((side*.17,-.08,.12),(.15,.23,.12),color,16,10)
  sphere((side*.17,-.25,.15),(.055,.045,.055),'goldLight',10,6)
  tagged(before,name,(side*.17,0,.56))
 for side,name in [(-1,'ArmL'),(1,'ArmR')]:
  before=set(bpy.data.objects)
  sphere((side*.34,0,1.43),(.14,.16,.16),color,16,10)
  beam((side*.35,-.015,1.40),(side*.52,-.09,1.10),.073,'skin',12)
  sphere((side*.54,-.10,1.07),(.09,.08,.11),'skin',14,10)
  tagged(before,name,(side*.32,0,1.42))
 before=set(bpy.data.objects)
 sphere((0,0,1.99),(.52,.44,.57),'skin',28,20)
 sphere((0,.105,2.15),(.54,.43,.48),hair,24,16)
 sphere((0,-.025,2.52),(.26,.24,.20),hair,20,12)
 for i in range(7):
  x=-.43+i*.143;lock=sphere((x,-.31,2.34-.05*abs(i-3)),(.16,.20,.24),hair,16,12);lock.rotation_euler.y=(i-3)*.17
 for side in (-1,1):
  sphere((side*.47,-.02,1.96),(.12,.14,.18),'skin',14,10)
  for k in range(3):sphere((side*(.47+.035*k),.04,1.75-.18*k),(.13,.17,.18),hair,14,10)
 face((0,-.018,2.02),1,'skin')
 for i in range(5):
  x=-.30+i*.15;z=2.60+.08*sin(i*pi/4)
  sphere((x,-.17,z),(.065,.058,.06),color,12,8)
  sphere((x,-.206,z+.03),(.028,.025,.027),'goldLight',10,6)
 tagged(before,'Head',(0,0,1.65))
 for side,name in [(-1,'WingL'),(1,'WingR')]:
  before=set(bpy.data.objects)
  wing=sphere((side*.53,.22,1.48),(.38,.065,.55),'wingPink' if who=='tae' else 'wing',24,16);wing.rotation_euler.y=side*.44
  wing2=sphere((side*.49,.24,1.05),(.30,.058,.27),'pearl',20,12);wing2.rotation_euler.y=-side*.35
  curve_tube('wing vein',[(side*.15,.15,1.19),(side*.45,.15,1.49),(side*.68,.15,1.80)],.018,color,8)
  for k in range(4):sphere((side*(.37+k*.07),.145,1.42+k*.11),(.028,.019,.028),'goldLight',8,6)
  tagged(before,name,(side*.15,.22,1.28))

def owl(plumage='tan',scholar=False):
 sphere((0,0,.80),(.52,.39,.63),plumage,22,16)
 sphere((0,-.06,1.41),(.57,.40,.44),plumage,24,16)
 sphere((0,-.34,.77),(.35,.085,.42),'pearl',20,12)
 for side in (-1,1):
  sphere((side*.23,-.38,1.44),(.25,.075,.28),'pearl',20,12)
  sphere((side*.23,-.455,1.44),(.11,.045,.16),'eye',18,12)
  sphere((side*.255,-.493,1.50),(.041,.015,.05),'pearl',10,6)
  sphere((side*.49,-.01,.84),(.15,.30,.43),plumage,16,12)
  sphere((side*.24,-.13,.19),(.19,.23,.09),'gold',14,10)
  o=cylinder((side*.39,.01,1.79),.19,.34,plumage,16,r2=.01);o.rotation_euler.y=side*.25
 cylinder((0,-.46,1.20),.09,.22,'gold',12,r2=.005).rotation_euler.x=pi/2
 if scholar:
  for side in (-1,1):torus((side*.23,-.513,1.44),.20,.024,'gold',(pi/2,0,0))
  beam((-.04,-.51,1.46),(.04,-.51,1.46),.022,'gold')
  group_call(lambda:book(scale=.40,color='blue'),(0,-.40,.28))

def squirrel():
 before=set(bpy.data.objects);pet('rabbit')
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH' and o.location.z>1.55 and abs(o.location.x)>.1 and o.dimensions.z>.5:bpy.data.objects.remove(o,do_unlink=True)
 for side in (-1,1):sphere((side*.28,0,1.56),(.16,.12,.18),'tan',16,10)
 sphere((.48,.32,.72),(.36,.25,.68),'wood',22,14)
 sphere((.39,.35,1.10),(.27,.24,.30),'tan',18,12)
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH' and o.data.materials and o.data.materials[0].name.endswith('cream'):o.data.materials[0]=material('tan')

def butterfly_model():
 sphere((0,0,.66),(.10,.15,.52),'ink',16,12)
 sphere((0,-.03,1.12),(.19,.16,.18),'purple',16,10)
 for side in (-1,1):
  sphere((side*.18,-.17,1.16),(.06,.035,.09),'eye',12,8)
  for z,s,c in [(1.0,.55,'purple'),(.40,.38,'pink')]:
   o=sphere((side*.47,.04,z),(s,.075,s*.80),c,22,14);o.rotation_euler.y=-side*.24
   sphere((side*.53,-.03,z),(.26,.035,.23),'goldLight',16,10)
  curve_tube('antenna',[(side*.07,0,1.25),(side*.12,0,1.46),(side*.25,0,1.51)],.02,'ink')

def human_worker(index=0,coat='blue',hat='',hair='hair',skin='skin'):
 for side in (-1,1):
  beam((side*.19,0,.66),(side*.19,0,.18),.12,'navy',14)
  sphere((side*.20,-.11,.11),(.16,.25,.11),'charcoal',16,10)
 sphere((0,0,1.03),(.40,.26,.52),coat,22,14)
 box((0,-.26,1.13),(.07,.045,.60),'pearl',.02)
 for side in (-1,1):
  beam((side*.37,0,1.37),(side*.52,-.02,.91),.115,coat,14)
  sphere((side*.52,-.025,.87),(.105,.10,.12),skin,16,10)
 sphere((0,0,1.92),(.49,.43,.53),skin,26,18)
 sphere((0,.12,2.10),(.51,.40,.37),hair,22,16)
 for j in range(5):sphere((-.35+j*.17,-.27,2.25),(.16,.18,.18),hair,14,10)
 for side in (-1,1):sphere((side*.47,0,1.90),(.12,.14,.18),skin,14,10)
 face((0,-.014,1.96),.9,skin)
 if index%3==0:
  for side in (-1,1):sphere((side*.46,.11,1.65),(.15,.21,.30),hair,16,10)
 if hat=='helmet':
  sphere((0,.015,2.39),(.55,.47,.25),'gold',24,14)
  box((0,-.14,2.30),(1.10,.82,.08),'goldLight',.05)
 elif hat=='chef':
  cylinder((0,0,2.47),.40,.35,'pearl',24)
  for x,y,z in [(0,0,2.76),(-.27,0,2.69),(.27,0,2.69),(0,-.20,2.69)]:sphere((x,y,z),(.30,.26,.25),'pearl',16,12)
 elif hat=='cap':
  sphere((0,0,2.36),(.52,.43,.22),coat,20,14);box((0,-.40,2.30),(.64,.42,.07),coat,.05)
 elif hat=='graduate':
  box((0,0,2.45),(1.0,.85,.10),'navy',.04)
  beam((.48,0,2.48),(.5,0,2.11),.018,'gold')
 elif hat=='nurse':
  box((0,-.1,2.37),(.7,.5,.16),'pearl',.06)
  box((0,-.365,2.38),(.15,.03,.045),'teal',.01)
 box((-.20,-.26,1.21),(.18,.04,.18),coat,.025)
 sphere((.18,-.28,1.31),(.04,.025,.04),'gold',10,6)

def laptop():
 box((0,0,.12),(1.35,.92,.15),'navy',.07)
 box((0,.36,.67),(1.34,.10,1.05),'navy',.06)
 box((0,.294,.70),(1.12,.018,.80),'aquaDark',.025)
 for i in range(3):box((-.25,.28,.90-i*.2),(.57-.1*i,.022,.034),'aqua',.006)
 for i in range(4):
  for j in range(7):box((-.51+j*.17,-.29+i*.13,.21),(.12,.075,.022),'silver',.008)

def stethoscope():
 curve_tube('stethoscope',[(-.36,0,1.2),(-.4,0,.85),(-.25,0,.62),(0,0,.58),(.25,0,.64),(.35,0,.9),(.32,0,1.2)],.04,'navy')
 curve_tube('tube',[(0,0,.6),(0,0,.30),(.28,0,.18)],.04,'navy')
 sphere((.32,0,.18),(.15,.055,.15),'silver',16,10)

def robot():
 box((0,0,.8),(.78,.50,.84),'silver',.14);box((0,0,1.55),(.9,.60,.60),'aqua',.17)
 for side in (-1,1):
  sphere((side*.24,-.315,1.62),(.1,.035,.13),'eye',14,10)
  beam((side*.55,0,.95),(side*.65,0,.5),.09,'silver');sphere((side*.67,0,.45),(.13,.13,.13),'gold',12,8)
  box((side*.25,-.04,.14),(.3,.48,.23),'navy',.06)
 box((0,-.32,1.35),(.35,.03,.05),'pearl',.015)
 beam((0,0,1.85),(0,0,2.05),.035,'silver');sphere((0,0,2.1),(.10,.1,.1),'gold',12,8)

def microscope():
 box((0,0,.10),(1.25,.8,.20),'navy',.06)
 curve_tube('arm',[(.32,.05,.2),(.48,.05,.90),(.1,.05,1.35)],.12,'silver')
 beam((-.20,0,1.30),(.12,0,1.8),.14,'navy',16)
 box((-.25,-.03,.68),(.7,.6,.10),'silver',.04)
 cylinder((-.25,-.03,.26),.18,.10,'aqua',16)

def fin(pts,c,depth=.035):
 n=len(pts);v=[(x,y-depth,z) for x,y,z in pts]+[(x,y+depth,z) for x,y,z in pts]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
 faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh_obj('rounded_fin',v,faces,c)

def airplane():
 sphere((0,0,.5),(1.25,.18,.20),'pearl',22,14)
 fin([(-.1,0,.55),(.6,-1.05,.5),(-.6,-1.05,.5)],'blue')
 fin([(-.1,0,.55),(.6,1.05,.5),(-.6,1.05,.5)],'blue')
 fin([(-.85,0,.56),(-1.12,0,1.05),(-.53,0,.57)],'coral')
