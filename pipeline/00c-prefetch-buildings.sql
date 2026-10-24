-- Treecast pipeline, step 00c-a: PRE-DOWNLOAD Overture BUILDINGS once.
--
-- One remote read for the whole Inner Core bbox -> a local parquet, so every
-- town's step 01 reads locally (instant, no S3 stalls). Buildings are the
-- critical layer (shade, 3D, candidate placement), fetched on their own so a
-- roads stall can never cost us the buildings cache.
--
-- Template vars: ${WEST} ${SOUTH} ${EAST} ${NORTH} ${BUILDINGS_OUT}.
-- Source: Overture Maps Foundation, buildings theme.

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');
SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

COPY (
  SELECT id, height, bbox, geometry
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/' || getvariable('latest') ||
      '/theme=buildings/type=building/*',
    hive_partitioning = 1
  )
  WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
    AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
) TO '${BUILDINGS_OUT}' (FORMAT PARQUET);
