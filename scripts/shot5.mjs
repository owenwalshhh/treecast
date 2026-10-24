import { chromium } from "playwright";
const DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
// Open Area section, click "Select an area".
await page.getByRole("button", { name: /Area/ }).first().click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /Select an area/i }).click();
await page.waitForTimeout(300);
// Click three points to form a triangle on the map, then hover to show rubber + tip.
const canvas = page.locator("canvas").first();
await canvas.click({ position: { x: 650, y: 350 } });
await canvas.click({ position: { x: 820, y: 360 } });
await canvas.click({ position: { x: 760, y: 500 } });
await page.mouse.move(700, 430);
await page.waitForTimeout(400);
await page.screenshot({ path: `${DIR}/ui-draw.png` });
console.log("ERRORS:" + JSON.stringify(errors));
await browser.close();
