-- Treecast pipeline, step 00c-c: PRE-DOWNLOAD Overture DIVISIONS once.
--
-- The bbox (00) and boundary (00b) steps look up each town's municipal polygon
-- in Overture's divisions theme — a per-town S3 read that, across 21 towns,
-- triggers HTTP 429 rate-limiting. This fetches ALL Massachusetts localities
-- once into a local parquet, so both steps then read locally (no network).
--
-- Template vars: ${DIVISIONS_OUT}.
-- Source: Overture Maps Foundation, divisions theme (division_area).

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');
SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

COPY (
  SELECT names, geometry, country, region, subtype
  FROM read_parquet(
    's3://overturemaps-us-west-2/release/' || getvariable('latest') ||
      '/theme=divisions/type=division_area/*',
    hive_partitioning = 1
  )
  WHERE country = 'US' AND region = 'US-MA' AND subtype = 'locality'
) TO '${DIVISIONS_OUT}' (FORMAT PARQUET);
