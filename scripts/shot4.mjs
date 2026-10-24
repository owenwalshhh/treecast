import { chromium } from "playwright";
const DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// Open Sources via the info button (3rd rail button).
await page.locator(".rail button").nth(2).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${DIR}/ui-sources.png` });
// Measure credit centering vs viewport.
const box = await page.locator(".map-credit").boundingBox();
const mid = box ? box.x + box.width / 2 : null;
console.log("CREDIT_MID:" + mid + " VIEWPORT_MID:680");
console.log("ERRORS:" + JSON.stringify(errors));
await browser.close();
