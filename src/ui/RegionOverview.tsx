/**
 * RegionOverview — the "All of Inner Core" overview (greater-boston C3 / R3.3).
 *
 * Shows every Inner Core town's outline on the vector basemap, shaded by how
 * many EJ-flagged 2020 block groups it has (MassGIS EJ2020). A labeled legend
 * explains the shading. Clicking a BUILT town opens it in the planner; an
 * unbuilt town says it needs a pipeline run.
 *
 * HONEST METRIC: the shade is the COUNT of EJ-flagged block groups, a
 * need/density signal — not a share of the whole town, since the EJ layer
 * carries only flagged groups (no non-flagged denominator). The legend says so.
 *
 * Accessibility (accessibility.md): the map is aria-hidden; a parallel list of
 * towns (name, EJ count, built/not) carries the same information and is the
 * keyboard-operable way to open a town.
 */

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { POSITRON_PRIMARY, POSITRON_FALLBACK } from "./PlannerMap";
import { loadRegionOutlines } from "./load-data";
import { t, type Lang } from "../i18n/strings";

interface TownOutlineProps {
  town: string;
  slug: string;
  ejBlockGroups: number;
  avgMinorityPct: number | null;
  built: boolean;
}

// Choropleth buckets on EJ-flagged block-group count. Greens from light (few)
// to dark (many) — more flagged groups = more residents the trees should reach.
const BUCKETS: { max: number; color: string; label: string }[] = [
  { max: 10, color: "#d9f0d3", label: "1–10" },
  { max: 25, color: "#a6dba0", label: "11–25" },
  { max: 50, color: "#5aae61", label: "26–50" },
  { max: 100, color: "#1b7837", label: "51–100" },
  { max: Infinity, color: "#00441b", label: "100+" },
];

export function RegionOverview({
  lang,
  onOpenTown,
  onClose,
}: {
  lang: Lang;
  onOpenTown: (slug: string) => void;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [towns, setTowns] = useState<TownOutlineProps[]>([]);

  // Escape closes the overview (keyboard-accessible dismiss).
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: POSITRON_PRIMARY,
      center: [-71.09, 42.36], // ~ Inner Core centroid (Boston/Cambridge line)
      zoom: 10.2,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on("error", (e: any) => {
      // Fall back to CARTO Positron if OpenFreeMap fails.
      if (String(e?.error?.message ?? "").includes("style") && map.getStyle()?.name !== "carto") {
        try { map.setStyle(POSITRON_FALLBACK); } catch {}
      }
    });

    loadRegionOutlines().then((gj) => {
      if (cancelled || !gj?.features?.length) return;
      const list: TownOutlineProps[] = gj.features
        .map((f: any) => ({
          town: f.properties.town,
          slug: f.properties.slug,
          ejBlockGroups: f.properties.ejBlockGroups ?? 0,
          avgMinorityPct: f.properties.avgMinorityPct ?? null,
          built: !!f.properties.built,
        }))
        .sort((a: TownOutlineProps, b: TownOutlineProps) => b.ejBlockGroups - a.ejBlockGroups);
      setTowns(list);

      const draw = () => {
        if (map.getSource("town-outlines")) return;
        map.addSource("town-outlines", { type: "geojson", data: gj });
        // Fill, colored by EJ count via a step expression.
        map.addLayer({
          id: "town-fill",
          type: "fill",
          source: "town-outlines",
          paint: {
            "fill-color": [
              "step",
              ["get", "ejBlockGroups"],
              BUCKETS[0].color,
              11, BUCKETS[1].color,
              26, BUCKETS[2].color,
              51, BUCKETS[3].color,
              101, BUCKETS[4].color,
            ],
            "fill-opacity": 0.65,
          },
        });
        map.addLayer({
          id: "town-line",
          type: "line",
          source: "town-outlines",
          paint: { "line-color": "#2b2b2b", "line-width": 0.8, "line-opacity": 0.5 },
        });
        // Town name labels.
        map.addLayer({
          id: "town-label",
          type: "symbol",
          source: "town-outlines",
          layout: {
            "text-field": ["get", "town"],
            "text-size": 12,
            "text-font": ["Noto Sans Regular"],
          },
          paint: { "text-color": "#1a1a1a", "text-halo-color": "#fff", "text-halo-width": 1.3 },
        });

        // Click a town -> open it if built.
        map.on("click", "town-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          if (f.properties?.built) onOpenTown(String(f.properties.slug));
        });
        map.on("mouseenter", "town-fill", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "town-fill", () => (map.getCanvas().style.cursor = ""));
      };
      if (map.isStyleLoaded()) draw();
      else map.once("load", draw);
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [onOpenTown]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} aria-hidden="true" style={{ width: "100%", height: "100%", minHeight: 420 }} />

      {/* Title + close — always visible so the overview can be dismissed. */}
      <div
        className="glass"
        style={{
          position: "absolute", top: 16, left: 16, zIndex: 7, padding: "8px 10px 8px 12px",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <img src="/logo.png" alt="" width={20} height={20} style={{ display: "block" }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t("overviewTitle", lang)}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("overviewClose", lang)}
            title={t("overviewClose", lang)}
            style={{
              marginLeft: 4, width: 28, height: 28, borderRadius: 999, border: "none",
              cursor: "pointer", fontSize: 16, lineHeight: 1,
              background: "rgba(127,127,127,0.18)", color: "inherit",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Legend. */}
      <div
        className="glass legend"
        style={{ position: "absolute", left: 16, bottom: 16, zIndex: 6, padding: 12, maxWidth: 230 }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("overviewLegendTitle", lang)}</div>
        {BUCKETS.map((b) => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ width: 16, height: 12, background: b.color, borderRadius: 2, display: "inline-block" }} />
            <span style={{ fontSize: 12.5 }}>{b.label}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{t("overviewLegendNote", lang)}</div>
      </div>

      {/* Accessible parallel list — the keyboard way to open a town. */}
      <div
        className="glass"
        style={{
          position: "absolute", top: 16, right: 16, zIndex: 6, padding: 12,
          width: 230, maxHeight: "calc(100% - 32px)", overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("overviewListTitle", lang)}</div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
          {towns.map((tw) => (
            <li key={tw.slug}>
              <button
                type="button"
                disabled={!tw.built}
                onClick={() => tw.built && onOpenTown(tw.slug)}
                title={tw.built ? t("overviewOpen", lang) : t("overviewNotBuilt", lang)}
                style={{
                  width: "100%", textAlign: "left", border: "none", borderRadius: 8,
                  padding: "6px 8px", cursor: tw.built ? "pointer" : "default",
                  background: "rgba(255,255,255,0.06)", color: "inherit",
                  opacity: tw.built ? 1 : 0.55, font: "13px/1.2 var(--font)",
                  display: "flex", justifyContent: "space-between", gap: 8,
                }}
              >
                <span>{tw.town}{!tw.built && ` · ${t("overviewNotBuilt", lang)}`}</span>
                <span style={{ opacity: 0.7 }}>{tw.ejBlockGroups}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
