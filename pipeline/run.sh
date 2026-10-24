#!/usr/bin/env bash
# Treecast per-town pipeline runner.
#
#   npm run pipeline -- --town "Everett"     # build one town
#   npm run pipeline                         # build every town in towns.json
#   npm run pipeline -- --town "Everett" --town "Revere"   # a few
#
# For each town it:
#   1. derives the bbox + center from Overture divisions,
#   2. fetches the town's municipal boundary polygon (the clip edge),
#   3. builds buildings + roads CLIPPED to that boundary,
#   4. builds the equity summary + candidate grid + shade grid,
#   5. writes everything to public/data/<slug>/,
#   6. rebuilds public/data/towns.json (name, counts, file sizes).
#
# Reproducible: re-running rebuilds a town's folder from data/raw + Overture.
# Neighboring towns meet with no gaps/overlaps because each is clipped to its
# own boundary (greater-boston spec, R2.4).
#
# Requires: duckdb on PATH (or DUCKDB=/path/to/duckdb), jq, node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIPE="$ROOT/pipeline"
RAW="$ROOT/data/raw"
DATA="$ROOT/public/data"
DUCKDB="${DUCKDB:-duckdb}"
MARGIN="${MARGIN:-0.004}"
SIZE_BUDGET_MB="${SIZE_BUDGET_MB:-8}"   # per-town soft cap; Boston expected over

mkdir -p "$DATA"

# --- which towns? -----------------------------------------------------------
TOWNS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --town) TOWNS+=("$2"); shift 2 ;;
    --town=*) TOWNS+=("${1#--town=}"); shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# No --town given: build every town named in pipeline/towns.json.
if [ ${#TOWNS[@]} -eq 0 ]; then
  if [ ! -s "$PIPE/towns.json" ]; then
    echo "!! no --town given and pipeline/towns.json is missing" >&2; exit 2
  fi
  while IFS= read -r name; do TOWNS+=("$name"); done < \
    <(jq -r '.towns[].name' "$PIPE/towns.json")
fi

slugify() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]\+/-/g' -e 's/^-//' -e 's/-$//'; }

build_one() {
  local CITY="$1"
  local SLUG; SLUG="$(slugify "$CITY")"
  local OUT="$DATA/$SLUG"
  mkdir -p "$OUT"
  echo ""
  echo "############################################################"
  echo "## $CITY  ->  public/data/$SLUG/"
  echo "############################################################"

  # 1) bbox + center from Overture divisions -> a per-town area file.
  local AREA="$OUT/area.json"
  echo "==> [0/6] deriving bbox for '$CITY'…"
  local RAWAREA; RAWAREA="$(mktemp)"
  sed -e "s|\${CITY}|$CITY|g" -e "s|\${MARGIN}|$MARGIN|g" -e "s|\${OUT}|$RAWAREA|g" \
      "$PIPE/00-derive-area.sql" | "$DUCKDB"
  if [ ! -s "$RAWAREA" ]; then
    echo "!! no boundary for '$CITY' in Overture MA divisions — check spelling"; rm -f "$RAWAREA"; return 1
  fi
  jq '{name,note,bbox,center,town_name_ej,town_name_utility}' "$RAWAREA" > "$AREA"
  rm -f "$RAWAREA"

  local WEST SOUTH EAST NORTH TOWN_EJ TOWN_UTIL
  WEST=$(jq -r '.bbox.west' "$AREA");  SOUTH=$(jq -r '.bbox.south' "$AREA")
  EAST=$(jq -r '.bbox.east' "$AREA");  NORTH=$(jq -r '.bbox.north' "$AREA")
  TOWN_EJ=$(jq -r '.town_name_ej' "$AREA"); TOWN_UTIL=$(jq -r '.town_name_utility' "$AREA")

  # 2) municipal boundary polygon (the clip edge).
  echo "==> [1/6] town boundary…"
  sed -e "s|\${CITY}|$CITY|g" -e "s|\${OUT}|$OUT/city-boundary.geojson|g" \
      "$PIPE/00b-boundary.sql" | "$DUCKDB"

  local B="$OUT/city-boundary.geojson"

  # 3) buildings, clipped.
  echo "==> [2/6] buildings (Overture, clipped — may take a minute)…"
  sed -e "s|\${WEST}|$WEST|g" -e "s|\${SOUTH}|$SOUTH|g" -e "s|\${EAST}|$EAST|g" \
      -e "s|\${NORTH}|$NORTH|g" -e "s|\${BOUNDARY}|$B|g" \
      -e "s|\${OUT}|$OUT/buildings.geojson|g" \
      "$PIPE/01-buildings.sql" | "$DUCKDB"

  # 4) roads, clipped.
  echo "==> [3/6] roads (Overture, clipped)…"
  sed -e "s|\${WEST}|$WEST|g" -e "s|\${SOUTH}|$SOUTH|g" -e "s|\${EAST}|$EAST|g" \
      -e "s|\${NORTH}|$NORTH|g" -e "s|\${BOUNDARY}|$B|g" \
      -e "s|\${OUT}|$OUT/roads.geojson|g" \
      "$PIPE/02-roads.sql" | "$DUCKDB"

  # 5) equity + utility summary (local CSVs).
  echo "==> [4/6] equity + utility summary…"
  sed -e "s|\${EJ_CSV}|$RAW/ej/data.csv|g" -e "s|\${UTIL_CSV}|$RAW/utilities/data.csv|g" \
      -e "s|\${TOWN_EJ}|$TOWN_EJ|g" -e "s|\${TOWN_UTIL}|$TOWN_UTIL|g" \
      -e "s|\${OUT}|$OUT/equity-summary.json|g" \
      "$PIPE/03-equity-summary.sql" | "$DUCKDB"

  # 6) candidates + shade (pure Node, read the town folder we just wrote).
  echo "==> [5/6] candidate sites…"
  TREECAST_TOWN_DIR="$OUT" node "$PIPE/04-candidates.mjs"
  echo "==> [6/6] shade grid…"
  TREECAST_TOWN_DIR="$OUT" node "$PIPE/05-shade.mjs"

  # size guard.
  local MB; MB=$(du -sm "$OUT" | cut -f1)
  echo "==> $CITY total: ${MB} MB"
  if [ "$MB" -gt "$SIZE_BUDGET_MB" ]; then
    echo "!! WARNING: $CITY is ${MB} MB (> ${SIZE_BUDGET_MB} MB budget)."
    echo "   Boston is expected to exceed this — split by neighborhood (see tasks.md Phase F)."
  fi
}

FAILED=()
for town in "${TOWNS[@]}"; do
  build_one "$town" || FAILED+=("$town")
done

# Rebuild the public index (counts + sizes) from whatever folders now exist.
echo ""
echo "==> rebuilding public/data/towns.json index…"
node "$PIPE/build-index.mjs"

echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "!! FAILED: ${FAILED[*]}"
  exit 1
fi
echo "==> done. public/data:"
du -sh "$DATA"/*/ 2>/dev/null || true
