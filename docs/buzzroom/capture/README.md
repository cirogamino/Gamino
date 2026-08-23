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
