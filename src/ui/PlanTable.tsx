/**
 * PlanTable — the sortable table that mirrors the map for screen readers
 * (accessibility.md: "Every map view has an equivalent sortable table"). Sorts
 * by column header; keyboard operable; all text via i18n.
 */

import { useMemo, useState } from "react";
import type { Plan } from "../optimizer/types";
import { t, type Lang } from "../i18n/strings";
import { directionName, locationDescription, treeName } from "./describe";

type SortKey = "id" | "direction" | "leaf" | "score";

interface Props {
  plan: Plan | null;
  lang: Lang;
  onPick?: (siteId: string) => void;
}

export function PlanTable({ plan, lang, onPick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [asc, setAsc] = useState(false);

  // Stable rank by plan order (plan is already best-first): id -> 0-based rank.
  const rankById = useMemo(() => {
    const m = new Map<string, number>();
    (plan?.trees ?? []).forEach((tr, i) => m.set(tr.site.id, i));
    return m;
  }, [plan]);

  const rows = useMemo(() => {
    const trees = plan?.trees ?? [];
    const sorted = [...trees].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = (rankById.get(a.site.id) ?? 0) - (rankById.get(b.site.id) ?? 0);
          break;
        case "direction":
          cmp = a.site.direction.localeCompare(b.site.direction);
          break;
        case "leaf":
          cmp = a.site.leafType.localeCompare(b.site.leafType);
          break;
        case "score":
          cmp = a.score - b.score;
          break;
      }
      return asc ? cmp : -cmp;
    });
    return sorted;
  }, [plan, sortKey, asc, rankById]);

  function toggle(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "id");
    }
  }

  const header = (key: SortKey, label: string) => (
    <th scope="col">
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-sort={sortKey === key ? (asc ? "ascending" : "descending") : "none"}
        style={{
          background: "none",
          border: "none",
          font: "inherit",
          cursor: "pointer",
          color: "inherit",
          padding: "4px 8px",
        }}
      >
        {label} {sortKey === key ? (asc ? "▲" : "▼") : ""}
      </button>
    </th>
  );

  const leafLabel = (leaf: string) =>
    leaf === "evergreen" ? t("leafEvergreen", lang) : t("leafDeciduous", lang);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {header("id", t("colId", lang))}
          {header("direction", t("colDirection", lang))}
          <th scope="col" style={{ padding: "4px 8px" }}>{t("colLocation", lang)}</th>
          {header("leaf", t("colLeaf", lang))}
          {header("score", t("colScore", lang))}
          {onPick && <th scope="col" style={{ padding: "4px 8px" }} aria-label={t("whyHere", lang)} />}
        </tr>
      </thead>
      <tbody>
        {rows.map((tree) => (
          <tr key={tree.site.id}>
            <td style={{ padding: "4px 8px" }}>{treeName(rankById.get(tree.site.id) ?? 0, lang)}</td>
            <td style={{ padding: "4px 8px" }}>
              {directionName(tree.site.direction, lang)}
            </td>
            <td style={{ padding: "4px 8px", opacity: 0.85 }}>
              {locationDescription(tree, lang)}
            </td>
            <td style={{ padding: "4px 8px" }}>
              {leafLabel(tree.site.leafType)}
            </td>
            <td style={{ padding: "4px 8px" }}>{Math.round(tree.score * 100)}</td>
            {onPick && (
              <td style={{ padding: "4px 8px" }}>
                <button
                  type="button"
                  onClick={() => onPick(tree.site.id)}
                  style={{ cursor: "pointer" }}
                >
                  {t("whyHere", lang)}
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
