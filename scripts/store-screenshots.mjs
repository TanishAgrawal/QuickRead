import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

// Capture the packaged extension using original sample text and a disposable profile.
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>QuickRead field notes</title><style>
body{margin:0;background:#f5f2eb;color:#292b30;font:21px/1.85 Georgia,serif}
article{max-width:590px;margin:84px 80px}small{font:12px system-ui;letter-spacing:3px;color:#716a60}
h1{font:52px/1.1 Georgia;margin:24px 0 32px}p{margin:0 0 24px}
footer{font:14px/1.6 system-ui;color:#716a60;margin-top:44px}
</style></head><body><article><small>THE QUICKREAD FIELD NOTES</small>
<h1>Make room for the words.</h1><section id="source">
<p>Reading begins with attention. A small pause gives a sentence room to land,
and a steady rhythm lets each word take its place.</p>
<p>Keep the page in view while you explore a different pace. Follow one word at
a time, or keep neighboring words nearby for context.</p>
<p>You can pause, rewind, change the speed, or return to the page whenever you like.</p>
</section><footer>Highlight a passage. Open QuickRead. Press Start when you are ready.</footer>
</article></body></html>`;
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(fixture);
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
let context;
try {
  context = await chromium.launchPersistentContext('', {
    executablePath: process.env.CHROME_PATH || (process.platform === 'win32'
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : chromium.executablePath()),
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--enable-unsafe-extension-debugging'],
  });
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: resolve('.output/chrome-mv3') });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#source').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  });
  const { targetInfos } = await cdp.send('Target.getTargets', { filter: [{ type: 'tab', exclude: false }] });
  const target = targetInfos.find((candidate) => candidate.url === page.url());
  assert.ok(target, 'sample tab found');
  await cdp.send('Extensions.triggerAction', { id, targetId: target.targetId });
  const reader = page.locator('quickread-reader');
  await reader.waitFor();
  await reader.getByRole('button', { name: 'Start', exact: true }).click();
  await reader.getByRole('button', { name: 'Pause', exact: true }).click();
  const timeline = reader.getByRole('slider', { name: 'Reading position' });
  await timeline.press('Home');
  for (let index = 0; index < 6; index++) await timeline.press('ArrowRight');
  const header = await reader.locator('.brand').boundingBox();
  await page.mouse.move(header.x + 30, header.y + 10);
  await page.mouse.down();
  await page.mouse.move(835, 230, { steps: 5 });
  await page.mouse.up();
  await page.mouse.move(1240, 760);
  assert.equal(await reader.locator('.status').innerText(), 'Paused');
  const destination = resolve('assets/brand');
  await mkdir(destination, { recursive: true });
  await page.screenshot({ path: resolve(destination, 'store-word-1280x800.png') });
  await reader.getByRole('button', { name: 'Line', exact: true }).click();
  assert.equal(await reader.locator('.line-focus').innerText(), await reader.locator('.line-token[aria-current="true"]').innerText());
  await page.mouse.move(1240, 760);
  await page.screenshot({ path: resolve(destination, 'store-line-1280x800.png') });
  const options = await context.newPage();
  await options.goto(`chrome-extension://${id}/options.html`);
  await options.getByRole('button', { name: 'Save preferences' }).waitFor({ state: 'visible' });
  await options.waitForFunction(() => !document.querySelector('#save').disabled);
  await options.screenshot({ path: resolve(destination, 'store-settings-1280x800.png') });
  console.log('Captured current Word, Line, and settings screenshots at 1280×800.');
} finally {
  await context?.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
