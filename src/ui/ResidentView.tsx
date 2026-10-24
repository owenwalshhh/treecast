/**
 * ResidentView — the phone-first view for a resident (brief feature 5).
 *
 * A resident drops a pin on their home; Treecast finds the nearest candidate
 * planting spots AROUND that home and shows the best 1–3, each with the plain-
 * language reason the planner uses. Reuses the pure optimizer scoring and the
 * explain() reasons — no new science, no backend.
 *
 * LOCAL-FIRST "geocoding": we have building footprints and candidate points for
 * the loaded town, but NO street-address table — so we honestly let the person
 * TAP their home (or use the browser's own geolocation), then snap to the
 * nearest candidate cluster. A typed box recenters on the town; it does not
 * invent an address match we cannot make.
 *
 * Styling matches the planner: the same frosted `.glass` surfaces and tokens.
 */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { POSITRON_PRIMARY, POSITRON_FALLBACK } from "./PlannerMap";
import type { GeoCandidate } from "./demo-data";
import { energyScore, distanceFactor } from "../optimizer/score";
import { explain, type ReasonCode } from "../optimizer/explain";
import { t, type Lang } from "../i18n/strings";
import { directionName } from "./describe";

interface Props {
  candidates: GeoCandidate[];
  center: { lng: number; lat: number };
  lang: Lang;
  /** Leave the resident view (back to the planner). */
  onExit: () => void;
}

const FT_PER_DEG_LAT = 364000;
function distFt(a: { lng: number; lat: number }, b: { lng: number; lat: number }) {
  const latFt = (a.lat - b.lat) * FT_PER_DEG_LAT;
  const lngFt = (a.lng - b.lng) * FT_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(latFt, lngFt);
}

function reasonText(code: ReasonCode, lang: Lang) {
  return t(`reason_${code}` as any, lang);
}

export function ResidentView({ candidates, center, lang, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const homeMarker = useRef<maplibregl.Marker | null>(null);
  const spotMarkers = useRef<maplibregl.Marker[]>([]);
  const [home, setHome] = useState<{ lng: number; lat: number } | null>(null);
  const [best, setBest] = useState<GeoCandidate[]>([]);

  // Build the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: POSITRON_PRIMARY,
      center: [center.lng, center.lat],
      zoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;
    let fellBack = false;
    map.on("error", (e: any) => {
      const msg = String(e?.error?.message ?? "");
      if (!fellBack && (msg.includes("style") || msg.includes("Failed to fetch"))) {
        fellBack = true;
        try { map.setStyle(POSITRON_FALLBACK); } catch {}
      }
    });

    // Tap to set home.
    map.on("click", (e) => setHomeAt(e.lngLat.lng, e.lngLat.lat));

    return () => { map.remove(); mapRef.current = null; };
  }, [center.lng, center.lat]);

  // When home changes, find the best nearby spots and draw everything.
  function setHomeAt(lng: number, lat: number) {
    setHome({ lng, lat });
    const map = mapRef.current;
    if (!map) return;

    // Candidates within ~250 ft of the home, scored by the real energy model
    // (pure placement science; we show the resident the single-home story).
    const near = candidates
      .map((c) => ({ c, d: distFt({ lng, lat }, c) }))
      .filter((x) => x.d <= 250)
      .map((x) => ({ ...x, score: energyScore(x.c) * (0.5 + 0.5 * distanceFactor(x.c.distanceToWallFt)) }))
      .filter((x) => x.score > 0) // never recommend a spot that doesn't help
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.c);
    setBest(near);

    // Home marker.
    homeMarker.current?.remove();
    const hEl = document.createElement("div");
    hEl.className = "resident-home";
    hEl.textContent = "🏠";
    homeMarker.current = new maplibregl.Marker({ element: hEl }).setLngLat([lng, lat]).addTo(map);

    // Spot markers (numbered best→).
    spotMarkers.current.forEach((m) => m.remove());
    spotMarkers.current = near.map((c, i) => {
      const el = document.createElement("div");
      el.className = "resident-spot";
      el.textContent = String(i + 1);
      return new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
    });

    map.easeTo({ center: [lng, lat], zoom: 17, duration: 500 });
  }

  // Browser geolocation (optional convenience).
  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setHomeAt(pos.coords.longitude, pos.coords.latitude),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="resident">
      <div ref={containerRef} className="resident-map" aria-hidden="true" />

      {/* Top card: title + how to use. */}
      <div className="glass resident-top">
        <div className="resident-head">
          <strong>🌳 {t("appTitle", lang)}</strong>
          <button type="button" className="resident-exit" onClick={onExit} aria-label={t("residentExit", lang)}>
            ✕
          </button>
        </div>
        <p className="resident-sub">{home ? t("residentTapAgain", lang) : t("residentTapPrompt", lang)}</p>
        {!home && (
          <button type="button" className="primary resident-geo" onClick={useMyLocation}>
            📍 {t("residentUseLocation", lang)}
          </button>
        )}
      </div>

      {/* Bottom sheet: the answer. */}
      {home && (
        <div className="glass resident-sheet" role="region" aria-label={t("residentResultTitle", lang)}>
          {best.length === 0 ? (
            <p className="resident-none">{t("residentNone", lang)}</p>
          ) : (
            <>
              <div className="resident-sheet-title">{t("residentResultTitle", lang)}</div>
              <ol className="resident-list">
                {best.map((c, i) => {
                  const ex = explain(c);
                  const leaf = c.leafType === "evergreen" ? t("leafEvergreen", lang) : t("leafDeciduous", lang);
                  return (
                    <li key={c.id}>
                      <span className="resident-rank">{i + 1}</span>
                      <div>
                        <div className="resident-where">
                          {directionName(c.direction, lang)} · {Math.round(c.distanceToWallFt)} ft · {leaf}
                        </div>
                        <div className="resident-why">
                          {ex.reasons[0] ? reasonText(ex.reasons[0], lang) : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="resident-foot">{t("residentEstimate", lang)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
