# Repository Guidelines

## Product Goal & Confirmed Scope

QuickRead uses rapid serial visual presentation (RSVP) in Chrome. Faster reading is a goal, not a verified outcome.

Provide selection-based reading with Word and Line display modes:

- Read highlighted text word by word, or in a focused line with one highlighted word fixed at the center and faded adjacent context. Offer a Word / Line switch in the reader; preserve reading position and paused/playing state when switching. The mode choice lasts until the panel closes. Target websites, research papers, PDFs, and other content inside Chrome. Desktop apps are outside scope. Verify source compatibility.
- Activate through Alt+Shift+F by default; users can assign or change it in Chrome's extension shortcut settings. The toolbar action also activates the reader. Load the selection into Ready state and show Start; do not autoplay on activation.
- Use a small, draggable, resizable window, fixed during playback. Keep the page visible and usable without blackouts. Resize from the bottom-right corner and adapt word size; dimensions last until the panel closes.
- Space pauses/resumes. Left/Right jumps five words backward/forward, preserving paused/playing state. Make jump size easily adjustable and key bindings customizable.
- Make speed, pause, and rewind easy to control. Start at 300 WPM, with extra pauses of 100 ms after commas/colons/semicolons, 250 ms after sentence endings, and 400 ms at paragraph breaks. Use the longest overlapping extra pause. These values are adjustable.
- Line mode uses the same word timing, punctuation pauses, and seeking controls. Keep the highlighted word fixed at center; ease the surrounding text into place on word advances, with adjacent words fading toward both edges. Hold still during extra punctuation pauses. Cache text geometry and avoid resetting playback timing for position or control-only preference changes.

Do not add a pointer-following mode. Initial placement is top right; remember the dragged position. Use black and #8FABD4 for the reader and a separate options page for timing, jump distance, and playback keys. Reset clears the session, keeps the panel open, and loads the next highlight into Ready state. The progress timeline supports click, drag, and keyboard seeking; preview while dragging and resume only if previously playing. Escape closes the panel. Preserve typing in page fields. See `docs/decisions.md` for accepted decisions and remaining proposals.

## Collaboration & Design Decisions

Discuss unresolved interactions, styling, architecture, dependencies, and tooling before implementation. Ask focused questions, explain tradeoffs, and document agreements. Distinguish proposals from requirements.

Clarify the concept first. Begin implementation only when requested.

## Project Structure & Module Organization

Repository: [TanishAgrawal/QuickRead](https://github.com/TanishAgrawal/QuickRead).

Source is established under `entrypoints/` (background worker, injected reader, options page) and `lib/` (playback, selection, preferences, storage, UI). Vitest tests live in `tests/`; the isolated Chrome check is `scripts/chrome-smoke.mjs`. WXT generates build output under `.output/`. See `README.md` for setup and compatibility limits.

## Agreed Technology Stack

Use TypeScript, WXT, plain HTML/CSS, and Chrome Manifest V3. Use content scripts for webpage selection and the draggable reader, Chrome Storage API for preferences, and Vitest for playback tests. Process reading text locally.

The first version targets selectable webpages. PDF integration remains undecided. Investigate compatibility before implementation; an extension-owned PDF.js viewer is a proposal, not an agreed dependency. Native Chrome PDF support is not claimed.

## Build, Test, and Development Commands

Use npm with the Node versions declared in `package.json` (verified with Node 24.16.0). Run `npm ci`, `npm run dev`, `npm run build`, `npm run typecheck`, `npm test`, `npm run test:chrome`, and `npm run zip`. The Chrome smoke check requires the recent installed Chrome or `CHROME_PATH`. Loading instructions and remaining physical-shortcut checks are documented in `README.md` and `docs/manual-checks.md`.

## Coding Style & Naming Conventions

Use strict TypeScript and plain CSS, two-space indentation, descriptive camelCase identifiers, and kebab-case filenames. No linting dependency is established. Keep changes focused.

## Testing Guidelines

Use Vitest with jsdom for selection tests. Test selection boundaries, word order, speed, pause/resume, punctuation timing, and seeking. The Playwright Core smoke check uses a disposable Chrome profile for placement, dragging, playback keys, settings, persistence, and page interaction. Physical activation-key dispatch and real-site compatibility remain manual checks; report limitations. No coverage threshold is established.

## Commit & Pull Request Guidelines

No commit history establishes a convention. Use descriptive, imperative subjects, for example `Document reader interaction decisions`.

Pull requests should explain motivation, changes, and validation. Link related issues, include screenshots for UI changes, and identify setup changes or unrun checks.

## Security & Configuration

Never commit credentials or browsing data. Agreed production permissions are activeTab, scripting, and storage, without persistent all-sites host access. Store only preferences and panel position locally; keep selected text in session memory. Any transmission of webpage text requires explicit agreement. Discuss any permission or storage expansion before implementation.
