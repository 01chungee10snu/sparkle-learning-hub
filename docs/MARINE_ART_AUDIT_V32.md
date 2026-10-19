# Marine original-art quality audit — v32 (2026-10-19)

## Scope and reproducibility

- 64 independent, editable SVG source illustrations and 64 matching transparent WebP exports under `village/assets/marine-premium-v25/`.
- Source artboard remains 1536 × 1152 px, viewBox 1024 × 768. Each animal has its own file; no shared atlas or hard-colored backdrop.
- Upgrade script: `python3 scripts/upgrade-marine-art-v32.py`. Conversion uses installed `~/.local/bin/vectorcraft-cli convert`; it completed without failures for all 64 assets.
- 64/64 exported WebP files inspected using macOS AppKit: native raster dimensions 1536 × 1152, all 64 images include an alpha channel. Largest file: 270,550 bytes. The alpha-channel test does not prove every border pixel is transparent.
- Contact sheets: `docs/qa-marine-v32/contact-1.jpg` through `contact-4.jpg`, 16 species per page against a distinct blue-grey backing for inspecting transparency and cutout overlap.

## Improvements

### Follow-up bespoke redraw: six species

After contact-sheet review, six original flat silhouettes were **replaced**, using the independent shape generator `scripts/marine_bespoke_v32.py`. `scripts/upgrade-marine-art-v32.py` imports this generator and explicitly rebuilds these six before any common polish, so regeneration preserves the redesign; the other 58 retain their v32 polish.

| Species | Bespoke geometry and markings |
|---|---|
| Giant squid | Tapered dorsal mantle, two triangular mantle fins, collar, eight curved suckered arms, two long independent feeding tentacles |
| Manta ray | Much broader wing-shaped disc, distinct anterior cephalic lobes, translucent ventral highlight and long thin tail |
| Mandarinfish | Unique blue/teal body with six irregular interlacing orange labyrinth-like paths and small gold accents |
| Longnose butterflyfish | Compressed deep body, banding and narrow extended forward tubular snout with terminal mouth |
| American lobster | Segmented abdomen, fan tail, walking legs, antennae and two different-sized filled articulated claws |
| Leatherback turtle | Seven longitudinal carapace ridges, elongated broad front flippers and dorsal leathery-shell shading |

VectorCraft export completed successfully for all 64 after redraw; AppKit reports 64/64 matching 1536 × 1152 dimensions and alpha channels. All four contact sheets were re-rendered; visual review of pages 1–3 confirms all six bespoke changes at sprite contact scale. Remaining visual limitation: the butterflyfish tube can still appear somewhat rectangular at small size, and lobster claws retain a stylized cartoon profile.

- Every SVG received layered highlights, curved reflected-light paths, selective contour contrast, and subtle surface texture. The extra-species SVGs' original broad sheen ellipse was removed because it could wash over body contours.
- Twelve focal species received individually selected anatomy and material accents: clownfish, blue tang, sea turtle, leatherback turtle, reef shark, whale shark, humpback whale, beluga whale, octopus, giant Pacific octopus, American lobster, and spiny lobster.
- Clownfish retained white stripes with dark borders; whale-shark spots and gill bars remain identifiable; turtle scutes and fin highlights were reinforced; octopus suction cups, lobster segmentation, and marine mammal tail edges received supplemental detail.

## Visual audit and outstanding art-direction issues

The contact sheets were visually inspected. All 64 assets are individual sprites with substantial separation and clean, recognizable silhouettes at gallery size. The update is a meaningful **incremental illustration pass**, not a complete painterly remake.

| Category | Observed state | Remaining upgrade required for truly premium original art |
|---|---|---|
| 28+ small fishes | Species markings/colors remain distinct but share several repeated generic oval silhouettes | Illustrate individual fin structures, mouths, profiles and scales at native resolution |
| Humpback / beluga / dolphin | Marine mammal shapes are legible; tail flukes remain side-profile stylizations | Redraw true horizontal two-lobed tail in a consistent 3/4 perspective and refine species head shape |
| Reef shark / whale shark | Dorsal outline and multiple gill bars visible; whale shark has dots | Improve pectoral and asymmetrical caudal fins, mouth placement and species-proportional silhouette |
| Octopus / giant Pacific octopus | Eight arms and selected suction cups | Make arms volumetric, add underside depth and spiraling suckers along each arm |
| American lobster / spiny lobster | Segmentation highlights and contrasting appendages; antennae on spiny species | Redraw American lobster's large unequal claws and spiny lobster's long segmented antennae; base body silhouette currently reads like a shrimp |
| Sea turtle / leatherback turtle | Four flippers, head and shell legible | Distinguish leatherback longitudinal ridges from hard scutes; improve foreflipper joint and contour |
| Jellyfish, corals, anemones | Silhouettes differ by family | Add graded translucency, light transmission and asymmetrical organic branching |
| Contact-sheet polish | Bright white accents visually strengthen relief | Some species still appear vector-flat and small glints can extend beyond silhouettes; review sprite-scale visuals in-game |

## Integration and non-modification

No game behavior, unlock economics, source exam PDFs, 66-game/IRT bank, player profiles, descriptions, catalog or UI code were modified by this art task. No push was performed. Base generation scripts (`build-marine-art-v25.py`, `build-marine-extras-v30.py`) retain their previous logic; after regenerating base images, rerun the v32 upgrade script.
