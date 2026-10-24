/**
 * Treecast pipeline: rebuild public/data/towns.json from whatever town folders
 * exist under public/data/. Each built town has its own folder
 * public/data/<slug>/ written by run.sh; the legacy Chelsea files may still sit
 * flat at public/data/ (base "/data").
 *
 * For each built town we record: name, slug, data base path, building count,
 * candidate count, and the total folder size in bytes (greater-boston R2.3).
 *
 * The town ORDER follows pipeline/towns.json (the MAPC Inner Core build list),
 * so the picker lists them in a stable, intentional order.
 *
 * Run: node pipeline/build-index.mjs   (run.sh calls this at the end)
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "public", "data");
const PIPE = join(ROOT, "pipeline");

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Count features in a GeoJSON file, or 0 if missing/unreadable. */
function featureCount(path) {
  try {
    const gj = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(gj.features) ? gj.features.length : 0;
  } catch {
    return 0;
  }
}

/** Total bytes of every file directly in a folder. */
function folderBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      const st = statSync(p);
      if (st.isFile()) total += st.size;
    } catch {}
  }
  return total;
}

// Build order from the MAPC list.
const buildList = JSON.parse(readFileSync(join(PIPE, "towns.json"), "utf8"));
const order = buildList.towns.map((t) => ({ name: t.name, slug: slugify(t.name) }));

// Legacy Chelsea: flat files at public/data/ (base "/data"), not a subfolder.
const chelseaLegacy =
  existsSync(join(DATA, "candidate-sites.geojson")) &&
  !existsSync(join(DATA, "chelsea"));

const towns = [];
for (const { name, slug } of order) {
  let base, dir;
  if (slug === "chelsea" && chelseaLegacy) {
    base = "/data";
    dir = DATA;
  } else {
    dir = join(DATA, slug);
    base = `/data/${slug}`;
  }
  if (!existsSync(join(dir, "candidate-sites.geojson"))) continue; // not built yet

  towns.push({
    name,
    slug,
    base,
    buildings: featureCount(join(dir, "buildings.geojson")),
    candidates: featureCount(join(dir, "candidate-sites.geojson")),
    bytes: slug === "chelsea" && chelseaLegacy ? folderBytes(dir) : folderBytes(dir),
  });
}

const index = {
  source: buildList.source,
  subregion: buildList.subregion,
  note:
    "Only towns the pipeline has built appear here. base points at each town's data folder; Chelsea may use the legacy flat /data path.",
  towns,
};

writeFileSync(join(DATA, "towns.json"), JSON.stringify(index, null, 2));

const totalMB = (
  towns.reduce((s, t) => s + (t.bytes || 0), 0) /
  (1024 * 1024)
).toFixed(1);
console.log(
  `wrote towns.json: ${towns.length} built town(s) [${towns
    .map((t) => t.name)
    .join(", ")}], ~${totalMB} MB total`,
);
