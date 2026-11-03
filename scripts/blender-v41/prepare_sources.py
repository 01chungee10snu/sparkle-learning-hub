#!/usr/bin/env python3
"""Curate Kenney CC0 3D glTF models into one reproducible offline Blender source."""
import hashlib, json, pathlib, sys, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
TARGET=ROOT/"assets/blender-v41/source"
ARCHIVES={
  "fantasy-town":("kenney_fantasy-town-kit_2.0.zip",[
    "wall-door","wall","wall-window-glass","wall-window-round","wall-window-shutters",
    "wall-wood","wall-wood-door","wall-wood-window-shutters",
    "roof-gable","roof-high","roof-high-window","roof","roof-point",
    "watermill","windmill","fountain-round-detail","fountain-square-detail",
    "lantern","stall-green","stall-red","banner-green","banner-red","fence","tree","tree-high-round"
  ]),
  "castle":("kenney_castle-kit.zip",[
    "tower-square","tower-square-mid","tower-square-top","tower-square-roof","tower-square-top-roof",
    "tower-square-mid-windows","tower-hexagon-roof","flag","gate","bridge-straight"
  ]),
  "nature":("Nature Kit (2.1).zip",[
    "tree_default","tree_detailed","tree_oak","tree_pineTallA_detailed","tree_pineRoundD",
    "flower_purpleA","flower_redB","flower_yellowC","mushroom_redGroup","plant_bushDetailed",
    "grass_leafs","rock_largeB","rock_smallD","bridge_wood","sign",
    "fence_simple"
  ])
}
URL={
  "fantasy-town":"https://opengameart.org/sites/default/files/kenney_fantasy-town-kit_2.0.zip",
  "castle":"https://opengameart.org/sites/default/files/kenney_castle-kit.zip",
  "nature":"https://opengameart.org/sites/default/files/Nature%20Kit%20%282.1%29.zip"
}
def sha(v):return hashlib.sha256(v).hexdigest()
def main():
 TARGET.mkdir(parents=True,exist_ok=True)
 data={"version":1,"license":"CC0-1.0","origin":"Kenney","packs":[]}
 archives=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/sparkle-blender-kenney")
 for pack,(name,models) in ARCHIVES.items():
  archive=({"fantasy-town":"fantasy-town.zip","castle":"castle.zip","nature":"nature.zip"}[pack])
  with zipfile.ZipFile(archives/archive) as z:
   license=z.read("License.txt").decode("utf-8-sig","replace")
   if "Kenney" not in license or "CC0" not in license:raise ValueError(pack+" license not CC0")
   lic=TARGET/f"LICENSE_{pack}.txt"
   lic.write_text("\n".join(x.rstrip() for x in license.replace("\r","\n").splitlines()).strip()+"\n")
   # Kenney's GLB assets can reference a palette PNG with a relative path.
   textures=[name for name in z.namelist() if ('/GLB format/Textures/' in name or '/GLTF format/Textures/' in name) and name.endswith('.png')]
   texture_entries=[]
   for name in textures:
    dest=TARGET/pack/'Textures'/pathlib.Path(name).name
    dest.parent.mkdir(parents=True,exist_ok=True)
    raw=z.read(name)
    dest.write_bytes(raw)
    texture_entries.append({"path":str(dest.relative_to(ROOT)),"bytes":len(raw),"sha256":sha(raw)})
   entries=[]
   for model in models:
    candidates=[x for x in z.namelist() if x.endswith('/'+model+'.glb') and '/GL' in x]
    if len(candidates)!=1:
     print("Missing",pack,model,candidates);continue
    content=z.read(candidates[0]);out=TARGET/pack/(model+".glb");out.parent.mkdir(exist_ok=True)
    out.write_bytes(content)
    entries.append({"name":model,"path":str(out.relative_to(ROOT)),"bytes":len(content),"sha256":sha(content)})
   data["packs"].append({"name":pack,"download_url":URL[pack],"archive_sha256":sha((archives/archive).read_bytes()),"original_license":str(lic.relative_to(ROOT)),"models":entries,"textures":texture_entries})
 (TARGET/"manifest.json").write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n")
 print("Curated",sum(len(p["models"]) for p in data["packs"]),"CC0 models")
if __name__=="__main__":main()
