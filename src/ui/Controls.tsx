/**
 * Controls — the Plan section body: tree budget, energy-vs-equity slider, and
 * the Optimize button. Language lives in the icon rail; growth has its own
 * section. Every control is a native input (keyboard + focus); labels via i18n.
 */

import { t, type Lang } from "../i18n/strings";

interface Props {
  lang: Lang;
  budget: number;
  equityWeight: number;
  optimizing: boolean;
  onBudget: (n: number) => void;
  onEquity: (w: number) => void;
  onOptimize: () => void;
}

export function Controls(p: Props) {
  const pct = Math.round(p.equityWeight * 100);
  return (
    <>
      <label style={{ display: "grid", gap: 6 }}>
        <span>
          {t("budgetLabel", p.lang)}: <strong>{p.budget}</strong>{" "}
          {t("budgetUnit", p.lang)}
        </span>
        <input
          type="range"
          min={1}
          max={40}
          value={p.budget}
          onChange={(e) => p.onBudget(Number(e.target.value))}
          aria-label={t("budgetLabel", p.lang)}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t("sliderLabel", p.lang)}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => p.onEquity(Number(e.target.value) / 100)}
          aria-label={t("sliderLabel", p.lang)}
          aria-valuetext={`${pct}% ${t("sliderEquity", p.lang)}, ${
            100 - pct
          }% ${t("sliderEnergy", p.lang)}`}
        />
        <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
          <span>{t("sliderEnergy", p.lang)}</span>
          <span>{t("sliderEquity", p.lang)}</span>
        </span>
      </label>

      <button
        type="button"
        onClick={p.onOptimize}
        disabled={p.optimizing}
        className="primary"
        style={{ padding: "11px 16px" }}
      >
        {p.optimizing ? t("optimizing", p.lang) : t("optimize", p.lang)}
      </button>
    </>
  );
}
