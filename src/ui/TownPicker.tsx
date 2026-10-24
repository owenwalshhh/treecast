/**
 * TownPicker — a typeahead city search. Type to filter the built towns, see a
 * clean dropdown, and click a row OR press Enter to load that town (the map
 * flies to it). Arrow keys move the highlight; Escape closes the list.
 *
 * Lists ONLY towns the pipeline has built (from public/data/towns.json).
 *
 * Accessibility (accessibility.md): an ARIA combobox — the input owns a listbox
 * of options, the active option is announced via aria-activedescendant, and
 * every action (type, arrow, Enter, Escape, click) is keyboard operable with a
 * visible focus ring. Labels come from i18n.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { TownInfo } from "./load-data";
import { t, type Lang } from "../i18n/strings";
import { SearchIcon } from "./icons";

interface Props {
  towns: TownInfo[];
  activeSlug: string | null;
  lang: Lang;
  onPick: (slug: string) => void;
}

export function TownPicker({ towns, activeSlug, lang, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeName = towns.find((tw) => tw.slug === activeSlug)?.name ?? "";

  // Filter by what's typed; empty query shows all built towns.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return towns;
    return towns.filter((tw) => tw.name.toLowerCase().includes(q));
  }, [query, towns]);

  // Keep the highlight in range as the list changes.
  useEffect(() => {
    setHighlight((h) => Math.min(Math.max(0, h), Math.max(0, matches.length - 1)));
  }, [matches.length]);

  // Click outside closes the dropdown and restores the active town's name.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function choose(slug: string) {
    onPick(slug);          // load the town + fly the map
    setOpen(false);
    setQuery("");
    (document.activeElement as HTMLElement)?.blur?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = matches[highlight] ?? matches[0];
      if (pick) choose(pick.slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  const listId = "town-picker-list";
  return (
    <div className="search-bar town-picker" ref={rootRef}>
      <span className="pick-icon" aria-hidden="true">
        <SearchIcon size={18} />
      </span>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[highlight] ? `tp-opt-${matches[highlight].slug}` : undefined}
        aria-label={t("townPicker", lang)}
        placeholder={towns.length === 0 ? t("townLoading", lang) : activeName || t("townPicker", lang)}
        value={open ? query : activeName}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="town-dropdown glass" id={listId} role="listbox">
          {matches.length === 0 && (
            <li className="town-opt empty" aria-disabled="true">{t("townNoMatch", lang)}</li>
          )}
          {matches.map((tw, i) => (
            <li
              key={tw.slug}
              id={`tp-opt-${tw.slug}`}
              role="option"
              aria-selected={tw.slug === activeSlug}
              className={`town-opt${i === highlight ? " hl" : ""}${tw.slug === activeSlug ? " current" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(tw.slug); }}
            >
              {tw.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
