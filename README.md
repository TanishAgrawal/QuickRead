# QuickRead

A Chrome extension that reads highlighted webpage text one word at a time or as
a smoothly scrolling line in a small draggable reader. Faster reading is a goal,
not a verified outcome.
Text is processed locally; only preferences and panel position are saved.

## Install and try it

Use Node.js **22.22.2+, 24.15.0+, or 26+** in the corresponding major release line,
and npm. Development was verified on Windows with Node 24.16.0 and npm 11.13.0.

```powershell
npm ci
npm run build
```

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select `D:\programing\QuickRead\.output\chrome-mv3`
   (or `.output/chrome-mv3` inside your checkout).
3. Open `chrome://extensions/shortcuts`. Check or assign **Alt+Shift+F** to QuickRead's
   **Activate the extension** command. Chrome may leave suggested shortcuts unassigned.
4. Highlight text on a regular webpage and press that shortcut. Clicking QuickRead's
   toolbar icon also loads the selection. Press **Start** when ready. Pin the icon
   from Chrome's Extensions menu if useful. Existing installations may keep their
   previous shortcut; change it manually in Chrome's shortcut settings.

The panel starts at the top right and remembers its dragged position. Drag its
header to move it. Drag the bottom-right corner to resize both dimensions; word
size adapts to the space. The resized dimensions last until the reader closes.
It stays fixed as the page scrolls and while playback runs.

| Control | Default behavior |
| --- | --- |
| Word / Line | Switch display mode while preserving your place and playback state |
| Start / Space | Begin the loaded selection, then pause/resume; replay after finishing |
| Left / Right | Jump 5 words backward / forward, preserving paused or playing state |
| Escape / × | Close the reader |
| WPM field | Change speed and save it locally |
| Gear | Open preferences for timing, jump size, and playback keys |
| Reset | Clear the session and load the next text you highlight, ready for Start |
| Progress timeline | Click or drag to a word; preserve paused/playing state |
| Resize corner | Drag to resize, or focus it and use arrows (Shift for larger steps) |

The reader uses a black background and `#8FABD4` text and accents. Loading a
selection does not autoplay. During timeline dragging, the chosen word previews
without advancing; releasing resumes only if reading was playing beforehand.

**Line mode** keeps one highlighted word fixed in the center, with neighboring
words faded toward both edges in a single serif text line. The side context eases
into place as each new word is read and holds during extra punctuation pauses.
The selected WPM sets the word timing. Start, pause/resume, jumps, Reset, and the timeline work in both
modes. Resizing adjusts the text size and visible context. Word is the initial
mode each time you open the panel; the mode choice is not stored.

The initial speed is **300 WPM** (200 ms per word), with extra pauses of **100 ms**
after commas/colons/semicolons, **250 ms** after sentence punctuation, and **400 ms**
at paragraph breaks. Overlapping pauses use the longest extra pause.
Typing in page fields keeps its normal keys. Switching tabs pauses the reader.
Returning to a tab does not automatically resume it.

## Develop and verify

```powershell
npm run dev        # WXT development output; no browser is launched automatically
npm run typecheck
npm test
npm run build
npm run test:chrome
npm run zip
```

For development, load `.output/chrome-mv3-dev` as an unpacked extension while
`npm run dev` is running. After rebuilding production, reload its extension card
in Chrome and refresh any webpage with an older reader open.

`test:chrome` uses Playwright Core and the installed Windows Chrome at
`C:\Program Files\Google\Chrome\Application\chrome.exe`. Set `CHROME_PATH` to use
a different Chrome executable. It requires a Chrome version with the experimental
CDP `Extensions.loadUnpacked` and `Extensions.triggerAction` testing APIs; verified
with **Chrome 156.0.8078.81**. It starts a temporary profile, serves a local fixture,
loads the production extension through CDP, and closes the test browser afterward.
It does not install into your regular Chrome profile. Set `HEADED=1` to see the run.
Screenshots are saved under `test-results/`.

The smoke check covers Word/Line switching, smooth scrolling and pause, line
seeking and replacement text, Ready/Start, Reset and replacement selection, timeline
click/drag/keyboard seeking, pointer/keyboard resizing, colors, playback controls,
dragging, typing, options, custom playback shortcuts, saved position, and storage.
Physical activation-shortcut dispatch still requires the manual check in
[docs/manual-checks.md](docs/manual-checks.md). Alt+Shift+F registered in the fresh
Chrome test profile. The settings page reports the actual assigned shortcut.

## Compatibility and privacy

- Selectable HTML text, including text in ordinary inputs and textareas, is the
  first-version target. Exact selection boundaries are kept, even for partial words.
- Chrome's native PDF viewer, browser pages, and the Chrome Web Store are unsupported.
  A PDF.js viewer remains a proposal. Research-paper HTML and third-party PDF text
  layers need site-specific checks. Scanned PDFs have no supported OCR workflow.
- Same-origin iframe selection is handled; cross-origin frames and canvas-based
  editors may not expose readable selection. Password fields are excluded.
- Local HTML requires **Allow access to file URLs** in QuickRead's extension details.
- Words are separated by whitespace. Paragraph timing follows the source's selection
  line breaks; abbreviations with terminal periods receive sentence pauses.
- Permissions are `activeTab`, `scripting`, and `storage`. No persistent all-sites
  permission, analytics, accounts, or text uploads are used. Selected text stays in
  memory for the session and is released when the reader closes or the page unloads.
- On a restricted page, the toolbar icon shows `!`; its tooltip explains the limitation.

## Logo and publishing assets

The QuickRead logo and reusable exports are in [assets/brand](assets/brand/README.md).
Chrome's 16, 32, 48, and 128px PNG icons live in `public/icons/` and are included
in both the unpacked build and `npm run zip` output. The toolbar action and settings
page use these icons. Large masters and promotional tiles stay outside the extension
package. Run `npm run brand:export` to regenerate the raster exports using installed
Chrome (or `CHROME_PATH`); no new dependency or online service is needed.

## Layout

- `entrypoints/`: MV3 background worker, injected reader bundle, and options page.
- `lib/`: playback, text selection, preferences, storage, and shadow-root UI.
- `tests/`: Vitest timing, selection, and preference tests (jsdom for DOM selection).
- `scripts/chrome-smoke.mjs`: isolated Chrome integration check.
- `docs/decisions.md`: accepted design and PDF investigation sources.
