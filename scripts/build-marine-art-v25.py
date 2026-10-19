#!/usr/bin/env python3
"""Self-authored scalable illustrations for family game. No external image licenses.

Each marine creature gets a standalone, transparently backed SVG; export optional
PNG/WebP with VectorCraft. Artwork is decorative, not a biological scale diagram.
"""
from pathlib import Path
from html import escape
import json

OUT=Path(__file__).resolve().parent.parent/'village/assets/marine-premium-v25'
OUT.mkdir(parents=True,exist_ok=True)

def shape(path,fill,stroke='none',width=0,extra=''):
 return f'<path d="{path}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def ellipse(x,y,rx,ry,fill,extra=''):
 return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'
def bubbles():
 return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#ffffff" stroke-opacity=".68" stroke-width="4"/>' for x,y,r in [(183,184,12),(866,160,9),(893,202,6),(120,481,13)])
def eye(x=685,y=380,r=20):
 return ellipse(x,y,r+8,r+9,'#eef9ff')+ellipse(x+3,y+1,r,r,'#162f4e')+ellipse(x-4,y-7,max(3,r//3),max(3,r//3),'#ffffff')+ellipse(x+7,y+9,3,3,'#c2ebf6')
def shine():
 return shape('M322 295 Q478 225 635 297','none','#ffffff',16,'opacity=".45"')
def fish(name,colors,pattern='basic',tail='standard'):
 top,base,fin=colors
 if tail=='flow':
  fins=shape('M330 335 Q170 198 92 257 Q206 352 96 420 Q190 489 336 441 Z','url(#fin)','none')+shape('M385 300 Q306 125 460 91 Q494 221 522 279 Z','url(#fin)')+shape('M354 471 Q283 614 457 676 Q483 539 512 489 Z','url(#fin)')
 elif tail=='double':
  fins=shape('M345 359 Q154 181 115 334 Q145 399 337 413 Q125 446 160 568 Q252 591 372 443 Z','url(#fin)')+shape('M430 308 Q455 166 553 243 L568 310 Z','url(#fin)')
 else:
  fins=shape('M342 364 Q186 221 139 288 Q197 390 133 518 Q253 526 354 427 Z','url(#fin)')+shape('M424 293 Q468 160 559 292 Z','url(#fin)')+shape('M424 471 Q410 581 541 497 Z','url(#fin)')
 body=shape('M302 382 Q350 239 514 236 Q668 221 784 343 Q823 400 780 451 Q664 581 500 551 Q359 545 302 428 Q288 407 302 382 Z','url(#body)','#5b7690',6)
 details=''
 if pattern=='guppy':
  details=''.join(ellipse(x,y,12,16,c) for x,y,c in [(428,337,'#ffe1a8'),(494,479,'#f1b0f1'),(595,315,'#89e8fa'),(547,392,'#fff0a0')])
  details+=shape('M146 301 Q228 334 230 396 Q191 466 155 503','none','#db69a0',21)
 if pattern=='goldfish':
  details+=''.join(shape(f'M{x} 367 q24 28 0 57','none','#ffefa6',8,'opacity=".7"') for x in [424,480,536,592])
 if pattern=='neon':
  details+=shape('M340 342 Q511 293 757 359','none','#93faff',31)+shape('M344 440 Q522 481 746 438','none','#ed546d',19)
 if pattern=='betta':
  details+=shape('M330 407 Q485 377 744 405','none','#eec2fa',13)+shape('M390 370 Q534 295 648 327','none','#ffffff',15,'opacity=".35"')
 if pattern=='koi':
  details+=ellipse(454,354,69,62,'#f77c62','opacity=".92"')+ellipse(585,458,90,59,'#e66354','opacity=".88"')+ellipse(630,332,23,29,'#343c48')
 if pattern=='angel':
  details+=shape('M370 485 Q472 692 550 585 L538 471','url(#fin)')+shape('M427 315 Q454 114 542 215 L582 336','url(#fin)')
  details+=''.join(shape(f'M{x} 270 Q{x-25} 410 {x+8} 526','none','#84638c',18,'opacity=".52"') for x in [441,527,607])
 if pattern=='clownfish':
  details+=''.join(shape(f'M{x} 275 Q{x+55} 386 {x} 521','none','#263847',42)+shape(f'M{x-6} 267 Q{x+44} 385 {x-5} 521','none','#fffdf3',30) for x in [438,579,716])
 if pattern=='tang':
  details+=shape('M343 346 Q464 253 641 302 Q726 320 739 358','none','#102e68',32)+shape('M370 463 Q533 504 722 449','none','#1c3378',17)
 details+=shine()+shape('M596 402 Q649 412 693 396','none','#4f6680',5,'opacity=".65"')+eye()
 return fins+body+details

def shrimp():
 s=shape('M303 416 Q371 249 529 295 Q667 329 725 443 Q668 532 536 506 Q419 558 332 477 Q296 448 303 416 Z','url(#body)','#a35c66',9)
 s+=''.join(shape(f'M{x} 323 Q{x-52} 402 {x-6} 521','none','#ffe2dc',13) for x in [410,492,574,646])
 s+=shape('M301 415 Q165 352 193 244 M306 431 Q152 413 139 492','none','#d36c76',14)
 s+=''.join(shape(f'M{x} 492 q-34 59 -27 90','none','#b85b60',12) for x in [408,481,552,627])
 s+=shape('M719 418 Q827 333 879 340 M705 397 Q809 256 838 243','none','#c9817a',9)+eye(711,375,13)
 return s

def crab(hermit=False):
 legs=''.join(shape(f'M{x} 433 Q{x+d*90} 466 {x+d*123} 555','none','#bb6274',26) for x,d in [(320,-1),(380,-1),(595,1),(670,1)])
 claws=shape('M338 424 Q209 411 176 310','none','#d67676',35)+shape('M670 424 Q831 408 851 296','none','#d67676',35)
 claws+=shape('M164 299 Q80 214 164 197 Q213 182 232 254 Q187 234 180 298 Z','url(#fin)','#984c65',8)
 claws+=shape('M854 298 Q937 214 856 191 Q800 179 784 263 Q834 222 844 303 Z','url(#fin)','#984c65',8)
 if hermit:
  shell=shape('M377 431 Q315 228 465 198 Q661 169 719 374 Q729 503 586 536 Q436 529 377 431 Z','url(#shell)','#98715d',9)
  shell+=shape('M468 295 Q618 246 640 371 Q655 463 548 465 Q472 458 475 395 Q477 354 530 352 Q587 349 583 408','none','#fff0cd',21,'opacity=".74"')
  body=shape('M300 468 Q464 408 716 455 Q629 547 428 534 Z','url(#body)','#ad6870',8)
 else:
  shell='';body=shape('M278 424 Q317 303 496 299 Q700 284 751 415 Q742 511 515 524 Q310 530 278 424 Z','url(#body)','#ab5c65',10)
 return legs+claws+shell+body+ellipse(441,359,40,13,'#ffffff','opacity=".3"')+eye(441,395,15)+eye(586,395,15)

def seahorse():
 s=shape('M618 211 Q725 213 747 306 Q752 362 695 405 L615 438 Q649 495 620 555 Q581 611 525 589 Q477 571 503 525 Q521 503 550 529 Q542 480 470 468 Q384 454 418 381 Q452 307 530 308 L520 252 Q572 210 618 211 Z','url(#body)','#b38c5b',9)
 s+=shape('M517 258 L423 283 L510 313 Z','url(#fin)')+shape('M430 390 Q335 380 327 437 Q389 432 425 455 Z','url(#fin)')
 s+=''.join(ellipse(570,y,12,15,'#fff0b9','opacity=".62"') for y in [355,398,442,483])+eye(660,283,14)
 return s

def octopus():
 tentacles=''
 for i in range(8):
  x=315+i*51;outer=150+i%3*42;dx=-1 if i<4 else 1
  tentacles+=shape(f'M{x} 449 Q{x+dx*outer} 530 {x+dx*outer} 600 Q{x+dx*(outer+40)} 652 {x+dx*(outer+70)} 585','none','#9575bf',37)
  tentacles+=shape(f'M{x} 451 Q{x+dx*outer} 525 {x+dx*outer} 600','none','#edb7dd',13)
 head=shape('M330 415 Q322 165 504 176 Q694 171 702 412 Q665 526 503 521 Q353 521 330 415 Z','url(#body)','#886dba',9)
 cheeks=ellipse(414,419,36,19,'#f6b3cc','opacity=".65"')+ellipse(602,419,36,19,'#f6b3cc','opacity=".65"')
 return tentacles+head+cheeks+eye(448,389,18)+eye(563,389,18)+shape('M476 451 Q508 470 539 449','none','#694e83',10)

def turtle():
 feet=shape('M384 343 Q230 277 173 337 Q205 426 341 446 Z','url(#fin)')+shape('M622 345 Q785 283 845 351 Q803 432 674 459 Z','url(#fin)')
 feet+=shape('M393 483 Q265 575 336 606 Q427 589 477 531 Z','url(#fin)')+shape('M617 493 Q725 600 767 561 Q760 506 664 460 Z','url(#fin)')
 neck=shape('M697 375 Q804 325 843 389 Q864 460 733 472 L669 430 Z','url(#body)')
 shell=ellipse(507,415,235,159,'url(#shell)','stroke="#497f83" stroke-width="13"')
 shell+=shape('M401 340 L509 288 L610 349 L579 457 L458 475 Z','none','#c7e7ad',13,'opacity=".8"')
 shell+=shape('M509 288 L506 524 M402 340 L354 435 M610 350 L662 452 M457 475 L398 515 M579 458 L632 518','none','#c7e7ad',13,'opacity=".7"')
 return feet+neck+shell+eye(802,397,14)+shape('M837 423 q-13 15 -25 2','none','#3d6970',8)

def shark():
 tail=shape('M328 380 Q220 299 161 198 L199 390 L166 558 Q238 488 338 433 Z','url(#fin)','#56768e',9)
 dorsal=shape('M433 319 Q443 166 572 186 L554 330 Z','url(#fin)')
 belly=shape('M325 393 Q419 254 633 292 Q788 301 875 404 Q769 494 579 519 Q412 534 325 439 Z','url(#body)','#466b83',9)
 belly+=shape('M363 449 Q584 503 837 421 Q753 523 572 519 Q441 510 363 449 Z','#e4edf1')
 fin=shape('M550 450 Q493 589 615 592 L659 464 Z','url(#fin)')
 gills=''.join(shape(f'M{x} 378 q-16 23 -8 49','none','#42607b',9) for x in [690,714,738])
 return tail+dorsal+belly+fin+gills+eye(788,370,12)

def whale():
 tail=shape('M285 410 Q169 287 73 347 Q118 431 265 447 Q135 459 119 556 Q212 563 320 480 Z','url(#fin)','#385e8a',9)
 flipper=shape('M529 454 Q489 605 688 611 Q648 543 619 468 Z','url(#fin)','#446a98',7)
 body=shape('M276 405 Q308 247 582 259 Q806 267 912 400 Q863 535 602 543 Q388 548 276 438 Z','url(#body)','#3c6489',9)
 body+=shape('M348 456 Q563 537 858 435 Q804 571 598 544 Q408 538 348 456 Z','#c5e0eb','none')
 body+=''.join(shape(f'M{x} {488+i*4} q-4 21 10 32','none','#fff4',6) for i,x in enumerate([501,540,579,618,657,696]))
 spout=shape('M615 260 Q589 184 605 156 Q625 180 627 246 M629 237 Q647 174 687 161','none','#75c2ec',20)
 return tail+flipper+body+spout+eye(798,357,14)+ellipse(679,274,21,5,'#2b4f73')

SPEC={
 'guppy':('무지개 구피',('#f8b1dc','#f39c56','#af76d5'),'guppy','double'),
 'goldfish':('황금 금붕어',('#fff2a0','#f69a30','#fcad63'),'goldfish','double'),
 'neon':('네온 테트라',('#69b5e0','#1c619c','#50bed5'),'neon','standard'),
 'betta':('비단 베타',('#e7b8f1','#895bc1','#b168d5'),'betta','flow'),
 'koi':('연못 잉어',('#fffaf2','#d0d7db','#f9d2ba'),'koi','standard'),
 'angel':('별빛 엔젤피시',('#fff3b7','#bf92bb','#eecadd'),'angel','flow'),
 'clownfish':('산호 흰동가리',('#ffe5a0','#f68b42','#fdb271'),'clownfish','standard'),
 'blue-tang':('푸른 블루탱',('#7ad2ff','#3474cb','#ffd24c'),'tang','standard'),
 'shrimp':('산호 새우',('#ffe2d3','#f18483','#f7bba2'),'shrimp',''),
 'hermit-crab':('소라게',('#ffdcc1','#d18271','#ffa382'),'hermit',''),
 'sea-crab':('바다 게',('#ffd1ad','#df6666','#f99878'),'crab',''),
 'seahorse':('별빛 해마',('#fff3ac','#e5a759','#f9da84'),'seahorse',''),
 'octopus':('산호 문어',('#efc0e3','#b479d3','#e7b1d9'),'octopus',''),
 'sea-turtle':('푸른 바다거북',('#aee6cf','#5aa88e','#75bfaa'),'turtle',''),
 'reef-shark':('산호초 상어',('#a2c8d5','#57809a','#658e9f'),'shark',''),
 'humpback-whale':('혹등고래',('#a7c6e7','#547fb0','#668fb5'),'whale','')}

def art_for(creature,spec):
 name,colors,kind,tail=spec
 c1,c2,c3=colors
 defs=f'''<defs>
 <linearGradient id="body" x1=".25" y1="0" x2=".78" y2="1"><stop stop-color="{c1}"/><stop offset=".48" stop-color="{c2}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
 <linearGradient id="fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{c3}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
 <radialGradient id="shell"><stop stop-color="#ffefd7"/><stop offset=".65" stop-color="#d7ac8d"/><stop offset="1" stop-color="#a77869"/></radialGradient>
 <filter id="soft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="13"/></filter>
 </defs>'''
 details={
  'shrimp':shrimp,'hermit':lambda:crab(True),'crab':lambda:crab(False),
  'seahorse':seahorse,'octopus':octopus,'turtle':turtle,'shark':shark,'whale':whale
 }
 body=details[kind]() if kind in details else fish(name,colors,kind,tail)
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1152" viewBox="0 0 1024 768" role="img" aria-labelledby="title desc">
 <title id="title">{escape(name)}</title><desc id="desc">원본 벡터 게임 에셋. 투명 배경의 {escape(name)} 한 마리.</desc>
 {defs}
 <g opacity=".18" filter="url(#soft)">{ellipse(503,604,295,29,'#184969')}</g>
 <g>{body}</g>
 <g opacity=".4">{bubbles()}</g>
 </svg>'''
 return svg

manifest=[]
for id,spec in SPEC.items():
 path=OUT/f'{id}.svg'
 if not path.exists():path.write_text(art_for(id,spec),encoding='utf-8')
 manifest.append({'id':id,'name':spec[0],'source':path.name,'license':'project original; no third-party source','format':'SVG','transparent':True,'px':[1536,1152]})
(OUT/'marine-originals-manifest.json').write_text(json.dumps({'version':'v25-20261019','creatures':manifest},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Created/retained {len(manifest)} marine original SVGs in {OUT}')
