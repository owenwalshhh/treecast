import { chromium } from "playwright";
const DIR = process.env.SHOT_DIR || "/tmp";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://127.0.0.1:5055/", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${DIR}/ui-default.png` });
// Run optimize so the table button + plan appear.
await page.getByRole("button", { name: /^Optimize$/ }).click();
await page.waitForTimeout(1600);
await page.screenshot({ path: `${DIR}/ui-plan.png` });
// Turn shade on.
await page.locator(".rail button").first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${DIR}/ui-shade.png` });
console.log("ERRORS:" + JSON.stringify(errors));
await browser.close();
