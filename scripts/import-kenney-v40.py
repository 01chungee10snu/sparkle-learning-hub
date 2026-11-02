#!/usr/bin/env python3
"""Reproducibly curate CC0 Sketch Town sprites without modifying originals."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets/kenney-sketch-v40"
SOURCES = {
    "base": {
        "url": "https://opengameart.org/content/sketch-town",
        "download": "https://opengameart.org/sites/default/files/kenney_sketchtown_1.0.zip",
        "default": "/tmp/sparkle-v40-asset-sources/sketch-town.zip",
        "files": [
            "Tiles/castle_towerPurple_N.png", "Tiles/castle_towerGreen_N.png",
            "Tiles/castle_towerBrown_N.png", "Tiles/castle_towerBeige_N.png",
            "Tiles/castle_gateOpen_N.png", "Tiles/grass_center_N.png",
            "Tiles/grass_pathCrossing_N.png", "Tiles/grass_riverBridge_N.png",
            "Tiles/grass_waterRiver_N.png", "Tiles/grass_water_N.png",
            "Tiles/grass_river_N.png", "Tiles/roof_gableBeige_N.png",
            "Tiles/roof_churchBeige_N.png", "Tiles/roof_churchPurple_N.png",
            "Tiles/roof_gableGreen_N.png", "Tiles/tree_single_N.png",
            "Tiles/tree_multiple_N.png", "Tiles/rocks_grass_N.png",
            "Tiles/building_door_N.png", "Tiles/building_window_N.png",
            "Tiles/grass_path_N.png", "Tiles/water_fall_N.png",
            "Tiles/structure_arch_N.png", "Tiles/castle_tower_N.png"
        ],
    },
    "expansion": {
        "url": "https://opengameart.org/content/sketch-town-expansion",
        "download": "https://opengameart.org/sites/default/files/kenney_sketchtownexpansion.zip",
        "default": "/tmp/sparkle-v40-asset-sources/sketch-town-expansion.zip",
        "files": [
            "Tiles/well_N.png", "Tiles/tree_pineLarge_N.png",
            "Tiles/furrow_crop_N.png", "Tiles/fence_wood_N.png"
        ],
    },
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def import_pack(kind, archive, files):
    with zipfile.ZipFile(archive) as z:
        license_text = z.read("License.txt").decode("utf-8-sig", "replace")
        license_text = "\n".join(line.rstrip() for line in license_text.replace("\r\n", "\n").replace("\r", "\n").splitlines()).strip()+"\n"
        if "CC0" not in license_text or "Kenney" not in license_text:
            raise SystemExit(f"Unexpected license in {archive}")
        entries = []
        for filename in files:
            data = z.read(filename)
            if not data.startswith(b"\x89PNG\r\n\x1a\n"):
                raise SystemExit(f"Unexpected sprite format: {filename}")
            output = DEST / kind / Path(filename).name
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(data)
            entries.append({"path": str(output.relative_to(ROOT)), "sha256": sha(data), "bytes": len(data)})
        (DEST / f"LICENSE_{kind.upper()}.txt").write_text(license_text, encoding="utf-8")
        return entries

def main():
    archives = {
        "base": Path(sys.argv[1]) if len(sys.argv) > 1 else Path(SOURCES["base"]["default"]),
        "expansion": Path(sys.argv[2]) if len(sys.argv) > 2 else Path(SOURCES["expansion"]["default"])
    }
    packs = {}
    for name, source in SOURCES.items():
        archive = archives[name]
        packs[name] = {
            "source": source["url"],
            "archive_url": source["download"],
            "archive_sha256": sha(archive.read_bytes()),
            "license": "CC0-1.0",
            "author": "Kenney",
            "files": import_pack(name, archive, source["files"])
        }
    (DEST / "manifest.json").write_text(json.dumps({"version": 1, "packs": packs}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {sum(len(p['files']) for p in packs.values())} Kenney CC0 assets into {DEST}")

if __name__ == "__main__":
    main()
