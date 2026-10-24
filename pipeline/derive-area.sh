#!/usr/bin/env bash
# Derive pipeline/area.json for ANY Massachusetts city from its name.
#
#   bash pipeline/derive-area.sh "Chelsea"
#   bash pipeline/derive-area.sh "Springfield"
#
# Looks up the city's official boundary in Overture divisions, computes a bbox
# (plus a small margin) and center, and writes pipeline/area.json. After this,
# run.sh builds buildings/roads/equity for that city with no code changes.
#
# Requires: duckdb (or DUCKDB=/path), jq.
set -euo pipefail

CITY="${1:?usage: derive-area.sh \"City Name\"}"
MARGIN="${MARGIN:-0.004}"   # ~0.004 deg ≈ 1,300 ft edge margin

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIPE="$ROOT/pipeline"
DUCKDB="${DUCKDB:-duckdb}"
TMP="$(mktemp -d)"
RAW="$TMP/area-raw.json"

echo "==> deriving bbox for '$CITY' from Overture divisions…"
sed -e "s|\${CITY}|$CITY|g" -e "s|\${MARGIN}|$MARGIN|g" -e "s|\${OUT}|$RAW|g" \
    "$PIPE/00-derive-area.sql" | "$DUCKDB"

if [ ! -s "$RAW" ]; then
  echo "!! No boundary found for '$CITY' in Overture MA divisions. Check the spelling (e.g. 'Chelsea', 'Springfield')."
  rm -rf "$TMP"; exit 1
fi

# DuckDB emits bbox/center as JSON objects already; pass them through as-is.
jq '{
  name: .name,
  note: .note,
  bbox:   .bbox,
  center: .center,
  town_name_ej: .town_name_ej,
  town_name_utility: .town_name_utility
}' "$RAW" > "$PIPE/area.json"

echo "==> wrote $PIPE/area.json:"
cat "$PIPE/area.json"
rm -rf "$TMP"
