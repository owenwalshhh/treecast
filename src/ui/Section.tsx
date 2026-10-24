/**
 * Section — a collapsible panel block. The heading is a button; clicking it
 * opens/closes the body (zoom.earth-style accordion). Keyboard operable; the
 * chevron rotates to show state.
 */

import { useState, type ReactNode } from "react";
import { Chevron } from "./icons";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button
        type="button"
        className="section-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}
