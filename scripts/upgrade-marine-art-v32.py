#!/usr/bin/env python3
"""Non-destructive-to-other-directories v32 marine SVG polish and VectorCraft export.

Reads the 64 standalone author SVGs in their existing native 1024x768 viewBox.
Generated v32 decorative layers stay inside the same transparent 1536x1152 artboards.
Idempotent: removes the v32 named group before applying it again.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
from marine_bespoke_v32 import BESPOKE, make_bespoke

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "village/assets/marine-premium-v25"
CLI = str(Path.home() / ".local/bin/vectorcraft-cli")
FLAGSHIP = {
    "clownfish", "blue-tang", "sea-turtle", "leatherback-turtle",
    "reef-shark", "whale-shark", "humpback-whale", "beluga-whale",
    "octopus", "giant-pacific-octopus", "american-lobster", "spiny-lobster",
}
FISH = {"guppy","goldfish","neon","betta","koi","angel","clownfish","blue-tang"}
SHARK = {"reef-shark","whale-shark"}
WHALE = {"humpback-whale","beluga-whale"}
TURTLE = {"sea-turtle","leatherback-turtle"}
OCTOPUS = {"octopus","giant-pacific-octopus"}
LOBSTER = {"american-lobster","spiny-lobster"}

DEFS = """<defs id="v32-materials">
<linearGradient id="v32-rim" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#fffaf0" stop-opacity=".7"/><stop offset=".58" stop-color="#e5faff" stop-opacity=".20"/><stop offset="1" stop-color="#23465b" stop-opacity=".13"/></linearGradient>
<linearGradient id="v32-fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".52"/><stop offset=".47" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#102a48" stop-opacity=".21"/></linearGradient>
<radialGradient id="v32-pearl" cx=".36" cy=".25" r=".75"><stop stop-color="#fff" stop-opacity=".6"/><stop offset=".40" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#031d32" stop-opacity=".14"/></radialGradient>
<pattern id="v32-micro" width="24" height="22" patternUnits="userSpaceOnUse"><path d="M2 13 Q11 4 20 13" stroke="#fff" stroke-opacity=".13" stroke-width="1.7" fill="none"/><circle cx="18" cy="3" r="1.2" fill="#fff" opacity=".16"/></pattern>
</defs>"""

def common_layers(kind: str, extra: bool) -> str:
    # Fin shadow, reflected caustic, soft scales; overlay paths stay near central bodies.
    special_invertebrate = kind in {"urchin","star","coral","anemone","jelly","clam","squid","octopus","lobster","shrimp","cucumber","seadragon","nudibranch"}
    if special_invertebrate:
        return '''<path d="M404 304 Q511 267 621 316" fill="none" stroke="#fff" stroke-width="8" opacity=".24"/>
<path d="M379 424 Q492 474 639 434" fill="none" stroke="#19364b" stroke-width="7" opacity=".11"/>
<ellipse cx="483" cy="320" rx="97" ry="23" fill="url(#v32-pearl)" opacity=".25"/>'''
    layer = '''<path d="M347 338 C440 258 589 263 689 326" fill="none" stroke="url(#v32-rim)" stroke-width="15" stroke-linecap="round" opacity=".65"/>
<path d="M393 461 Q530 514 681 448" fill="none" stroke="#16354d" stroke-width="9" opacity=".12"/>
<path d="M356 373 Q496 339 669 354" fill="none" stroke="#fff" stroke-width="3.5" opacity=".20"/>
<path d="M399 424 Q518 457 640 408" fill="none" stroke="#fff" stroke-width="4" opacity=".10"/>'''
    if kind in {"fish","slender","round","disk","catfish","goby","puffer","box"} or extra:
        layer += '''<ellipse cx="517" cy="389" rx="174" ry="69" fill="url(#v32-micro)" opacity=".30"/>
<path d="M432 316 Q482 286 537 302" fill="none" stroke="#fff" stroke-opacity=".29" stroke-width="6" stroke-linecap="round"/>'''
    return layer

def anatomy(identifier: str) -> str:
    if identifier in WHALE:
        # Foreshortened pair of broad, horizontal tail lobes; beluga lacks dorsal fin.
        return '''<path d="M287 403 C234 368 176 354 113 365 C157 392 213 410 283 420 C207 423 149 444 109 475 C181 476 237 455 296 431" fill="none" stroke="#f0f9ff" stroke-opacity=".55" stroke-width="9" stroke-linecap="round"/>
<path d="M377 457 Q519 512 690 479" fill="none" stroke="#f8ffff" stroke-opacity=".45" stroke-width="7"/>'''
    if identifier in SHARK:
        return '''<path d="M687 361 q-17 25 -8 45 M708 365 q-17 26 -8 45 M729 370 q-16 27 -8 43 M746 377 q-14 23 -9 37" stroke="#284a62" stroke-width="7" fill="none" stroke-linecap="round" opacity=".70"/>
<path d="M434 316 Q463 215 507 204" fill="none" stroke="#effaff" stroke-width="8" opacity=".37"/>'''
    if identifier in TURTLE:
        return '''<path d="M390 374 L472 326 L552 356 L587 430 L534 481 L450 463 Z" stroke="#e5f8d5" stroke-width="5" opacity=".57" fill="none"/>
<path d="M472 326 L470 463 M552 356 L534 481 M390 374 L335 421 M587 430 L654 438" fill="none" stroke="#fff" stroke-width="4" opacity=".24"/>
<path d="M221 346 Q266 359 314 393 M727 369 Q755 364 793 367" fill="none" stroke="#fff" stroke-opacity=".31" stroke-width="7"/>'''
    if identifier in OCTOPUS:
        return '''<path d="M371 313 Q395 238 476 230" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".37"/>
<g fill="#f9dfe5" fill-opacity=".66"><circle cx="284" cy="556" r="6"/><circle cx="316" cy="572" r="6"/><circle cx="386" cy="564" r="6"/><circle cx="432" cy="591" r="6"/><circle cx="573" cy="581" r="6"/><circle cx="634" cy="560" r="6"/><circle cx="709" cy="554" r="6"/></g>
<path d="M434 419 Q497 441 560 419" stroke="#fff" stroke-opacity=".16" stroke-width="7" fill="none"/>'''
    if identifier in LOBSTER:
        return '''<path d="M359 356 Q468 290 603 355" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width="9"/>
<path d="M408 330 Q389 396 399 470 M465 322 Q446 391 458 481 M527 328 Q509 393 518 484 M590 350 Q564 410 579 475" fill="none" stroke="#f4c8b2" stroke-opacity=".63" stroke-width="6"/>
<path d="M372 424 Q403 465 439 466" fill="none" stroke="#532e47" stroke-width="6" opacity=".25"/>'''
    if identifier == "clownfish":
        return '''<path d="M431 293 Q464 391 438 497 M578 295 Q613 392 576 499 M718 352 Q728 400 708 450" fill="none" stroke="#fff" stroke-width="6" opacity=".49"/>
<path d="M350 407 Q512 482 680 442" fill="none" stroke="#b65328" stroke-width="8" opacity=".27"/>'''
    if identifier == "blue-tang":
        return '''<path d="M369 337 Q488 281 645 316" stroke="#153a80" stroke-width="12" opacity=".54" fill="none"/>
<path d="M428 465 Q572 497 702 443" stroke="#fff" stroke-width="7" opacity=".32" fill="none"/>'''
    return ""

def upgrade(path: Path) -> None:
    if path.stem in BESPOKE:
        source = make_bespoke(path.stem)
        ET.fromstring(source)
        source = "\n".join(line.rstrip() for line in source.splitlines()).rstrip() + "\n"
        path.write_text(source, encoding="utf-8")
        return
    source = path.read_text(encoding="utf-8")
    source = re.sub(r'<defs id="v32-materials">.*?</defs>', '', source, flags=re.S)
    source = re.sub(r'<g id="v32-polish".*?(?=</svg>)', '', source, flags=re.S)
    identifier = path.stem
    # Existing 48 extra SVGs place opaque-looking light discs outside anatomy.
    source = re.sub(r'<ellipse cx="519" cy="388" rx="276" ry="170" fill="url\(#sheen\)" opacity="\.49"/>', '', source)
    source = re.sub(r'<ellipse cx="479" cy="309" rx="211" ry="95" fill="url\(#gloss\)" opacity="\.44"/>', '', source)
    is_extra = 'aria-label=' in source
    kind = "fish" if identifier in FISH else ("whale" if identifier in WHALE else
           "shark" if identifier in SHARK else "turtle" if identifier in TURTLE else
           "octopus" if identifier in OCTOPUS else "lobster" if identifier in LOBSTER else
           "invertebrate" if identifier in {"shrimp","hermit-crab","sea-crab","seahorse"} else "fish")
    overlay = common_layers(kind, is_extra) + anatomy(identifier)
    source = source.replace('</svg>', f'{DEFS}\n<g id="v32-polish" pointer-events="none">{overlay}</g>\n</svg>')
    ET.fromstring(source)
    source = "\n".join(line.rstrip() for line in source.splitlines()).rstrip() + "\n"
    path.write_text(source, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-convert", action="store_true")
    args = ap.parse_args()
    sources = sorted(ASSETS.glob("*.svg"))
    assert len(sources) == 64, f"Expected 64 original SVGs, found {len(sources)}"
    for p in sources: upgrade(p)
    if not args.no_convert:
        failures = []
        for n,p in enumerate(sources, 1):
            out = p.with_suffix(".webp")
            result = subprocess.run([CLI, "convert", str(p), str(out)], capture_output=True, text=True)
            if result.returncode: failures.append((p.name, result.stderr[-400:]))
            if n % 16 == 0: print(f"VectorCraft exported {n}/64",flush=True)
        if failures: raise RuntimeError(f"Conversion errors: {failures}")
    print(f"Polished {len(sources)} original 1536x1152 marine assets; 12 flagship anatomical accents")

if __name__ == "__main__": main()
