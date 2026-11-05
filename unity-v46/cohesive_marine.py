"""64 individually keyed stylized species. Geometry families preserve named anatomy.
Original game names, care rules and ownership identifiers are never rewritten.
These are child-oriented illustrations, not biological identification plates.
"""
def fish_eye(x,y,z,r=.095):
 sphere((x,y,z),(r,r*.44,r*1.15),'eye',16,10)
 sphere((x+.02,y-.035,z+.035),(r*.34,r*.16,r*.36),'pearl',10,6)

def fish_basic(row):
 key=row['id'];body=row['color'].lstrip('#');P['marine_'+key]=body;c='marine_'+key
 tall=key in ['angel','discus','copperband-butterflyfish','longnose-butterflyfish','flame-angelfish']
 thin=key in ['neon','zebra-danio','white-cloud-minnow','rummy-nose-tetra','clown-killifish','otocinclus','medaka']
 h=.77 if tall else .30 if thin else .46
 if key=='yellow-boxfish':box((0,0,.65),(1.30,.75,.90),c,.18);h=.48
 else:sphere((0,0,.68),(.96,.29,h),c,28,16)
 sphere((.18,-.005,.55),(.71,.276,h*.65),'pearl' if key in ['koi','goldfish','bronze-corydoras'] else c,22,14)
 # Transparent fin effect is approximated by soft pastel vertex shading, robust on WebGL.
 fincolor='goldLight' if key in ['yellowtail-damselfish','blue-tang','goldfish'] else 'coral' if key in ['neon','zebra-danio','white-cloud-minnow','rummy-nose-tetra'] else c
 before=set(bpy.data.objects)
 fan=.70 if key in ['guppy','betta'] else .48
 tail=fin([(-.75,0,.68),(-1.65,0,.68+fan),(-1.50,0,.68),(-1.65,0,.68-fan)],fincolor,.05)
 for j in (-2,-1,0,1,2):beam((-.85,-.06,.68),(-1.55,-.06,.68+fan*j/2),.015,'pearl' if key=='betta' else fincolor,8)
 tagged(before,'Tail',(-.72,0,.68))
 fin([(-.6,0,.68+h*.75),(-.45,0,.68+h+.4 if key=='angel' else .68+h+.18),(.33,0,.68+h*.80)],fincolor,.045)
 if key in ['angel','discus']:
  fin([(-.5,0,.4),(-.4,0,-.28),(.30,0,.34)],fincolor)
  for y in (-.17,.17):curve_tube('ventral filament',[(.40,y,.25),(.20,y,-.18),(-.05,y,-.43)],.018,c)
 elif key in ['betta','pearl-gourami','dwarf-gourami']:
  fin([(-.75,0,.43),(-.65,0,-.08),(.32,0,.2),(.50,0,.45)],fincolor)
  for y in (-.16,.16):beam((.40,y,.40),(-.12,y,.12),.02,fincolor)
 # Paired pectoral fins, slanted away from the body.
 for side in (-1,1):
  f=sphere((.28,side*.29,.45),(.28,.055,.13),fincolor,14,8);f.rotation_euler.z=side*.38
 fish_eye(.58,-.255,.81,.08 if thin else .11)
 fish_eye(.58,.255,.81,.08 if thin else .11)
 sphere((.88,-.03,.63),(.08,.10,.045),c,12,8)
 if key in ['copperband-butterflyfish','longnose-butterflyfish']:
  beam((.68,0,.63),(1.33,0,.59),.07,c,12)
  fish_eye(.52,-.28,.86,.095)
 if key in ['bronze-corydoras','panda-corydoras','otocinclus']:
  for y in (-.13,.13):curve_tube('barbel',[(.84,y,.48),(1.04,y*2,.36),(1.14,y*3,.41)],.015,'cream')
 # Explicitly authored species markings.
 if key in ['neon','white-cloud-minnow','otocinclus']:
  stripe='aqua' if key=='neon' else 'eye' if key=='otocinclus' else 'pearl'
  for side in (-1,1):sphere((0,side*.285,.75),(.73,.017,.045),stripe,20,8)
 if key=='zebra-danio':
  for side in (-1,1):
   for z in (.53,.67,.81):sphere((0,side*.281,z),(.72,.015,.028),'navy',20,8)
 if key in ['clownfish','clown-killifish','flame-angelfish','dwarf-gourami','copperband-butterflyfish']:
  bands=[-.48,.10,.62] if key=='clownfish' else [-.60,-.22,.18,.53]
  for x in bands:
   for side in (-1,1):sphere((x,side*.275,.69),(.065 if key!='clownfish' else .085,.026,h*.90),'pearl' if key=='clownfish' else 'blue' if key=='dwarf-gourami' else 'orange' if key=='copperband-butterflyfish' else 'ink',12,10)
 if key=='royal-gramma':
  for side in (-1,1):sphere((-.43,side*.21,.69),(.46,.065,h*.84),'gold',16,10)
 if key=='harlequin-rasbora':
  for side in (-1,1):fin([(-.72,side*.28,.66),(-.08,side*.28,.88),(-.25,side*.28,.35)],'ink',.012)
 if key in ['rummy-nose-tetra','cherry-barb']:
  sphere((.61,0,.70),(.32,.28,h*.85),'red',20,12);fish_eye(.63,-.265,.81,.08)
 if key=='panda-corydoras':
  for side in (-1,1):sphere((.56,side*.28,.8),(.14,.025,.23),'ink',12,10)
  fish_eye(.58,-.31,.81,.065)
 if key in ['pearl-gourami','celestial-pearl-danio','german-blue-ram','yellow-boxfish','mandarinfish','discus','scarlet-badis']:
  for i in range(24):
   x=-.62+(i%8)*.16;z=.40+(i//8)*h*.62
   for side in (-1,1):sphere((x,side*.29,z),(.035,.018,.038),'ink' if key=='yellow-boxfish' else 'orange' if key=='mandarinfish' else 'aqua' if key=='german-blue-ram' else 'pearl',8,6)
 if key=='koi':
  for x,z,r,col in [(-.4,.85,.19,'red'),(.30,.80,.22,'red'),(-.20,.45,.13,'ink')]:
   for side in (-1,1):sphere((x,side*.28,z),(r,.026,r*.8),col,12,8)
 if key=='porcupinefish':
  for i in range(30):
   a=2*pi*i/10;z=.4+(i//10)*.24;p=Vector((.75*cos(a),.29*sin(a),z));d=Vector((cos(a),sin(a),.25)).normalized()
   beam(p,p+d*.18,.027,'goldLight',8)
 return 'fish'

def turtle_model(row):
 leather=row['id']=='leatherback-turtle';c='charcoal' if leather else 'olive'
 sphere((0,0,.65),(.85,.59,.36),c,28,18)
 sphere((0,-.015,.52),(.77,.56,.20),'tan',24,14)
 sphere((.98,0,.60),(.33,.23,.21),c,20,12)
 for side in (-1,1):
  fish_eye(1.12,side*.16,.67,.065)
  for x in (-.55,.50):
   flipper=sphere((x,side*.59,.43),(.46,.18,.095),c,18,10);flipper.rotation_euler.z=side*(.60 if x>0 else -.4)
 if leather:
  for k in range(7):
   y=-.40+k*.133;curve_tube('shell ridge',[(-.65,y,.72),(-.25,y,.99),(.25,y,.99),(.65,y,.72)],.024,'silver')
 else:
  for i in range(7):
   a=2*pi*i/6;sphere((.40*cos(a),.29*sin(a),.94),(.23,.16,.035),'leafDark',6,6)
 return 'turtle'

def whale_model(row):
 key=row['id'];shark='shark' in key;dolphin='dolphin' in key
 c='pearl' if key=='beluga-whale' else 'blue' if key=='whale-shark' else 'silver' if dolphin else 'aquaDark' if shark else 'navy'
 sphere((0,0,.8),(1.35,.42,.52),c,28,18)
 sphere((.25,0,.56),(.95,.39,.20),'pearl',24,12)
 if dolphin:beam((.9,0,.75),(1.68,0,.68),.11,c,16)
 if key=='beluga-whale':sphere((.93,0,1.03),(.4,.40,.32),c,22,14)
 if shark:
  fin([(-.35,0,1.1),(-.45,0,1.85),(.16,0,1.16)],c,.05)
  fin([(-1.0,0,.75),(-1.90,0,1.60),(-1.55,0,.63),(-1.80,0,.1)],c,.045)
  for i in range(4):
   for side in (-1,1):beam((.55-i*.1,side*.38,.72),(.60-i*.1,side*.34,.45),.018,'ink',8)
 else:
  if key!='beluga-whale':fin([(-.45,0,1.2),(-.52,0,1.55),(.02,0,1.21)],c)
  for side in (-1,1):fin([(-1.1,0,.75),(-1.85,side*.62,.75),(-1.70,0,.64)],c)
 for side in (-1,1):
  flipper=sphere((.2,side*.43,.56),(.55,.14,.10),c,18,10);flipper.rotation_euler.z=-side*.7
  fish_eye(.95,side*.31,.86,.075)
 if key=='whale-shark':
  for i in range(42):
   x=-.9+(i%10)*.21;ang=.35+(i//10)*.6
   for side in (-1,1):sphere((x,side*.42*sin(ang),.81+.50*cos(ang)),(.025,.021,.025),'pearl',8,6)
 if key=='humpback-whale':
  for i in range(5):curve_tube('throat pleat',[(.95,-.14-i*.035,.52),(.35,-.28-i*.02,.36),(-.1,-.3-i*.015,.39)],.012,'silver')
 return 'shark' if shark else 'cetacean'

def crustacean(row):
 key=row['id'];crab=key in ['sea-crab','hermit-crab'];c='coral' if 'cleaner' not in key else 'red';z=.48
 if crab:sphere((0,0,z),(.55,.39,.22),c,22,14)
 else:
  for i in range(7):sphere((.58-i*.22,0,z-.05*i+0.014*i*i),(.22-i*.012,.22-i*.013,.20-i*.01),c,18,10)
 # Five leg pairs in shrimp, four walking pairs plus claw pair in crabs/lobsters.
 for side in (-1,1):
  for i in range(4 if crab or 'lobster' in key else 5):
   x=-.42+i*.23;curve_tube('segmented leg',[(x,side*.18,.4),(x-.1,side*.52,.28),(x-.22,side*.73,.08)],.027,c)
  for x in (.30,.5):sphere((x,side*.18,.70),(.05,.05,.065),'eye',12,8)
  if key!='spiny-lobster':
   curve_tube('claw arm',[(.40,side*.2,.47),(.67,side*.44,.53),(.94,side*.46,.62)],.075,c)
   if crab or key=='american-lobster':
    scale=1.15 if side==1 and key=='american-lobster' else 1
    sphere((1.05,side*.45,.62),(.24*scale,.14,.12),c,18,10)
    curve_tube('claw pincer',[(1.1,side*.37,.62),(1.35,side*.39,.65),(1.30,side*.45,.63)],.046,c)
  for j in range(2):curve_tube('antenna',[(.55,side*.12,.66),(.90,side*(.20+j*.08),.99),(1.45,side*(.40+j*.1),1.16)],.014,'pearl' if key=='cleaner-shrimp' else c)
 if key=='hermit-crab':
  sphere((-.43,.08,.76),(.52,.48,.53),'sand',24,16)
  for i in range(4):torus((-.49,.07,.76+i*.08),.32-i*.065,.07,'wood')
 if not crab:
  for side in (-1,1):sphere((-1.04,side*.15,.34),(.29,.16,.06),c,14,8)
 if key=='cleaner-shrimp':beam((-.75,0,.52),(.60,0,.70),.032,'pearl')
 return 'crustacean'

def tentacled(row):
 key=row['id'];squid=key=='giant-squid';c='coral' if squid else 'red' if key=='giant-pacific-octopus' else 'purple'
 sphere((0,0,1.05),(.42,.35,.92 if squid else .57),c,26,18)
 for side in (-1,1):fish_eye(side*.25,-.30,.99,.10)
 for i in range(8):
  a=2*pi*i/8;pts=[]
  for j in range(7):
   r=.22+j*.18;ang=a+.18*sin(j*.65);pts.append((r*cos(ang),r*sin(ang),.35-.04*j+.06*sin(j)))
  curve_tube('eight arms',pts,.075,c,10)
  for p in pts[2::2]:sphere((p[0],p[1],p[2]-.06),(.055,.055,.028),'pearl',10,6)
 if squid:
  for side in (-1,1):
   curve_tube('feeding tentacle',[(side*.3,-.2,.35),(side*.8,-.5,.20),(side*1.3,-.8,.15),(side*1.8,-1.3,.22)],.04,c)
   sphere((side*1.85,-1.35,.21),(.15,.30,.065),c,14,8)
   fin([(0,0,1.65),(side*.63,0,1.55),(0,0,2.02)],c)
 return 'squid-10' if squid else 'octopus-8'

def ray_model(row):
 manta=row['id']=='manta-ray';c='navy' if manta else 'aquaDark'
 sphere((0,0,.37),(.62,.50,.17),c,24,14)
 for side in (-1,1):
  fin([(.55,0,.4),(-.3,side*1.65,.41),(-.58,side*.36,.3)],c,.055)
  fish_eye(.35,side*.23,.50,.065)
  if manta:curve_tube('cephalic lobe',[(.45,side*.35,.4),(.89,side*.27,.39),(.85,side*.12,.46)],.065,c)
 curve_tube('ray tail',[(-.40,0,.35),(-1.0,0,.31),(-1.65,.12,.3),(-2.2,.16,.35)],.028,c)
 if not manta:
  for i in range(18):sphere((-.45+(i%6)*.17,-.32+(i//6)*.3,.54),(.05,.04,.014),'aqua',10,6)
 return 'ray'

def seahorse_model(row):
 key=row['id'];c='gold' if key=='seahorse' else 'leaf' if key=='leafy-seadragon' else 'tan'
 sphere((0,0,1.0),(.20,.17,.51),c,20,14)
 sphere((.15,0,1.55),(.25,.18,.24),c,22,14)
 beam((.25,0,1.51),(.67,0,1.42),.075,c,14);fish_eye(.18,-.18,1.63,.065)
 pts=[(0,0,.65),(-.08,0,.3),(-.35,0,.13),(-.60,0,.19),(-.65,0,.40),(-.51,0,.48),(-.40,0,.36)]
 curve_tube('curled tail',pts,.065,c)
 for j in range(7):sphere((-.16,0,.60+j*.15),(.07,.11,.065),'goldLight',10,6)
 fin([(-.15,0,.85),(-.5,0,1.15),(-.18,0,1.28)],'pearl')
 if key!='seahorse':
  for i in range(9):
   side=(-1)**i;z=.25+i*.15
   o=sphere((side*.27,.06,z),(.24,.04,.075),c,12,8);o.rotation_euler.y=side*.55
 return 'seahorse'

def invertebrate(row):
 key=row['id']
 if 'jelly' in key:
  c='lilac' if key=='moon-jelly' else 'coral'
  sphere((0,0,1.22),(.74,.64,.40),c,28,16)
  torus((0,0,1.07),.61,.08,'pearl')
  if key=='moon-jelly':
   for a in (0,pi/2,pi,pi*1.5):torus((.25*cos(a),.25*sin(a),1.57),.13,.027,'pink')
  for i in range(12 if key=='lion-mane-jelly' else 8):
   a=i*pi/4;r=.40;pts=[(r*cos(a)+.08*sin(j),r*sin(a),1.10-j*.19) for j in range(6)]
   curve_tube('hanging tentacle',pts,.021,c,8)
  return 'jellyfish'
 if key=='common-starfish':
  verts=[(0,0,.24)];outline=[]
  for i in range(10):
   a=pi/2+i*pi/5;r=1 if i%2==0 else .42;outline.append((r*cos(a),r*sin(a),.13))
  verts+=outline;faces=[(0,1+i,1+(i+1)%10) for i in range(10)];mesh_obj('five arms',verts,faces,'coral',True)
  for i in range(5):
   a=pi/2+i*2*pi/5
   for r in (.30,.50,.70):sphere((r*cos(a),r*sin(a),.24-r*.07),(.06,.06,.04),'goldLight',10,6)
  return 'starfish-5'
 if key=='long-spined-urchin':
  sphere((0,0,.65),(.42,.42,.40),'purple',22,14)
  for i in range(65):
   t=i*2.39996;z=-.8+1.8*(i+.5)/65;r=sqrt(max(0,1-z*z));d=Vector((r*cos(t),r*sin(t),z));p=Vector((0,0,.65))+d*.33
   beam(p,Vector((0,0,.65))+d*1.05,.018,'navy',6)
  return 'urchin'
 if key=='staghorn-coral':
  for i in range(5):
   a=2*pi*i/5;p=(.35*cos(a),.35*sin(a),.7+i*.14)
   curve_tube('coral branch',[(0,0,0),p,(p[0]*1.8,p[1]*1.8,p[2]+.45)],.07,'coral')
   for side in (-1,1):beam(p,(p[0]+side*.3,p[1]+.2,p[2]+.35),.045,'pink',10)
  return 'coral'
 if key=='sea-anemone':
  cylinder((0,0,.22),.40,.44,'coral',24)
  for i in range(20):
   a=i*pi/10;curve_tube('anemone tentacle',[(.3*cos(a),.3*sin(a),.3),(.60*cos(a),.60*sin(a),.65),(.66*cos(a+.1),.66*sin(a+.1),1)],.034,'pink',8)
  return 'anemone'
 if key=='giant-clam':
  sphere((0,0,.3),(.76,.64,.25),'sand',28,16)
  sphere((0,-.03,.45),(.68,.59,.12),'blue',24,12)
  for i in range(9):
   a=i*pi/8;o=sphere((.60*cos(a),.53*sin(a),.54),(.11,.18,.25),'pearl',14,10)
  for i in range(5):sphere((-.45+i*.23,-.24,.59),(.12,.22,.07),'aqua',14,8)
  return 'clam'
 if key=='nudibranch':
  sphere((0,0,.25),(.80,.33,.21),'blue',24,14)
  for i in range(20):
   a=2*pi*i/20;sphere((.76*cos(a),.31*sin(a),.30),(.09,.06,.035),'goldLight',10,6)
  for x in (-.20,.05,.30):sphere((x,.03,.53),(.09,.1,.3),'aqua',12,8)
  for y in (-.14,.14):beam((.55,y,.35),(.64,y,.65),.04,'gold')
  return 'nudibranch'
 if key=='sea-cucumber':
  sphere((0,0,.3),(.91,.33,.27),'wood',24,14)
  for i in range(24):
   x=-.6+(i%8)*.17;y=-.23+(i//8)*.23;sphere((x,y,.52),(.048,.048,.075),'tan',10,6)
  return 'sea-cucumber'
 raise ValueError('No explicit anatomy family: '+key)

def marine_builder(row):
 key=row['id']
 if key in ['sea-turtle','leatherback-turtle']:return turtle_model(row)
 if any(word in key for word in ['whale','shark','dolphin']):return whale_model(row)
 if key in ['shrimp','cleaner-shrimp','hermit-crab','sea-crab','american-lobster','spiny-lobster']:return crustacean(row)
 if key in ['octopus','giant-pacific-octopus','giant-squid']:return tentacled(row)
 if 'ray' in key:return ray_model(row)
 if key in ['seahorse','leafy-seadragon','weedy-seadragon']:return seahorse_model(row)
 if key in ['common-starfish','long-spined-urchin','staghorn-coral','sea-anemone','giant-clam','nudibranch','sea-cucumber'] or 'jelly' in key:return invertebrate(row)
 return fish_basic(row)
