# Baking town data on another machine (Windows) and bringing it back

You can compute the town data on a bigger machine and copy just the result
files back — no need to move the whole project. The pipeline only produces
static files under `public/data/`, so this is safe and simple.

Everything below uses the SAME `npm run` commands on both machines (Mac and
Windows). The scripts use Node + `tar`, both of which ship on macOS and on
Windows 10/11.

---

## One-time: carry the private source files to the Windows machine

The GitHub repo does NOT include `data/raw/` (the private MassGIS EJ + utility
CSVs). You move them over once.

### On THIS Mac
```
npm run raw:export
```
This writes `treecast-raw.tgz` at the project root (a few MB).

Copy `treecast-raw.tgz` to the Windows machine (USB, AirDrop to a shared drive,
email to yourself — it's tiny).

---

## On the WINDOWS machine

1. Install the prerequisites (once):
   - **Node.js 20+** — https://nodejs.org
   - **DuckDB CLI** — https://duckdb.org/docs/installation (put `duckdb.exe` on
     your PATH, or set `DUCKDB=C:\path\to\duckdb.exe`)
   - Git — https://git-scm.com

2. Clone the repo and install:
   ```
   git clone https://github.com/owenwalshhh/treecast.git
   cd treecast
   npm install
   ```

3. Drop `treecast-raw.tgz` into the `treecast` folder, then:
   ```
   npm run raw:import
   ```
   (This unpacks the private sources into `data\raw`.)

4. Fetch the EJ block-group geometry (needed for the regional equity layer):
   ```
   node data/raw/ej/fetch-geometry.mjs
   ```

5. Bake every town (sequential; Boston is the slow one):
   ```
   npm run bake:bg
   ```
   With lots of memory this is much faster than on the Mac. It's resumable — if
   you stop it, re-running skips towns already built.

6. Package the result:
   ```
   npm run data:export
   ```
   This writes `treecast-data.tgz` at the project root.

Copy `treecast-data.tgz` back to the Mac.

---

## Back on THIS Mac

Drop `treecast-data.tgz` into the `treecast` folder, then:
```
npm run data:import
npm run dev
```
The town picker now lists every town you baked, and "All of Inner Core" shows
them all. Done — no project transfer, just the data.

---

## Notes
- `npm run data:import` MERGES into `public/data` (it overwrites a town that's
  already there and leaves the rest), so importing is safe to repeat.
- The `.tgz` files are gitignored on purpose — they're transfer artifacts, not
  source.
- If `tar` is somehow missing on Windows, use any zip tool to compress/extract
  the `public/data` folder manually instead of the export/import scripts.
