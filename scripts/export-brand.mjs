import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Raster exports from the original imagegen artwork; no external image service.
const brandPath = resolve('assets/brand');
const iconPath = resolve('public/icons');
await Promise.all([mkdir(brandPath, { recursive: true }), mkdir(iconPath, { recursive: true })]);
const source = await readFile(resolve(brandPath, 'quickread-source.png'));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : chromium.executablePath()),
  headless: true,
});

try {
  const page = await browser.newPage();
  const exports = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const makeCanvas = (width, height = width) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      return { canvas, context };
    };
    const original = makeCanvas(image.width, image.height);
    original.context.drawImage(image, 0, 0);
    const pixels = original.context.getImageData(0, 0, image.width, image.height).data;
    if (pixels[3] !== 0) throw new Error('The source must have a transparent background.');
    let left = image.width, top = image.height, right = 0, bottom = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (pixels[(y * image.width + x) * 4 + 3] > 8) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    }
    const width = right - left + 1, height = bottom - top + 1;
    const drawIcon = (context, x, y, size) => {
      const scale = size / Math.max(width, height);
      context.drawImage(image, left, top, width, height,
        x + (size - width * scale) / 2, y + (size - height * scale) / 2,
        width * scale, height * scale);
    };
    const output = [];
    const save = (name, canvas, type = 'image/png') => {
      output.push({ name, width: canvas.width, height: canvas.height,
        data: canvas.toDataURL(type, 0.96).split(',')[1] });
    };
    for (const size of [16, 32, 48, 128, 256, 512, 1024]) {
      const { canvas, context } = makeCanvas(size);
      // Chrome recommends 16px transparent padding on each side of a 128px icon.
      const padding = size >= 128 ? size / 8 : 0;
      drawIcon(context, padding, padding, size - padding * 2);
      save(`quickread-${size}.png`, canvas);
      if (size === 1024) {
        save('quickread.webp', canvas, 'image/webp');
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = '#f6f2e9';
        context.fillRect(0, 0, size, size);
        save('quickread.jpg', canvas, 'image/jpeg');
      }
    }
    for (const theme of ['light', 'dark']) {
      const { canvas, context } = makeCanvas(1600, 400);
      drawIcon(context, 40, 60, 280);
      context.fillStyle = theme === 'light' ? '#17191f' : '#f6f2e9';
      context.font = '600 186px "Segoe UI", sans-serif';
      context.textBaseline = 'middle';
      context.fillText('QuickRead', 382, 195);
      save(`quickread-wordmark-${theme}.png`, canvas);
    }
    for (const [width, height, name] of [[440, 280, 'store-small-440x280.png'], [1400, 560, 'store-marquee-1400x560.png']]) {
      const { canvas, context } = makeCanvas(width, height);
      context.fillStyle = '#17191f';
      context.fillRect(0, 0, width, height);
      if (width === 440) {
        drawIcon(context, 145, 30, 150);
        context.fillStyle = '#f6f2e9';
        context.font = '600 36px "Segoe UI", sans-serif';
        context.textAlign = 'center';
        context.fillText('QuickRead', 220, 230);
      } else {
        drawIcon(context, 104, 112, 336);
        context.fillStyle = '#f6f2e9';
        context.font = '600 104px "Segoe UI", sans-serif';
        context.fillText('QuickRead', 520, 278);
        context.fillStyle = '#8fabd4';
        context.font = '400 34px "Segoe UI", sans-serif';
        context.fillText('One word at a time.', 526, 350);
      }
      save(name, canvas);
    }
    const { canvas, context } = makeCanvas(1200, 720);
    context.fillStyle = '#f6f2e9';
    context.fillRect(0, 0, 600, 720);
    context.fillStyle = '#17191f';
    context.fillRect(600, 0, 600, 720);
    for (const x of [0, 600]) {
      drawIcon(context, x + 150, 60, 300);
      context.fillStyle = x === 0 ? '#17191f' : '#f6f2e9';
      context.font = '600 48px "Segoe UI", sans-serif';
      context.textAlign = 'center';
      context.fillText('QuickRead', x + 300, 430);
      context.font = '14px "Segoe UI", sans-serif';
      for (const [index, size] of [16, 32, 48, 128].entries()) {
        const iconX = x + 72 + index * 120;
        drawIcon(context, iconX + (96 - size) / 2, 510, size);
        context.fillText(`${size} px`, iconX + 48, 670);
      }
    }
    save('preview.png', canvas);
    return output;
  }, source.toString('base64'));

  for (const item of exports) {
    const bytes = Buffer.from(item.data, 'base64');
    await writeFile(resolve(brandPath, item.name), bytes);
    const size = Number(item.name.match(/^quickread-(\d+)\.png$/)?.[1]);
    if ([16, 32, 48, 128].includes(size)) {
      assert.equal(item.width, size);
      assert.equal(item.height, size);
      await writeFile(resolve(iconPath, `icon-${size}.png`), bytes);
    }
  }

  // ICO is a convenience export for websites/desktop branding; Chrome uses PNG.
  const sizes = [16, 32, 48, 128, 256];
  const pngs = await Promise.all(sizes.map((size) => readFile(resolve(brandPath, `quickread-${size}.png`))));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(pngs[index].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += pngs[index].length;
  });
  await writeFile(resolve(brandPath, 'quickread.ico'), Buffer.concat([header, ...pngs]));
  console.log(`Exported ${exports.length + 1} brand files and four packaged Chrome icons.`);
} finally {
  await browser.close();
}
