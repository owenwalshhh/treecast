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

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute, resolve } from "node:path";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PIPE = join(ROOT, "pipeline");
const RAW = join(ROOT, "data", "raw");
const DATA = join(ROOT, "public", "data");
// Resolve the DuckDB binary. A relative path (e.g. "duckdb\duckdb.exe") is
// resolved against the current working directory so Windows can find it even
// when the bake runs from the project folder. A bare "duckdb" is left as-is so
// PATH lookup still works.
const rawDuck = process.env.DUCKDB || "duckdb";
const DUCKDB =
  rawDuck !== "duckdb" && !isAbsolute(rawDuck) && (rawDuck.includes("/") || rawDuck.includes("\\"))
    ? resolve(process.cwd(), rawDuck)
    : rawDuck;
const MARGIN = process.env.MARGIN || "0.004";

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// --- args ---
const args = process.argv.slice(2);
let force = false;
let townOnly = false; // when set, skip region prep + finalize (parallel wrapper owns those)
let verbose = false; // when set, print a heartbeat + DuckDB progress bar for long steps
let smallFirst = false; // when set, bake towns smallest-area-first (quick wins before slow Boston)
const requested = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--force") force = true;
  else if (args[i] === "--town-only") townOnly = true;
  else if (args[i] === "--verbose" || args[i] === "-v") verbose = true;
  else if (args[i] === "--small-first") smallFirst = true;
  else if (args[i] === "--town") requested.push(args[++i]);
  else if (args[i].startsWith("--town=")) requested.push(args[i].slice(7));
}

const townDefs = JSON.parse(readFileSync(join(PIPE, "towns.json"), "utf8")).towns;
const areaOf = Object.fromEntries(townDefs.map((t) => [t.name, t.areaSqMi ?? 999]));
let buildListNames = townDefs.map((t) => t.name);
if (smallFirst) buildListNames = [...buildListNames].sort((a, b) => areaOf[a] - areaOf[b]);

const towns = requested.length ? requested : buildListNames;
if (smallFirst && !requested.length) {
  console.log("small-first order: " + towns.map((t) => `${t} (${areaOf[t]}mi²)`).join(", "));
}

/** Render a SQL template's ${VARS} and run it through duckdb via stdin. */
// Does this DuckDB accept `geometry_always_xy`? v2.0 REQUIRES it for GDAL
// exports with an SRS and still enforces the axis-order guard; v1.x does not
// know the setting. Probe once and cache, so the same SQL runs on both.
let _xySupported = null;
function supportsXy() {
  if (_xySupported !== null) return _xySupported;
  try {
    execFileSync(DUCKDB, [], {
      input: "INSTALL spatial; LOAD spatial; SET geometry_always_xy = true; SELECT 1;",
      stdio: ["pipe", "ignore", "ignore"],
    });
    _xySupported = true;
  } catch {
    _xySupported = false;
  }
  return _xySupported;
}

function runSql(file, vars) {
  let sql = readFileSync(join(PIPE, file), "utf8");
  for (const [k, v] of Object.entries(vars)) {
    sql = sql.split("${" + k + "}").join(String(v));
  }
  // On DuckDB v2.0+, enable xy axis order so GDAL GeoJSON export is correct and
  // the axis-order guard does not error. Injected after the spatial LOAD.
  if (supportsXy() && /LOAD spatial;/.test(sql)) {
    sql = sql.replace(/LOAD spatial;/, "LOAD spatial;\nSET geometry_always_xy = true;");
  }
  // In verbose mode, turn on DuckDB's live progress bar so a long S3 scan
  // (buildings/roads) shows a running percentage instead of silence.
  if (verbose) {
    sql = "PRAGMA enable_progress_bar;\nPRAGMA enable_print_progress_bar;\n" + sql;
  }
  // duckdb reads the SQL from stdin — portable, no temp file needed.
  if (!verbose) {
    execFileSync(DUCKDB, [], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
    return;
  }
  // Verbose: run DuckDB with its progress bar (prints live % from DuckDB's own
  // process) AND a Node heartbeat. Because execFileSync blocks Node's event
  // loop, the heartbeat timer can't fire during it — so use the synchronous
  // spawnSync but let DuckDB's inherited stderr stream the progress bar itself.
  const started = Date.now();
  process.stdout.write(`      ${new Date().toLocaleTimeString()} running ${file} — DuckDB progress bar on, Ctrl+C-safe\n`);
  const r = spawnSync(DUCKDB, [], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
  const secs = Math.round((Date.now() - started) / 1000);
  process.stdout.write(`      done ${file} (${secs}s)\n`);
  if (r.status !== 0) {
    throw new Error(`${file} exited ${r.status}${r.error ? ": " + r.error.message : ""}`);
  }
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
// Region EJ + LEAD FIRST, so each town's candidate join can attach block-group
// equity and tract energy burden. Needs the raw EJ geometry present.
const haveEj = existsSync(join(RAW, "ej", "ej-blockgroups.geojson"));
if (haveEj && !townOnly) {
  console.log("== region EJ block groups ==");
  try { execFileSync("node", [join(PIPE, "06-region.mjs")], { stdio: "inherit" }); } catch (e) { console.error("region:", e.message); }
  if (process.env.LEAD_CSV) {
    console.log("== LEAD energy burden ==");
    try { execFileSync("node", [join(PIPE, "08-lead.mjs")], { stdio: "inherit" }); } catch (e) { console.error("lead:", e.message); }
  } else {
    console.log("(no LEAD_CSV — energy burden skipped; set LEAD_CSV to the 'MA AMI Census Tracts 2022.csv' to include it)");
  }
} else {
  console.log("(no data/raw/ej/ej-blockgroups.geojson — run data/raw/ej/fetch-geometry.mjs for regional equity)");
}

for (const city of towns) {
  const slug = slugify(city);
  const chelseaLegacy = slug === "chelsea" && existsSync(join(DATA, "candidate-sites.geojson")) && !existsSync(join(DATA, "chelsea"));
  const already = chelseaLegacy || existsSync(join(DATA, slug, "candidate-sites.geojson"));
  if (!force && already) { console.log(`-- skip ${city} (already built)`); skipped++; continue; }
  let ok = false;
  try { ok = buildOne(city); ok ? built++ : failed++; } catch (e) { console.error(`  !! ${city}: ${e.message}`); failed++; }
  // Rebuild the index after EACH town so a finished town appears in the app's
  // picker right away (refresh the dev server), instead of only at run's end.
  if (ok) {
    try { execFileSync("node", [join(PIPE, "build-index.mjs")], { stdio: "inherit" }); } catch {}
  }
}

// Town outlines (for the overview) + the public index, AFTER towns are built.
if (!townOnly) {
  if (haveEj) {
    try { execFileSync("node", [join(PIPE, "07-town-outlines.mjs")], { stdio: "inherit" }); } catch (e) { console.error("outlines:", e.message); }
  }
  try { execFileSync("node", [join(PIPE, "build-index.mjs")], { stdio: "inherit" }); } catch {}
}

console.log(`\n== done: built=${built} skipped=${skipped} failed=${failed} ==`);
process.exit(failed ? 1 : 0);
