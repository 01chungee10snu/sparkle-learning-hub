"""Supplement the verified main set with all 48 reward catalogue illustrations.
The catalogue IDs/costs/ownership stay untouched. These are render-only models.
"""
from pathlib import Path
prefix=Path('unity-v46/export_cohesive.py').read_text().split('# CHARACTERS:')[0]
exec(compile(prefix,'unity-v46/export_cohesive.py','exec'),globals())
old=json.loads((OUT/'manifest.json').read_text());RECORDS=[];GALLERY=[]
rewards=json.loads(Path('unity-v46/reward-descriptors.json').read_text())

def bear_model():
 sphere((0,0,.68),(.43,.31,.52),'tan',24,16);sphere((0,-.03,1.35),(.52,.38,.45),'tan',26,18)
 for side in (-1,1):
  sphere((side*.38,0,1.72),(.18,.12,.18),'wood',18,12)
  sphere((side*.38,-.09,1.72),(.10,.04,.11),'blush',14,8)
  sphere((side*.20,-.39,1.40),(.055,.027,.07),'eye',14,8)
  sphere((side*.45,-.02,.73),(.15,.17,.30),'tan',16,10)
  sphere((side*.22,-.10,.16),(.20,.23,.17),'tan',18,12)
 sphere((0,-.39,1.22),(.19,.10,.15),'cream',18,12);sphere((0,-.50,1.28),(.07,.03,.055),'eye',12,8)

def fox_gift():
 sphere((0,0,.75),(.36,.27,.5),'orange',22,14);sphere((0,-.02,1.35),(.50,.34,.40),'orange',26,16)
 sphere((0,-.26,1.14),(.37,.15,.22),'pearl',22,14)
 for side in (-1,1):
  cone=cylinder((side*.33,.02,1.74),.20,.5,'orange',16,r2=.015);cone.rotation_euler.y=side*.22
  sphere((side*.19,-.35,1.40),(.06,.03,.075),'eye',14,10)
  sphere((side*.19,-.08,.17),(.14,.19,.14),'charcoal',16,10)
 sphere((0,-.43,1.23),(.075,.04,.06),'eye',12,8)
 tail=sphere((.48,.25,.65),(.25,.20,.68),'orange',22,16);tail.rotation_euler.y=.48
 sphere((.69,.25,1.18),(.16,.19,.24),'pearl',18,12)

def penguin_gift():
 sphere((0,0,.79),(.48,.36,.70),'navy',24,16);sphere((0,-.05,1.36),(.43,.34,.39),'navy',24,16)
 sphere((0,-.29,.83),(.36,.10,.51),'pearl',24,14)
 for side in (-1,1):
  sphere((side*.16,-.34,1.41),(.055,.025,.075),'eye',14,10)
  fin([(side*.35,0,1.05),(side*.72,0,.55),(side*.42,0,.5)],'navy')
  sphere((side*.22,-.16,.13),(.22,.25,.09),'gold',16,10)
 cylinder((0,-.40,1.21),.10,.25,'gold',12,r2=.005).rotation_euler.x=pi/2

def ribbon_gift():
 for side in (-1,1):
  o=sphere((side*.35,0,.85),(.39,.15,.27),'pink',24,14);o.rotation_euler.y=side*.20
  fin([(side*.10,0,.73),(side*.23,0,.10),(side*.53,0,.23),(side*.41,0,.75)],'rose',.04)
 sphere((0,-.03,.83),(.17,.18,.18),'goldLight',16,10)

def clover_gift():
 for i in range(4):
  a=i*pi/2;sphere((.23*cos(a),0,.85+.23*sin(a)),(.23,.10,.23),'leaf',20,12)
 curve_tube('stalk',[(0,0,.78),(.04,0,.3),(.15,0,.08)],.035,'leafDark')

def cherries_gift():
 for side in (-1,1):
  sphere((side*.25,0,.38),(.28,.25,.27),'red',24,16)
  curve_tube('cherry stem',[(side*.25,0,.6),(side*.18,0,1.0),(0,0,1.25)],.025,'wood')
 sphere((.24,0,1.15),(.25,.06,.10),'leaf',18,10)

def folded_paper():
 fin([(-.7,-.25,.2),(.7,-.25,.2),(.25,.35,.5),(-.25,.35,.5)],'blue',.045)
 fin([(-.52,0,.45),(.52,0,.45),(0,0,1.15)],'pearl',.035)

def microscope_icon():microscope()

FRIENDS={'friend-rabbit':lambda:pet('rabbit'),'friend-cat':lambda:pet('cat'),'friend-bear':bear_model,'friend-fox':fox_gift,'friend-owl':lambda:owl('lilac',True),'friend-butterfly':butterfly_model,'friend-penguin':penguin_gift,'friend-whale':lambda:whale_model({'id':'humpback-whale'})}
MARKS={'mark-flower':lambda:pot(flower=True),'mark-leaf':pot,'mark-ribbon':ribbon_gift,'mark-heart':tool_heart,'mark-clover':clover_gift,'mark-cherry':cherries_gift,'mark-moon':lambda:icon_emblem('moon'),'mark-palette':tool_palette}
TITLES={'title-curious':globe,'title-number':abacus,'title-word':lambda:book(opened=True),'title-hello':lambda:human_worker(1,'teal'),'title-thinker':lambda:pot(flower=True),'title-maker':robot,'title-story':brush,'title-space':tool_rocket}
FAMILIES={'story':lambda:book(opened=True),'drawing':tool_palette,'paperfold':folded_paper,'walk':lambda:tree('oak','leaf'),'experiment':microscope,'cooking':tool_pan,'picnic':chest}
COLORS={'bg-sky':'aqua','bg-leaf':'leaf','bg-peach':'coral','bg-ocean':'blue','bg-lemon':'goldLight','bg-lilac':'lilac','bg-rose':'pink','bg-rainbow':'purple'}
def reward_model(item):
 key=item['id'];category=item['category']
 if category=='friend':FRIENDS[key]()
 elif category=='mark':MARKS[key]()
 elif category=='title':TITLES[key]()
 elif category=='family':FAMILIES[key]()
 elif category=='background':
  c=COLORS[key];box((0,0,.65),(1.55,.20,1.18),'gold',.10);box((0,-.12,.67),(1.35,.035,.97),c,.06)
  sphere((.36,-.16,.90),(.17,.04,.17),'goldLight',18,10)
  for x in (-.32,-.08,.16):sphere((x,-.16,.52),(.25,.04,.12),'pearl',16,8)
  if key=='bg-rainbow':
   for i,c in enumerate(['pink','gold','leaf','blue','purple']):beam((-.5+i*.22,-.19,.27),(-.5+i*.22,-.19,1.03),.055,c)
 elif category=='light':
  if key=='sun-spark':icon_emblem('sun')
  elif key=='mint-gems':gem((0,0,.6),1,'teal')
  elif key=='trail-stars':
   for i in range(3):group_call(star,(-.45+i*.4,0,.3+i*.42),.25+i*.08)
  elif key=='halo':
   torus((0,0,.7),.5,.045,'gold',(pi/2,0,0))
   for i in range(8):a=i*pi/4;sphere((.5*cos(a),0,.7+.5*sin(a)),(.09,.05,.09),'pink',12,8)
  elif key in ['coral-orbit','rainbow-orbit']:
   torus((0,0,.75),.58,.045,'gold',(pi/2,0,0))
   for i in range(6):a=i*pi/3;sphere((.58*cos(a),0,.75+.58*sin(a)),(.10,.06,.10),['coral','gold','leaf','blue','purple','pink'][i] if key=='rainbow-orbit' else 'coral',12,8)
  elif key=='comet':
   star();beam((-.9,0,1.3),(-.2,0,.6),.055,'blue');beam((-.7,.05,1.45),(-.1,.05,.75),.035,'gold')
  else:star_tinted('blue' if key=='ocean-stars' else 'purple')
 else:raise ValueError('Unexpected reward '+key)
 return {'id':key,'category':category}
for item in rewards:bake46('Gift/'+item['id'],lambda x=item:reward_model(x),'gifts',item['id'],[],maxdim=1.9,raycount=3)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'reward-set-v46.blend'),compress=True)
allAssets=[a for a in old['assets'] if not a['id'].startswith('Gift/')]+RECORDS
old['assets']=allAssets;old['fullExport']=True;old['giftsExpected']=48
(OUT/'manifest.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n')
print('V46_REWARD_EXPORT',len(RECORDS),'total assets',len(allAssets),flush=True)
