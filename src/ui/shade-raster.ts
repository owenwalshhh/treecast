/**
 * Build a SHADE RASTER from the shade grid, client-side, with no dependency.
 *
 * Every output pixel gets a color by interpolating the grid's shade values
 * (inverse-distance weighting over nearby cells), red (no shade) -> green (full
 * shade). It is a fixed-resolution image pinned to the data's geographic bounds,
 * so the map can scale it like any picture: every pixel has a color and ZOOM
 * does not change the field (unlike a heatmap, which reweights by zoom).
 */

type Cell = { lng: number; lat: number; shade: number };

export interface ShadeRaster {
  dataUrl: string;
  /** [[W,N],[E,N],[E,S],[W,S]] for MapLibre image coordinates. */
  coordinates: [[number, number], [number, number], [number, number], [number, number]];
}

/** Rings of one polygon (outer + holes), each an array of [lng,lat]. */
type Ring = [number, number][];

/** Ray-casting point-in-polygon against a single ring. */
function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const hit =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Collect the outer rings of every Polygon/MultiPolygon in a GeoJSON. */
function collectRings(gj: any): Ring[] {
  const out: Ring[] = [];
  const feats = gj?.features ?? (gj ? [gj] : []);
  for (const f of feats) {
    const g = f.geometry ?? f;
    if (!g) continue;
    if (g.type === "Polygon") out.push(g.coordinates[0]);
    else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) out.push(poly[0]);
    }
  }
  return out;
}

// Red -> orange -> yellow -> light green -> green (matches the legend).
function ramp(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [215, 48, 39]],
    [0.25, [252, 141, 89]],
    [0.5, [254, 224, 139]],
    [0.75, [145, 207, 96]],
    [1.0, [26, 152, 80]],
  ];
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (x - t0) / (t1 - t0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * @param shadeGrid GeoJSON FeatureCollection of cells with properties.shade.
 * @param res pixels per side of the output raster (fixed; zoom-independent).
 * @param cityBoundary GeoJSON polygon; pixels OUTSIDE it are transparent.
 * @param water GeoJSON water polygons; pixels INSIDE any are transparent.
 */
export function buildShadeRaster(
  shadeGrid: any,
  res = 256,
  cityBoundary?: any,
  water?: any,
): ShadeRaster | null {
  const feats = shadeGrid?.features ?? [];
  if (!feats.length) return null;

  const cityRings = cityBoundary ? collectRings(cityBoundary) : [];
  const waterRings = water ? collectRings(water) : [];

  const inCity = (lng: number, lat: number) =>
    cityRings.length === 0 || cityRings.some((r) => inRing(lng, lat, r));
  const inWater = (lng: number, lat: number) =>
    waterRings.some((r) => inRing(lng, lat, r));

  // Collect cell centers + bounds.
  const cells: Cell[] = [];
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const f of feats) {
    const ring = f.geometry?.coordinates?.[0];
    if (!ring) continue;
    let lng = 0, lat = 0;
    for (let i = 0; i < 4; i++) {
      lng += ring[i][0];
      lat += ring[i][1];
    }
    lng /= 4;
    lat /= 4;
    const shade = f.properties?.shade ?? 0;
    cells.push({ lng, lat, shade });
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  if (!cells.length) return null;

  // Approx cell spacing, for the IDW falloff radius.
  const span = Math.max(east - west, north - south);
  const r = (span / Math.sqrt(cells.length)) * 1.6; // smoothing radius
  const r2 = r * r;

  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(res, res);

  // Pass 1: interpolate shade + coverage weight at every pixel.
  const field = new Float32Array(res * res);
  const cover = new Float32Array(res * res);
  const clipped = new Uint8Array(res * res); // 1 = outside city or in water
  let vmin = Infinity;
  let vmax = -Infinity;
  // Coverage threshold: a pixel with less total weight than this is "no data"
  // (far from any cell) and will be transparent — so the layer is not a box.
  const coverFloor = 1 / (r2 * 0.6);

  for (let py = 0; py < res; py++) {
    const lat = north - ((py + 0.5) / res) * (north - south);
    for (let px = 0; px < res; px++) {
      const lng = west + ((px + 0.5) / res) * (east - west);
      const i = py * res + px;
      // Clip: only inside the city, and never over water.
      if (!inCity(lng, lat) || inWater(lng, lat)) {
        clipped[i] = 1;
        field[i] = NaN;
        continue;
      }
      let wsum = 0;
      let vsum = 0;
      for (const c of cells) {
        const dx = c.lng - lng;
        const dy = c.lat - lat;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2 * 9) continue;
        const w = 1 / (d2 + r2 * 0.05);
        wsum += w;
        vsum += w * c.shade;
      }
      cover[i] = wsum;
      if (wsum > 0) {
        const v = vsum / wsum;
        field[i] = v;
        if (wsum >= coverFloor) {
          if (v < vmin) vmin = v;
          if (v > vmax) vmax = v;
        }
      } else {
        field[i] = NaN;
      }
    }
  }

  // Normalize across the ACTUAL min..max so the full red->green ramp is used
  // and red/green are balanced around the data's own midpoint (not a fixed 0.5
  // that would read almost all-red when raw shade values cluster low).
  const range = vmax - vmin;
  const norm = (v: number) => (range > 1e-6 ? (v - vmin) / range : 0.5);

  for (let i = 0; i < field.length; i++) {
    const idx = i * 4;
    const v = field[i];
    // Transparent where there is no real coverage — removes the solid box.
    if (!Number.isFinite(v) || cover[i] < coverFloor) {
      img.data[idx + 3] = 0;
      continue;
    }
    const [rr, gg, bb] = ramp(norm(v));
    img.data[idx] = rr;
    img.data[idx + 1] = gg;
    img.data[idx + 2] = bb;
    img.data[idx + 3] = 200;
  }
  ctx.putImageData(img, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  };
}
