#!/usr/bin/env bash
# Treecast background bake queue.
#
#   npm run bake:bg                 # bake every town in pipeline/towns.json
#   npm run bake:bg -- --force      # re-bake even towns already built
#
# Bakes towns ONE AT A TIME (sequential) so memory stays bounded — each town
# hits Overture S3 for a minute or two and is memory-heavy, so a parallel wave
# can exhaust RAM. Safe to stop with Ctrl-C and re-run: already-built towns are
# skipped unless --force.
#
# Logs each town to pipeline/bake.log and prints a running tally. Boston is
# expected to exceed the 8 MB per-town budget; run.sh warns, and the neighbor-
# hood split (tasks.md Phase F) is the documented remedy.
#
# This is the OFFLINE job — run it on a machine with free memory, not during a
# live demo. Chelsea/Everett/Revere are built first so the app works early.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIPE="$ROOT/pipeline"
DATA="$ROOT/public/data"
LOG="$PIPE/bake.log"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

slugify() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]\+/-/g' -e 's/^-//' -e 's/-$//'; }

mapfile -t TOWNS < <(jq -r '.towns[].name' "$PIPE/towns.json")

echo "== Treecast bake queue: ${#TOWNS[@]} towns ==" | tee -a "$LOG"
echo "started $(date)" | tee -a "$LOG"

built=0; skipped=0; failed=0
for town in "${TOWNS[@]}"; do
  slug="$(slugify "$town")"
  # Chelsea legacy lives flat at public/data; a subfolder means already baked.
  if [ "$FORCE" -eq 0 ]; then
    if { [ "$slug" = "chelsea" ] && [ -s "$DATA/candidate-sites.geojson" ] && [ ! -d "$DATA/chelsea" ]; } \
       || [ -s "$DATA/$slug/candidate-sites.geojson" ]; then
      echo "-- skip $town (already built)" | tee -a "$LOG"
      skipped=$((skipped+1)); continue
    fi
  fi

  echo "" | tee -a "$LOG"
  echo ">> baking $town ($(date +%H:%M:%S))…" | tee -a "$LOG"
  if bash "$PIPE/run.sh" --town "$town" >>"$LOG" 2>&1; then
    echo "   ok $town" | tee -a "$LOG"
    built=$((built+1))
  else
    echo "   FAILED $town (see $LOG)" | tee -a "$LOG"
    failed=$((failed+1))
  fi
done

echo "" | tee -a "$LOG"
echo "== done $(date): built=$built skipped=$skipped failed=$failed ==" | tee -a "$LOG"
echo "   total public/data size:" | tee -a "$LOG"
du -sh "$DATA" | tee -a "$LOG"
[ "$failed" -eq 0 ]
