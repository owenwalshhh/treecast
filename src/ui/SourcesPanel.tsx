/**
 * SourcesPanel — the "Sources & limits" panel (feature 6).
 *
 * Loads data/sources.json and lists each dataset with its agency, what it is
 * used for, and — honestly — what it cannot tell us. Then the known modeling
 * limits. Satisfies data-rules.md: show the agency, link official pages, and
 * say plainly that every number is a modeled estimate.
 */

import { useEffect, useState } from "react";
import { t, type Lang } from "../i18n/strings";

interface Source {
  name: string;
  agency: string;
  url: string;
  license?: string;
  used_for?: string;
  cannot_tell_us?: string;
}

export function SourcesPanel({ lang }: { lang: Lang }) {
  const [sources, setSources] = useState<Source[]>([]);

  useEffect(() => {
    fetch("/data/sources.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSources(j?.sources ?? []))
      .catch(() => setSources([]));
  }, []);

  return (
    <section style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>{t("sourcesTitle", lang)}</h2>
      <p style={{ fontSize: 13, color: "rgba(241,245,239,0.75)" }}>{t("sourcesIntro", lang)}</p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {sources.map((s) => (
          <li
            key={s.name}
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "var(--radius-sm)",
              padding: 10,
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "rgba(241,245,239,0.7)" }}>{s.agency}</div>
            {s.used_for && (
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <strong>{t("sourcesUsedFor", lang)}:</strong> {s.used_for}
              </div>
            )}
            {s.cannot_tell_us && (
              <div style={{ fontSize: 13, color: "#f0a775", marginTop: 2 }}>
                <strong>{t("sourcesCantTell", lang)}:</strong> {s.cannot_tell_us}
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.url}
              </a>
            </div>
          </li>
        ))}
      </ul>

      <h3 style={{ marginBottom: 6 }}>{t("limitsTitle", lang)}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        <li>{t("limit1", lang)}</li>
        <li>{t("limit2", lang)}</li>
        <li>{t("limit3", lang)}</li>
        <li>{t("limit4", lang)}</li>
        <li>{t("limit5", lang)}</li>
        <li>{t("limit6", lang)}</li>
      </ul>
    </section>
  );
}
