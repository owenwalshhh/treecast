-- Treecast pipeline, step 1: building footprints for the demo bounding box.
--
-- Reads Overture Maps buildings (GeoParquet on AWS S3, public, no login) and
-- writes only the slice inside the bbox to /public/data/buildings.geojson.
-- Pulls one neighbourhood box, never the whole dataset (data-rules.md).
--
-- The release is resolved from Overture's STAC catalog at run time, so there is
-- no hardcoded release date to go stale.
--
-- Template substituted by run.sh: ${WEST} ${SOUTH} ${EAST} ${NORTH} ${OUT}.
--
-- Source: Overture Maps Foundation, buildings theme.
--   https://registry.opendata.aws/overture/   (ODbL for footprints).

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

COPY (
  SELECT
    id,
    height,
    geometry
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/' || getvariable('latest') ||
      '/theme=buildings/type=building/*',
    hive_partitioning = 1
  )
  WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
    AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
) TO '${OUT}'
WITH (FORMAT GDAL, DRIVER 'GeoJSON', SRS 'EPSG:4326');
