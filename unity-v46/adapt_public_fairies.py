"""Adapt Frakassets/Pixor's CC0 Fairy into two playable, articulated variants.
Source meshes are imported, smoothed and recolored, not replaced with generated images.
Run from web root: blender -b --python unity-v46/adapt_public_fairies.py -- UNITY_PATH
"""
from pathlib import Path
source=Path('unity-v46/export_cohesive.py').read_text().split('# CHARACTERS:')[0]
exec(compile(source,'unity-v46/export_cohesive.py','exec'),globals())
import bmesh
PUBLIC=UNITY/'SourceArt/PublicFairiesV46'
BASE=PUBLIC/'pixor-library-fairy.blend'
assert hashlib.sha256(BASE.read_bytes()).hexdigest()=='b5b790eb6586217c6f84f5b2617ea0e814b1cdb494bc3d2acc1349c047c11468'
original_manifest=json.loads((OUT/'manifest.json').read_text())
P.update({'fairSkin':'f6d7b9','fairBlush':'f3a4ad','taeHair':'dca17e','seHair':'cbbce7',
 'taeDress':'ee83ac','seDress':'a38bd6','taePale':'ffe2ec','sePale':'e6dfff',
 'fairEye':'363951','fairWhite':'fff8f1','taeWing':'ffe0ba','seWing':'d4e5ff',
 'taeEdge':'d94c8b','seEdge':'7b5aba'})
S=8.0; Z0=.4186

def world(v):return Vector((v.x*S,v.y*S,(v.z-Z0)*S))
def tag(obj,piece,pivot):obj['piece']=piece;obj['pivot']=tuple(pivot);return obj

def extras(fn,piece,pivot):
 before=set(bpy.data.objects);fn()
 for o in set(bpy.data.objects)-before:
  if o.type=='MESH':tag(o,piece,pivot)

def islands(mesh):
 neighbors={i:set() for i in range(len(mesh.vertices))}
 for edge in mesh.edges:a,b=edge.vertices;neighbors[a].add(b);neighbors[b].add(a)
 remaining=set(neighbors);result=[]
 while remaining:
  first=remaining.pop();stack=[first];seen={first}
  while stack:
   for n in neighbors[stack.pop()]:
    if n in remaining:remaining.remove(n);seen.add(n);stack.append(n)
  result.append(seen)
 return result

def public_fairy(who):
 pink=who=='tae'; hair='taeHair' if pink else 'seHair';dress='taeDress' if pink else 'seDress'
 pale='taePale' if pink else 'sePale';wing='taeWing' if pink else 'seWing';edge='taeEdge' if pink else 'seEdge'
 with bpy.data.libraries.load(str(BASE),link=False) as (data,loaded):loaded.objects=list(data.objects)
 imported=[o for o in loaded.objects if o is not None]
 for obj in imported:bpy.context.collection.objects.link(obj)
 bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
 headpivot=Vector((0,0,(.718-Z0)*S));armz=(.632-Z0)*S;legz=(.503-Z0)*S
 parts=[];eye_centers=[]
 for obj in imported:
  if obj.type!='MESH' or obj.name.startswith('Fairy sparkles'):continue
  matrix=obj.matrix_world.copy();coords=[world(matrix@v.co) for v in obj.data.vertices]
  connected=islands(obj.data) if obj.name in ['Fairy limbs','Fairy eyes'] else [set(range(len(coords)))]
  for component in connected:
   centroid=sum((coords[i] for i in component),Vector())/len(component)
   pivot=Vector((0,0,0));piece='Body';color=dress;subdiv=0
   if obj.name=='Fairy limbs':
    side='L' if centroid.x<0 else 'R';leg=centroid.z<(.52-Z0)*S
    piece=('Leg' if leg else 'Arm')+side;pivot=Vector((centroid.x,0,legz if leg else armz));color='fairSkin'
   elif obj.name=='Fairy head':piece='Head';pivot=headpivot;color='fairSkin';subdiv=2
   elif obj.name=='Fairy hair':piece='Head';pivot=headpivot;color=hair;subdiv=2
   elif obj.name=='Fairy eyes':piece='Head';pivot=headpivot;color='fairEye';subdiv=1;eye_centers.append(centroid)
   elif obj.name.startswith('Fairy wings'):
    left='left' in obj.name;piece='WingL' if left else 'WingR';color=wing
    # Original named wings are mirrored around the body after evaluating their authoring pose.
    coords=[Vector((-abs(v.x) if left else abs(v.x),v.y,v.z)) for v in coords]
    pivot=Vector((-.12 if left else .12,.32,(.63-Z0)*S))
   chosen=sorted(component);mapping={old:i for i,old in enumerate(chosen)}
   faces=[tuple(mapping[v] for v in p.vertices) for p in obj.data.polygons if all(v in component for v in p.vertices)]
   me=bpy.data.meshes.new('Pixor source '+obj.name);me.from_pydata([coords[i] for i in chosen],[],faces);me.update()
   out=bpy.data.objects.new('Pixor derived '+obj.name,me);bpy.context.collection.objects.link(out);paint(out,color);tag(out,piece,pivot)
   bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
   bpy.context.view_layer.objects.active=out;out.select_set(True)
   if subdiv:
    original_size=out.dimensions.copy();original_center=sum((Vector(c) for c in out.bound_box),Vector())/8
    mod=out.modifiers.new('Smooth imported Fairy geometry','SUBSURF');mod.levels=subdiv;mod.render_levels=subdiv
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.context.view_layer.update()
    new_center=sum((Vector(c) for c in out.bound_box),Vector())/8
    factor=Vector([original_size[i]/max(.001,out.dimensions[i]) for i in range(3)])
    for v in out.data.vertices:v.co=original_center+Vector([(v.co[i]-new_center[i])*factor[i] for i in range(3)])
   else:
    mod=out.modifiers.new('Soft imported edges','BEVEL');mod.width=.025 if piece=='Body' else .018;mod.segments=3
    try:bpy.ops.object.modifier_apply(modifier=mod.name)
    except RuntimeError:out.modifiers.remove(mod)
   for p in out.data.polygons:p.use_smooth=True
   parts.append(out);out.select_set(False)
 for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
 # Face finishing: original face/eyes retained; only highlights and blush are added.
 for pos in eye_centers:
  extras(lambda p=pos:sphere((p.x-.025,p.y-.085,p.z+.035),(.034,.020,.041),'fairWhite',16,10),'Head',headpivot)
 for side in (-1,1):
  extras(lambda side=side:sphere((side*.35,-.475,headpivot.z-.10),(.10,.027,.053),'fairBlush',18,10),'Head',headpivot)
  extras(lambda side=side:sphere((side*.535,-.025,headpivot.z),(.075,.06,.105),'fairSkin',18,10),'Head',headpivot)
  # Curls frame the existing imported cap; neither the source silhouette nor face is discarded.
  for j in range(3):
   extras(lambda side=side,j=j:sphere((side*(.47+.035*sin(j)),.06,headpivot.z+.18-j*.16),(.145,.14,.16),hair,20,14),'Head',headpivot)
 extras(lambda:sphere((0,-.568,headpivot.z-.045),(.050,.038,.045),'fairSkin',18,10),'Head',headpivot)
 extras(lambda:curve_tube('Gentle smile',[(-.07,-.536,headpivot.z-.195),(0,-.551,headpivot.z-.216),(.07,-.536,headpivot.z-.195)],.011,'fairEye',8),'Head',headpivot)
 # A small wreath, scalloped dress hem and matching shoes distinguish the two children.
 for i in range(7):
  a=pi+i*pi/6;cx=.49*cos(a);cy=.36*sin(a);cz=headpivot.z+.48+.06*cos(a*2)
  for j in range(5):
   t=j*2*pi/5
   extras(lambda cx=cx,cy=cy,cz=cz,t=t:sphere((cx+.055*cos(t),cy-.035,cz+.055*sin(t)),(.051,.035,.049),pale,12,8),'Head',headpivot)
  extras(lambda cx=cx,cy=cy,cz=cz:sphere((cx,cy-.066,cz),(.035,.018,.035),'goldLight',12,8),'Head',headpivot)
 for i in range(10):
  a=i*2*pi/10
  extras(lambda a=a:sphere((.52*cos(a),.61*sin(a),.68),(.12,.115,.055),pale,14,8),'Body',(0,0,1.25))
 extras(lambda:sphere((0,-.37,1.68),(.11,.045,.12),'goldLight',16,10),'Body',(0,0,1.25))
 for side in (-1,1):
  piece='LegL' if side<0 else 'LegR';pivot=(side*.18,0,legz)
  extras(lambda side=side:sphere((side*.18,-.10,.10),(.13,.20,.10),edge,18,12),piece,pivot)
 return 'Frakassets/Pixor Fairy CC0 imported body, face, hair, limbs and wings; smoothed and recolored; original flower wreath, facial highlights and dress trim added'

for who,height,alias in [('tae',3.8,'Characters/taehee_original'),('se',3.65,'Characters/sehee_original')]:
 bake46('Character/'+who,lambda w=who:public_fairy(w),'characters',who,[alias],height=height,raycount=6)
 record=RECORDS[-1];record['sourceAsset']='Pixor library Fairy';record['sourceAuthor']='Frakassets';record['license']='CC0-1.0'
 record['sourceUrl']='https://pixor.art/library/crystals/fairy/';record['sourceSha256']=hashlib.sha256(BASE.read_bytes()).hexdigest()
 by_id={r['id']:r for r in RECORDS}
 original_manifest['assets']=[by_id.get(r['id'],r) for r in original_manifest['assets']]
original_manifest['source']='Original Blender scenery and content, with two attributed CC0 Pixor Fairy-derived playable heroes'
(OUT/'manifest.json').write_text(json.dumps(original_manifest,ensure_ascii=False,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(PUBLIC/'tae-se-pixor-fairies.blend'),compress=True)
(PUBLIC/'derivatives.json').write_text(json.dumps({'source':'Pixor Fairy','author':'Frakassets','license':'CC0-1.0','sourceBlendSha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'derivatives':RECORDS},ensure_ascii=False,indent=2)+'\n')
print('PUBLIC_FAIRY_ADAPTATION_PASS',len(RECORDS),sum(r['triangles'] for r in RECORDS),flush=True)
