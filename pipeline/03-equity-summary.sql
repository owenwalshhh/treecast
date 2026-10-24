-- Treecast pipeline, step 3: town-level equity + utility summary.
--
-- The uploaded MassGIS EJ and utility extracts are ATTRIBUTE tables with NO
-- geometry (see each README). So this step cannot place block-group polygons on
-- the map. What it CAN do, honestly, is summarise the demo town's equity profile
-- and name its electric utility, for the Sources/limits panel and as the basis
-- of the equity need the optimiser blends in.
--
-- Template substituted by run.sh: ${EJ_CSV} ${UTIL_CSV} ${TOWN_EJ} ${TOWN_UTIL} ${OUT}.
--
-- Sources:
--   MassGIS 2020 Environmental Justice block groups.
--   MassGIS electric utility by town.

COPY (
  WITH ej AS (
    SELECT *
    FROM read_csv_auto('${EJ_CSV}', header = true)
    WHERE lower(municipality) = lower('${TOWN_EJ}')
  ),
  util AS (
    SELECT utility
    FROM read_csv_auto('${UTIL_CSV}', header = true)
    WHERE upper(town) = upper('${TOWN_UTIL}')
    LIMIT 1
  )
  SELECT
    '${TOWN_EJ}'                              AS town,
    (SELECT utility FROM util)                AS electric_utility,
    count(*)                                  AS ej_block_groups,
    round(avg(minority_pct), 1)               AS avg_minority_pct,
    round(avg(limited_english_hh_pct), 1)     AS avg_limited_english_pct,
    round(avg(block_group_income))            AS avg_block_group_income,
    min(block_group_income)                   AS min_block_group_income,
    max(block_group_income)                   AS max_block_group_income,
    -- The distinct EJ criteria present across the town's flagged block groups
    -- (e.g. "Income", "Minority and income"). Shown in "Why here?".
    (SELECT list(DISTINCT criteria) FROM ej)  AS criteria
  FROM ej
) TO '${OUT}' WITH (FORMAT JSON, ARRAY false);
