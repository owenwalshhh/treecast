#!/usr/bin/env bash
# Treecast pipeline runner.
#
# Reads pipeline/area.json, substitutes the bbox + town into each SQL template,
# and runs them with DuckDB to write app-ready files into public/data.
# Reproducible: re-running rebuilds public/data from data/raw + Overture.
#
# Requires: duckdb on PATH (or set DUCKDB=/path/to/duckdb), jq.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIPE="$ROOT/pipeline"
RAW="$ROOT/data/raw"
OUT="$ROOT/public/data"
DUCKDB="${DUCKDB:-duckdb}"

mkdir -p "$OUT"

AREA="$PIPE/area.json"
WEST=$(jq -r '.bbox.west'  "$AREA")
SOUTH=$(jq -r '.bbox.south' "$AREA")
EAST=$(jq -r '.bbox.east'  "$AREA")
NORTH=$(jq -r '.bbox.north' "$AREA")
TOWN_EJ=$(jq -r '.town_name_ej' "$AREA")
TOWN_UTIL=$(jq -r '.town_name_utility' "$AREA")

# Render a template to stdout with env-var substitution.
render() { sed -e "s|\${WEST}|$WEST|g" -e "s|\${SOUTH}|$SOUTH|g" \
               -e "s|\${EAST}|$EAST|g" -e "s|\${NORTH}|$NORTH|g" \
               -e "s|\${OUT}|$1|g" \
               -e "s|\${EJ_CSV}|$RAW/ej/data.csv|g" \
               -e "s|\${UTIL_CSV}|$RAW/utilities/data.csv|g" \
               -e "s|\${TOWN_EJ}|$TOWN_EJ|g" -e "s|\${TOWN_UTIL}|$TOWN_UTIL|g" \
               "$2"; }

echo "==> [1/3] buildings (Overture, this may take a minute)…"
render "$OUT/buildings.geojson" "$PIPE/01-buildings.sql" | "$DUCKDB" || {
  echo "!! buildings step failed (Overture/S3 reachable?)"; exit 1; }

echo "==> [2/3] roads (Overture)…"
render "$OUT/roads.geojson" "$PIPE/02-roads.sql" | "$DUCKDB" || {
  echo "!! roads step failed"; exit 1; }

echo "==> [3/3] equity + utility summary (local CSVs)…"
render "$OUT/equity-summary.json" "$PIPE/03-equity-summary.sql" | "$DUCKDB"

echo "==> done. Wrote:"
ls -la "$OUT"
