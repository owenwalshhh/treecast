/**
 * WhyHere — the "Why here?" popup for one chosen tree.
 *
 * Takes a planned tree, asks the optimizer's pure explain() for the reasons,
 * and shows them as plain sentences in the active language. Accessible: a
 * labelled dialog, closable by button or Escape, focus moved to it on open.
 */

import { useEffect, useRef } from "react";
import { explain, type ReasonCode } from "../optimizer/explain";
import type { PlannedTree } from "../optimizer/types";
import { t, type Lang } from "../i18n/strings";
import { directionName, tierPhrase, needTierOf } from "./describe";

interface Props {
  tree: PlannedTree;
  lang: Lang;
  onClose: () => void;
  /** Readable name like "Tree 3" (plan-order rank); falls back to the id. */
  name?: string;
}

// Map a reason code to its i18n key (keys are reason_<code>).
function reasonText(code: ReasonCode, lang: Lang): string {
  return t(`reason_${code}` as any, lang);
}

export function WhyHere({ tree, lang, onClose, name }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const ex = explain(tree.site);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const leafLabel =
    tree.site.leafType === "evergreen"
      ? t("leafEvergreen", lang)
      : t("leafDeciduous", lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("whyHere", lang)}
      ref={ref}
      tabIndex={-1}
      className="glass whyhere"
      style={{
        position: "absolute",
        top: 16,
        left: 320,
        zIndex: 10,
        width: 320,
        maxWidth: "calc(100vw - 320px - 76px - 32px)",
        padding: 16,
        font: "14px/1.45 var(--font)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <strong>
          {t("whyHere", lang)} — {name ?? tree.site.id}
        </strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("whyClose", lang)}
          style={{
            border: "none",
            background: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "inherit",
          }}
        >
          ✕
        </button>
      </div>

      <dl style={{ margin: "0 0 10px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px" }}>
        <dt style={{ opacity: 0.7 }}>{t("whyDirection", lang)}</dt>
        <dd style={{ margin: 0 }}>{directionName(ex.direction, lang)}</dd>
        <dt style={{ opacity: 0.7 }}>{t("whyLeaf", lang)}</dt>
        <dd style={{ margin: 0 }}>{leafLabel}</dd>
        <dt style={{ opacity: 0.7 }}>{t("whyDistance", lang)}</dt>
        <dd style={{ margin: 0 }}>{Math.round(tree.site.distanceToWallFt)} ft</dd>
        <dt style={{ opacity: 0.7 }}>{t("whyEquity", lang)}</dt>
        <dd style={{ margin: 0 }}>
          {Math.round(ex.equityNeed * 100)}% · {tierPhrase(needTierOf(tree), lang)}
        </dd>
      </dl>

      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {ex.reasons.map((code) => (
          <li key={code} style={{ marginBottom: 4 }}>
            {reasonText(code, lang)}
          </li>
        ))}
      </ul>

      <p style={{ margin: "10px 0 0", fontSize: 12, opacity: 0.7 }}>
        {t("scoreNote", lang)}
      </p>
    </div>
  );
}
