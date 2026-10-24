-- Treecast pipeline, step 0b: the town's own municipal boundary polygon.
--
-- Writes the single locality polygon for ${CITY} as GeoJSON. This is the
-- authoritative edge we clip buildings, roads and candidates to, so neighboring
-- towns meet with no gaps or overlaps (greater-boston spec, R2.4).
--
-- The polygon is simplified a little so the saved file stays small; the detail
-- lost is far below a city block, well under what the demo needs.
--
-- Template substituted by run.sh: ${CITY} ${OUT}.
--
-- Source: Overture Maps Foundation, divisions theme (division_area), which
-- carries MassGIS-derived municipal boundaries for Massachusetts localities.

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

${LATEST_SETUP}

COPY (
  SELECT
    '${CITY}' AS name,
    -- ~10 m tolerance: trims vertices without moving the edge meaningfully.
    ST_SimplifyPreserveTopology(geometry, 0.0001) AS geometry
  FROM read_parquet(
    '${SOURCE}',
    hive_partitioning = 1
  )
  WHERE names.primary = '${CITY}'
    AND country = 'US'
    AND region = 'US-MA'
    AND subtype = 'locality'
  ORDER BY ST_Area(geometry) DESC
  LIMIT 1
) TO '${OUT}'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');
