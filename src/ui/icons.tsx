/**
 * Icons — a small set of consistent, Apple/SF-style line icons as inline SVG.
 * One stroke weight (1.8), round caps/joins, 24x24 viewBox. Using a single
 * coherent set (not mixed emoji) is what makes the rail read as designed.
 */

type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Sun — the shade/sun overlay toggle. */
export function SunIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** Swap arrows — optimized vs naive. */
export function SwapIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M7 4L3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 0 8h-1" />
      <path d="M17 20l4-4-4-4" />
    </svg>
  );
}

/** Info — sources & limits. */
export function InfoIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Pencil/region — select-area draw. */
export function RegionIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M4 7l4-3 5 2 6-2v13l-6 2-5-2-4 3z" />
      <path d="M8 4v13M13 6v13" />
    </svg>
  );
}

/** Translate — language picker (Google-Translate style: an "文/A" glyph pair). */
export function GlobeIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      {/* Left card: a Latin "A" (source language) */}
      <path d="M3.3 11.5L5.8 5l2.5 6.5M4.1 9.6h3.4" />
      {/* Right card: a CJK-ish glyph (target language) */}
      <path d="M13 7h7M16.5 7v2c0 3-1.8 5-4 6M14.5 10.5c.6 2.2 2.3 3.8 4.5 4.6" />
      {/* Divider arrow suggesting conversion */}
      <path d="M11 14v6M9 18l2 2 2-2" />
    </svg>
  );
}

/** Region globe — the "All of Inner Core" overview toggle. */
export function RegionGlobeIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M4.5 7h15M4.5 17h15" />
    </svg>
  );
}

/** Satellite — toggle a satellite/aerial basemap. */
export function SatelliteIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M6.5 2.5l3 3M2.5 6.5l3 3" />
      <rect x="3.2" y="5.2" width="4.5" height="4.5" rx="1" transform="rotate(45 5.45 7.45)" />
      <path d="M9 9l6 6M13 11l2.5-2.5a2.1 2.1 0 0 1 3 3L16 14" />
      <path d="M12.5 15.5a3 3 0 0 1-3 3M15 18a5.5 5.5 0 0 1-5.5 5.5" transform="translate(-1 -2)" />
      <circle cx="17.5" cy="17.5" r="1" />
    </svg>
  );
}

/** Chevron — collapsible section open/close. */export function Chevron({ size = 18, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base(size)}
      aria-hidden="true"
      style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 160ms ease" }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Warning triangle. */
export function WarnIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Table grid. */
export function TableIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 14h18M9 4v16" />
    </svg>
  );
}

/** Plus — zoom in. */
export function PlusIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Minus — zoom out. */
export function MinusIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

/** Compass — recenter / reset the view to the whole city. */
export function CompassIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </svg>
  );
}

/** Fit-to-bounds — reset view to the full city. */
export function FitIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </svg>
  );
}

/** Search — magnifier for the city search bar. */
export function SearchIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
