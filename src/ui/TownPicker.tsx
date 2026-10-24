/**
 * TownPicker — replaces the old (non-functional) search bar. Lists ONLY the
 * towns the pipeline has built (from public/data/towns.json). Selecting one
 * tells App to load that town and fly the map to it.
 *
 * Accessibility (accessibility.md): a native <select> — fully keyboard
 * operable, screen-reader friendly, visible focus — styled to match the glass
 * search bar it replaces. The search icon stays as an affordance; labels via
 * i18n.
 */

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
  return (
    <div className="search-bar town-picker">
      <select
        value={activeSlug ?? ""}
        aria-label={t("townPicker", lang)}
        onChange={(e) => onPick(e.target.value)}
      >
        {towns.length === 0 && <option value="">{t("townLoading", lang)}</option>}
        {towns.map((tw) => (
          <option key={tw.slug} value={tw.slug}>
            {tw.name}
          </option>
        ))}
      </select>
      <span className="pick-icon" aria-hidden="true">
        <SearchIcon size={18} />
      </span>
    </div>
  );
}
