-- Treecast pipeline, step 2: roads, CLIPPED to the town.
--
-- Roads are needed so the candidate-site step keeps trees the required setback
-- off a road (tree-science.md). Reads the bbox slice from Overture, then keeps
-- only segments that intersect the town's own municipal boundary, so a town's
-- road data stops at its edge (greater-boston spec, R2.4).
--
-- Release resolved from Overture's STAC catalog at run time.
--
-- Template substituted by run.sh: ${WEST} ${SOUTH} ${EAST} ${NORTH} ${BOUNDARY} ${OUT}.
--
-- Source: Overture Maps Foundation, transportation theme (segments).
--   https://registry.opendata.aws/overture/

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

CREATE OR REPLACE TABLE town_boundary AS
  SELECT ST_GeomFromGeoJSON(feature->'geometry') AS geom
  FROM (
    SELECT unnest(features) AS feature
    FROM read_json_auto('${BOUNDARY}')
  );

COPY (
  WITH r AS (
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
  )
  SELECT r.id, r.geometry
  FROM r, town_boundary t
  WHERE ST_Intersects(t.geom, r.geometry)
) TO '${OUT}'
WITH (FORMAT GDAL, DRIVER 'GeoJSON', SRS 'EPSG:4326');
