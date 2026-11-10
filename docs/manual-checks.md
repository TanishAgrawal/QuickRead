# Manual Chrome checks

Use the normal unpacked installation described in the README. The automated
check uses a disposable profile and local fixture; these checks cover the remaining
browser and source-specific interactions. Unchecked items are not claims of support.

- [ ] Verify or assign Alt+Shift+F in `chrome://extensions/shortcuts`; highlight a
  partial paragraph on a regular webpage and activate using the physical keys.
- [ ] Confirm activation waits at Ready, then press Start. Reset the session,
  highlight new text without reactivating, and confirm it waits for Start again.
- [ ] Click and drag the timeline while paused and while playing. Confirm the
  chosen word previews and the previous playback state is restored on release.
- [ ] Resize from the bottom-right corner and using its focused arrow keys. Verify
  word size adapts and all controls stay reachable after shrinking the viewport.
- [ ] Switch between Word and Line while paused and while playing. Confirm the
  position is preserved, line movement freezes on pause, and punctuation pauses
  hold the scrolling line still. Check long words and non-ASCII selections.
- [ ] In Line mode, seek to the start and end, resize the panel, and reset to a new
  highlight. Confirm nearby words remain readable and the previous text is cleared.
- [ ] Check the centered highlight with short and long words at several WPM settings.
  The highlighted word should stay fixed while side words ease into place and fade
  toward both edges. Pause during a transition and confirm the context freezes.
- [ ] Change the activation shortcut in Chrome and verify the new shortcut works.
- [ ] On representative article and research-paper HTML pages, compare highlighted
  text with reader output, including inline links, multi-paragraph selections,
  quotation marks, and non-ASCII text.
- [ ] Check paragraph pauses on those pages; native selection determines line breaks.
- [ ] Pause/resume with Space; use arrow keys and jump buttons in both directions
  in Word and Line modes. Confirm paused playback stays paused and playing playback
  continues. Before Start, jumping should keep Ready state.
- [ ] Drag while paused and while playing. Scroll the page: the panel should stay
  in the same viewport position. Resize Chrome and check that controls stay reachable.
- [ ] Tab through reader controls. Use Space/Enter on focused buttons; test keyboard
  use with a screen reader. The page should remain clickable and editable.
- [ ] Switch tabs during playback. Confirm that the reader pauses and stays paused
  when returning. Close the panel and check that page keys work normally again.
- [ ] Change settings in one tab and confirm another open reader uses them. Restart
  Chrome and confirm preferences persist. Try a shortcut collision and reassign it.
- [ ] Try local HTML with and without file-URL access enabled. Check the toolbar
  error tooltip when access is denied.
- [ ] Investigate Chrome's native PDF viewer and representative web PDF viewers
  before deciding on a PDF.js workflow. Record viewer/version, source URL or fixture,
  whether selection is exposed, and permission behavior. Do not save private text.
- [ ] Check hostile page CSS, embedded frames, browser zoom, very long words, narrow
  viewports, and pages that intercept keyboard events.

Automated coverage already checks a local HTML fixture, action activation, initial
placement, dragging, page input keys, pause and five-word seeking, live preferences,
custom playback keys, reopening position, and preference-only storage. It does not
establish compatibility with every website, PDF viewer, or keyboard layout.
