/**
 * App — the planner screen. Holds state (budget, slider, language, which plan),
 * runs the optimizer on demand, and feeds the map + the accessible table.
 *
 * The optimizer stays pure: App gathers inputs and calls optimize()/naivePlan().
 */

import { useEffect, useState } from "react";
import * as turf from "@turf/turf";
import { optimize } from "../optimizer/optimize";
import type { Plan } from "../optimizer/types";
import { loadAppData, loadTowns, type AppData, type TownInfo } from "./load-data";
import type { GeoCandidate } from "./demo-data";
import { Controls } from "./Controls";
import { Section } from "./Section";
import { TownPicker } from "./TownPicker";
import { PlannerMap } from "./PlannerMap";
import { RegionOverview } from "./RegionOverview";
import { ResidentView } from "./ResidentView";
import { PlanTable } from "./PlanTable";
import { WhyHere } from "./WhyHere";
import { SourcesPanel } from "./SourcesPanel";
import { SunIcon, InfoIcon, GlobeIcon, WarnIcon, TableIcon, PlusIcon, MinusIcon, FitIcon, RegionGlobeIcon, Chevron } from "./icons";
import { t, LANGUAGES, type Lang } from "../i18n/strings";
import { treeName } from "./describe";

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [towns, setTowns] = useState<TownInfo[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [budget, setBudget] = useState(12);
  const [equityWeight, setEquityWeight] = useState(0.3);
  const [year, setYear] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState<Plan | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [area, setArea] = useState<[number, number][] | null>(null);
  const [overview, setOverview] = useState(false);
  const [resident, setResident] = useState(false);

  // Load the list of built towns once, then load the first town's data.
  useEffect(() => {
    loadTowns().then((list) => {
      setTowns(list);
      const first = list[0] ?? null;
      if (first) {
        setActiveSlug(first.slug);
        loadAppData(first.base).then(setData);
      } else {
        // No index — fall back to the legacy flat Chelsea dataset.
        loadAppData().then(setData);
      }
    });
  }, []);

  // Switch towns: load the chosen town's data, reset the plan/selection, and
  // fly the map to its bounds (handled by PlannerMap's fitCity once data lands).
  function pickTown(slug: string) {
    const tw = towns.find((t) => t.slug === slug);
    if (!tw) return;
    setOverview(false);
    if (slug === activeSlug && data) return; // already loaded and showing
    setActiveSlug(slug);
    setOptimized(null);
    setPickedId(null);
    setArea(null);
    setDrawing(false);
    setData(null);
    loadAppData(tw.base).then((d) => {
      setData(d);
      setFlyToken((k) => k + 1); // tell the map to recenter on the new town
    });
  }
  const [flyToken, setFlyToken] = useState(0);

  const allCandidates = data?.candidates ?? [];
  // If the user drew a select-area polygon, limit candidates to inside it.
  const candidates: GeoCandidate[] = area
    ? allCandidates.filter((c) =>
        turf.booleanPointInPolygon(
          turf.point([c.lng, c.lat]),
          turf.polygon([[...area, area[0]]]),
        ),
      )
    : allCandidates;

  function runOptimize() {
    if (!candidates.length) return;
    setOptimizing(true);
    const opts = { budget, equityWeight };
    const opt = optimize(candidates, opts);
    // Brief delay so the "Optimizing…" state and the map animation read as work.
    window.setTimeout(() => {
      setOptimized(opt);
      setAnimationKey((k) => k + 1);
      setOptimizing(false);
      // Warn if we could not place the full requested budget (common inside a
      // small selected area, where spacing/validity limit how many fit).
      if (opt.trees.length < budget) {
        setShortfall({ placed: opt.trees.length, requested: budget });
      } else {
        setShortfall(null);
      }
    }, 300);
  }

  const [showShade, setShowShade] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [mapControls, setMapControls] = useState<{
    zoomIn: () => void;
    zoomOut: () => void;
    fitCity: () => void;
  } | null>(null);
  const [shortfall, setShortfall] = useState<{ placed: number; requested: number } | null>(null);

  // When a new town's data has loaded, recenter the map on it.
  useEffect(() => {
    if (flyToken > 0 && data && mapControls) {
      // fitCity reads the latest city boundary rings, updated when data lands.
      const id = window.setTimeout(() => mapControls.fitCity(), 120);
      return () => window.clearTimeout(id);
    }
  }, [flyToken, data, mapControls]);

  const activePlan = optimized;
  const activeTown = towns.find((t) => t.slug === activeSlug) ?? null;
  // A town with no candidate/shade data yet can still show buildings + equity;
  // it just can't run the planner. Treat unknown (no flag) as ready.
  const plannerReady = activeTown ? activeTown.hasPlanner !== false : true;
  const pickedTree =
    pickedId != null
      ? activePlan?.trees.find((t) => t.site.id === pickedId) ?? null
      : null;

  return (
    <div className="app-shell">
      {resident && data && (
        <ResidentView
          candidates={data.candidates}
          center={data.center}
          lang={lang}
          onExit={() => setResident(false)}
        />
      )}
      {/* Top banner: a slim line to open the resident (phone) view. */}
      {!resident && !overview && (
        <button type="button" className="resident-banner" onClick={() => setResident(true)}>
          {t("residentToggle", lang)}
        </button>
      )}
      {/* Full-bleed map underneath everything. */}
      <div className="map-full">
        {overview ? (
          <RegionOverview lang={lang} onOpenTown={pickTown} onClose={() => setOverview(false)} />
        ) : (
          <PlannerMap
            candidates={candidates}
            plan={activePlan}
            center={data?.center ?? { lng: -71.0331, lat: 42.3918 }}
            buildings={data?.buildings ?? null}
            shadeGrid={data?.shadeGrid ?? null}
            cityBoundary={data?.cityBoundary ?? null}
            water={data?.water ?? null}
            showShade={showShade}
            animationKey={animationKey}
            year={year}
            drawing={drawing}
            area={area}
            onAreaChange={(ring) => {
              setArea(ring);
              setDrawing(false);
            }}
            onPick={setPickedId}
            onReady={setMapControls}
          />
        )}
      </div>

      {/* Floating control panel, top-left — collapsible sections. */}
      <div className={`panel-float glass ${panelOpen ? "panel-open" : "panel-collapsed"}`}>
        <button
          type="button"
          className="panel-header"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <h1 style={{ margin: 0, fontSize: 21, display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.png" alt="" width={28} height={28} style={{ display: "block" }} />
            {t("appTitle", lang)}
          </h1>
          <span className="panel-chevron" aria-hidden="true">
            <Chevron open={panelOpen} />
          </span>
        </button>
        <div className="panel-body">
        <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.7, fontWeight: 500 }}>
          {t("subheading", lang)}
        </p>

        {/* Town picker — lists only towns the pipeline has built. */}
        <TownPicker
          towns={towns}
          activeSlug={activeSlug}
          lang={lang}
          onPick={pickTown}
        />

        <div style={{ marginTop: 6 }}>
          <Section title={t("sectionPlan", lang)} defaultOpen>
            {plannerReady ? (
              <>
                <Controls
                  lang={lang}
                  budget={budget}
                  equityWeight={equityWeight}
                  optimizing={optimizing}
                  onBudget={setBudget}
                  onEquity={setEquityWeight}
                  onOptimize={runOptimize}
                />
                {activePlan && (
                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    {t("planOptimized", lang)} — {t("treesPlaced", lang)}:{" "}
                    <strong>{activePlan.trees.length}</strong> ·{" "}
                    {t("totalScore", lang)}:{" "}
                    <strong>{activePlan.totalScore.toFixed(2)}</strong>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, opacity: 0.8, margin: "4px 0" }}>
                {t("plannerComingSoon", lang)}
              </p>
            )}
          </Section>

          <Section title={t("sectionArea", lang)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={!area && !drawing ? "primary" : ""}
                style={{ flex: 1, minWidth: 0 }}
                onClick={() => {
                  setArea(null);
                  setDrawing(false);
                  setOptimized(null);
                  setPickedId(null);
                }}
              >
                {t("areaWhole", lang)}
              </button>
              <button
                type="button"
                className={drawing ? "primary" : ""}
                style={{ flex: 1, minWidth: 0 }}
                onClick={() => {
                  setArea(null);
                  setDrawing(true);
                  setOptimized(null);
                  setPickedId(null);
                }}
              >
                {t("areaSelect", lang)}
              </button>
              {area && (
                <button
                  type="button"
                  style={{ flexBasis: "100%" }}
                  onClick={() => {
                    setArea(null);
                    setDrawing(false);
                    setOptimized(null);
                    setPickedId(null);
                  }}
                >
                  {t("areaClear", lang)}
                </button>
              )}
            </div>
          </Section>

          <Section title={t("sectionGrowth", lang)}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>
                {t("growthYear", lang)} <strong>{year}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={30}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label={t("growthLabel", lang)}
                aria-valuetext={`${t("growthYear", lang)} ${year}`}
              />
              <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}>
                <span>0 · {t("growthPlanted", lang)}</span>
                <span>30 · {t("growthMature", lang)}</span>
              </span>
            </label>
          </Section>
        </div>
        <div className="panel-credit">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            {t("mapCredit", lang)}
          </a>
        </div>
        </div>
      </div>

      {/* Icon rail, top-right. */}
      <div className="rail">
        <button
          type="button"
          className={showShade ? "active" : ""}
          data-label={t("shadeToggle", lang)}
          title={t("shadeToggle", lang)}
          aria-pressed={showShade}
          onClick={() => setShowShade((v) => !v)}
        >
          <SunIcon />
        </button>
        <button
          type="button"
          className={showLang ? "active" : ""}
          data-label={t("language", lang)}
          title={t("language", lang)}
          aria-pressed={showLang}
          onClick={() => setShowLang((v) => !v)}
        >
          <GlobeIcon />
        </button>
        <button
          type="button"
          className={showTable ? "active" : ""}
          data-label={t("tableView", lang)}
          title={t("tableView", lang)}
          aria-pressed={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          <TableIcon />
        </button>
        <button
          type="button"
          className={showSources ? "active" : ""}
          data-label={t("sourcesTitle", lang)}
          title={t("sourcesTitle", lang)}
          aria-pressed={showSources}
          onClick={() => setShowSources((v) => !v)}
        >
          <InfoIcon />
        </button>
        <button
          type="button"
          className={overview ? "active" : ""}
          data-label={overview ? t("overviewBack", lang) : t("overviewToggle", lang)}
          title={t("overviewToggle", lang)}
          aria-pressed={overview}
          onClick={() => setOverview((v) => !v)}
        >
          <RegionGlobeIcon />
        </button>
      </div>

      {/* Language menu, opens beside the rail globe. Native names stay native. */}
      {showLang && (
        <div className="lang-menu glass">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className={lang === l.code ? "active" : ""}
              onClick={() => {
                setLang(l.code);
                setShowLang(false);
              }}
            >
              {l.native}
            </button>
          ))}
        </div>
      )}

      {/* Shade legend, bottom-left, only when the overlay is on. */}
      {showShade && (
        <div className="legend glass">
          <strong>{t("shadeToggle", lang)}</strong>
          <div className="bar" />
          <div className="ends">
            <span>{t("shadeNone", lang)}</span>
            <span>{t("shadeFull", lang)}</span>
          </div>
        </div>
      )}

      {/* Why-here popup. */}
      {pickedTree && (
        <WhyHere
          tree={pickedTree}
          lang={lang}
          name={treeName(
            activePlan?.trees.findIndex((t) => t.site.id === pickedTree.site.id) ?? 0,
            lang,
          )}
          onClose={() => setPickedId(null)}
          equity={data?.equity ?? null}
        />
      )}

      {/* Zoom + recenter pill, bottom-right: fit-to-city, zoom in, zoom out. */}
      <div className="zoom-pill glass">
        <button
          type="button"
          data-label={t("recenter", lang)}
          aria-label={t("recenter", lang)}
          onClick={() => mapControls?.fitCity()}
        >
          <FitIcon />
        </button>
        <button
          type="button"
          data-label={t("zoomIn", lang)}
          aria-label={t("zoomIn", lang)}
          onClick={() => mapControls?.zoomIn()}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          data-label={t("zoomOut", lang)}
          aria-label={t("zoomOut", lang)}
          onClick={() => mapControls?.zoomOut()}
        >
          <MinusIcon />
        </button>
      </div>

      {/* Table overlay — bottom strip, stops left of the right-side controls. */}
      {showTable && activePlan && (
        <div
          className="glass"
          style={{
            position: "fixed",
            left: 16,
            right: 78,
            bottom: 16,
            maxHeight: "min(320px, 42vh)",
            overflow: "auto",
            padding: 14,
            zIndex: 6,
          }}
        >
          <PlanTable plan={activePlan} lang={lang} onPick={setPickedId} />
        </div>
      )}

      {/* Empty state — table pressed but no plan yet. Same warning card style. */}
      {showTable && !activePlan && (
        <div
          className="glass"
          role="alertdialog"
          aria-label={t("tableEmpty", lang)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 340,
            padding: 20,
            zIndex: 20,
            textAlign: "center",
          }}
        >
          <div style={{ color: "var(--warn)", display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <WarnIcon size={34} />
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 13.5, opacity: 0.85, lineHeight: 1.45 }}>
            {t("tableEmpty", lang)}
          </p>
          <button type="button" className="primary" onClick={() => setShowTable(false)}>
            {t("warnOk", lang)}
          </button>
        </div>
      )}

      {/* Sources panel — toggled by the info button, top-right beside the rail. */}
      {showSources && (
        <div
          className="glass sources-float"
          style={{
            position: "absolute",
            top: 16,
            right: 76,
            width: 340,
            maxHeight: "calc(100vh - 32px)",
            overflow: "auto",
            zIndex: 7,
          }}
        >
          <SourcesPanel lang={lang} />
        </div>
      )}

      {/* Map attribution — bottom-center, glass style. */}
      <div className="map-credit glass">
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          {t("mapCredit", lang)}
        </a>
      </div>
      {/* Shortfall warning — requested trees can't fit in the selected area. */}
      {shortfall && (
        <div
          className="glass"
          role="alertdialog"
          aria-label={t("warnTitle", lang)}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 340,
            padding: 20,
            zIndex: 20,
            textAlign: "center",
          }}
        >
          <div style={{ color: "var(--warn)", display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <WarnIcon size={34} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>{t("warnTitle", lang)}</h2>
          <p style={{ margin: "0 0 14px", fontSize: 13.5, opacity: 0.85, lineHeight: 1.45 }}>
            {t("warnBody", lang)
              .replace("{placed}", String(shortfall.placed))
              .replace("{requested}", String(shortfall.requested))}
          </p>
          <button type="button" className="primary" onClick={() => setShortfall(null)}>
            {t("warnOk", lang)}
          </button>
        </div>
      )}
    </div>
  );
}
