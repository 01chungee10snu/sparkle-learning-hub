# Blender habitat expansion v43

Adds 18 authored environment meshes to the existing 39 native Unity prop kinds.
The actual Unity renderer gains reeds, water lilies, small boats/piers, orchard and glasshouse,
a flower arch, stone banks, and separately pivoted windmill/waterwheel/wing meshes.
This is not a new Three.js preview or a change to questions, rewards, or saved family records.

## Rebuild

Run from this web repository (its v42 authoring helpers and v41 CC0 sources are retained):

```sh
blender -b --factory-startup --python unity-v43/export_habitats.py -- /absolute/path/to/private-unity-project
```

In the private Unity repository, use `VillageHabitatBuild.PrepareAndBuild`.
It imports 18 new FBXs, keeps the original 39 prefabs, checks both learners in both worlds,
checks 11 subject routes and 5 free-roam destinations per world, verifies motion and reduced-motion
poses, renders Editor evidence and builds the WebGL binary.

The shared vertex-color material and existing sprite companions are preserved. New decorations
never register click colliders. New large structures have explicit navigation footprints.
The runtime animation is distance-bounded and respects reduced-motion/application focus.

Only generated WebGL and review evidence go into this public web repository.
The full Unity C#, shaders, FBXs, prefabs and Blender editable master remain in the private
`sparkle-fairy-village` repository, branch `feat/blender-habitats-v43-20261104`.
