# Capture albums and media

Albums live in `src/lib/captures.json`, in newest-first order. The homepage shows the newest three; View all shows every album. This same list generates all detail routes at build time. Add social metadata in `src/lib/social-previews.json` when adding an album.

## Importing photographs

Keep full-size originals in your own photo library, outside this repository and `public`. Create a temporary JSON import file with one entry per photo:

```json
[
  {
    "id": "album-month-year-01",
    "source": "/absolute/path/to/original.jpg",
    "alt": "A specific description of the photograph"
  }
]
```

Run from the repository root:

```sh
node scripts/prepare-capture-images.mjs /path/to/import.json
npm run check:captures
```

Reference the IDs in the album's `images` array, in display order. Commit the generated `src/lib/capture-images.json` and `public/photo/captures` files. Reimporting changed images creates new content-hashed filenames; remove old unreferenced variants as reported by the check. Keep originals elsewhere for future re-encoding.

The importer strips metadata, respects orientation, and produces WebP files at 192, 512, and 1024 pixels wide without cropping or enlargement. Thumbnails only use the smallest variant. Galleries use responsive 512/1024 variants for their maximum 512-pixel display width. Portraits retain their proportions and use a narrower display width. Dimensions are available before download, avoiding layout shifts. Only the first gallery image loads eagerly; the rest load lazily.

These assets are served directly, avoiding Vercel Image Optimization transformations and its image-cache operations for captures. Static delivery still uses requests and data transfer. Content hashes make the existing year-long immutable cache header safe across photo changes. Capture detail pages are prerendered, avoiding server rendering per visit; the existing analytics APIs remain separate.

## Budgets

`npm run build` runs `check:captures` first. It validates references, dimensions, file hashes, and byte counts, rejects unused variants, and enforces a 512 KiB per-file / 20 MiB total capture budget. These are project guardrails, not Vercel plan allowances. Review growth before raising them.

Current library: 7 albums, 80 photographs, 240 variants, 13.44 MB total. The 19 existing capture originals occupied 6.62 MB; their replacement variants occupy 2.12 MB (68% smaller). The 26-photo SF album occupies 2.83 MB. Originals replaced from the existing albums remain recoverable in Git history.

The 12-photo Yates Mountain album occupies 3.94 MB and follows the lakeside approach, climb, summit, and return to the lake.

The SF sequence follows a visual arc: friends and sunlit streets, red signs and warm interiors, the bay, food, the beach at sunset, and nighttime scenes. The darker Golden Gate sunset leads into the Palace of Fine Arts and the group portrait beside the bridge at night. Image IDs stay stable when the display order changes.

Other site media, especially videos, account for most deployment bytes. Capture optimization does not establish account-wide quota headroom. Check the project's actual plan and usage before publishing large media additions. Vercel's CLI source-upload limits and monthly delivery limits are different constraints.

References: [Image Optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing), [platform limits](https://vercel.com/docs/limits).

The five-photo Surrail Ridge album occupies 1.13 MB, moving from rocky slopes to the ridge overlook and ending at the still lake.

The Vancouver album contains 12 photos (1.67 MB), moving from the city and park to the climb, resting group, and inlet panorama, then back to the waterfront sunset and blue-hour bicycle scene.

The five-photo Stampede album occupies 1.04 MB, progressing from daytime rides to the illuminated midway and fireworks.

The 15-photo Niagara to Montreal album occupies 2.59 MB, moving from Niagara Falls through road-trip scenes to Montreal streets and evening light.

All 85 photographs across the eight albums were visually reviewed together in November 2026. Vancouver and SF were reordered to keep the hike and changing evening light coherent; the other six sequences already followed their location and time-of-day arcs. Tony’s pizza was subsequently removed at the owner’s request, including its four photos, social preview, and generated variants. See [the full media audit](media.md) for optimization outside captures.

The nighttime phone portrait was later removed from SF at the owner’s request, including all three generated variants.
