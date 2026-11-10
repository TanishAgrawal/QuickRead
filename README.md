<p align="center">
  <img src="assets/brand/quickread-256.png" alt="QuickRead logo" width="112" height="112">
</p>

<h1 align="center">QuickRead</h1>

<p align="center">Read highlighted webpage text at your pace, in a small floating Chrome reader.</p>

## What it does

- **Word or Line mode:** read one word at a time, or keep a highlighted word centered with faded context.
- **Your pace:** start at 300 WPM, with adjustable speed, punctuation pauses, and shortcuts.
- **Stay on the page:** drag and resize the reader, pause, rewind, or seek along the timeline.
- **Local and private:** selected text stays on your device. Only preferences and panel position are saved.

## Try it

Use Node.js and npm; tested with Node **24.16.0**. Supported versions are listed in [package.json](package.json).

```sh
npm ci
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select `.output/chrome-mv3` inside your checkout.
3. Highlight webpage text, then press **Alt+Shift+F** or click the toolbar icon.
4. Press **Start** when ready. Activation never autoplays.

Check or change the activation shortcut at `chrome://extensions/shortcuts` if needed.
After rebuilding, reload the extension and refresh pages with an older reader open.

## Controls

| Control | Action |
| --- | --- |
| Space | Start, pause, or resume; replay after finishing |
| Left / Right | Jump 5 words; paused stays paused, playing continues |
| Word / Line | Switch modes without losing your place or playback state |
| Timeline | Click, drag, or use arrow keys to seek; preserve playback state |
| Reset | Clear the session, then load the next highlight into Ready state |
| WPM / Gear | Change speed / open timing and shortcut settings |
| Escape / × | Close the reader |

Drag the header to move the panel and the bottom-right corner to resize it.
Typing in page fields works normally. Switching tabs pauses playback.

## Development

```sh
npm run dev          # Load .output/chrome-mv3-dev in Chrome
npm run typecheck
npm test
npm run build
npm run test:chrome  # Test the production build in a disposable Chrome profile
npm run zip          # Create the extension ZIP in .output/
```

The Chrome check needs a recent installed Chrome with extension-testing CDP APIs;
set `CHROME_PATH` for a custom executable. Verified with Chrome **156.0.8078.81**.
See [manual checks](docs/manual-checks.md) for physical shortcuts and real-site testing.

## Compatibility and privacy

QuickRead targets selectable webpage text. Chrome's built-in PDF viewer, browser pages,
and the Chrome Web Store are unsupported. Cross-origin frames, canvas editors, and
third-party PDF viewers need separate compatibility checks. Local HTML requires
**Allow access to file URLs** in the extension settings.

Permissions: `activeTab`, `scripting`, and `storage`. No persistent all-sites access,
analytics, accounts, or text uploads. Selected text stays in session memory.

[Privacy policy](PRIVACY.md) · [Design decisions](docs/decisions.md) · [Logo and publishing assets](assets/brand/README.md)
