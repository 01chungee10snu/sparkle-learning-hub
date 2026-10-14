# REA game-learning mechanics v1.2

Evidence, SHA, license, failed trace outcomes and adaptation risks: `../../rea/GAME_LEARNING_ADAPTATIONS.md`.

API: `mergeNumber({left,right,accepted=false})`, `composeRecipe({ingredients,required,accepted=false})`, `cooperativeGarden({contributions:[{participant,role}],requiredRoles,accepted=false})`, all exported by `../village/learning-mechanics-v12.js`.

All are deterministic and return `{kind,state,result,explanation,...}`; `state` is `observe` or `illustrate`. The existing learning engine owns grading, IRT, child profiles, and reward ledger. Only pass `accepted:true` after independent verification. No UI integration is asserted. Original game assets are absent.

Source classification: **2048 = actual MIT source + REA static analysis**, with `trace` unavailable; **Animal Crossing / Stardew Valley / Minecraft = design concepts only**, with official first-party product-description evidence still unverified. Inputs are bounded to 64 array entries and 80 characters per label. Duplicate participant-role contributions are deduplicated; prototype-like names are ordinary safe labels. Synthetic tests cover these cases.

2026-10-14 verification update: Nintendo [Create](https://animalcrossing.nintendo.com/new-horizons/create/) and [Explore](https://animalcrossing.nintendo.com/new-horizons/explore/), [Stardew Valley official About](https://www.stardewvalley.net/about/), and [Minecraft official Schools Reinventing Cities](https://www.minecraft.net/fr-fr/article/schools-reinventing-cities) confirm **first-party publisher descriptions as behavioral-design references**. None constitutes commercial binary REA. Nintendo content was confirmed from indexed official-site text; direct fetch failed. Alternative REA `trace-javascript-semantics` returned a **partial** static trace; the failed generic trace raw output remains preserved. See REA report for details.

**Semantic-trace correction:** literal `mergedFrom` returned zero seed matches and zero nodes; it did **not** validate tracing. A corrected `semantic-node` seed identifying the real `property-slot` returned one seed node, one node, zero relations and `ambiguous`. Thus only REA static node identification is validated; dependency/flow tracing remains unverified. Raw failures and both attempts remain preserved.
