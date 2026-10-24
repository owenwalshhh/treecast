/**
 * Treecast pipeline, step 8: LEAD energy burden by census tract (R4.2).
 *
 * Aggregates the DOE LEAD 2022 microdata (MA AMI Census Tracts) into a small
 * per-tract energy-burden table for the Inner Core only, written to
 * public/data/region/lead-by-tract.json.
 *
 * ENERGY BURDEN (LEAD's own definition, confirmed in the LEAD FAQ): average
 * annual housing energy cost divided by average annual household income, as a
 * households-weighted average over the tract. In this dataset the ELEP/GASP/FULP
 * "*UNITS" columns are ANNUAL cost weighted by housing units and HINCP*UNITS is
 * annual income weighted by units, so the tract burden is:
 *     100 * sum(ELEP*UNITS + GASP*UNITS + FULP*UNITS) / sum(HINCP*UNITS)
 * This yields a ~2.7% statewide median, matching LEAD's published range (an
 * earlier *12 gave a 10x-inflated number — the columns are already annual).
 *
 * The raw LEAD file is ~200 MB and is NOT committed. Download "MA 2022" from the
 * LEAD Tool, unzip, and point LEAD_CSV at "MA AMI Census Tracts 2022.csv":
 *     LEAD_CSV="/path/to/MA AMI Census Tracts 2022.csv" node pipeline/08-lead.mjs
 *
 * Source: U.S. DOE Low-Income Energy Affordability Data (LEAD) Tool, 2022.
 *   https://www.energy.gov/scep/slsc/lead-tool
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REGION = join(ROOT, "public", "data", "region");
const DUCKDB = process.env.DUCKDB || "duckdb";
const LEAD_CSV = process.env.LEAD_CSV;

if (!LEAD_CSV || !existsSync(LEAD_CSV)) {
  console.error(
    "Set LEAD_CSV to the 'MA AMI Census Tracts 2022.csv' from the LEAD Tool.\n" +
      'Example: LEAD_CSV="/path/to/MA AMI Census Tracts 2022.csv" node pipeline/08-lead.mjs',
  );
  process.exit(1);
}

mkdirSync(REGION, { recursive: true });

// The Inner Core tracts we actually need (first 11 digits of each block-group
// GEOID) — so we keep only our slice, never the whole state (data-rules.md).
const bg = JSON.parse(readFileSync(join(REGION, "ej-block-groups.geojson"), "utf8"));
const tracts = [...new Set(bg.features.map((f) => String(f.properties.geoid).slice(0, 11)))];
const inList = tracts.map((t) => `'${t}'`).join(",");

// Aggregate burden per tract with DuckDB, limited to our tracts, to a tidy CSV.
const sql = `
COPY (
  SELECT
    CAST(FIP AS VARCHAR) AS tract,
    round(100.0 * sum("ELEP*UNITS" + "GASP*UNITS" + "FULP*UNITS")
          / nullif(sum("HINCP*UNITS"), 0), 1) AS energy_burden_pct,
    round(sum(UNITS)) AS households
  FROM read_csv_auto('${LEAD_CSV.replace(/'/g, "''")}')
  WHERE CAST(FIP AS VARCHAR) IN (${inList})
  GROUP BY FIP
) TO '/dev/stdout' WITH (FORMAT CSV, HEADER);
`;

const csv = execFileSync(DUCKDB, [], { input: sql, maxBuffer: 1 << 26 }).toString();
const lines = csv.trim().split("\n");
const header = lines.shift();
const out = {};
for (const line of lines) {
  const [tract, burden, hh] = line.split(",");
  if (!tract) continue;
  out[tract] = { energyBurdenPct: Number(burden), households: Number(hh) };
}

writeFileSync(
  join(REGION, "lead-by-tract.json"),
  JSON.stringify(
    {
      source: "U.S. DOE LEAD Tool 2022 (MA AMI Census Tracts)",
      url: "https://www.energy.gov/scep/slsc/lead-tool",
      metric: "Energy burden: annual home energy cost / annual household income, households-weighted per tract.",
      tracts: out,
    },
    null,
    0,
  ),
);
console.log(`wrote lead-by-tract.json: ${Object.keys(out).length} Inner Core tracts (of ${tracts.length} needed)`);
