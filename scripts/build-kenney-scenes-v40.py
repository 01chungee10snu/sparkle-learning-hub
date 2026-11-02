#!/usr/bin/env python3
"""Build original scene compositions using only bundled CC0 Kenney sprite PNGs.

Authoring-only: Pillow is needed to regenerate and is not needed in production.
The resulting PNGs and manifest are committed; browsers never request Pillow.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/kenney-sketch-v40"
DERIV = ASSETS / "composite"
W, H = 1200, 760
SPRITES: dict[tuple[str,str],Image.Image] = {}

def sprite(name: str, size: int = 256, collection: str = "base") -> Image.Image:
    key = (collection, name)
    if key not in SPRITES:
        SPRITES[key] = Image.open(ASSETS / collection / f"{name}_N.png").convert("RGBA")
    img = SPRITES[key]
    if size == 256:
        return img
    return img.resize((size, round(size * img.height / img.width)), Image.Resampling.LANCZOS)

def overlay(canvas: Image.Image, name: str, cx: float, bottom: float,
            size: int = 256, collection: str = "base"):
    img = sprite(name, size, collection)
    canvas.alpha_composite(img, (int(cx - img.width / 2), int(bottom-img.height)))

def gradient(size, top, bottom):
    image = Image.new("RGBA", size, (0,0,0,255))
    px = image.load()
    for y in range(size[1]):
        t = y / max(1,size[1] - 1)
        r = round(top[0]*(1-t)+bottom[0]*t)
        g = round(top[1]*(1-t)+bottom[1]*t)
        b = round(top[2]*(1-t)+bottom[2]*t)
        for x in range(size[0]):px[x,y]=(r,g,b,255)
    return image

# Each building consists only of sprites from the licensed Kenney bundle.
COMPOSITIONS = {
    'math': [('tree_single',116,-71,322,'base'),('castle_towerPurple',216,0,310,'base')],
    'korean':[('building_door',208,0,311,'base'),('roof_gableBeige',210,0,216,'base')],
    'english':[('tree_multiple',206,20,314,'base'),('tree_single',150,-95,321,'base')],
    'hanja':[('structure_arch',211,0,316,'base'),('tree_single',112,-94,318,'base')],
    'kma':[('castle_gateOpen',230,0,316,'base'),('castle_towerBeige',138,-77,310,'base')],
    'practice':[('rocks_grass',164,68,335,'base'),('castle_towerBrown',209,0,307,'base')],
    'academy':[('building_door',213,0,311,'base'),('roof_churchPurple',212,0,215,'base')],
    'growth':[('tree_single',118,83,320,'base'),('castle_towerGreen',211,0,308,'base')],
    'pond':[('tree_single',135,-82,320,'base'),('grass_waterRiver',218,0,341,'base')],
    'ocean':[('grass_water',226,0,342,'base'),('water_fall',180,42,321,'base')],
    'career':[('building_door',206,0,311,'base'),('roof_gableGreen',210,0,218,'base')],
    'garden':[('furrow_crop',229,0,341,'expansion'),('tree_single',128,78,314,'base')],
    'plaza':[('well',218,0,315,'expansion'),('tree_single',116,86,323,'base')],
}

def icon(place):
    im = Image.new("RGBA",(380,380),(0,0,0,0))
    draw = ImageDraw.Draw(im)
    draw.ellipse((91,313,291,363),fill=(58,76,72,35))
    # Every location sits on the same familiar grassy isometric base.
    base = 'grass_water' if place in ('pond','ocean') else 'grass_center'
    overlay(im,base,190,369,264)
    # For building icons draw props on top of their tiles.
    for name,scale,dx,y,pkg in COMPOSITIONS[place]:
        overlay(im,name,190+dx,y,scale,pkg)
    return im

def scene():
    im=gradient((W,H),(174,217,234),(114,174,158))
    draw=ImageDraw.Draw(im,"RGBA")
    for x,y,w in [(98,125,170),(345,75,135),(865,125,230),(1095,80,125)]:
        draw.ellipse((x-w/2,y-22,x+w/2,y+27),fill=(246,253,246,86))
        draw.ellipse((x-w/3,y-41,x+w/3,y+18),fill=(250,252,255,115))
    draw.rectangle((0,568,W,H),fill=(61,147,162,82))
    for row in range(588,H,44):
        for col in range(-20,W+50,110):
            xx=col+((row//44)%2)*50
            draw.arc((xx,row,xx+55,row+15),190,350,fill=(230,247,239,95),width=3)
    # 7x7 floating tiles form an island. Neighboring tile bottoms are stepped
    # in isometric order, so no stock photo or copied Kenney sample is used.
    n=7
    def pos(i,j):
        return 600 + (i-j)*84, 222 + (i+j)*42
    for s in range(0,2*(n-1)+1):
        for i in range(n):
            j=s-i
            if not (0<=j<n):continue
            x,y=pos(i,j)
            tile='grass_center'
            if (i,j) in {(0,6),(1,6),(6,0),(6,1),(5,6)}:tile='grass_water'
            if (i,j) in {(2,2),(3,3),(4,4),(3,2),(2,3)}:tile='grass_path'
            if (i,j)==(3,3):tile='grass_pathCrossing'
            overlay(im,tile,x,y,185)
    props=[
       (0,1,'tree_multiple',177,'base'),(1,1,'castle_towerPurple',197,'base'),
       (1,2,'tree_single',150,'base'),(2,1,'tree_multiple',175,'base'),
       (0,4,'structure_arch',184,'base'),(2,4,'tree_single',173,'base'),
       (3,1,'castle_towerBeige',181,'base'),(4,1,'tree_single',154,'base'),
       (3,5,'roof_gableGreen',165,'base'),(5,2,'castle_towerGreen',187,'base'),
       (5,4,'tree_multiple',170,'base'),(4,5,'well',174,'expansion'),
       (5,5,'tree_single',174,'base'),(3,0,'castle_towerBrown',171,'base'),
       (0,5,'tree_multiple',160,'base')
    ]
    for i,j,name,size,pkg in sorted(props,key=lambda p:p[0]+p[1]):
        x,y=pos(i,j)
        overlay(im,name,x,y-30,size,pkg)
    return im

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    DERIV.mkdir(parents=True,exist_ok=True)
    entries=[]
    for place in COMPOSITIONS:
        out=DERIV/(place+".png")
        icon(place).save(out,optimize=True)
        entries.append({"name":place,"path":str(out.relative_to(ROOT)), "sha256":sha(out)})
    out=DERIV/'island-scene.png'
    scene().save(out,optimize=True)
    entries.append({"name":"island-scene","path":str(out.relative_to(ROOT)),"sha256":sha(out)})
    (DERIV/'derivatives.json').write_text(json.dumps({
        "version":1, "generator":"scripts/build-kenney-scenes-v40.py",
        "license":"CC0-1.0","derivation":"Original isometric compositions from bundled Kenney Sketch Town tiles",
        "entries": entries
    },ensure_ascii=False,indent=2)+"\n")
    print("Built",len(entries),"original CC0 compositions, no publisher logo or sample credits in UI.")

if __name__=="__main__":main()
