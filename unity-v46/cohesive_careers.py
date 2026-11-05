"""Profession-specific miniature tools; identical framing avoids ranking people visually."""
def tool_gavel():
 beam((-.4,0,.1),(.35,0,1.20),.09,'wood',14)
 hammer=cylinder((.27,0,1.12),.21,.78,'darkWood',20);hammer.rotation_euler.y=pi/2
 cylinder((-.18,0,.13),.54,.17,'gold',24)
def tool_flask():
 sphere((0,0,.53),(.49,.42,.50),'aqua',24,16)
 cylinder((0,0,1.13),.14,.55,'silver',20)
 torus((0,0,1.43),.16,.055,'pearl')
 for x,z,r in [(-.13,.60,.07),(.16,.78,.05),(.02,.99,.035)]:sphere((x,-.40,z),(r,.022,r),'pearl',12,8)
def tool_tooth():
 for x in (-.19,.19):sphere((x,0,.48),(.18,.22,.47),'pearl',18,14)
 sphere((0,0,1.0),(.47,.34,.38),'pearl',24,16)
 curve_tube('tooth crown',[(-.27,-.25,1.2),(0,-.31,1.1),(.27,-.25,1.2)],.035,'silver')
def tool_medicine():
 box((0,0,.45),(1.10,.62,.80),'pearl',.10)
 box((0,-.325,.48),(.60,.03,.13),'teal',.02)
 cylinder((.55,.12,.35),.20,.64,'coral',20);cylinder((.55,.12,.71),.22,.12,'pearl',20)
 for x in (-.25,.20):sphere((x,-.37,.90),(.18,.075,.075),'aqua',14,8)
def tool_heart():
 # Heart as a continuous rounded extruded emblem.
 n=36;pts=[]
 for i in range(n):
  t=i*2*pi/n;x=16*sin(t)**3/18;z=(13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t))/18
  pts.append((x,0,z+.95))
 fin(pts,'pink',.14)
def tool_chart():
 box((0,0,.78),(1.55,.12,1.45),'page',.08)
 for i,(h,c) in enumerate([(.35,'blue'),(.65,'teal'),(.95,'purple')]):box((-.48+i*.46,-.09,.20+h/2),(.25,.08,h),c,.025)
 beam((-.6,-.13,.12),(.62,-.13,.12),.025,'gold')
def tool_phone():
 box((0,0,.85),(.86,.18,1.60),'navy',.11);box((0,-.105,.90),(.70,.025,1.30),'aqua',.05)
 for i in range(6):sphere((-.19+(i%2)*.38,-.13,.50+(i//2)*.35),(.10,.025,.10),['gold','pink','purple'][i//2],12,8)
def tool_chip():
 box((0,0,.72),(1.2,.25,1.10),'navy',.07);box((0,-.14,.72),(.68,.08,.62),'aqua',.04)
 for side in (-1,1):
  for i in range(5):beam((side*.52,0,.31+i*.20),(side*.82,0,.31+i*.2),.025,'gold')
def tool_battery():
 box((0,0,.74),(.78,.65,1.35),'teal',.10);box((0,0,1.47),(.35,.30,.12),'silver',.025)
 fin([(-.14,-.35,1.17),(.16,-.35,1.17),(-.02,-.35,.80),(.2,-.35,.80),(-.16,-.35,.35),(-.02,-.35,.73),(-.22,-.35,.73)],'gold',.02)
def tool_rocket():
 sphere((0,0,.85),(.28,.28,.85),'pearl',24,16)
 torus((0,-.26,1.15),.14,.035,'blue',(pi/2,0,0));sphere((0,-.29,1.15),(.11,.025,.11),'aqua',16,10)
 for side in (-1,1):fin([(side*.16,0,.5),(side*.5,0,.18),(side*.22,0,.92)],'coral')
 cylinder((0,0,.13),.20,.26,'goldLight',16,r2=.03)
def tool_solar():
 panel=box((0,0,.90),(1.45,.12,1.1),'navy',.05)
 for x in (-.5,0,.5):
  for z in (.57,.90,1.23):box((x,-.075,z),(.43,.03,.27),'blue',.015)
 beam((0,0,.3),(0,0,.8),.09,'silver')
 sphere((.85,0,1.55),(.27,.10,.27),'goldLight',18,10)
def tool_wrench():
 beam((-.3,0,.1),(.30,0,1.10),.10,'silver',14)
 torus((.30,0,1.15),.22,.08,'silver',(pi/2,0,0))
 box((.32,-.015,1.34),(.2,.25,.25),'page',.01)
def tool_camera():
 box((0,0,.60),(1.20,.62,.78),'navy',.12);box((-.3,0,1.08),(.38,.40,.20),'navy',.03)
 o=cylinder((.12,-.39,.62),.31,.25,'silver',24);o.rotation_euler.x=pi/2
 o=cylinder((.12,-.55,.62),.23,.06,'aquaDark',24);o.rotation_euler.x=pi/2
 sphere((.03,-.59,.72),(.07,.018,.09),'pearl',12,8)
def tool_cloud():
 for x,z,r in [(-.48,.8,.34),(0,.97,.50),(.5,.78,.34)]:sphere((x,0,z),(r,.22,r*.8),'pearl',18,12)
 sphere((-.55,.12,1.15),(.30,.17,.30),'gold',18,12)
 for x in (-.38,0,.38):beam((x,0,.45),(x-.10,0,.14),.025,'aqua')
def tool_atom():
 sphere((0,0,.85),(.17,.17,.17),'coral',18,12)
 for a in (0,pi/3,pi*2/3):torus((0,0,.85),.65,.028,'silver',(pi/2,a,0))
 for x,y,z in [(.65,0,.85),(-.33,-.24,1.36),(-.33,.24,.34)]:sphere((x,y,z),(.10,.10,.10),'aqua',14,8)
def tool_board():
 box((0,0,1.1),(1.5,.15,1.1),'wood',.06);box((0,-.09,1.12),(1.34,.03,.91),'sage',.035)
 for i in range(3):box((-.18,-.12,1.38-i*.22),(.75-.1*i,.025,.028),'pearl',.005)
 for side in (-1,1):beam((side*.55,0,.05),(side*.55,0,.64),.045,'wood')
def tool_palette():
 sphere((0,0,.55),(.7,.14,.51),'tan',24,16)
 for i,c in enumerate(['blue','red','gold','purple','teal']):sphere((-.45+i*.22,-.15,.65+.17*sin(i)),(.09,.025,.09),c,12,8)
 beam((-.55,-.23,.10),(.45,-.23,1.10),.04,'wood');sphere((.5,-.23,1.16),(.07,.04,.14),'red',12,8)
def tool_microphone():
 beam((0,0,.12),(0,0,.80),.055,'silver')
 sphere((0,0,1.10),(.22,.21,.40),'navy',22,14)
 torus((0,0,1.1),.245,.018,'silver')
 cylinder((0,0,.08),.44,.15,'navy',24)
def tool_bread():
 sphere((0,0,.42),(.72,.38,.37),'gold',24,16)
 for i in range(4):curve_tube('bread cut',[(-.43+i*.28,-.22,.58),(-.34+i*.28,0,.76),(-.27+i*.28,.22,.58)],.035,'cream')
def tool_pan():
 cylinder((0,0,.30),.54,.12,'navy',24);beam((.5,0,.3),(1.05,0,.3),.085,'wood')
 sphere((0,0,.38),(.38,.38,.03),'pearl',18,10);sphere((.08,0,.43),(.16,.16,.05),'gold',16,10)
def tool_briefcase():
 box((0,0,.65),(1.2,.45,.88),'wood',.09)
 torus((0,0,1.2),.21,.055,'darkWood',(pi/2,0,0))
 box((0,-.25,.65),(.15,.035,.15),'gold',.02)
def tool_shield():
 fin([(-.56,0,1.45),(.56,0,1.45),(.50,0,.65),(0,0,.2),(-.50,0,.65)],'blue',.10)
 group_call(lambda:star(),(0,-.13,.82),.27,rotate=0)
def tool_house():
 box((0,0,.50),(1.10,.85,1.0),'cream',.05)
 fin([(-.72,0,1),(0,0,1.70),(.72,0,1)],'coral',.52)
 box((0,-.45,.37),(.28,.04,.55),'wood',.02)
 for x in (-.33,.33):box((x,-.45,.69),(.19,.04,.23),'aqua',.02)
def tool_bridge():
 for x in (-.65,.65):box((x,0,.35),(.20,.50,.70),'sand',.04)
 box((0,0,.68),(1.8,.65,.14),'wood',.035)
 for y in (-.31,.31):curve_tube('bridge arch',[(-.85,y,.73),(-.4,y,1.05),(0,y,1.17),(.4,y,1.05),(.85,y,.73)],.04,'coral')
def tool_broom():
 beam((-.35,0,.45),(.35,0,1.65),.047,'wood')
 broom=box((-.43,0,.25),(.72,.2,.48),'gold',.06);broom.rotation_euler.y=-.16
 for x in [-.70,-.53,-.36,-.19]:beam((x,0,.10),(x+.12,0,.46),.018,'tan')
def tool_steering():
 torus((0,0,.90),.60,.085,'navy',(pi/2,0,0))
 for i in range(3):
  a=i*pi*2/3;beam((0,0,.90),(.53*cos(a),0,.90+.53*sin(a)),.045,'silver')
 sphere((0,-.03,.90),(.15,.07,.15),'silver',14,10)
def tool_dumbbell():
 beam((-.55,0,.55),(.55,0,.55),.07,'silver')
 for side in (-1,1):
  for x in (.40,.56):
   o=cylinder((side*x,0,.55),.3,.12,'navy',20);o.rotation_euler.y=pi/2

def tool_printer():
 box((0,0,.74),(1.25,.95,1.3),'silver',.09)
 box((0,-.51,.8),(.85,.03,.90),'navy',.03)
 box((0,-.54,.55),(.58,.10,.15),'aqua',.025)
 box((0,-.53,.81),(.22,.16,.32),'coral',.03)
def tool_dress():
 cylinder((0,0,.58),.64,.95,'pink',24,r2=.22)
 sphere((0,0,1.18),(.28,.18,.34),'pink',18,12)
 beam((0,0,1.42),(0,0,1.8),.035,'gold')
 for side in (-1,1):beam((0,0,1.68),(side*.49,0,1.33),.035,'gold')
def tool_seat():
 box((0,0,.7),(.9,.8,.18),'teal',.08);box((0,.33,1.16),(.9,.16,.95),'teal',.09)
 for x in (-.32,.32):
  for y in (-.28,.28):beam((x,y,.05),(x,y,.65),.055,'wood')
def tool_headphones():
 curve_tube('headset',[(-.48,0,.55),(-.5,0,1.15),(-.2,0,1.43),(.2,0,1.43),(.5,0,1.15),(.48,0,.55)],.065,'navy')
 for side in (-1,1):sphere((side*.48,0,.62),(.12,.23,.3),'aqua',18,12)
def tool_fuel():
 box((0,0,.76),(.80,.6,1.5),'coral',.08);box((0,-.32,1.12),(.60,.04,.4),'pearl',.03)
 curve_tube('fuel hose',[(.4,0,1.2),(.72,0,1.12),(.73,0,.35),(.53,0,.3)],.05,'navy')
def tool_lock():
 box((0,0,.50),(1,.4,.80),'gold',.09)
 torus((0,0,1.02),.35,.075,'silver',(pi/2,0,0))
 sphere((0,-.22,.55),(.08,.025,.08),'navy',12,8)

TOOLS={'computer':laptop,'stethoscope':stethoscope,'robot':robot,'microscope':microscope,'plane':airplane,'gavel':tool_gavel,'flask':tool_flask,'tooth':tool_tooth,'medicine':tool_medicine,'heart':tool_heart,'chart':tool_chart,'phone':tool_phone,'chip':tool_chip,'battery':tool_battery,'rocket':tool_rocket,'solar':tool_solar,'wrench':tool_wrench,'camera':tool_camera,'cloud':tool_cloud,'atom':tool_atom,'board':tool_board,'palette':tool_palette,'microphone':tool_microphone,'bread':tool_bread,'pan':tool_pan,'briefcase':tool_briefcase,'shield':tool_shield,'house':tool_house,'bridge':tool_bridge,'broom':tool_broom,'steering':tool_steering,'dumbbell':tool_dumbbell,'printer':tool_printer,'dress':tool_dress,'chair':tool_seat,'headphones':tool_headphones,'fuel':tool_fuel,'lock':tool_lock,'globe':globe,'book':lambda:book(opened=True),'coffee':cup,'plant':pot,'abacus':abacus,'scale':scales,'scroll':scroll,'brush':brush,'trophy':trophy,'watering':watering,'chest':chest,'hourglass':hourglass}
# Exact ID-to-tools mapping rather than random art for a title.
CAREER_TOOLS={
 'ceo':('briefcase','chart'),'pilot':('plane','headphones'),'dentist':('tooth','microscope'),'career-37':('plant','medicine'),'doctor':('stethoscope','medicine'),
 'career-364':('board','atom'),'lawyer':('gavel','book'),'judge':('scale','gavel'),'accountant':('abacus','chart'),'economist':('chart','book'),
 'career-199':('gavel','scroll'),'career-10115':('phone','stethoscope'),'robot-engineer':('robot','computer'),'career-198':('house','scale'),'career-224':('abacus','scroll'),
 'career-8':('atom','microscope'),'diplomat':('globe','briefcase'),'ai-researcher':('computer','robot'),'career-374':('scroll','chip'),'pharmacist':('medicine','flask'),
 'career-10116':('flask','microscope'),'veterinarian':('stethoscope','pet'),'career-950':('chart','computer'),'career-244':('briefcase','chart'),'career-217':('abacus','scale'),
 'career-66':('robot','wrench'),'career-104':('atom','flask'),'astronautical':('rocket','plane'),'career-10105':('solar','battery'),'career-148':('headphones','plane'),
 'career-202':('chart','briefcase'),'career-137':('bridge','house'),'career-56':('wrench','robot'),'career-10108':('battery','flask'),'architect':('house','scroll'),
 'career-1436':('flask','medicine'),'career-13':('microscope','plant'),'career-322':('camera','board'),'semiconductor':('chip','computer'),'career-5':('cloud','globe'),
 'career-10110':('atom','computer'),'career-119':('chip','wrench'),'game-designer':('computer','trophy'),'career-1089':('board','atom'),'career-10032':('computer','chart'),
 'career-114':('battery','wrench'),'career-182':('plant','watering'),'career-212':('bridge','globe'),'career-10005':('house','chip'),'career-232':('microphone','board'),
 'career-1068':('chart','microphone'),'career-397':('stethoscope','heart'),'career-410':('board','book'),'career-262':('microphone','camera'),'career-10076':('phone','computer'),
 'career-84':('shield','wrench'),'career-385':('shield','watering'),'career-149':('plane','wrench'),'career-398':('heart','book'),'career-173':('pan','bread'),
 'career-359':('shield','headphones'),'career-10':('microscope','computer'),'career-219':('house','briefcase'),'career-142':('steering','chest'),'career-413':('board','heart'),
 'cybersecurity':('lock','computer'),'career-332':('chair','palette'),'career-33':('tooth','wrench'),'career-834':('computer','chip'),'career-10001':('printer','computer'),
 'career-252':('scroll','gavel'),'career-208':('globe','chest'),'career-354':('stethoscope','heart'),'career-10106':('plant','phone'),'career-344':('dress','brush'),
 'career-392':('dumbbell','heart'),'career-267':('book','globe'),'career-258':('abacus','scroll'),'career-264':('headphones','globe'),'career-937':('palette','computer'),
 'career-102':('wrench','shield'),'career-172':('bread','pan'),'career-369':('dumbbell','stethoscope'),'career-379':('heart','book'),'career-180':('coffee','pan'),
 'career-395':('board','toy'),'career-376':('toy','book'),'career-426':('steering','phone'),'career-1115':('fuel','shield'),'career-253':('scroll','computer'),
 'career-266':('book','camera'),'career-358':('shield','lock'),'career-1116':('abacus','scroll'),'career-243':('chest','briefcase'),'career-1128':('pan','plant'),
 'career-1441':('book','brush'),'career-353':('heart','stethoscope'),'career-356':('broom','watering'),'career-294':('camera','dress'),'career-352':('chest','broom')}
TOOLS.update({'pet':lambda:pet('dog'),'toy':lambda:pet('rabbit')})

def career_miniature(row,index):
 key=row['id'];a,b=CAREER_TOOLS[key]
 group=row['group'];coat={'medical':'pearl','tech':'teal','creative':'purple','planet':'sage','leadership':'blue','justice':'navy'}[group]
 hat=''
 if key in ['career-173','career-172','career-1128']:hat='chef';coat='pearl'
 elif key in ['career-385','career-84','career-137','career-56','career-149','career-102','architect']:hat='helmet';coat='coral' if key=='career-385' else 'teal'
 elif key in ['pilot','career-359','career-358','career-142','career-426']:hat='cap'
 elif key=='career-364':hat='graduate'
 elif key in ['career-354','career-353']:hat='nurse'
 skin=['skin','skinWarm','skinDeep','skinWarm'][index%4]
 hair=['hair','hairLight','charcoal','hair'][index%4]
 # Same display platform, height and camera for all jobs, unrelated to wages.
 cylinder((0,0,.08),1.48,.16,'sand',40)
 cylinder((0,0,.18),1.40,.07,'page',40)
 group_call(lambda:human_worker(index,coat,hat,hair,skin),(-.56,.05,.22),.88)
 group_call(TOOLS[a],(.72,-.25,.28),.64,rotate=-.12)
 group_call(TOOLS[b],(.95,.42,.28),.39,rotate=.16)
 # Small decorated display rail behind the worker; different layouts remain recognisable.
 for side in (-1,1):sphere((side*1.18,.45,.30),(.07,.07,.07),'goldLight',10,6)
 return [a,b]
