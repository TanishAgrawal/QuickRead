# Chrome Web Store submission

Prepared for QuickRead 0.1.0 on November 10, 2026. These are submission drafts;
the developer dashboard remains the source for required fields and available categories.

## Package and listing assets

- Package: `.output/quickread-0.1.0-chrome.zip` (run `npm run zip`).
- Icon: `public/icons/icon-128.png`.
- Word screenshot: `assets/brand/store-word-1280x800.png`.
- Line screenshot: `assets/brand/store-line-1280x800.png`.
- Settings screenshot: `assets/brand/store-settings-1280x800.png`.
- Optional small promotional tile: `assets/brand/store-small-440x280.png`.
- Optional marquee: `assets/brand/store-marquee-1400x560.png`.

The package contains the production extension, not the repository or source ZIP.
Screenshots must show the current product; promotional tiles are separate assets.

## Store listing

**Name:** QuickRead

**Short description** (matches the manifest):

Read highlighted webpage text word by word. Your reading stays on this device.

**Language:** English

**Suggested category:** Productivity; use the closest reading/productivity category
offered in the dashboard.

**Detailed description:**

Read selected webpage text at your own pace with QuickRead, a small floating reader
that keeps the page visible.

Choose how you read:

- Word mode displays one word at a time.
- Line mode keeps the current word highlighted at the center, with faded neighboring
  words for context.
- Switch between modes without losing your place or paused/playing state.

Stay in control:

- Highlight text, press Alt+Shift+F or click the toolbar icon, then press Start.
- Adjust reading speed from 60 to 1,200 WPM; the default is 300 WPM.
- Customize extra pauses for punctuation and paragraph breaks.
- Pause or resume with Space. Jump backward or forward with the arrow keys without
  changing whether playback is paused or playing.
- Click or drag the progress timeline to move through the selection.
- Drag and resize the reader, customize playback shortcuts, and reset to a new selection.

Your reading stays on your device. QuickRead processes selected text locally and
saves only preferences and panel position. No account, analytics, advertising, or
text uploads are included.

QuickRead works with selectable webpage text. Chrome's built-in PDF viewer,
browser pages, and the Chrome Web Store are unsupported. Other PDF viewers and
embedded editors may not expose selectable text. Change the activation shortcut
at chrome://extensions/shortcuts if Chrome has not assigned it or another shortcut conflicts.

Reading speed and comprehension vary; QuickRead does not promise faster reading
or improved comprehension.

**Homepage:** https://github.com/TanishAgrawal/QuickRead

**Support:** https://github.com/TanishAgrawal/QuickRead/issues

**Privacy policy:** https://github.com/TanishAgrawal/QuickRead/blob/main/PRIVACY.md

These links require the repository to remain publicly accessible.

Recapture screenshots with `npm run build` followed by `npm run store:screenshots`.
The script uses a disposable Chrome profile and original local sample text.

## Privacy practices

**Single purpose:**

Display user-selected webpage text in a local, adjustable reading panel, one word
at a time or with a centered highlighted word and nearby context.

**activeTab justification:**

QuickRead needs temporary access to the current webpage only when the user
invokes the toolbar action or activation shortcut, so it can read the user's
selection and display the reader. Persistent all-sites access is not requested.

**scripting justification:**

QuickRead injects its packaged reader script into the current webpage after user
activation. The script reads the selection and mounts the floating reader.

**storage justification:**

QuickRead saves reading speed, punctuation pauses, jump distance, playback key
bindings, and panel position in chrome.storage.local. Selected text is never saved.

**Remote code:** No. All executable code is packaged with the extension.

**Data handling:** Disclose website content: QuickRead accesses selected text solely
to provide its reader, processes it locally, and does not transmit or retain it
outside the session. Do not describe the extension as handling no user data;
Google's policy includes local processing. Match the actual dashboard wording
and ensure the disclosures agree with PRIVACY.md.

**Limited Use certifications:** The extension does not sell or transfer user data,
use it for purposes unrelated to its reading functionality, or use it to determine
creditworthiness or for lending. Review the dashboard's exact certifications before submitting.

## Reviewer test instructions

No account or credentials are needed.

1. Open a regular HTML article, highlight a paragraph, and click QuickRead's toolbar icon.
2. Confirm that the reader shows Ready; click Start to begin.
3. Use Space to pause. Use Left/Right or the jump buttons; it should stay paused.
4. Resume, seek again, and confirm playback continues. Try the timeline while paused and playing.
5. Switch Word/Line modes; reading position and playback state should be preserved.
6. Drag and resize the reader. Open settings to change speed, pauses, jump distance, or keys.
7. Click Reset, highlight new text, and confirm it loads into Ready. Escape closes the reader.

If the activation shortcut is unassigned, use the toolbar icon or assign a shortcut
at chrome://extensions/shortcuts. Chrome's native PDF viewer is outside supported scope.

## Final account and release choices

The account owner must complete developer registration, payment, identity or email
verification, and any required legal declarations in the developer dashboard.
Confirm the public developer identity, contact email, distribution regions,
visibility, and whether publication should happen automatically after review.
The local Chrome smoke check does not replace the physical-shortcut and real-site
checks in [manual-checks.md](manual-checks.md).

## Official references

- [Publish an extension](https://developer.chrome.com/docs/webstore/publish)
- [Store images](https://developer.chrome.com/docs/webstore/images)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
