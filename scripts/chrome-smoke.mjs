import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

// Uses a fresh temporary profile and Chrome's extension-testing CDP API.
// No changes to the user's browser profile or extension installation.
const extensionPath = resolve('.output/chrome-mv3');
const manifest = JSON.parse(await readFile(resolve(extensionPath, 'manifest.json'), 'utf8'));
assert.deepEqual(manifest.permissions.toSorted(), ['activeTab', 'scripting', 'storage'].toSorted());
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts, undefined);
assert.equal(manifest.commands._execute_action.suggested_key.default, 'Alt+Shift+F');
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>QuickRead browser check</title>
<style>body{margin:0;background:#f5f2eb;color:#292b30;font:20px/1.8 Georgia,serif}article{max-width:680px;margin:80px 100px}h1{font:42px/1.1 Georgia}small{font:12px system-ui;letter-spacing:2px;color:#716a60}textarea{display:block;width:500px;height:100px;padding:12px;font:16px system-ui}button{background:red!important}p{margin-bottom:30px}</style></head>
<body><article tabindex="-1"><small>THE QUICKREAD FIELD NOTES</small><h1>Make room for the words.</h1>
<p id="source">Reading begins with attention. A small pause gives a sentence room to land, and a steady rhythm lets each word take its place. Keep the page in view while you explore a different pace.</p>
<p id="fresh">The reader stays where you put it. You can pause, rewind, change the speed, or return to the page whenever you like.</p>
<label for="notes">Notes</label><textarea id="notes" placeholder="The page remains usable."></textarea></article></body></html>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(fixture);
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : chromium.executablePath());
let context;
try {
  context = await chromium.launchPersistentContext('', {
    executablePath,
    headless: process.env.HEADED !== '1',
    viewport: { width: 1440, height: 1000 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging'],
  });
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: extensionPath });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}`);
  const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const targetInfo = targetInfos.find((target) => target.url === page.url());
  assert.ok(targetInfo, 'test tab found');
  const activate = () => cdp.send('Extensions.triggerAction', { id, targetId: targetInfo.targetId });
  const select = (selector = '#source') => page.locator(selector).evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  const reader = page.locator('quickread-reader');
  await select();
  await activate();
  await reader.waitFor();
  assert.equal(await reader.locator('.status').innerText(), 'Ready — press Start');
  assert.equal(await reader.locator('.word').innerText(), 'Reading');
  await page.waitForTimeout(300);
  assert.equal(await reader.locator('.word').innerText(), 'Reading', 'activation does not autoplay');
  await mkdir('test-results', { recursive: true });
  await reader.screenshot({ path: 'test-results/reader-ready.png' });
  await reader.getByRole('button', { name: 'Start', exact: true }).click();
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.mouse.move(10, 10);
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(await reader.getByRole('spinbutton').inputValue(), '300');
  assert.equal(await reader.locator('.panel').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(0, 0, 0)');
  assert.equal(await reader.locator('.primary').evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(143, 171, 212)');
  const initialBounds = await reader.boundingBox();
  assert.ok(initialBounds.x > 1000 && initialBounds.y === 24, `initial top-right placement: ${JSON.stringify(initialBounds)}`);

  // Arrow keys and jump buttons preserve paused/playing state in both directions.
  const pausedCount = await reader.locator('.count').innerText();
  await page.waitForTimeout(250);
  assert.equal(await reader.locator('.count').innerText(), pausedCount);
  await page.locator('article').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(Number((await reader.locator('.count').innerText()).split(' / ')[0]), Number(pausedCount.split(' / ')[0]) + 5);
  await page.waitForTimeout(250);
  assert.equal(Number((await reader.locator('.count').innerText()).split(' / ')[0]), Number(pausedCount.split(' / ')[0]) + 5);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(await reader.locator('.count').innerText(), pausedCount);
  await reader.locator('.forward').click();
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(Number((await reader.locator('.count').innerText()).split(' / ')[0]), Number(pausedCount.split(' / ')[0]) + 5);
  await reader.locator('.back').click();
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(await reader.locator('.count').innerText(), pausedCount);
  await page.locator('article').focus();
  await page.keyboard.press('Space');
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press(key);
    assert.equal(await reader.locator('.status').innerText(), 'Reading');
  }
  for (const control of ['.forward', '.back']) {
    await reader.locator(control).click();
    assert.equal(await reader.locator('.status').innerText(), 'Reading');
  }
  await page.locator('article').focus();
  await page.keyboard.press('Space');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');

  // Clicking, dragging, and keyboard navigation of the timeline preserve playback state.
  const timeline = reader.getByRole('slider', { name: 'Reading position' });
  const timelineBounds = await timeline.boundingBox();
  await timeline.click({ position: { x: timelineBounds.width / 2, y: timelineBounds.height / 2 } });
  const seekIndex = Number(await timeline.inputValue());
  assert.ok(seekIndex > 10 && seekIndex < 25, 'click seeks near the middle');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  await timeline.press('ArrowLeft');
  assert.equal(Number(await timeline.inputValue()), seekIndex - 1, 'timeline arrows move one word');
  await page.locator('article').focus();
  await page.keyboard.press('Space');
  const scrubbingBounds = await timeline.boundingBox();
  await page.mouse.move(scrubbingBounds.x + scrubbingBounds.width * 0.3, scrubbingBounds.y + scrubbingBounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(scrubbingBounds.x + scrubbingBounds.width * 0.6, scrubbingBounds.y + scrubbingBounds.height / 2);
  assert.equal(await reader.locator('.status').innerText(), 'Paused', 'scrubbing previews without advancing');
  const preview = await reader.locator('.word').innerText();
  await page.waitForTimeout(250);
  assert.equal(await reader.locator('.word').innerText(), preview);
  await page.mouse.up();
  assert.equal(await reader.locator('.status').innerText(), 'Reading', 'playing resumes after scrub');
  await page.locator('article').focus();
  await page.keyboard.press('Space');

  // Pointer dragging persists; page text entry and its arrow/space keys still work.
  const drag = await reader.locator('.brand').boundingBox();
  await page.mouse.move(drag.x + 25, drag.y + 10);
  await page.mouse.down();
  await page.mouse.move(850, 400, { steps: 5 });
  await page.mouse.up();
  const movedBounds = await reader.boundingBox();
  assert.ok(movedBounds.x < initialBounds.x - 100 && movedBounds.y > initialBounds.y + 100, 'reader moved');
  const resizeBounds = await reader.getByRole('button', { name: 'Resize reader' }).boundingBox();
  const wordFont = await reader.locator('.word').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  await page.mouse.move(resizeBounds.x + 10, resizeBounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(resizeBounds.x + 170, resizeBounds.y + 110, { steps: 5 });
  await page.mouse.up();
  const resizedBounds = await reader.boundingBox();
  assert.ok(resizedBounds.width >= movedBounds.width + 150 && resizedBounds.height >= movedBounds.height + 90);
  assert.ok(await reader.locator('.word').evaluate((element) => parseFloat(getComputedStyle(element).fontSize)) > wordFont);
  assert.equal(await reader.locator('.status').innerText(), 'Paused', 'resizing does not start playback');
  await reader.getByRole('button', { name: 'Resize reader' }).focus();
  await page.keyboard.press('ArrowLeft');
  const keyboardResize = await reader.boundingBox();
  assert.equal(keyboardResize.width, resizedBounds.width - 16);
  assert.equal(await reader.locator('.status').innerText(), 'Paused', 'resize keys do not trigger seek');
  await page.getByLabel('Notes').fill('Page remains usable');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByLabel('Notes').inputValue(), 'Page remains usable ');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  await page.screenshot({ path: 'test-results/reader.png', fullPage: true });

  // Reset clears the old session, captures a new highlight, and waits for Start.
  await reader.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await reader.locator('.word').innerText(), 'Select text');
  assert.equal(await reader.getByRole('button', { name: 'Start', exact: true }).isDisabled(), true);
  await page.locator('article').focus();
  await page.locator('#fresh').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  await page.locator('#fresh').dispatchEvent('pointerup');
  assert.equal(await reader.locator('.word').innerText(), 'The');
  assert.equal(await reader.locator('.status').innerText(), 'Ready — press Start');
  await reader.getByRole('button', { name: 'Start', exact: true }).click();
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();

  // The settings button opens a real extension page, which saves live preferences.
  const optionsPromise = context.waitForEvent('page');
  await reader.getByRole('button', { name: 'Open QuickRead settings' }).click();
  const options = await optionsPromise;
  await options.waitForURL(`chrome-extension://${id}/options.html`);
  await options.getByRole('button', { name: 'Save preferences' }).waitFor();
  await options.locator('[name=wpm]').fill('600');
  await options.locator('[name=jumpWords]').fill('3');
  await options.locator('[name=pause]').press('Control+Shift+P');
  await options.getByRole('button', { name: 'Save preferences' }).click();
  await options.getByText('Saved. Your preferences also apply to open readers.').waitFor();
  await options.screenshot({ path: 'test-results/settings.png', fullPage: true });
  await page.bringToFront();
  await page.waitForFunction(() => document.querySelector('quickread-reader')?.shadowRoot.querySelector('.speed input').value === '600');
  assert.equal(await reader.locator('.forward span').innerText(), '3');
  await page.locator('article').focus();
  await page.keyboard.press('Control+Shift+P');
  assert.equal(await reader.locator('.status').innerText(), 'Reading');
  await page.keyboard.press('Control+Shift+P');
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  await page.keyboard.press('Escape');
  assert.equal(await reader.count(), 0);

  // Restarting restores position and settings, without duplicating the panel.
  await select();
  await activate();
  await reader.waitFor();
  assert.equal(await reader.getByRole('spinbutton').inputValue(), '600');
  const restoredBounds = await reader.boundingBox();
  assert.ok(Math.abs(restoredBounds.x - movedBounds.x) < 1 && Math.abs(restoredBounds.y - movedBounds.y) < 1);
  await activate();
  assert.equal(await reader.count(), 1);
  assert.equal(await reader.locator('.status').innerText(), 'Ready — press Start');

  // Line mode fixes one highlighted word at the center and eases its faded context.
  const lineMode = reader.getByRole('button', { name: 'Line', exact: true });
  const wordMode = reader.getByRole('button', { name: 'Word', exact: true });
  await reader.getByRole('spinbutton').fill('60');
  await reader.getByRole('spinbutton').press('Tab');
  await lineMode.click();
  assert.equal(await lineMode.getAttribute('aria-pressed'), 'true');
  assert.equal(await reader.locator('.word').isVisible(), false);
  assert.equal(await reader.locator('.line-stream').textContent(), await page.locator('#source').textContent());
  assert.equal(await reader.locator('.status').innerText(), 'Ready — press Start');
  await timeline.press('Home');
  await timeline.press('ArrowRight');
  await timeline.press('ArrowRight');
  const focus = reader.locator('.line-focus');
  const assertCenteredFocus = async () => {
    const focusBounds = await focus.boundingBox();
    const viewportBounds = await reader.locator('.line-viewport').boundingBox();
    assert.ok(Math.abs(focusBounds.x + focusBounds.width / 2 - viewportBounds.x - viewportBounds.width / 2) < 1,
      'highlighted word remains at the fixed center');
    assert.equal(await reader.locator('.line-token[aria-current="true"]').count(), 1);
    assert.equal(await focus.innerText(), await reader.locator('.line-token[aria-current="true"]').innerText());
  };
  await assertCenteredFocus();
  assert.equal(await focus.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(143, 171, 212)');
  assert.ok(await reader.locator('.line-token').first().evaluate((element) => Number(getComputedStyle(element).opacity)) < 0.5,
    'neighboring text is faded');
  const lineOffset = () => reader.locator('.line-stream').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41);
  await reader.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('quickread-reader').shadowRoot
    .querySelector('.line-stream').getAnimations().some((animation) => animation.playState === 'running'), undefined, { polling: 'raf' });
  const motion = await reader.locator('.line-stream').evaluate(async (element) => {
    const samples = [];
    for (let frame = 0; frame < 3; frame++) {
      await new Promise(requestAnimationFrame);
      const root = element.getRootNode();
      const activeBounds = root.querySelector('.line-focus').getBoundingClientRect();
      const viewportBounds = root.querySelector('.line-viewport').getBoundingClientRect();
      samples.push({ x: new DOMMatrix(getComputedStyle(element).transform).m41,
        center: activeBounds.x + activeBounds.width / 2 - viewportBounds.x - viewportBounds.width / 2 });
    }
    return samples;
  });
  assert.ok(motion.every((sample) => Math.abs(sample.center) < 1), 'focus stays fixed throughout context animation');
  assert.ok(motion[2].x < motion[0].x, 'context moves smoothly right to left');
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();
  const linePosition = await reader.locator('.count').innerText();
  const frozenOffset = await lineOffset();
  await page.waitForTimeout(120);
  assert.ok(Math.abs(await lineOffset() - frozenOffset) < 1, 'context freezes on pause');
  await assertCenteredFocus();
  await wordMode.click();
  assert.equal(await reader.locator('.count').innerText(), linePosition);
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  assert.equal(await reader.locator('.word').isVisible(), true);
  await lineMode.click();
  await assertCenteredFocus();
  await reader.getByRole('button', { name: 'Resume', exact: true }).click();
  await wordMode.click();
  assert.equal(await reader.locator('.status').innerText(), 'Reading');
  assert.equal(await reader.locator('.count').innerText(), linePosition);
  await lineMode.click();
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();
  await timeline.press('End');
  assert.equal(await reader.locator('.count').innerText(), '34 / 34');
  await assertCenteredFocus();
  await timeline.press('Home');
  for (let index = 0; index < 10; index++) await timeline.press('ArrowRight');
  await reader.getByRole('button', { name: 'Resize reader' }).press('Shift+ArrowRight');
  await reader.getByRole('button', { name: 'Resize reader' }).press('Shift+ArrowRight');
  await reader.getByRole('button', { name: 'Resize reader' }).press('Shift+ArrowRight');
  await page.locator('article').focus();
  await assertCenteredFocus();
  await reader.screenshot({ path: 'test-results/reader-line.png' });
  await reader.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await reader.locator('.line-token').count(), 0, 'reset clears previous line text');
  await page.locator('article').focus();
  await select('#fresh');
  await page.locator('#fresh').dispatchEvent('pointerup');
  assert.equal(await reader.locator('.line-stream').textContent(), await page.locator('#fresh').textContent());
  assert.equal(await lineMode.getAttribute('aria-pressed'), 'true');
  assert.equal(await reader.locator('.status').innerText(), 'Ready — press Start');

  const worker = context.serviceWorkers().find((candidate) => candidate.url().startsWith(`chrome-extension://${id}/`));
  assert.ok(worker, 'MV3 service worker running');
  const data = await worker.evaluate(() => chrome.storage.local.get(null));
  assert.deepEqual(Object.keys(data).sort(), ['bindings', 'jumpWords', 'minorPauseMs', 'paragraphPauseMs', 'position', 'sentencePauseMs', 'wpm'].sort());
  assert.ok(!JSON.stringify(data).includes('Reading begins'));
  const command = await worker.evaluate(async () => (await chrome.commands.getAll()).find((item) => item.name === '_execute_action'));
  assert.ok(command, 'activation command declared');

  await reader.getByRole('button', { name: 'Close reader' }).click();
  await page.evaluate(() => window.getSelection().removeAllRanges());
  await page.locator('article').focus();
  await activate();
  await reader.waitFor();
  assert.equal(await reader.getByRole('button', { name: 'Word', exact: true }).getAttribute('aria-pressed'), 'true', 'mode is session-only');
  assert.equal(await reader.locator('.word').innerText(), 'Select text');
  assert.equal(await reader.getByRole('button', { name: 'Start', exact: true }).isDisabled(), true);
  await page.setViewportSize({ width: 320, height: 480 });
  await page.waitForFunction(() => {
    const bounds = document.querySelector('quickread-reader').getBoundingClientRect();
    return bounds.x >= 0 && bounds.y >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight;
  });
  const narrowBounds = await reader.boundingBox();
  assert.ok(narrowBounds.x >= 0 && narrowBounds.y >= 0
    && narrowBounds.x + narrowBounds.width <= 320 && narrowBounds.y + narrowBounds.height <= 480,
  'panel clamped inside narrow viewport');
  assert.deepEqual(errors, []);
  console.log(`Chrome ${context.browser().version()}: centered word highlight, faded context, eased context motion, Word/Line switching, pause, seeking, reset, resizing, colors, dragging, typing, settings, and storage checks passed.`);
  console.log(`Activation shortcut in test profile: ${command.shortcut || 'unassigned'}. Physical shortcut dispatch still needs a manual check.`);
  console.log('Screenshots: test-results/reader.png, test-results/reader-line.png, and test-results/settings.png');
} finally {
  await context?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
