#!/usr/bin/env python3
"""Copy only a completed, stable Unity build and its authored UI renders.
No production records or private C# source are copied into the web repository.
"""
from pathlib import Path
import hashlib,json,shutil,sys,time
try:
    from PIL import Image
except ModuleNotFoundError:
    sys.path.insert(0,'/tmp/sparkle-v40-py')
    from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
UNITY=Path(sys.argv[1]).resolve()
SRC=UNITY/'Builds/WebGL/Build'
EVIDENCE=UNITY/'EvidenceV45'
DEST=ROOT/'docs/qa-interiors-v45'
ART=ROOT/'assets/interiors-v45'
VERSION='interiors-v45-20261105'
FILES={'WebGL.data.unityweb':1000000,'WebGL.wasm.unityweb':1000000,'WebGL.framework.js.unityweb':10000,'WebGL.loader.js':20000}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def copy_atomic(source,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    before=digest(source)
    temporary=target.with_name(target.name+'.copying')
    shutil.copy2(source,temporary)
    if digest(temporary)!=before or digest(source)!=before:raise RuntimeError('Source changed during copy: '+str(source))
    temporary.replace(target)
    return {'file':target.name,'bytes':target.stat().st_size,'sha256':before}
def main():
    result=json.loads((EVIDENCE/'build-summary.json').read_text())
    assert result['result']=='Succeeded' and result['errors']==0,result
    snapshot={name:((SRC/name).stat().st_size,(SRC/name).stat().st_mtime_ns) for name in FILES}
    time.sleep(.8)
    for name,minimum in FILES.items():
        size,mtime=snapshot[name]
        assert size>minimum and (size,mtime)==((SRC/name).stat().st_size,(SRC/name).stat().st_mtime_ns),'Incomplete/active build '+name
    DEST.mkdir(parents=True,exist_ok=True)
    manifest={'version':VERSION,'files':[copy_atomic(SRC/name,ROOT/'village/Build'/name) for name in FILES]}
    (DEST/'webgl-build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for name in ['build-summary.json','interior-audit.json']:copy_atomic(EVIDENCE/name,DEST/name)
    copy_atomic(UNITY/'Assets/Art/InteriorsV45/manifest.json',DEST/'authoring-manifest.json')
    records=[]
    for group in ['rooms','props']:
        (ART/group).mkdir(parents=True,exist_ok=True)
        for source in sorted((EVIDENCE/group).glob('*.png')):
            im=Image.open(source)
            if group=='props':
                box=im.getchannel('A').getbbox() if im.mode=='RGBA' else None
                if box:im=im.crop(box)
                output=ART/group/source.name
                im.save(output,optimize=True)
            else:
                output=ART/group/(source.stem+'.webp')
                im.convert('RGB').save(output,'WEBP',quality=89,method=6)
            records.append({'path':str(output.relative_to(ROOT)),'bytes':output.stat().st_size,'sha256':digest(output)})
    assert len(records)==47,'Expected 13 rooms, 2 playfields, 32 props'
    (ART/'manifest.json').write_text(json.dumps({'version':45,'source':'Unity render of original Blender FBX interiors; transparent prop margins cropped only','files':records},indent=2)+'\n')
    print('V45_SYNC_PASS',len(records),'rendered assets;',sum(x['bytes'] for x in manifest['files']),'WebGL bytes')
if __name__=='__main__':main()
