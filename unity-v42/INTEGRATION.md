# Unity native Blender integration v42

This is the authoring/build integration folder for the v42 development branch.
The original learning/IRT/reward/progress data and scripts are not modified.

Blender source assets: ../assets/blender-v41/source/ (Kenney CC0, verified manifest).
Export native FBX props from the web repository root:

```sh
blender -b --factory-startup --python unity-v42/export_native_props.py -- /absolute/path/to/unity-project
```

Unity uses `VillageBlenderBuild.PrepareAndBuild` to import vertex-colored meshes, generate
39 prefabs, validate all 11 district navigation routes/colliders, render editor evidence,
and produce the WebGL build. Native-world geometry is recorded by a read-only renderer
report. The browser test uses actual building taps, not injected answers.

Native mesh, shader, prefab and C# files are preserved in the Unity source repository.
See the final Korean report in docs/ for tested scope and remaining real-device checks.
