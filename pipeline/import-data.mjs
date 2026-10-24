/**
 * Treecast — import baked town data.
 *
 * Unpacks treecast-data.tgz (made by `npm run data:export` on another machine)
 * back into public/data, so the app shows every town baked over there.
 *
 * Cross-platform: uses `tar` (macOS + Windows 10+). Same command on both:
 *     npm run data:import
 *
 * It MERGES into public/data (does not wipe it), so a town already present is
 * overwritten by the incoming copy and others are left alone.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARCHIVE = "treecast-data.tgz";

if (!existsSync(join(ROOT, ARCHIVE))) {
  console.error(
    `No ${ARCHIVE} found at the repo root.\n` +
      "Copy it here from the machine where you ran `npm run data:export`, then retry.",
  );
  process.exit(1);
}

mkdirSync(join(ROOT, "public"), { recursive: true });

// -x extract, -z gzip, -f file; -C public so the archive's "data/" lands as
// public/data/. Existing files are overwritten; untouched ones remain.
console.log(`Unpacking ${ARCHIVE} -> public/data …`);
execFileSync("tar", ["-xzf", join(ROOT, ARCHIVE), "-C", join(ROOT, "public")], {
  cwd: ROOT,
  stdio: "inherit",
});

console.log("\nDone. public/data now holds the imported towns.");
console.log("Start the app with `npm run dev` — the town picker lists them all.");
