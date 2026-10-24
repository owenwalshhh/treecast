-- Treecast pipeline, step 2: roads for the demo bounding box.
--
-- Roads are needed so the candidate-site step can keep trees the required
-- setback off a road (tree-science.md). Same bbox slice, same no-rehosting rule.
-- Release resolved from Overture's STAC catalog at run time.
--
-- Template substituted by run.sh: ${WEST} ${SOUTH} ${EAST} ${NORTH} ${OUT}.
--
-- Source: Overture Maps Foundation, transportation theme (segments).
--   https://registry.opendata.aws/overture/

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

COPY (
  SELECT
    id,
    geometry
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/' || getvariable('latest') ||
      '/theme=transportation/type=segment/*',
    hive_partitioning = 1
  )
  WHERE bbox.xmin BETWEEN ${WEST} AND ${EAST}
    AND bbox.ymin BETWEEN ${SOUTH} AND ${NORTH}
) TO '${OUT}'
WITH (FORMAT GDAL, DRIVER 'GeoJSON', SRS 'EPSG:4326');
