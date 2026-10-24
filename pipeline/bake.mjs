/**
 * Treecast — cross-platform bake runner (Node, no bash/jq/sed needed).
 *
 * Does exactly what pipeline/run.sh + bake-all.sh do, but in pure Node so it
 * runs the SAME on macOS and Windows:
 *     node pipeline/bake.mjs                 # all towns in pipeline/towns.json
 *     node pipeline/bake.mjs --town Everett  # one town
 *     node pipeline/bake.mjs --force         # re-bake already-built towns
 *
 * For each town, in order: derive bbox (00), boundary (00b), buildings (01),
 * roads (02), equity (03), candidates (04), shade (05). Then rebuilds the
 * region EJ files (06, 07) and the public index. Sequential, so memory stays
 * bounded. Resumable: a town with candidate-sites.geojson is skipped unless
 * --force.
 *
 * Requires: duckdb on PATH (or DUCKDB=/path), node. NO jq, sed, or bash.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PIPE = join(ROOT, "pipeline");
const RAW = join(ROOT, "data", "raw");
const DATA = join(ROOT, "public", "data");
const DUCKDB = process.env.DUCKDB || "duckdb";
const MARGIN = process.env.MARGIN || "0.004";

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// --- args ---
const args = process.argv.slice(2);
let force = false;
const requested = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--force") force = true;
  else if (args[i] === "--town") requested.push(args[++i]);
  else if (args[i].startsWith("--town=")) requested.push(args[i].slice(7));
}

const buildList = JSON.parse(readFileSync(join(PIPE, "towns.json"), "utf8")).towns.map((t) => t.name);
const towns = requested.length ? requested : buildList;

/** Render a SQL template's ${VARS} and run it through duckdb via stdin. */
function runSql(file, vars) {
  let sql = readFileSync(join(PIPE, file), "utf8");
  for (const [k, v] of Object.entries(vars)) {
    sql = sql.split("${" + k + "}").join(String(v));
  }
  // duckdb reads the SQL from stdin — portable, no temp file needed.
  execFileSync(DUCKDB, [], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
}

function featureCount(p) {
  try { return JSON.parse(readFileSync(p, "utf8")).features.length; } catch { return 0; }
}

function buildOne(city) {
  const slug = slugify(city);
  const out = join(DATA, slug);
  mkdirSync(out, { recursive: true });
  console.log(`\n#### ${city} -> public/data/${slug}/`);

  // 0) bbox + center.
  console.log("  [0/6] bbox…");
  const rawArea = join(tmpdir(), `tc-area-${slug}.json`);
  runSql("00-derive-area.sql", { CITY: city, MARGIN, OUT: rawArea.replace(/\\/g, "/") });
  if (!existsSync(rawArea)) { console.error(`  !! no boundary for ${city}`); return false; }
  const area = JSON.parse(readFileSync(rawArea, "utf8"));
  writeFileSync(join(out, "area.json"), JSON.stringify(area, null, 2));
  const { west, south, east, north } = area.bbox;
  const bnd = join(out, "city-boundary.geojson");

  // 1) boundary.
  console.log("  [1/6] boundary…");
  runSql("00b-boundary.sql", { CITY: city, OUT: bnd.replace(/\\/g, "/") });

  // 2) buildings, clipped.
  console.log("  [2/6] buildings…");
  runSql("01-buildings.sql", {
    WEST: west, SOUTH: south, EAST: east, NORTH: north,
    BOUNDARY: bnd.replace(/\\/g, "/"), OUT: join(out, "buildings.geojson").replace(/\\/g, "/"),
  });

  // 3) roads, clipped.
  console.log("  [3/6] roads…");
  runSql("02-roads.sql", {
    WEST: west, SOUTH: south, EAST: east, NORTH: north,
    BOUNDARY: bnd.replace(/\\/g, "/"), OUT: join(out, "roads.geojson").replace(/\\/g, "/"),
  });

  // 4) equity.
  console.log("  [4/6] equity…");
  runSql("03-equity-summary.sql", {
    EJ_CSV: join(RAW, "ej", "data.csv").replace(/\\/g, "/"),
    UTIL_CSV: join(RAW, "utilities", "data.csv").replace(/\\/g, "/"),
    TOWN_EJ: area.town_name_ej, TOWN_UTIL: area.town_name_utility,
    OUT: join(out, "equity-summary.json").replace(/\\/g, "/"),
  });

  // 5) candidates + shade (read the town folder via env var).
  const env = { ...process.env, TREECAST_TOWN_DIR: out };
  console.log("  [5/6] candidates…");
  execFileSync("node", [join(PIPE, "04-candidates.mjs")], { env, stdio: "inherit" });
  console.log("  [6/6] shade…");
  execFileSync("node", [join(PIPE, "05-shade.mjs")], { env, stdio: "inherit" });

  console.log(`  ok ${city}: ${featureCount(join(out, "buildings.geojson"))} buildings, ${featureCount(join(out, "candidate-sites.geojson"))} candidates`);
  return true;
}

// --- run ---
let built = 0, skipped = 0, failed = 0;
for (const city of towns) {
  const slug = slugify(city);
  const chelseaLegacy = slug === "chelsea" && existsSync(join(DATA, "candidate-sites.geojson")) && !existsSync(join(DATA, "chelsea"));
  const already = chelseaLegacy || existsSync(join(DATA, slug, "candidate-sites.geojson"));
  if (!force && already) { console.log(`-- skip ${city} (already built)`); skipped++; continue; }
  try { buildOne(city) ? built++ : failed++; } catch (e) { console.error(`  !! ${city}: ${e.message}`); failed++; }
}

// Region EJ + outlines + index (best-effort; need the raw EJ geometry present).
try {
  if (existsSync(join(RAW, "ej", "ej-blockgroups.geojson"))) {
    console.log("\n== region EJ + outlines ==");
    execFileSync("node", [join(PIPE, "06-region.mjs")], { stdio: "inherit" });
    execFileSync("node", [join(PIPE, "07-town-outlines.mjs")], { stdio: "inherit" });
  } else {
    console.log("\n(skipping region step — data/raw/ej/ej-blockgroups.geojson missing; run data/raw/ej/fetch-geometry.mjs)");
  }
} catch (e) { console.error("region step:", e.message); }
try { execFileSync("node", [join(PIPE, "build-index.mjs")], { stdio: "inherit" }); } catch {}

console.log(`\n== done: built=${built} skipped=${skipped} failed=${failed} ==`);
process.exit(failed ? 1 : 0);
