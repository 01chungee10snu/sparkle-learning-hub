#!/usr/bin/env python3
"""Compose in-app illustrations from the existing, independent licensed village sprites.

Outputs are deterministic, optimized WebP files. Art is recomposed (not invented new
licensed source material); keep labels as HTML so typography remains accessible.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = HERE.parent / "sparkle-fairy-village-unified-20261013" / "Assets/Resources/Sprites"
OUT = HERE / "village/assets/illustrations"
COLORS = {
    "math": ("#ebfbf4", "#fff1cf", "learning_castle", "flowers_sun", "tree_mint"),
    "korean": ("#fff4e8", "#ffdbeb", "house_library", "flowers_pink", "tree_blush"),
    "english": ("#eaf4ff", "#eae1ff", "house_moon", "flowers_blue", "tree_lilac"),
    "kma": ("#f4e6ff", "#fff3d2", "learning_castle", "flowers_lilac", "tree_gold"),
    "practice": ("#fff3e3", "#e7faf1", "house_flower", "flowers_coral", "tree_oak"),
    "academy": ("#f9e8ff", "#e7faff", "house_cake", "flowers_white", "tree_mint"),
    "growth": ("#eafde9", "#fff6d8", "tree_gold", "flowers_sun", "fountain"),
    "garden": ("#e9f9e8", "#fce7f1", "house_leaf", "flowers_pink", "tree_oak"),
    "shop": ("#fff0f5", "#f2e8ff", "house_shop", "flowers_coral", "balloon"),
}
def rgb(v):
    return tuple(bytes.fromhex(v.removeprefix("#")))
def gradient(w: int, h: int, a: str, b: str) -> Image.Image:
    r, s = rgb(a), rgb(b)
    img = Image.new("RGBA", (w, h))
    strip = Image.new("RGBA", (1, h))
    for y in range(h):
        t = y/max(h-1,1)
        strip.putpixel((0,y), tuple(round(r[i]*(1-t)+s[i]*t) for i in range(3))+(255,))
    return strip.resize((w,h))
def original(source: Path, name: str, subdir: str = "World") -> Image.Image:
    p = source / subdir / (name + ".png")
    if not p.is_file():
        raise FileNotFoundError(f"Missing approved original village artwork: {p}")
    img = Image.open(p).convert("RGBA")
    bounds = img.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
    if bounds: img = img.crop(bounds)
    return img
def paste_at(board: Image.Image, obj: Image.Image, x: int, y: int, width: int,
             height: int | None = None, shadow: bool=True) -> None:
    obj = obj.copy()
    if height is None: height = int(width*obj.height/max(obj.width,1))
    obj.thumbnail((width,height), Image.Resampling.LANCZOS)
    left = int(x - obj.width/2); top = int(y - obj.height)
    if shadow:
        shade = Image.new("RGBA",obj.size,"#6f557c")
        shade.putalpha(obj.getchannel("A").filter(ImageFilter.GaussianBlur(9)).point(lambda v:int(v*.17)))
        board.alpha_composite(shade,(left+6,top+12))
    board.alpha_composite(obj,(left,top))
def dust(board: Image.Image, seed: int, count: int, bottom: int | None=None) -> None:
    # Stable golden points, deliberately sparse; no flashing, no animation.
    import random
    r = random.Random(seed); d = ImageDraw.Draw(board,"RGBA")
    w,h=board.size
    for _ in range(count):
        x=r.randint(12,w-12); y=r.randint(10,bottom or h-12)
        rad=r.randint(2,5)
        d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=(255,230,151,r.randint(70,140)))
        if r.random()>.7:
            d.line((x-rad*2,y,x+rad*2,y),fill=(255,239,167,140),width=2)
            d.line((x,y-rad*2,x,y+rad*2),fill=(255,239,167,140),width=2)
def scenery(source: Path, key: str) -> Image.Image:
    a,b,building,flower,tree=COLORS[key]
    w,h=720,290
    canvas=gradient(w,h,a,b);d=ImageDraw.Draw(canvas,"RGBA")
    d.ellipse((-110,180,800,445),fill=(242,254,236,175))
    d.ellipse((70,224,730,460),fill=(209,242,227,168))
    d.ellipse((115,250,610,420),fill=(255,246,224,130))
    dust(canvas,sum(map(ord,key)),27,210)
    paste_at(canvas,original(source,tree),530,278,215,244)
    paste_at(canvas,original(source,flower),140,293,190,165)
    paste_at(canvas,original(source,building),338,282,300,252)
    paste_at(canvas,original(source,"butterfly"),618,140,92,98,False)
    d=ImageDraw.Draw(canvas,"RGBA")
    d.rounded_rectangle((4,4,w-5,h-5),radius=32,outline=(241,206,167,180),width=4)
    return canvas

def welcome(source:Path) -> Image.Image:
    w,h=1200,520
    canvas=gradient(w,h,"#edfaff","#fae7f6");d=ImageDraw.Draw(canvas,"RGBA")
    d.ellipse((-290,210,840,790),fill=(217,245,224,185))
    d.ellipse((480,160,1520,700),fill=(246,247,216,185))
    d.ellipse((-200,400,1600,850),fill=(242,225,241,155))
    dust(canvas,1077,92,360)
    paste_at(canvas,original(source,"tree_blush"),245,453,270,345)
    paste_at(canvas,original(source,"tree_lilac"),947,451,295,355)
    paste_at(canvas,original(source,"house_library"),480,438,290,285)
    paste_at(canvas,original(source,"learning_castle"),725,432,290,335)
    paste_at(canvas,original(source,"flowers_pink"),178,515,260,175)
    paste_at(canvas,original(source,"flowers_blue"),1048,513,260,165)
    paste_at(canvas,original(source,"taehee_original","Characters"),378,493,240,320)
    paste_at(canvas,original(source,"sehee_original","Characters"),870,489,232,309)
    paste_at(canvas,original(source,"butterfly"),621,135,140,128,False)
    d.rounded_rectangle((5,5,w-6,h-6),radius=34,outline=(248,204,181,185),width=5)
    return canvas

def lite_portrait(source:Path) -> Image.Image:
    w,h=720,1280
    canvas=gradient(w,h,"#e5f4ff","#f8e8f7"); d=ImageDraw.Draw(canvas,"RGBA")
    d.ellipse((-330,255,890,920),fill=(217,245,229,177))
    d.ellipse((-140,670,920,1500),fill=(246,238,212,190))
    d.ellipse((-180,1080,880,1570),fill=(216,243,224,185))
    # A ribbon of illustrated woodland, avoiding hard-edged UI-looking blocks.
    d.ellipse((210,130,630,650),fill=(255,245,218,175))
    d.ellipse((-90,750,540,1310),fill=(243,255,241,130))
    dust(canvas,1147,90,1160)
    paste_at(canvas,original(source,"tree_lilac"),565,380,235,285)
    paste_at(canvas,original(source,"tree_blush"),132,575,240,298)
    paste_at(canvas,original(source,"house_leaf"),175,320,255,257)
    paste_at(canvas,original(source,"learning_castle"),457,590,340,350)
    paste_at(canvas,original(source,"house_library"),170,940,305,295)
    paste_at(canvas,original(source,"house_flower"),518,1040,270,270)
    paste_at(canvas,original(source,"taehee_original","Characters"),232,784,240,315)
    paste_at(canvas,original(source,"sehee_original","Characters"),505,888,250,320)
    paste_at(canvas,original(source,"butterfly"),565,275,125,140,False)
    paste_at(canvas,original(source,"flowers_pink"),106,1220,236,178)
    paste_at(canvas,original(source,"flowers_blue"),626,1225,260,182)
    return canvas

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",type=Path,default=DEFAULT_SOURCE)
    args=p.parse_args()
    if not args.source.is_dir(): raise SystemExit("Original Unity source unavailable: "+str(args.source))
    OUT.mkdir(parents=True,exist_ok=True)
    for key in COLORS:
        image=scenery(args.source,key)
        image.save(OUT/(key+".webp"),format="WEBP",quality=89,method=6)
        icon=original(args.source,COLORS[key][2])
        icon.thumbnail((120,120),Image.Resampling.LANCZOS)
        icon.save(OUT/(key+"-icon.webp"),format="WEBP",quality=88,method=6)
    welcome(args.source).save(OUT/"welcome.webp",format="WEBP",quality=89,method=6)
    lite_portrait(args.source).save(OUT/"lite-portrait.webp",format="WEBP",quality=89,method=6)
    print("VILLAGE_ART_COMPOSED",len(COLORS)*2+2,"WebP files",sum(x.stat().st_size for x in OUT.glob("*.webp")),"bytes")

if __name__=="__main__": main()
