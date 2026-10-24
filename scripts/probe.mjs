import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /Area/ }).first().click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: /Select an area/i }).click();
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  // maplibre map isn't global; inspect DOM canvas layers via any debug hook.
  // Fallback: read computed pixel darkness at center.
  const c = document.querySelector("canvas");
  return { hasCanvas: !!c, w: c?.width, h: c?.height };
});
console.log("INFO:" + JSON.stringify(info));
await browser.close();
