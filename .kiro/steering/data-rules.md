---
inclusion: always
---

# Treecast — Data Rules

- `data/raw/` is read-only. Never edit, overwrite or delete anything there.
- Every dataset in `/data` or `/public/data` has an entry in `data/sources.json`
  with: name, agency, url, license, date accessed, and what it can't tell us.
- Show the agency's name in the UI wherever its data appears. Link official
  pages; never copy or republish them.
- Pull only the slice we need (one neighborhood bounding box). Never rehost
  whole datasets.
- Savings are modeled estimates, not measurements. Every number shown to a user
  says "estimated".
- Ship no personal data. Building IDs only, no owner names.
