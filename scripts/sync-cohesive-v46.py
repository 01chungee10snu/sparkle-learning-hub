#!/usr/bin/env python3
"""Copy a completed native build and genuine same-model Unity renders.
Original files remain available for one-shot image failure fallback.
"""
from pathlib import Path
import hashlib,json,shutil,sys,time
try:
 from PIL import Image
except ModuleNotFoundError:
 sys.path.insert(0,'/tmp/sparkle-v40-py');from PIL import Image
ROOT=Path(__file__).resolve().parents[1];UNITY=Path(sys.argv[1]).resolve()
OUT=ROOT/'assets/cohesive-v46';DOC=ROOT/'docs/qa-cohesive-v46';DOC.mkdir(parents=True,exist_ok=True)
VERSION='cohesive-v46-20261105'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(source,dest):
 before=sha(source);dest.parent.mkdir(parents=True,exist_ok=True);temp=dest.with_name(dest.name+'.copying');shutil.copy2(source,temp)
 if sha(temp)!=before or sha(source)!=before:raise RuntimeError('Source changed during copy')
 temp.replace(dest)
 return {'file':dest.name,'bytes':dest.stat().st_size,'sha256':before}
report=json.loads((UNITY/'EvidenceV46/build-summary.json').read_text())
assert report['result']=='Succeeded' and report['errors']==0,report
files={'WebGL.data.unityweb':1000000,'WebGL.wasm.unityweb':1000000,'WebGL.framework.js.unityweb':10000,'WebGL.loader.js':20000}
source=UNITY/'Builds/WebGL/Build';snap={n:((source/n).stat().st_size,(source/n).stat().st_mtime_ns) for n in files};time.sleep(.8)
for n,minimum in files.items():assert snap[n][0]>minimum and snap[n]==((source/n).stat().st_size,(source/n).stat().st_mtime_ns),'incomplete build '+n
records=[atomic(source/n,ROOT/'village/Build'/n) for n in files]
(DOC/'webgl-build-manifest.json').write_text(json.dumps({'version':VERSION,'files':records},indent=2)+'\n')
for n in ['build-summary.json','native-audit.json']:atomic(UNITY/'EvidenceV46'/n,DOC/n)
atomic(UNITY/'Assets/Art/CohesiveV46/manifest.json',DOC/'authoring-manifest.json')
atomic(UNITY/'EvidenceV45/interior-audit.json',DOC/'interior-regression.json')
m=json.loads((UNITY/'Assets/Art/CohesiveV46/manifest.json').read_text());assert m['fullExport']
images=[]
for item in m['assets']:
 source=UNITY/'EvidenceV46'/item['webGroup']/(item['webKey']+'.png')
 im=Image.open(source).convert('RGBA');bbox=im.getchannel('A').getbbox();assert bbox,source
 # Preserve a small clear margin. Keep proportions, never stretch anatomy.
 x0,y0,x1,y1=bbox;pad=round(max(x1-x0,y1-y0)*.035)
 im=im.crop((max(0,x0-pad),max(0,y0-pad),min(im.width,x1+pad),min(im.height,y1+pad)))
 ext='.webp' if item['webGroup']=='careers' else '.png';dest=OUT/item['webGroup']/(item['webKey']+ext);dest.parent.mkdir(parents=True,exist_ok=True)
 if ext=='.webp':im.save(dest,'WEBP',quality=91,method=6)
 else:im.save(dest,optimize=True)
 images.append({'id':item['id'],'path':str(dest.relative_to(ROOT)),'bytes':dest.stat().st_size,'sha256':sha(dest),'width':im.width,'height':im.height,'sourceModel':item['file'],'modelSha256':item['sha256']})
scenes=[]
for key,name in [('entry','scene-entry.png'),('world','scene-overview.png')]:
 source=UNITY/'EvidenceV46'/name
 if not source.exists():continue
 dest=OUT/'scenes'/(key+'.webp');dest.parent.mkdir(parents=True,exist_ok=True)
 Image.open(source).convert('RGB').save(dest,'WEBP',quality=90,method=6)
 scenes.append({'path':str(dest.relative_to(ROOT)),'bytes':dest.stat().st_size,'sha256':sha(dest),'source':'Current Unity scene rendered by Editor'})
(OUT/'manifest.json').write_text(json.dumps({'version':VERSION,'source':'Same Blender models rendered in Unity; includes two CC0 Pixor-derived heroes; transparent crop only','assets':images,'scenes':scenes},ensure_ascii=False,indent=2)+'\n')
for name in ['unity-tae-world.png','unity-se-world.png']:atomic(UNITY/'EvidenceV46'/name,DOC/name)
print('COHESIVE_SYNC_PASS',len(images),'authored images;',sum(r['bytes'] for r in records),'runtime bytes')
