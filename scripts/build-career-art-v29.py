#!/usr/bin/env python3
"""Deterministic, locally authored career portrait illustrations for the 100-job dictionary."""
from pathlib import Path
import subprocess, json, hashlib, html
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'village/assets/career-illustrations'
OUT.mkdir(parents=True,exist_ok=True)
payload=subprocess.check_output(['node','--input-type=module','-e',
 "import {CAREERS} from './village/career-library.js'; console.log(JSON.stringify(CAREERS.map(c=>({id:c.id,name:c.name,group:c.group,emoji:c.emoji}))))"],
 cwd=ROOT,text=True)
careers=json.loads(payload)
PALETTES={
 'medical':('#a5e8df','#e7fcf9','#409f9e','#e9f8f8'),
 'tech':('#b4c5ff','#e9f0ff','#5f73c9','#edf1ff'),
 'justice':('#fbd6a9','#fff5df','#c18a4c','#fff4e5'),
 'leadership':('#c6dcca','#f1faee','#4d926b','#eff8ee'),
 'creative':('#f9c5db','#fff0f6','#bd7599','#ffeaf2'),
 'planet':('#b9e3c3','#ecf9ea','#70ab75','#e9f6e5')
}
SKINS=['#f2c4a3','#e3ad83','#c98961','#f6d7b8','#a36b53']
HAIR=['#433044','#392923','#8d5d40','#2c333a','#624c6a']
def esc(value):
 return html.escape(str(value),quote=True)
def make(c):
 key=c['id'];group=c['group'];seed=int.from_bytes(hashlib.sha256(key.encode()).digest()[:5],'big')
 bg1,bg2,accent,soft=PALETTES[group]
 skin=SKINS[seed%len(SKINS)];hair=HAIR[(seed//5)%len(HAIR)]
 face_x=151+(seed%9)-4;face_y=103
 body_colors={
  'medical':['#f9ffff','#e5f5f9','#ffffff'],
  'tech':['#6c83c4','#739fd0','#455bb4'],
  'justice':['#566890','#596278','#bf764c'],
  'leadership':['#5b7894','#6b8b6b','#77608a'],
  'creative':['#b077a6','#eb9d73','#848ccd'],
  'planet':['#74a794','#a88772','#578da5']
 }
 jacket=body_colors[group][(seed//11)%3]
 icon=esc(c['emoji'])
 accessory={
  'medical':'<path d="M149 182v30m-13-14h26" stroke="#48b7ae" stroke-width="6" stroke-linecap="round"/>',
  'justice':'<path d="M135 198h33" stroke="#d6ba65" stroke-width="6" stroke-linecap="round"/>',
  'tech':'<path d="M140 194h21m-10-11v22" stroke="#c9e8ff" stroke-width="3" stroke-linecap="round"/>',
  'leadership':'<path d="M149 178l9 16-9 22-9-22z" fill="#f3dc9c"/>',
  'creative':'<path d="M138 198q12-9 25 0" stroke="#fff0fd" stroke-width="5" fill="none" stroke-linecap="round"/>',
  'planet':'<path d="M141 189l8 9 8-9" stroke="#eaffde" stroke-width="5" fill="none" stroke-linecap="round"/>'
 }[group]
 detail=[
  '<path d="M100 76q56-65 110 0" stroke="#fff" stroke-width="6" opacity=".7" fill="none"/>',
  '<circle cx="63" cy="89" r="12" fill="#ffffff88"/><circle cx="264" cy="151" r="7" fill="#ffffffaa"/>',
  '<path d="M41 152q22-15 35 2m174 11q20-14 38-1" stroke="#ffffffbb" stroke-width="5" fill="none"/>'
 ][seed%3]
 hair_style=[
  '<path d="M114 105q-7-68 39-72 56-5 50 67-17-29-26-34-35 29-63 39z"/>',
  '<path d="M115 95q-11-61 38-64 57 2 48 67l-19-29q-43 21-67 26z"/>',
  '<path d="M117 91q-10-57 35-59 60-4 48 63-22-19-41-24-19 21-42 20z"/>',
  '<path d="M113 99q2-70 44-68 50 5 44 69-18-29-34-28-22 12-54 27z"/>'
 ][(seed//13)%4]
 headgear=''
 if any(word in c['name'] for word in ['의사','간호사','치과','약사','수의사','연구원','임상','방사선']):
  headgear='<path d="M122 48q30-20 63 1l-1 17h-64z" fill="#e8fafb" stroke="#a1d5dd" stroke-width="2"/><path d="M152 49v13m-6-6h13" stroke="#e6929f" stroke-width="4"/>'
 elif any(word in c['name'] for word in ['소방','경찰','안전','조종사','운전기사','정비원']):
  headgear='<path d="M116 69q2-39 38-39t43 39l-5 7h-73z" fill="'+accent+'" stroke="#ffffff" stroke-width="3"/><path d="M133 65h40" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>'
 elif any(word in c['name'] for word in ['제과','제빵','조리사','주방','바리스타']):
  headgear='<path d="M115 52c-15-26 17-37 31-21 12-24 44-7 39 12 21 8 20 27 8 33h-78z" fill="#fffaf6" stroke="#eaded6" stroke-width="3"/>'
 elif any(word in c['name'] for word in ['교사','교수','작가','기자','디자이너','감독']):
  headgear='<path d="M100 70q48-44 100 0" fill="none" stroke="#ffffffad" stroke-width="4"/>'
 name=esc(c['name'])
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 260" role="img" aria-labelledby="title">
<title id="title">{name} 어린이 일러스트</title>
<defs>
 <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="{bg1}"/><stop offset="1" stop-color="{bg2}"/></linearGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="{soft}"/><stop offset="1" stop-color="{bg1}"/></linearGradient>
 <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#425066" flood-opacity=".22"/></filter>
</defs>
<rect width="320" height="260" rx="24" fill="url(#sky)"/>
<circle cx="258" cy="48" r="48" fill="#ffffff55"/>
<path d="M0 190Q55 170 110 189T220 184T320 178V260H0Z" fill="url(#floor)"/>
<g fill="#fff" opacity=".85"><path d="M41 37l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M278 119l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>
{detail}
<ellipse cx="158" cy="242" rx="91" ry="13" fill="#536c7b33"/>
<g filter="url(#shadow)">
 <path d="M75 244v-26c0-40 26-67 70-68h22c44 1 73 31 73 70v24z" fill="{jacket}" stroke="#ffffffcc" stroke-width="3"/>
 <path d="M127 159l25 26 24-26-14-13h-21z" fill="#fff4e4"/>
 <path d="M127 160l26 28-25 34-22-59z" fill="#ffffff8d"/>
 <path d="M179 160l-26 28 26 34 22-59z" fill="#ffffff88"/>
 {accessory}
 <ellipse cx="{face_x-40}" cy="{face_y+13}" rx="9" ry="13" fill="{skin}"/>
 <ellipse cx="{face_x+40}" cy="{face_y+13}" rx="9" ry="13" fill="{skin}"/>
 <ellipse cx="{face_x}" cy="{face_y}" rx="45" ry="53" fill="{skin}"/>
 <g fill="{hair}">{hair_style}</g>
 {headgear}
 <g fill="#302d40"><ellipse cx="{face_x-16}" cy="{face_y+8}" rx="3.5" ry="4.5"/><ellipse cx="{face_x+16}" cy="{face_y+8}" rx="3.5" ry="4.5"/></g>
 <g fill="#e6878b" opacity=".45"><ellipse cx="{face_x-27}" cy="{face_y+23}" rx="9" ry="5"/><ellipse cx="{face_x+27}" cy="{face_y+23}" rx="9" ry="5"/></g>
 <path d="M{face_x-10} {face_y+31}q10 10 20 0" fill="none" stroke="#8b5257" stroke-width="2.8" stroke-linecap="round"/>
 <path d="M85 210q-10-15-21-9t-10 18q9 9 29 13m158-22q10-15 21-9t10 18q-9 9-29 13" fill="{skin}" stroke="#ffffffcc" stroke-width="2"/>
</g>
<g filter="url(#shadow)"><circle cx="257" cy="74" r="43" fill="#ffffffed" stroke="#ffffff" stroke-width="4"/>
<text x="257" y="92" font-size="46" font-family="'Apple Color Emoji','Noto Color Emoji','Segoe UI Emoji',sans-serif" text-anchor="middle">{icon}</text></g>
<circle cx="68" cy="213" r="17" fill="#ffffffb8"/>
<path d="M59 212l7 7 11-17" fill="none" stroke="{accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'''
manifest=[]
for c in careers:
 if not c['id'].replace('-','').isalnum():
  raise ValueError('Unsafe job id')
 result='\n'.join(line.rstrip() for line in make(c).splitlines())+'\n'
 path=OUT/(c['id']+'.svg')
 path.write_text(result,encoding='utf-8')
 manifest.append({'id':c['id'],'name':c['name'],'src':'./assets/career-illustrations/'+c['id']+'.svg',
                  'sha256':hashlib.sha256(result.encode()).hexdigest()})
(OUT/'manifest.json').write_text(json.dumps({'version':29,'license':'Original generated vector portraits, project-owned, no third-party image dependencies','illustrations':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert len(manifest)==100 and len(set(x['sha256'] for x in manifest))==100
print('CAREER_ART_100_OK',len(manifest),'generated',OUT)
