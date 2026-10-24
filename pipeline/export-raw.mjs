/**
 * Treecast — export the RAW source files (data/raw) the pipeline needs.
 *
 * The git repo does NOT contain data/raw (the private MassGIS EJ + utility
 * CSVs). A fresh clone on another machine therefore can't run the equity step
 * until these are present. This bundles them into treecast-raw.tgz so you carry
 * them over ONCE.
 *
 * Cross-platform (tar on macOS + Windows 10+). Same command on both:
 *     npm run raw:export
 */

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARCHIVE = "treecast-raw.tgz";

if (!existsSync(join(ROOT, "data", "raw"))) {
  console.error("No data/raw folder to export.");
  process.exit(1);
}

console.log("Archiving data/raw -> " + ARCHIVE + " …");
execFileSync("tar", ["-czf", ARCHIVE, "-C", join(ROOT, "data"), "raw"], {
  cwd: ROOT,
  stdio: "inherit",
});

const mb = (statSync(join(ROOT, ARCHIVE)).size / 1e6).toFixed(2);
console.log(`\nDone. Wrote ${ARCHIVE} (${mb} MB).`);
console.log("Copy it to the other machine's treecast/ folder, then run: npm run raw:import");
