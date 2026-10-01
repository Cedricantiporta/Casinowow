import { chromium } from 'playwright';
import fs from 'fs';
const shots = JSON.parse(fs.readFileSync('shots.json', 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 4 / 3 });
fs.mkdirSync('out', { recursive: true });
for (const [i, s] of shots.entries()) {
  await p.goto('file://' + process.cwd() + '/template.html');
  await p.evaluate(() => document.fonts.ready);
  const bottom = await p.evaluate((c) => window.build(c), s);
  await p.waitForFunction(() => [...document.images].every((im) => im.complete));
  await p.evaluate((src) => new Promise((r) => { const im = new Image(); im.onload = r; im.onerror = r; im.src = src; }), s.src);
  await p.waitForTimeout(800);
  const name = `out/cozy-casino-screenshot-${i + 1}.png`;
  await p.screenshot({ path: name });
  console.log(name, 'content bottom', bottom);
}
await b.close();
