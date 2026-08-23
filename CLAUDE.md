# Gamino — read this first

Claude sessions do not remember previous conversations. This file is the memory.
**If you learn where something lives, write it down here.**

## The company

Gamino. Office at **13470 W Greenfield Ave**. Established 2005.
Ciro A. Gamiño — President, CEO & Founder.
The front doors carry the logo: a red circle around a black lowercase "e" with a
cursor arrow. That mark and those doors are the show's headquarters shot.

## Where the assets already are

**Check here before asking for a file.** Search Drive with
`mcp__Google_Drive__search_files` using `parentId = '<id>'`.

| What | Drive folder ID |
|---|---|
| **13470 W Greenfield Ave Photos** — 47 RAW `.DNG` (IMG_4381–4518, 57–110 MB each, ~3.5 GB) plus 30 `.JPG` (IMG_2528–2557). Includes the E doors, the 13470 address plate, and exterior coverage of the property. The JPGs carry 2015 EXIF dates from an iPhone 6 Plus, so they predate the renovation and show the building intact and operating. The DNGs were uploaded 2026-08-01. | `1NzcLonkyLfiA2v09AAIXsyruSliPtONk` |
| **GAMINO CAPTURE** — working folders for the 3D capture pipeline | `1ZpOpuoIZWPkogzxoRzpHLmBUHGgUXr_P` |
| ├ `1 SCOUT` — small images for Claude to look at | `1CIeOGc4elEKgrSWpkFORo55EU4Zrh867` |
| ├ `2 FULL RES` — originals headed for splat processing | `1w3KMesHqTAUK6ynnIoZbRcn8WAhIxyA3` |
| └ `3 INSTA360` — X4 / X5 footage | `1XrsQ2Ai25W3kcEuGJ39T164im68_7V7N` |

## Reading a large Drive file without destroying context

`download_file_content` returns base64 inline, and a multi-megabyte photo will
exhaust the context window. When it exceeds the limit the harness writes the
result to a file on disk and prints the path — that is the good path, not a
failure. Recover the bytes from it:

```bash
jq -r '.content' <saved-result-path> | base64 -d > photo.jpg
```

Then open the decoded file with the Read tool, which handles display scaling.
Images return nothing from `read_file_content`; the bytes are the only route.

## Hardware

- iPhone (photos and video)
- **Insta360 X4 and X5.** Insta360 ships a "Spatial Capture" mode that produces a
  Gaussian splat inside its own app; it is listed for the X6 with selected X4/X5
  modes and some regional exclusions. Confirm in the app before planning a shoot
  around it — if it works it replaces the entire multi-pass capture with one walk.

## State of the building

Gutted and under construction. No walls. The vapour barrier is stapled to the
rafters over the insulation with drywall to follow, so it *is* the ceiling and it
is not coming down. The decision was made deliberately to capture the space **as
is** — the half-built state is the show's first act, and it disappears for good
once the drywall goes up.

## Working agreements

- **Verify before reporting.** Run it, look at it, then say it works.
- **Hand over links, not terminal commands.** Claude runs in a cloud container
  with no access to the user's Mac; anything requiring his machine is friction.
- Claude cannot watch video. Stills only.

## Project docs

- `docs/buzzroom/PLAN.md` — the 3D office architecture
- `docs/buzzroom/CAST.md` — the eight AI characters
- `docs/buzzroom/capture/` — capture checklist and the numbers behind it
- `app/buzzroom/roster.ts` — cast config, single source of truth
