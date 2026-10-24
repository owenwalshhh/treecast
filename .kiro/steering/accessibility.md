---
inclusion: fileMatch
fileMatchPattern: "src/ui/**/*.tsx"
---

# Treecast — Accessibility

- Every map view has an equivalent sortable table for screen readers.
- Every control works by keyboard, with a visible focus outline.
- Colorblind-safe palette. Color never carries meaning alone; pair it with a
  label or icon.
- Text contrast meets WCAG AA.
- The resident view works at 375 px wide: no horizontal scroll, tap targets at
  least 44 px.
- Respect `prefers-reduced-motion`.
- All user-facing text goes through `src/i18n` in English and Spanish. No
  hard-coded UI strings.
