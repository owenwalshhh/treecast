/**
 * Treecast — import the RAW source files (data/raw) into a fresh clone.
 *
 * Unpacks treecast-raw.tgz (made by `npm run raw:export`) into data/raw, so the
 * pipeline's equity step can run on this machine.
 *
 * Cross-platform (tar on macOS + Windows 10+). Same command on both:
 *     npm run raw:import
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARCHIVE = "treecast-raw.tgz";

if (!existsSync(join(ROOT, ARCHIVE))) {
  console.error(
    `No ${ARCHIVE} found at the repo root.\n` +
      "Copy it here from the machine where you ran `npm run raw:export`, then retry.",
  );
  process.exit(1);
}

mkdirSync(join(ROOT, "data"), { recursive: true });
console.log(`Unpacking ${ARCHIVE} -> data/raw …`);
execFileSync("tar", ["-xzf", join(ROOT, ARCHIVE), "-C", join(ROOT, "data")], {
  cwd: ROOT,
  stdio: "inherit",
});

console.log("\nDone. data/raw is in place. You can now run `npm run bake:bg`.");
