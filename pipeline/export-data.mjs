/**
 * Treecast — export baked town data.
 *
 * Archives the entire public/data folder (all baked town folders + the region
 * EJ layer) into ONE portable file: treecast-data.tgz at the repo root.
 *
 * Cross-platform: uses `tar`, which ships on macOS and on Windows 10+ (as the
 * bundled bsdtar `tar.exe`). The SAME command works on both:
 *     npm run data:export
 *
 * Move the resulting treecast-data.tgz to the other machine, then run
 * `npm run data:import` there.
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARCHIVE = "treecast-data.tgz";

if (!existsSync(join(ROOT, "public", "data"))) {
  console.error("No public/data folder to export. Bake some towns first.");
  process.exit(1);
}

// -c create, -z gzip, -f file; -C sets the base dir so paths inside the
// archive start at "data/" (not an absolute path). Clean on both OSes.
console.log("Archiving public/data -> " + ARCHIVE + " …");
execFileSync("tar", ["-czf", ARCHIVE, "-C", join(ROOT, "public"), "data"], {
  cwd: ROOT,
  stdio: "inherit",
});

const mb = (statSync(join(ROOT, ARCHIVE)).size / 1e6).toFixed(1);
console.log(`\nDone. Wrote ${ARCHIVE} (${mb} MB) at the repo root.`);
console.log("Copy it to the other machine's treecast/ folder, then run: npm run data:import");
