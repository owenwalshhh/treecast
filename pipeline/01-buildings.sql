-- Treecast pipeline, step 1: building footprints, CLIPPED to the town.
--
-- Reads Overture Maps buildings (GeoParquet on AWS S3, public, no login) inside
-- the bbox, then keeps only those whose centroid falls inside the town's own
-- municipal boundary (greater-boston spec, R2.4). Clipping by centroid means a
-- building belongs to exactly one town, so neighbors never double-count a
-- shared-edge building.
--
-- Footprints are lightly simplified so the per-town file stays small enough to
-- keep all of public/data under the 60 MB budget. Height is preserved exactly;
-- only the outline is simplified.
--
-- Template substituted by run.sh: ${WEST} ${SOUTH} ${EAST} ${NORTH} ${BOUNDARY} ${OUT}.
--
-- Source: Overture Maps Foundation, buildings theme.
--   https://registry.opendata.aws/overture/   (ODbL for footprints).

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

${LATEST_SETUP}

-- The town boundary written by 00b-boundary.sql (one feature).
CREATE OR REPLACE TABLE town_boundary AS
  SELECT geom FROM ST_Read('${BOUNDARY}');

COPY (
  WITH b AS (
    SELECT
      id,
      height,
      geometry
    FROM read_parquet(
      '${SOURCE}',
      hive_partitioning = 1
    )
    WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
      AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
  )
  SELECT
    b.id,
    b.height,
    -- ~2 m simplify: keeps the footprint readable, drops redundant vertices.
    ST_SimplifyPreserveTopology(b.geometry, 0.00002) AS geometry
  FROM b, town_boundary t
  WHERE ST_Contains(t.geom, ST_Centroid(b.geometry))
) TO '${OUT}'
WITH (FORMAT GDAL, DRIVER 'GeoJSON');
