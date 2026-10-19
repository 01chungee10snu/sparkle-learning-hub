#!/usr/bin/env python3
"""Original, per-species detailed transparent marine SVG artwork and WebP conversion."""
from __future__ import annotations
import json, math, subprocess, argparse, html
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'village/assets/marine-premium-v25'
CLI='/Users/01chungee10/.local/bin/vectorcraft-cli'
# id | Korean common name | habitat | zoological morphology | color1 | color2 | characteristic | description | mode
ROWS="""platy|플래티|pond|fish|#f5a83b|#df562e|speckle|짧고 둥근 몸을 가진 난태생 송사리과 물고기|feed
black-molly|블랙 몰리|pond|fish|#343d60|#0d1729|solid|검고 둥근 꼬리지느러미가 눈에 띄는 물고기|feed
zebra-danio|제브라다니오|pond|slender|#d9c173|#557f98|stripes|가느다란 가로줄이 이어지는 작은 민물고기|feed
cherry-barb|체리바브|pond|slender|#ee665c|#a52e42|stripe|번식기 수컷이 진한 붉은빛을 띠는 잉엇과 물고기|feed
harlequin-rasbora|할리퀸 라스보라|pond|fish|#e8a35d|#ce5779|triangle|몸 뒤쪽에 검은 삼각형 무늬가 있는 물고기|feed
dwarf-gourami|드워프 구라미|pond|round|#e68a50|#48acc4|bars|푸른 세로줄과 붉은 몸빛을 가진 작은 구라미|feed
bronze-corydoras|브론즈 코리도라스|pond|catfish|#bdad73|#6d9273|armor|수염으로 바닥 먹이를 찾는 갑옷메기|feed
otocinclus|오토싱클루스|pond|catfish|#c5aa76|#597a63|lateral|흡착형 입으로 수초 잎을 훑는 작은 메기|feed
medaka|메다카|pond|slender|#e3db9b|#d8b67d|shimmer|수면 가까이 헤엄치는 송사리 친척 물고기|feed
white-cloud-minnow|백운산 금사어|pond|slender|#8ac1af|#c75b66|stripe|몸의 밝은 줄무늬와 붉은 지느러미가 특징|feed
celestial-pearl-danio|갤럭시 라스보라|pond|fish|#476c9d|#e7b361|pearls|짙은 몸에 작은 진주빛 반점이 퍼진 물고기|feed
rummy-nose-tetra|러미노즈 테트라|pond|slender|#b8cccf|#d65462|nose|붉은 얼굴과 검은 꼬리줄이 특징인 테트라|feed
discus|디스커스|pond|disk|#69abd0|#d08b7e|waves|원반처럼 납작하고 둥근 열대 민물고기|feed
german-blue-ram|저먼 블루 라미레지|pond|round|#e3aa46|#5b8cbc|spots|푸른 비늘 점과 눈을 지나는 검은 줄이 특징|feed
pearl-gourami|펄 구라미|pond|round|#c8aac4|#8db7a2|pearls|몸 전체에 진주빛 반점과 긴 배지느러미가 특징|feed
panda-corydoras|팬더 코리도라스|pond|catfish|#e7d6af|#50575b|panda|눈과 지느러미의 검은 무늬가 판다를 닮은 메기|feed
scarlet-badis|스칼렛 바디스|pond|fish|#de6b58|#bd333c|bars|붉고 푸른 가로무늬가 있는 소형 민물고기|feed
clown-killifish|클라운 킬리피시|pond|slender|#d5cd9d|#2b5b80|bars|세로 검은 줄과 길게 뻗은 꼬리지느러미가 특징|feed
yellowtail-damselfish|노랑꼬리자리돔|ocean|fish|#4c8ed0|#e9c04d|yellowtail|진한 푸른 몸과 노란 꼬리가 구별되는 자리돔|feed
royal-gramma|로열 그라마|ocean|fish|#8752b3|#ecd255|twotone|앞은 보라색이고 뒤는 노란 작은 암초 물고기|feed
copperband-butterflyfish|구리띠나비고기|ocean|disk|#f4e5c5|#bd6a43|bands|가느다란 주둥이와 주황색 수직 띠가 특징|feed
longnose-butterflyfish|긴주둥이나비고기|ocean|disk|#f5d36d|#f8b847|eyespots|긴 주둥이로 암초 틈의 작은 먹이를 찾는 물고기|feed
porcupinefish|가시복|ocean|puffer|#d5ac73|#9a805e|spines|방어할 때 몸을 부풀리고 가시를 세우는 복어|feed
yellow-boxfish|노랑거북복|ocean|box|#f2d448|#af9c54|dots|노란 상자 모양 몸에 작은 검은 점이 있는 물고기|feed
long-spined-urchin|긴가시성게|ocean|urchin|#554875|#28364b|spines|유난히 긴 가시를 가진 바다 성게|observe
common-starfish|일반불가사리|ocean|star|#e3a276|#cb6b69|spotted|보통 다섯 팔을 가진 불가사리|observe
moon-jelly|보름달물해파리|ocean|jelly|#b4d6f5|#9b9bdb|rings|투명한 종 모양 몸속에 네 개의 고리 무늬가 보임|observe
lion-mane-jelly|사자갈기해파리|ocean|jelly|#c77e8c|#e9b36e|tentacles|긴 촉수가 갈기처럼 늘어지는 해파리|observe
bluespotted-ribbontail-ray|푸른점가오리|ocean|ray|#a8b583|#557da5|bluespots|둥근 몸에 푸른 점과 길고 가는 꼬리가 특징|observe
manta-ray|대왕쥐가오리|ocean|manta|#3a6476|#8facae|whitebelly|큰 삼각형 가슴지느러미와 머리 양옆 돌기가 특징|observe
bottlenose-dolphin|큰돌고래|ocean|dolphin|#829fae|#536f87|belly|굽은 등지느러미와 뚜렷한 부리가 있는 돌고래|observe
whale-shark|고래상어|ocean|shark|#456a83|#839cae|whitespots|아주 큰 몸에 흰 점과 격자무늬가 있는 여과섭식 상어|observe
giant-squid|대왕오징어|ocean|squid|#b67a8e|#93566e|longarms|긴 먹이촉수 두 개와 여덟 팔을 가진 큰 오징어|observe
american-lobster|아메리카바닷가재|ocean|lobster|#886e8d|#b57c72|claws|크기가 다른 두 집게발을 가진 바닷가재|feed
spiny-lobster|닭새우|ocean|lobster|#bf7f60|#ddad6a|antenna|큰 집게발 대신 길고 단단한 더듬이가 있는 갑각류|feed
cleaner-shrimp|흰줄박이청소새우|ocean|shrimp|#c95159|#e3c6a2|whiteback|등에 흰 띠가 이어지는 작은 청소새우|feed
nudibranch|파란갯민숭달팽이|ocean|nudibranch|#4d8bb8|#f7ca61|frills|화려한 노란 테두리와 등 돌기가 있는 갯민숭달팽이|observe
giant-clam|대왕조개|ocean|clam|#68b6a6|#936d91|mantle|화려한 외투막이 펼쳐지는 거대한 조개|observe
sea-anemone|말미잘|ocean|anemone|#ba7c9d|#e5ada3|tentacles|촉수를 펼쳐 먹이를 잡는 자포동물|observe
staghorn-coral|사슴뿔산호|ocean|coral|#d2a66f|#ad7960|branches|사슴뿔처럼 여러 갈래로 뻗는 산호 동물 군체|observe
sea-cucumber|해삼|ocean|cucumber|#8e765e|#b7a273|tubercles|길쭉한 몸의 관족으로 바닥을 느리게 이동|observe
leafy-seadragon|나뭇잎해룡|ocean|seadragon|#c5ac57|#97b67c|leaf|몸을 따라 잎사귀 같은 돌기가 달린 해마 친척|observe
flame-angelfish|불꽃천사고기|ocean|disk|#ee6b4a|#b43d49|bars|붉은 주황 몸에 검은 세로띠가 있는 암초 물고기|feed
mandarinfish|만다린피시|ocean|goby|#377cb1|#dd995a|swirls|푸른 몸에 주황색 미로 무늬가 있는 바닥 물고기|observe
weedy-seadragon|풀잎해룡|ocean|seadragon|#c6a875|#a47f62|leaf|길쭉한 몸에 해초 같은 돌기가 있는 해룡|observe
giant-pacific-octopus|큰태평양문어|ocean|octopus|#b67872|#925664|suckers|여덟 팔에 빨판이 줄지어 있는 큰 문어|observe
beluga-whale|흰고래|ocean|whale|#e0edf0|#a3becd|white|둥근 이마와 흰 몸을 가진 북극권 이빨고래|observe
leatherback-turtle|장수거북|ocean|turtle|#657e8d|#344f6d|ridges|등딱지에 길게 솟은 능선이 있는 거대한 바다거북|observe
""".strip().splitlines()

def parse():
 rows=[]
 for n,line in enumerate(ROWS):
  v=line.split('|')
  assert len(v)==9,(n,v)
  id,name,world,kind,c1,c2,mark,desc,mode=v
  rows.append(dict(id=id,name=name,world=world,kind=kind,c1=c1,c2=c2,mark=mark,description=desc,careMode=mode))
 assert len(rows)==48
 assert sum(x['world']=='pond' for x in rows)==18
 return rows

def path(d,fill,stroke='#33495d',sw=3,extra=''):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def ellipse(cx,cy,rx,ry,fill,extra=''):
 return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def circle(cx,cy,r,fill):
 return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"/>'
def eyes(x=708,y=353,scale=1):
 return ellipse(x,y,11*scale,13*scale,'#f9f8ed')+circle(x+3*scale,y,7*scale,'#182a3d')+circle(x+scale,y-4*scale,2.5*scale,'#fff')

def body_shape(s):
 kind=s['kind'];mark=s['mark']
 # All animals occupy their own centered artboard, with silhouette-specific anatomy.
 if kind in ('fish','slender','round','disk','catfish','goby','puffer','box'):
  dims={'fish':(265,135),'slender':(286,83),'round':(217,157),'disk':(171,220),'catfish':(274,103),'goby':(240,105),'puffer':(177,172),'box':(205,153)}
  rx,ry=dims[kind]
  tail=path('M280 378 Q166 275 119 298 Q158 391 119 490 Q186 502 280 421 Z','url(#fin)')
  if kind=='disk':tail=path('M364 380 L258 292 Q282 388 260 488 L366 434 Z','url(#fin)')
  fins=path(f'M424 {388-ry*.78:.1f} Q440 {210-ry*.40:.1f} 553 {376-ry*.8:.1f} Z','url(#fin)')+path(f'M460 {388+ry*.65:.1f} Q475 {572+ry*.2:.1f} 594 {392+ry*.7:.1f} Z','url(#fin)')
  if kind=='catfish':fins+=path('M736 374 Q804 415 844 435 M736 375 Q805 338 831 302','none','#586f70',5)
  if kind=='puffer':fins+=''.join(path(f'M{480+math.cos(i*math.pi/9)*rx:.0f} {388+math.sin(i*math.pi/9)*ry:.0f} l{-math.cos(i*math.pi/9)*16:.0f} {-math.sin(i*math.pi/9)*16:.0f}','none','#ae9971',6) for i in range(18))
  if kind=='disk':fins+=path('M731 388 Q782 368 823 363 L811 408 Q769 398 730 391 Z','url(#fin)')
  base=tail+fins+ellipse(515,388,rx,ry,'url(#body)','stroke="#526677" stroke-width="5"')
  if kind=='box':base+=path('M334 309 L665 308 L720 372 L682 466 L341 461 L309 398 Z','none','#8b844c',8)
  if mark in ('bars','bands','stripes','stripe'):
   count=5 if mark in ('bars','bands') else 8
   base+=''.join(path(f'M{374+i*48} {390-ry*.87:.0f} Q{399+i*48} 388 {374+i*48} {390+ry*.86:.0f}','none','#243c5b',12 if mark in ('bars','bands') else 6,'opacity=".72"') for i in range(count))
  if mark in ('lateral','nose'):base+=path('M320 388 Q518 372 748 386','none','#494b4b',13)
  if mark in ('pearls','dots','speckle','spots','whitespots','bluespots'):
   color='#e5f6ec' if mark in ('pearls','whitespots') else '#2b566f' if mark=='dots' else '#4e9de2' if mark=='bluespots' else '#eaca91'
   for i in range(10):
    for j in range(4):
     x=337+i*36+(j%2)*12;y=310+j*48
     if ((x-515)/rx)**2+((y-388)/ry)**2<.83:base+=circle(x,y,3.7+(i+j)%3,color)
  if mark in ('triangle','panda'):base+=path('M510 384 L620 466 L640 316 Z','#303c44' if mark=='triangle' else '#384c57')
  if mark=='twotone':base+=path('M526 274 Q657 256 735 348 Q783 389 727 450 Q636 505 526 503 Z','#ebc94e','none')
  if mark=='yellowtail':base+=path('M270 367 Q197 303 125 302 Q149 397 125 483 Q215 479 274 418 Z','#eccc45','none')
  if mark=='nose':base+=ellipse(712,377,51,49,'#d64e58','opacity=".7"')
  if mark=='eyespots':base+=circle(611,338,19,'#27394b')+circle(611,338,7,'#f8eadb')
  if mark=='armor':base+=''.join(path(f'M{x} 308 l30 82 -30 76','none','#9fbc9b',4) for x in (395,445,495,545,595))
  if kind=='disk':base+=path('M716 376 Q785 366 820 359 Q792 389 717 399 Z','url(#body)')
  if s['id']=='longnose-butterflyfish':
   base+=path('M672 365 Q771 342 917 372 Q930 382 914 392 Q779 406 677 392 Z','url(#body)','#956f53',4)
   base+=path('M727 394 Q825 402 891 389','none','#845f46',4)
  base+=path(f'M{340 if kind!="disk" else 395} {350-ry*.42:.0f} Q495 {287-ry*.34:.0f} 644 {350-ry*.51:.0f}','none','#ffffff',9,'opacity=".28"')
  base+=path(f'M391 {419+ry*.36:.0f} Q510 {448+ry*.40:.0f} 647 {409+ry*.48:.0f}','none','#263957',7,'opacity=".18"')
  if kind in ('fish','slender','catfish','round','disk'):
   for j in range(5):
    base+=path(f'M{400+j*43} 385 q22 17 2 35','none','#ffffff',2,'opacity=".16"')
  if kind=='goby':base+=path('M395 441 Q493 533 596 479','none','#f1ad75',11)
  return base+eyes(707,362,1.1)
 if kind in ('shark','dolphin','whale'):
  fluke=path('M298 385 Q185 284 106 273 L171 389 L108 530 Q215 489 303 432 Z','url(#fin)')
  dorsal=path('M440 314 Q488 159 554 237 L563 324 Z','url(#fin)')
  flipper=path('M533 432 Q545 563 658 551 L616 446 Z','url(#fin)')
  fuselage=path('M286 387 Q359 252 584 289 Q734 297 826 376 Q852 405 826 419 Q701 509 491 477 Q334 473 286 421 Z','url(#body)')
  if kind=='dolphin':fuselage+=path('M824 381 L910 382 Q902 397 824 406 Z','url(#fin)')
  if kind=='whale':fuselage=path('M278 378 Q327 228 600 277 Q817 285 862 377 Q879 461 651 513 Q382 535 278 427 Z','url(#body)')
  if s['id']=='beluga-whale':
   fluke=path('M282 395 Q182 324 116 363 Q171 409 277 422 Q152 450 123 505 Q215 496 301 443 Z','url(#fin)')
   dorsal=''
   fuselage=path('M276 397 Q330 265 493 263 Q579 238 640 290 Q728 271 779 328 Q801 348 793 374 L919 387 Q927 401 904 409 L783 416 Q685 510 493 505 Q328 492 276 425 Z','url(#body)')
   fuselage+=ellipse(586,306,103,48,'url(#sheen)')
   fuselage+=ellipse(580,286,9,5,'#567789')
   fuselage+=path('M793 410 Q833 416 898 406','none','#6b8795',4)
   flipper=path('M529 456 Q536 577 670 554 Q637 518 616 473 Z','url(#fin)')
  if s['id']=='whale-shark':
   fuselage=path('M260 367 Q316 242 564 289 Q748 301 845 370 L932 372 Q943 400 931 416 L835 420 Q708 511 503 493 Q310 483 260 416 Z','url(#body)')
   fuselage+=path('M841 391 Q899 406 933 388','none','#29394f',11)
   fuselage+=path('M351 347 Q499 270 722 320','none','#c4ccdc',11,'opacity=".35"')
   fuselage+=path('M685 335 Q719 335 765 354','none','#8c6596',19,'opacity=".66"')
  marks=''
  if mark=='whitespots':
   for i in range(9):
    for j in range(3): marks+=circle(352+i*44,324+j*37,4+(i+j)%3,'#dcf2eb')
  if mark in ('belly','white'):marks+=path('M349 428 Q606 505 821 406 Q740 528 484 477 Z','#d9edf1','none')
  if mark=='ridges':marks+=''.join(path(f'M{x} 314 Q{x+15} 393 {x} 462','none','#d6d2c9',5) for x in (421,485,549,612))
  marks+=path('M367 344 Q531 287 681 332','none','#ffffff',12,'opacity=".2"')
  return fluke+dorsal+flipper+fuselage+marks+eyes(777,365,.8)
 if kind in ('ray','manta'):
  s=path('M499 286 Q405 255 178 337 Q234 477 481 462 Q573 496 796 349 Q657 255 499 286 Z','url(#body)')
  s+=path('M504 461 Q526 562 508 692','none','#637d8a',9)
  if kind=='manta':
   s=path('M518 299 Q395 260 108 239 Q163 351 414 440 L507 470 Q601 450 905 228 Q629 256 518 299 Z','url(#body)')
   s+=path('M423 350 Q500 403 574 348','none','#ffffff',16,'opacity=".28"')
   s+=path('M407 422 Q511 477 610 423','none','#9bc0c5',14,'opacity=".5"')
   s+=path('M503 455 Q518 580 498 692','none','#456a80',8)
   s+=path('M609 314 Q691 261 739 311 L639 342 Z','url(#fin)')+path('M413 314 Q340 270 283 316 L399 346 Z','url(#fin)')
  if mark=='bluespots':
   for i in range(34):
    x=260+(i%9)*53;y=325+(i//9)*32
    if ((x-510)/305)**2+((y-371)/105)**2<1:s+=circle(x,y,5,'#247cca')
  return s+eyes(560,337,.6)+eyes(640,337,.6)
 if kind in ('urchin','star','anemone','coral'):
  if kind=='urchin':
   s=''.join(path(f'M510 388 L{510+270*math.cos(i*math.pi/20):.1f} {388+270*math.sin(i*math.pi/20):.1f}','none','#433e58',8) for i in range(40))
   return s+ellipse(510,388,117,116,'url(#body)')+''.join(circle(445+i*26,366+(i%3)*25,5,'#bdb1c5') for i in range(6))
  if kind=='star':
   coords=[]
   for i in range(10):
    a=-math.pi/2+i*math.pi/5;r=220 if i%2==0 else 90
    coords.append(f'{510+r*math.cos(a):.1f},{388+r*math.sin(a):.1f}')
   return f'<polygon points="{" ".join(coords)}" fill="url(#body)" stroke="#af6c59" stroke-width="9"/>'+''.join(circle(510+math.sin(i)*i*8,388+math.cos(i)*i*8,5,'#fff2c9') for i in range(22))
  if kind=='coral':
   s=''
   for i in range(13):
    x=322+i*30
    s+=path(f'M510 586 Q{x} 505 {x} {262+(i%4)*32} M{x} {340+(i%3)*22} q-43 -40 -48 -97 M{x} 390 q39 -36 38 -89','none','url(#body)',19)
   return s+ellipse(511,592,240,37,'#a17e6a')
  s=ellipse(510,553,150,75,'url(#body)')
  for i in range(23):
   a=i*2*math.pi/23;x=510+115*math.cos(a);y=518+35*math.sin(a)
   s+=path(f'M{x:.1f} {y:.1f} Q{x+math.cos(a)*36:.1f} 353 {x+math.cos(a)*72:.1f} {264+(i%4)*19}','none','url(#fin)',14)
  return s
 if kind in ('jelly','squid','octopus','seadragon','shrimp','lobster','nudibranch','clam','cucumber','turtle'):
  if kind=='jelly':
   s=''.join(path(f'M{380+i*27} 397 Q{350+i*32} 534 {379+i*28} {596+(i%3)*20}','none','url(#fin)',7) for i in range(10))
   s+=path('M298 396 Q295 191 511 207 Q727 193 741 396 Q544 457 298 396 Z','url(#body)')
   if mark=='rings':s+=''.join(ellipse(x,y,22,13,'none','stroke="#eee9fa" stroke-width="5"') for x,y in ((467,338),(537,340),(480,374),(552,371)))
   return s
  if kind=='squid':
   s=path('M494 215 Q609 235 660 360 Q625 466 485 487 Q380 436 362 344 Z','url(#body)')
   s+=path('M493 223 L397 150 L409 291 Z','url(#fin)')+path('M552 228 L672 175 L620 322 Z','url(#fin)')
   # Eight short arms encircle two independently elongated feeding tentacles.
   for i in range(8):
    x=417+i*25
    s+=path(f'M{x} 463 Q{x+(i-3)*20} 535 {x+(i-3)*31} {599+(i%3)*8}','none','url(#fin)',11)
    s+=path(f'M{x} 486 Q{x+(i-3)*14} 548 {x+(i-3)*26} 593','none','#e0afc2',3,'opacity=".55"')
   s+=path('M463 472 C399 545 295 520 231 591 S164 700 139 714','none','url(#fin)',11)
   s+=path('M526 473 C581 556 701 518 771 597 S853 704 899 719','none','url(#fin)',11)
   s+=path('M139 709 q-17 13 -32 4 M899 714 q18 13 31 -5','none','#d9a1aa',13)
   s+=path('M460 285 Q522 244 592 305','none','#fff',9,'opacity=".24"')
   return s+eyes(568,366,.9)
  if kind=='octopus':
   s=''
   for i in range(8):
    x=366+i*43;y=448
    s+=path(f'M{x} {y} Q{x+(i-4)*32} 558 {x+(i-4)*64} 594 Q{x+(i-4)*70} 626 {x+(i-4)*78} 578','none','url(#fin)',23)
    for j in range(4):s+=circle(x+(i-4)*j*14,484+j*21,3.5,'#f4d9ce')
   return s+path('M343 411 Q308 202 511 197 Q716 194 688 413 Q633 518 416 484 Z','url(#body)')+eyes(454,389)+eyes(570,389)
  if kind=='seadragon':
   s=path('M482 222 Q599 204 654 314 Q678 375 563 429 Q516 447 554 509 Q576 579 484 588 Q435 560 475 531','none','url(#body)',66)
   for i in range(11):
    x=480+(i%4)*40;y=253+i*26
    s+=path(f'M{x} {y} q{-70 if i%2 else 55} -57 {-83 if i%2 else 79} -78 q-9 47 21 73 Z','url(#fin)')
   return s+eyes(618,295)
  if kind in ('shrimp','lobster'):
   s=path('M307 403 Q372 288 500 307 Q654 329 725 414 Q660 516 531 494 Q400 516 307 445 Z','url(#body)')
   for i in range(7):
    x=343+i*48;s+=path(f'M{x} 470 Q{x-40} 521 {x-15} 589','none','#925f6f',8)
    s+=path(f'M{x} 325 Q{x-10} 402 {x-3} 471','none','#ffd4c1',5,'opacity=".8"')
   s+=path('M721 409 Q818 291 853 269 M717 420 Q821 360 895 355','none','#9d677a',5)
   if kind=='lobster':
    if mark=='claws':
     s+=path('M341 386 Q198 332 172 259','none','#996776',30)+path('M182 260 Q81 146 123 139 Q209 155 222 227 Q168 183 166 264 Z','url(#fin)')
     s+=path('M649 397 Q835 340 869 235','none','#996776',29)+path('M862 249 Q936 129 898 139 Q810 160 813 227 Q869 185 870 255 Z','url(#fin)')
    else:s+=path('M679 367 Q815 187 882 123 M687 372 Q790 163 813 104','none','#dcae75',9)
   return s+eyes(721,375,.9)
  if kind=='nudibranch':
   s=path('M243 449 Q346 297 578 327 Q748 346 799 478 Q609 538 371 506 Z','url(#body)')
   for i in range(11):
    x=339+i*35;s+=path(f'M{x} 344 Q{x-21} 275 {x+5} 241 Q{x+27} 292 {x+18} 355 Z','#ebbd6a')
   return s+eyes(721,417,.8)
  if kind=='clam':
   s=path('M257 466 Q314 280 510 254 Q730 279 777 466 Q553 591 257 466 Z','url(#body)')
   s+=path('M257 463 Q400 395 510 396 Q657 394 777 468 Q541 561 257 463 Z','#63bbb7','#e0b879',9)
   for i in range(11):s+=path(f'M510 535 Q{340+i*33} 424 {286+i*46} 375','none','#f7c6c7',7)
   return s
  if kind=='cucumber':
   s=path('M222 430 Q241 302 528 332 Q769 329 812 437 Q736 513 500 496 Q288 519 222 430 Z','url(#body)')
   for i in range(14):
    x=282+i*35;s+=path(f'M{x} 338 l12 -29 18 29','url(#fin)')
   return s
  if kind=='turtle':
   legs=path('M372 330 Q205 235 177 348 Q258 416 353 429 Z','url(#fin)')+path('M636 339 Q770 233 824 346 Q748 419 671 441 Z','url(#fin)')+path('M376 458 Q244 560 333 598 L473 500 Z','url(#fin)')+path('M646 469 Q767 582 741 600 L584 502 Z','url(#fin)')
   shell=ellipse(511,408,217,139,'url(#body)','stroke="#5b7880" stroke-width="10"')
   for i in (-2,-1,0,1,2):shell+=path(f'M{511+i*67} 282 Q{515+i*41} 405 {510+i*67} 540','none','#cbd5cb',5)
   return legs+path('M689 384 Q771 346 846 403 Q864 465 729 469 Z','url(#fin)')+shell+eyes(802,400,.85)
 raise ValueError(kind)

def svg_for(s):
 title=html.escape(s['name'])
 # Fine color-matched layered highlights preserve species identity at display scale.
 highlights=''.join(path(f'M{387+i*19} {300+(i%3)*4} q{18+i%4} -12 {31+i%4} -3','none','#ffffff',2,'opacity=".15"') for i in range(14))
 return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1152" viewBox="0 0 1024 768" role="img" aria-label="{title}">
<defs>
<linearGradient id="body" x1=".08" y1=".05" x2=".87" y2="1"><stop stop-color="{s['c1']}"/><stop offset=".47" stop-color="{s['c2']}"/><stop offset="1" stop-color="{s['c1']}"/></linearGradient>
<linearGradient id="fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{s['c2']}"/><stop offset="1" stop-color="{s['c1']}"/></linearGradient>
<radialGradient id="sheen" cx=".31" cy=".19" r=".85"><stop stop-color="#ffffff" stop-opacity=".38"/><stop offset=".48" stop-color="#ffffff" stop-opacity=".06"/><stop offset="1" stop-color="#071729" stop-opacity=".18"/></radialGradient>
<radialGradient id="gloss"><stop stop-color="#ffffff" stop-opacity=".33"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<g>{body_shape(s)}</g>
<g>{highlights}</g>
<ellipse cx="519" cy="388" rx="276" ry="170" fill="url(#sheen)" opacity=".49"/>
<ellipse cx="479" cy="309" rx="211" ry="95" fill="url(#gloss)" opacity=".44"/>
</svg>
"""

def descriptor(s,i,po,oc):
 if s['world']=='pond':
  k=po
  threshold=12+2*k
  balanced=max(0,(k-1)//5)
  costs=[5+k*2,5+k*2,5+k*2,4+k]
 else:
  k=oc-1
  anchor_thresholds=[14,24,34,46,60,78,98,125,165,220]
  anchor_costs=[[7,5,5,4],[9,7,7,5],[13,9,8,7],[17,13,11,9],[23,18,14,12],[30,23,19,15],[39,31,25,22],[54,42,34,28],[75,60,50,40],[110,90,75,60]]
  anchor_days=[0,1,1,2,2,3,4,5,6,8]
  section=k//3; step=k%3+1
  if section<9:
   lo,hi=anchor_thresholds[section:section+2]
   threshold=lo+(hi-lo)*step//4
   costs=[a+(b-a)*step//4 for a,b in zip(anchor_costs[section],anchor_costs[section+1])]
   total_lo=sum(anchor_costs[section]);total_hi=sum(anchor_costs[section+1])
   target_total=total_lo+(total_hi-total_lo)*step//4
   costs[0]+=target_total-sum(costs)
   balanced=anchor_days[section]
  else:
   threshold=220+step*35
   costs=[110+step*25,90+step*20,75+step*17,60+step*14]
   balanced=8+step
 size=round(.42+(i%7)*.06+(.9 if s['kind'] in ('whale','shark','manta') else 0),2)
 return [s['id'],s['name'],s['world'],costs,threshold,balanced,s['c1'],size,s['description'],s['careMode']]

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--no-convert',action='store_true')
 ap.add_argument('--only',type=str)
 args=ap.parse_args()
 OUT.mkdir(parents=True,exist_ok=True)
 rows=parse()
 po=oc=0
 specs=[]
 for i,s in enumerate(rows):
  if s['world']=='pond':po+=1
  else:oc+=1
  specs.append(descriptor(s,i,po,oc))
 js='''/** Extra verified real-world species. Descriptor tuple order: id,name,world,costs,minSolved,minBalancedDays,color,size,description,careMode. */\nexport const EXTRA_SPECIES=Object.freeze(\n'''+json.dumps(specs,ensure_ascii=False,indent=2)+'''\n);\n'''
 (ROOT/'platform/marine-species-extra.js').write_text(js,encoding='utf-8')
 manifest=[]
 failures=[]
 for s in rows:
  id=s['id']
  sp=OUT/f'{id}.svg'; wp=OUT/f'{id}.webp'
  sp.write_text(svg_for(s),encoding='utf-8')
  if not args.no_convert and (not args.only or args.only==id):
   p=subprocess.run([CLI,'convert',str(sp),str(wp)],capture_output=True,text=True)
   if p.returncode:failures.append((id,p.stderr[:220],p.stdout[:220]))
  manifest.append({'id':id,'name':s['name'],'world':s['world'],'scientific_group':s['kind'],'svg':sp.name,'webp':wp.name,'px':[1536,1152],'transparent':True,'careMode':s['careMode'],'license':'Original project-authored vector drawing; no third-party source'})
 (OUT/'marine-extra-manifest-v30.json').write_text(json.dumps({'version':'v30-20261019','count':len(rows),'pond':18,'ocean':30,'creatures':manifest},indent=2,ensure_ascii=False),encoding='utf-8')
 print('48 species, pond',po,'ocean',oc,'WebP existing',sum((OUT/(x['id']+'.webp')).exists() for x in rows),'errors',failures[:5])
 if failures:raise SystemExit(1)
if __name__=='__main__':main()
