/**
 * Treecast — PARALLEL bake runner (cross-platform, Node).
 *
 *   node pipeline/bake-parallel.mjs                # all towns, 3 at a time
 *   node pipeline/bake-parallel.mjs --jobs 4       # 4 at a time
 *   node pipeline/bake-parallel.mjs --jobs 4 --town Boston --town Lynn
 *   node pipeline/bake-parallel.mjs --force        # re-bake built towns
 *
 * Each town is independent, so this bakes several at once to cut wall-clock on
 * a high-memory machine. The per-town work is the bbox/buildings/roads Overture
 * pulls (network-bound) plus local candidates/shade — running a few in parallel
 * overlaps the network waits.
 *
 * It spawns `bake.mjs --town <name>` as separate processes (so each gets its
 * own DuckDB), honoring $env:DUCKDB and $env:LEAD_CSV. The region EJ + LEAD
 * files are built FIRST (so candidate joins see them), then towns fan out, then
 * town-outlines + index run once at the end.
 *
 * TUNING: each concurrent job holds a DuckDB doing an S3 scan (memory-heavy).
 * Start with --jobs 3; raise it only if memory is comfortable. Too many at once
 * can exhaust RAM or get throttled by S3.
 */

import { execFileSync, spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PIPE = join(ROOT, "pipeline");
const RAW = join(ROOT, "data", "raw");
const DATA = join(ROOT, "public", "data");

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// --- args ---
const args = process.argv.slice(2);
let jobs = 2, force = false, smallFirst = true;
const requested = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--jobs") jobs = Math.max(1, parseInt(args[++i], 10) || 2);
  else if (args[i] === "--force") force = true;
  else if (args[i] === "--no-small-first") smallFirst = false;
  else if (args[i] === "--town") requested.push(args[++i]);
  else if (args[i].startsWith("--town=")) requested.push(args[i].slice(7));
}

const townDefs = JSON.parse(readFileSync(join(PIPE, "towns.json"), "utf8")).towns;
const areaOf = Object.fromEntries(townDefs.map((t) => [t.name, t.areaSqMi ?? 999]));
let buildList = townDefs.map((t) => t.name);
if (smallFirst) buildList = [...buildList].sort((a, b) => areaOf[a] - areaOf[b]);
let towns = requested.length ? requested : buildList;

// Skip already-built towns unless --force.
if (!force) {
  towns = towns.filter((name) => {
    const slug = slugify(name);
    const chelseaLegacy = slug === "chelsea" && existsSync(join(DATA, "candidate-sites.geojson")) && !existsSync(join(DATA, "chelsea"));
    const built = chelseaLegacy || existsSync(join(DATA, slug, "candidate-sites.geojson"));
    if (built) console.log(`-- skip ${name} (already built)`);
    return !built;
  });
}

// Region EJ + LEAD FIRST so each town's candidate join can use them.
if (existsSync(join(RAW, "ej", "ej-blockgroups.geojson"))) {
  console.log("== region EJ block groups ==");
  try { execFileSync("node", [join(PIPE, "06-region.mjs")], { stdio: "inherit" }); } catch (e) { console.error("region:", e.message); }
  if (process.env.LEAD_CSV) {
    console.log("== LEAD energy burden ==");
    try { execFileSync("node", [join(PIPE, "08-lead.mjs")], { stdio: "inherit" }); } catch (e) { console.error("lead:", e.message); }
  }
}

// Pre-download Overture ONCE for the whole region before fanning out, so every
// town child reads the local parquet cache instead of racing on S3.
console.log("== prefetch Overture (one download for all towns) ==");
try { execFileSync("node", [join(PIPE, "bake.mjs"), "--prefetch-only"], { stdio: "inherit", env: process.env }); }
catch (e) { console.error("prefetch:", e.message, "— towns will fall back to S3."); }

// Fan out town bakes, `jobs` at a time.
console.log(`\n== baking ${towns.length} town(s), ${jobs} at a time ==`);
const results = { ok: [], fail: [] };

function bakeTown(name) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(PIPE, "bake.mjs"), "--town", name, "--town-only"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let tail = "";
    const cap = (d) => { tail = (tail + d.toString()).slice(-400); };
    child.stdout.on("data", cap);
    child.stderr.on("data", cap);
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`  ok ${name}`); results.ok.push(name);
        // Rebuild the index now so this town appears in the app's picker live.
        try { execFileSync("node", [join(PIPE, "build-index.mjs")], { stdio: "ignore" }); } catch {}
      }
      else { console.error(`  !! ${name} failed (code ${code}):\n${tail.trim()}`); results.fail.push(name); }
      resolve();
    });
  });
}

async function run() {
  let i = 0;
  async function worker() {
    while (i < towns.length) {
      const name = towns[i++];
      console.log(`>> start ${name}`);
      await bakeTown(name);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, towns.length) }, worker));

  // Finalize: town outlines + public index, once.
  if (existsSync(join(RAW, "ej", "ej-blockgroups.geojson"))) {
    try { execFileSync("node", [join(PIPE, "07-town-outlines.mjs")], { stdio: "inherit" }); } catch (e) { console.error("outlines:", e.message); }
  }
  try { execFileSync("node", [join(PIPE, "build-index.mjs")], { stdio: "inherit" }); } catch {}

  console.log(`\n== done: ok=${results.ok.length} fail=${results.fail.length} ==`);
  if (results.fail.length) console.log(`   failed: ${results.fail.join(", ")} (re-run to retry — resumable)`);
  process.exit(results.fail.length ? 1 : 0);
}
run();
