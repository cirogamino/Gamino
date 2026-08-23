# Capture Day

`capture-day.html` is the phone checklist for photographing the real office and
the Greenfield Avenue building so they can be rebuilt as a photoreal 3D scene
rather than modelled by hand. Published as a private artifact; this is the source.

## Why photogrammetry rather than modelling

Realtime lighting is what makes hand-built 3D read as a toy. The two ways out are
baking the lighting in Blender, or capturing a real place. This project takes the
second: a Gaussian splat of the actual office, with the AI cast composited in.

## The numbers the checklist is built on

| | |
|---|---|
| Frame overlap | 70–80% (each feature lands in 3–5 frames) |
| Typical room | 200–350 frames |
| Large open space | 400–600 frames |
| Building exterior | 150–250 frames |

Exposure and focus must be locked before the first frame. Auto-exposure flicker
between frames is the most common cause of a failed reconstruction — ahead of
resolution, camera, or software choice.

## Capturing before the building is finished

A splat reproduces only what was in front of the lens. It is not a mesh and carries
no editable geometry, so a scan of a gutted shell yields a photoreal gutted shell —
walls cannot be added afterwards. That splits the work by what is actually ready:

- **Exterior, now.** The Greenfield Avenue facade is finished and unaffected by the
  interior demolition. It is the establishing shot and it can be shot today.
- **Interior shell, now, as measurement.** Not the final look, but it captures true
  footprint, ceiling height, and window and column positions, so the hand-built room
  is modelled to real dimensions rather than guessed. Bare studs capture well —
  plenty of texture, no mirrors or glass. Leave an object of known length in frame
  to give the scene real-world scale.
- **Interior, later.** The photoreal room can only be captured once the room exists.

Construction-specific hazards: sheet plastic flutters and is translucent, both of
which the solver handles badly, so pin it flat or pull it; site lighting is dim,
which forces a slow shutter and reintroduces motion blur, so bring work lights; and
a path must be walkable end to end, since frame overlap cannot be held while
climbing over material.

## Pipeline

1. Capture (phone, per the checklist).
2. Process in Luma or Polycam. Export **Gaussian Splat → PLY**.
   Polycam's free tier exports GLTF only; PLY needs Pro.
   Postshot is Windows-only and is not an option on a Mac.
3. Compress PLY → KSPLAT.
4. Render with `@mkkellogg/gaussian-splats-3d` (MIT, v0.4.7). Its UMD build is
   what makes a single self-contained page possible — the ES module build is
   split across files that import each other and cannot be inlined.

## The size ceiling

A published artifact caps at 16 MB. three.js (2 MB) plus the splat renderer
(0.65 MB) leaves roughly 13 MB, and inlining binary costs a further ~33% in
encoding — so about **10 MB of raw splat data**, or ~350–400K splats.

Measured: 500K splats ≈ 11.4 MB as KSPLAT; a 1M-splat room ≈ 72 MB. A
full-quality room therefore does not fit a single page and has to be hosted,
where the splat is served as a separate file and the ceiling disappears.
