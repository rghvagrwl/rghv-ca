# Media storage and quality

The November 2026 optimization audit covered every file in `public`: 254,818,556 bytes before optimization, 164,158,877 bytes afterward. This saves 90,659,679 bytes (35.6%) without removing any photograph or artwork. After the subsequent requested removal of Tony’s pizza and one SF portrait, capture albums contain 80 photographs across seven albums; see [captures.md](captures.md) for their import pipeline and sequencing.

## What changed

| Media | Treatment | Quality verification |
| --- | --- | --- |
| Capture photos | Responsive 192/512/1024 px WebP variants; lazy gallery loading | Reviewed every photo in album context; 1024 px supports the 512 px gallery at 2× density |
| Existing photo, book, and comic WebP/JPEG files | Retained their current dimensions and encodings | Avoided another lossy encoding pass |
| 25 PNG images at audit time (24 remain after removing Tony’s preview), including UI screenshots and shader textures | Smaller PNG encoding or full-resolution lossless WebP | Exact decoded RGBA hash and original dimensions recorded and checked before every build |
| Generic social previews | Consolidated 18 identical work PNGs, plus the identical home preview, into `/og/work.png` | Identical bytes; old URLs remain available |
| Two Vercel screen recordings | H.264, slow preset, CRF 14, fast-start MP4; original 4K dimensions and 60 fps | Compared every frame against the source; inspected full-frame samples and 100% crops |

The screenshots keep their full resolution and ICC profiles. The canvas serves converted screenshots directly, so Next Image does not apply another lossy encode to them. Lossless PNG optimization also preserves the exact pixels used by the comic's relief texture.

Video size fell from 110,197,157 bytes to 27,547,131 bytes, a 75.0% reduction. Chat sidebar: 1,279 frames compared, mean SSIM 0.999626, minimum frame SSIM 0.998382. URL interaction: 1,347 frames, mean SSIM 0.999742, minimum 0.998136. These video encodes and the capture WebP variants are lossy; the measurements and visual review support very small visible differences, not mathematically identical pixels. SSIM is a structural similarity metric, not a percentage of retained quality.

## Maintaining the result

`npm run build` first runs both `check:captures` and `check:media`. The latter checks the complete public inventory for duplicates, enforces 200 MiB overall and 32 MiB per file, verifies image dimensions and decoded pixel hashes, and checks video file hashes and alias targets. These are repository guardrails, not a hosting plan's quota. Raising them should follow a review of the new assets.

`src/lib/optimized-media.json` records original URLs, replacement URLs, byte counts, hashes, and video comparison results. Next config preserves the 52 remaining replaced URLs (including 15 legacy capture originals) with compatibility rewrites (including cached Next Image requests). Replacement media filenames include their content hashes and receive one-year immutable cache headers.

To optimize newly added PNGs, run `node scripts/optimize-static-images.mjs`, inspect the results, then run the checks. The script only accepts smaller encodes whose decoded pixels exactly match the source; it does not recompress photos or print scans. Set `MEDIA_ORIGINALS_DIR` to a permanent archive outside the repository when importing future media. This audit's originals were also copied to `/tmp/rghv-media-originals`; tracked sources remain recoverable in Git. Temporary backups are not a permanent photo library.

The video encodes used FFmpeg 7.1 with `-c:v libx264 -preset slow -crf 14 -threads 2 -c:a copy -movflags +faststart`, preserving the input stream dimensions and frame rate. Re-encode future videos from their originals, compare every frame and inspect samples, then update the manifest and references together.

Smaller public assets reduce deployment payload and delivery bytes. They do not by themselves guarantee account-wide storage or transfer headroom: that depends on the hosting plan, retained deployments, traffic, and image transformations. See [Vercel platform limits](https://vercel.com/docs/limits) and [Image Optimization pricing](https://vercel.com/docs/image-optimization/limits-and-pricing).

After the audit, the owner requested removal of the Tony’s pizza album. Its four photographs, twelve generated variants, social preview, metadata, and legacy aliases were removed. The optimization figures above describe the pass before that content removal; `npm run check:media` reports the current inventory.

The SF nighttime phone portrait and its three generated variants were subsequently removed at the owner’s request.
