# QuickRead logo and publishing images

The user selected a compact Q with a forward reading cue, on a dark tile with a
bright accent, on 2026-11-09. The user then specified `#8FABD4` for the mark,
matching the existing reader's blue interface palette.

## Files

| File | Use |
| --- | --- |
| `quickread-source.png` | Transparent imagegen raster master with the requested blue mark |
| `quickread-{16,32,48,128}.png` | Chrome PNG icons, also copied to `public/icons/` |
| `quickread-{256,512,1024}.png` | Transparent PNGs for other publishing uses |
| `quickread-wordmark-light.png` | Transparent wordmark for light backgrounds, 1600×400 |
| `quickread-wordmark-dark.png` | Transparent wordmark for dark backgrounds, 1600×400 |
| `quickread.webp` | Transparent 1024×1024 web export |
| `quickread.jpg` | 1024×1024 JPEG on a warm light background |
| `quickread.ico` | Multi-resolution ICO for website/desktop use |
| `store-small-440x280.png` | Optional Chrome Web Store small promotional tile |
| `store-marquee-1400x560.png` | Optional Chrome Web Store marquee promotional tile |
| `store-settings-1280x800.png` | Actual settings-page screenshot from the packaged extension |
| `preview.png` | Light/dark comparison and size preview; not a store screenshot |

The master is raster artwork; these exports do not include an editable vector
source. PNG is the required Chrome publishing format; SVG is unsupported for
Chrome manifest icons. The 128px icon has 16px transparent padding on every side;
the smaller toolbar icons use less padding to preserve legibility.

## Regenerate and package

Run `npm run brand:export` with installed Chrome (or `CHROME_PATH`). This uses the
existing Playwright Core dependency and Canvas for deterministic local raster
exports; it does not call imagegen again. Then run `npm run zip` to rebuild
`.output/quickread-0.1.0-chrome.zip`. Only the four small Chrome PNGs are packaged;
masters and promotional images stay outside the extension ZIP.

The store requires the 128px icon and at least one actual product screenshot at
1280×800 or 640×400. Promotional tiles and the preview are not screenshots.
The included settings screenshot was captured from the loaded extension in Chrome;
recapture it after interface changes. `brand:export` does not regenerate screenshots.
Publishing the listing also requires its descriptions, privacy disclosures, and
developer-account submission; this asset task does not submit anything.

Requirements checked on 2026-11-09:

- [Chrome manifest icons](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
- [Chrome Web Store image requirements](https://developer.chrome.com/docs/webstore/images)

## Artwork provenance

Created and recoloured with the built-in imagegen tool. The original generation
prompt and subsequent colour-edit prompt are saved in `generation-prompt.txt`.
The wordmark uses Segoe UI via the installed Windows font;
no font binaries are distributed. For identical wordmark exports, regenerate on
Windows with Segoe UI available. The edited PNG is retained as the raster master.
