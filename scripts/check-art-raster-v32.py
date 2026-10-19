#!/usr/bin/python3
"""Verify all 64 independent game sprites retain transparent crop-safe artwork.

This check validates file integrity, not human aesthetic approval. The latter is
documented separately in the original-art audit/contact sheets.
"""
from pathlib import Path
from hashlib import sha256
import json

try:
 from PIL import Image
except ImportError as exc:
 raise SystemExit('Pillow is required for alpha/pixel QA: /usr/bin/python3') from exc

ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'village/assets/marine-premium-v25'
BASE=ROOT/'village/assets/marine-premium-v25/marine-originals-manifest.json'
EXTRA=ROOT/'village/assets/marine-premium-v25/marine-extra-manifest-v30.json'

for meta in [BASE,EXTRA]:
 data=json.loads(meta.read_text('utf-8'))
 assert isinstance(data.get('creatures'),list),f'Original art provenance manifest missing: {meta.name}'

webps=sorted(ART.glob('*.webp'));svg=sorted(ART.glob('*.svg'))
assert len(webps)==64 and len(svg)==64, f'Expected 64 unique SVG and 64 WebP, got {len(svg)}, {len(webps)}'
seen=set();minimumMargin=1536;total=0
for asset in webps:
 raw=asset.read_bytes();total+=len(raw)
 digest=sha256(raw).hexdigest()
 assert digest not in seen, f'Pixel-identical sprite: {asset.name}'
 seen.add(digest)
 assert 20_000 < len(raw) < 1_000_000, f'Unexpected byte budget {asset.name}: {len(raw)}'
 master=asset.with_suffix('.svg')
 assert master.is_file() and len(master.read_bytes())>1600, f'Missing editable source for {asset.name}'
 image=Image.open(asset)
 assert image.size==(1536,1152),f'Wrong artboard {asset.name}: {image.size}'
 assert image.format=='WEBP',f'Wrong media format {asset.name}'
 assert 'A' in image.getbands(),f'No alpha channel: {asset.name}'
 alpha=image.getchannel('A')
 bbox=alpha.getbbox()
 assert bbox is not None and bbox[0] < bbox[2] and bbox[1] < bbox[3],f'Blank transparent original: {asset.name}'
 margin=min(bbox[0],bbox[1],image.width-bbox[2],image.height-bbox[3]); minimumMargin=min(minimumMargin,margin)
 assert margin>=32,f'Art touches cutout/neighbor tile boundaries: {asset.name} margin={margin}'
 corners=[(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)]
 assert all(alpha.getpixel(point)==0 for point in corners),f'Opaque corners: {asset.name}'
 visiblePixels=sum(alpha.histogram()[1:])
 assert visiblePixels>=1500,f'Image has too little visible original art: {asset.name} ({visiblePixels} pixels)'
 assert visiblePixels/(image.width*image.height)<0.70,f'Background is not sufficiently transparent for cropping: {asset.name}'

print(f'PASS_ART_RASTER_V32 64 SVG + 64 independent WebP, transparent corner/margins, 1536×1152, unique SHA; closest margin={minimumMargin}px total WebP={total/1048576:.2f} MiB')
