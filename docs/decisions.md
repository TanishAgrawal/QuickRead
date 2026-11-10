# QuickRead first-version decisions

Accepted on 2026-11-07: the user approved the playback defaults, reader design,
and foundation below, including shipping selectable webpages first and investigating
PDF compatibility before choosing a dependency.

Updated on 2026-11-09: activation loads Ready state with a Start button; the panel
can be resized in both dimensions using its bottom-right corner, with word size
adapting to the available space. Size lasts until the panel closes. Black and
`#8FABD4` replace the original palette in the reader and settings. The suggested
activation shortcut is now Alt+Shift+F. Existing Chrome shortcut assignments may
need to be changed manually.

The user confirmed that Reset clears the session, keeps the panel open, and
captures the next highlight into Ready state. Timeline click/drag seeking preserves
paused/playing state: dragging previews a word without advancing and releasing
resumes only if playback was running. Keyboard timeline navigation is also available.
Updated on 2026-11-10: relative jump buttons and playback arrow keys also preserve
paused/playing state. Jumping before Start keeps Ready state; jumping after
completion stays paused at the chosen word until playback is explicitly resumed.

No dependencies, permissions, or stored preference fields were added for these changes.

Visual refinement on 2026-11-09: align Reset with the left edge of the WPM field
above it. Replace the resize arrow with a thin #8FABD4 corner edge, keeping the
existing pointer target and keyboard resizing.

The user also confirmed an additional Line display mode on 2026-11-09: scroll
text continuously through a single-line area, advance automatically at the selected
WPM, and keep both modes with an in-reader switch. Line mode moves right to left
using the existing word clock, with smooth movement during base word time and no
movement during extra punctuation pauses. It uses a serif font and shows nearby
words. Switching modes preserves the reading position, within-word progress, and
paused/playing state. Word remains the initial display mode; the switch is scoped
to the open panel. Reset keeps the chosen mode and clears the old text. No new
dependencies, permissions, or storage fields are needed.

Line refinement on 2026-11-09: the user reported jitter and requested one highlighted
word with fading neighbors, then confirmed that the highlighted word should stay
fixed in the center. This supersedes the continuous-marquee movement above. The
current word now uses a centered #8FABD4 highlight with black text; adjacent context
is dimmed and fades toward both edges. Browser-driven eased transitions move only
the context between word positions. Text centers are measured with subpixel bounds
and cached until layout changes. Position and control-only preference updates do
not restart the reading clock. Seeking and resizing reframe immediately; pausing
also freezes an in-progress context transition. No dependencies or storage changes.

## Confirmed foundation

The repository guide establishes TypeScript, WXT, plain HTML/CSS, Chrome Manifest V3,
content scripts, Chrome Storage API, and Vitest. Reading text is processed locally.
The reader uses selected text, stays in a draggable panel, and leaves the page usable.
There is no pointer-following mode.

## Agreed playback

- Start at 300 words per minute (200 ms per word).
- Add 100 ms after commas, colons, and semicolons.
- Add 250 ms after sentence endings and 400 ms at paragraph boundaries.
- When punctuation and a paragraph boundary coincide, use the longest extra pause.
- Expose speed, punctuation durations, and jump size as preferences.
- Space pauses/resumes; Left/Right seek five words, preserving paused/playing state. Escape closes.

## Agreed interface

- Black and #8FABD4 panel at the top right, with Start/pause/resume, backward,
  forward, speed, Reset, timeline, resize, settings, and close controls.
- Remember the dragged position and clamp it within the current viewport.
- The panel stays in place during playback; only deliberate dragging moves it.
- Suggest Alt+Shift+F for activation, customizable through Chrome's extension
  shortcut settings. Offer playback key customization in QuickRead's options page.
- Leave normal typing in page fields unaffected.
- Offer Word and scrolling Line display modes in the reader. Both use the same
  selection, playback clock, speed, punctuation timing, and navigation controls.

## Agreed implementation and tooling

- npm, strict TypeScript, two-space indentation, descriptive camelCase identifiers,
  kebab-case filenames, and plain CSS. Avoid adding a UI framework.
- A background service worker handles activation and injects the reader on demand.
- Inject an isolated-world script and mount the panel in a shadow root so page CSS
  does not affect its controls. Keep playback logic independent of the DOM.
- Request only activeTab, scripting, and storage permissions, with no persistent
  all-sites host permission.
- Save preferences and panel position in chrome.storage.local. Keep selected text
  in memory for the current reading session; do not persist or transmit it.
- Test selection boundaries, word order, timing, pause/resume, and seeking with
  Vitest. Verify activation, dragging, focus, and page interaction in Chrome.
- Document verified installation, development, build, test, and unpacked-extension
  loading commands when the scaffold exists.

Implementation details: the reader is a WXT unlisted bundle injected as an
isolated-world content script with chrome.scripting.executeScript, so it needs no
automatically registered all-sites content script. Vite is WXT's required build
peer. jsdom supports selection tests; Playwright Core drives the installed Chrome
in a disposable profile for integration checks. These are development dependencies.
No PDF dependency, UI framework, or network service was added.

## Logo and packaging

On 2026-11-09, the user requested a logo and Chrome publishing formats, and selected
the proposed compact Q with a forward reading cue, dark background, and bright
accent. The user then specified #8FABD4 for the mark on the dark tile. The PNG master,
wordmarks, raster exports, and optional store promotional tiles live in
`assets/brand/`. Four PNG sizes (16, 32, 48, 128) are packaged in `public/icons/`
and declared for Chrome's extension/action icons. The settings page uses the logo
and favicon. The existing reader palette and behavior remain unchanged.

## Compatibility investigation

Chrome grants temporary activeTab access when the user invokes an extension
command or action. It permits script injection with the scripting permission.
This supports on-demand access to a selected webpage without persistent all-sites
access. Cross-origin frames need separate investigation.

Chrome's PDF viewer is implemented as a separate component extension. Chromium's
permission checks normally prevent scripts from accessing another extension's
pages. Consequently, ordinary webpage selection injection should not be assumed
to work inside the native PDF viewer. This is a source-based finding; native PDF
runtime compatibility checks have not been performed. The first version does not
claim native PDF support.

An extension-owned PDF.js viewer remains an unapproved proposal. Do not add it
until the PDF workflow and dependency are agreed. Test HTML research papers and
web-based text-layer viewers separately; scanned documents require a text source
or OCR, which is not established scope.

Sources checked on 2026-11-07:

- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome commands and shortcut customization](https://developer.chrome.com/docs/extensions/reference/api/commands)
- [WXT content scripts and shadow-root UI](https://wxt.dev/guide/essentials/content-scripts)
- [WXT entrypoint types](https://wxt.dev/guide/essentials/entrypoints.html)
- [Chromium PDF viewer manifest](https://github.com/chromium/chromium/blob/main/chrome/browser/resources/pdf/manifest.json)
- [Chromium script-access restrictions](https://github.com/chromium/chromium/blob/main/extensions/common/permissions/permissions_data.cc)

## Verification and remaining scope

Unit tests cover exact text-selection boundaries, whitespace tokenization, word
order, punctuation timing, pause/resume, replay, seeking, and malformed preferences.
The Chrome smoke check covers a local HTML fixture, action activation, panel
placement and dragging, page typing, settings changes, custom playback keys,
position persistence, and preference-only storage.

The 2026-11-09 Chrome check additionally covers Ready/Start without autoplay,
Reset and replacement highlights, timeline click/drag/keyboard seeking with state
preservation, pointer/keyboard resizing, responsive bounds, and exact reader colors.
The new Alt+Shift+F default registered in the fresh Chrome test profile. Physical
activation-key dispatch remains a manual check.

The suggested Alt+Shift+R command was present but unassigned in the CDP-loaded
Chrome test profile in both headless and visible runs. Physical shortcut dispatch
and assignment through a normal unpacked installation remain manual checks.
QuickRead shows the actual assigned shortcut in settings and provides a button to
Chrome's shortcut management page.

PDF workflow, PDF.js adoption, OCR, cross-origin frame access, canvas-based
editors, and compatibility across real research sites remain unverified or undecided.
The tokenizer currently uses whitespace-separated words; punctuation pauses are
heuristics rather than sentence parsing. Paragraph pauses depend on selection
line breaks supplied by the source webpage.
