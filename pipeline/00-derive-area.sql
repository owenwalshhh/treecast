-- Treecast pipeline, step 0: derive a city's bounding box from Overture.
--
-- Given a Massachusetts city/town name, look up its official boundary in the
-- Overture divisions theme and emit the bbox + center as JSON. This is what
-- makes Treecast work for ANY MA city: no hand-typed coordinates. run.sh calls
-- this first (when area.json is being (re)generated) and writes the result.
--
-- A small margin is added around the boundary so trees near the edge still see
-- their nearest building.
--
-- Template substituted by derive-area.sh: ${CITY} ${MARGIN} ${OUT}.
--
-- Source: Overture Maps Foundation, divisions theme (division_area).

INSTALL httpfs;   LOAD httpfs;
INSTALL spatial;  LOAD spatial;
SET s3_region = 'us-west-2';
CREATE SECRET IF NOT EXISTS anon (TYPE s3, PROVIDER config, KEY_ID '', SECRET '', REGION 'us-west-2');

SET VARIABLE latest = (SELECT latest FROM 'https://stac.overturemaps.org/catalog.json');

COPY (
  WITH city AS (
    SELECT geometry
    FROM read_parquet(
      's3://overturemaps-us-west-2/release/' || getvariable('latest') ||
        '/theme=divisions/type=division_area/*',
      hive_partitioning = 1
    )
    WHERE names.primary = '${CITY}'
      AND country = 'US'
      AND region = 'US-MA'
      AND subtype = 'locality'
    -- Largest matching polygon, in case of name collisions / fragments.
    ORDER BY ST_Area(geometry) DESC
    LIMIT 1
  )
  SELECT
    '${CITY}'                                   AS name,
    'Auto-derived bbox from Overture divisions.' AS note,
    json_object(
      'west',  ST_XMin(geometry) - ${MARGIN},
      'south', ST_YMin(geometry) - ${MARGIN},
      'east',  ST_XMax(geometry) + ${MARGIN},
      'north', ST_YMax(geometry) + ${MARGIN}
    )                                            AS bbox,
    json_object(
      'lng', (ST_XMin(geometry) + ST_XMax(geometry)) / 2,
      'lat', (ST_YMin(geometry) + ST_YMax(geometry)) / 2
    )                                            AS center,
    '${CITY}'                                   AS town_name_ej,
    upper('${CITY}')                             AS town_name_utility
  FROM city
) TO '${OUT}' WITH (FORMAT JSON, ARRAY false);
