# Puffacles ↔ wabbazzar.com contract

This document is the authoritative contract between two separate deploys:

- **wabbazzar.github.io** (this repo) — serves `https://wabbazzar.com/`.
  Owns `ascii-art.json`, the long-press easter-egg trigger, and the shatter
  animation that hands off into the iframe.
- **puffacles** (separate repo) — serves `https://wabbazzar.com/puffacles/`.
  Owns the game, consumes `ascii-art.json`, and honors the query-param +
  postMessage hooks described below.

Any change to this document requires coordination across both repos. If you
are about to make a change that would break one of the behaviors below, open
an issue on **both** repos first.

---

## 1. ASCII glyph endpoint

### URL

```
https://wabbazzar.com/ascii-art.json
```

Same-origin with the game (both served from `wabbazzar.com`), so no CORS
headers required. The response has `Content-Type: application/json`.

If you ever move puffacles off `wabbazzar.com`, the site will need to add
`Access-Control-Allow-Origin: <game-origin>` (or `*`).

### Shape

Accept either of these forms. Callers SHOULD accept both; producers SHOULD
emit the object form with `glyphs`:

```jsonc
// Form A — object (preferred)
{ "glyphs": ["<glyph-string>", "<glyph-string>", ...] }

// Form B — bare array (legacy-accepted)
["<glyph-string>", "<glyph-string>", ...]
```

Each `<glyph-string>` is:

- A single string
- Newlines (`\n`) preserved as row separators
- Every row is the same width (pad with spaces if needed)
- Uses only printable ASCII: space, `.`, `:`, `+`, `#`, `|`, `-`, `/`, `\`
- No trailing spaces are guaranteed — do not rely on them for layout
- No BOM, no leading/trailing blank rows

Current production dimensions: **40 columns × 24 rows** per glyph. Callers
SHOULD auto-detect (`width = rows[0].length`, `height = rows.length`) rather
than hard-coding.

### Rendering assumptions

- **Monospace font required.** Non-monospace rendering will skew the glyph.
- **Corners are pre-masked with an iOS squircle.** Rows near the top, bottom,
  and sides already contain leading/trailing spaces that form rounded
  corners. The game MUST NOT apply additional clipping/masking — that would
  double-round and look wrong.
- The glyphs are designed to be tinted by the renderer (brightness only);
  they do not carry color information.

### Reserved / forward-compat

These keys are reserved on the root object for future use. The game SHOULD
ignore unknown keys gracefully:

- `version` (integer) — schema version. If absent, treat as `1`.
- `meta` (object) — free-form metadata (e.g. `{ "generatedAt": "..." }`).

If the game ever needs per-glyph metadata (href, label, depth hint), we'll
add it as a parallel array or promote `glyphs` entries to objects; that will
bump `version`.

### Fallback behavior (required)

The game MUST silently fall back to its default background if any of the
following occur — **no console errors, no UI tell**:

- Fetch error (network, DNS, offline)
- Non-2xx HTTP status (404, 5xx, etc.)
- Malformed JSON
- Empty `glyphs` array
- A glyph that fails basic validation (empty string, inconsistent row
  widths)

Rationale: the site may be mid-deploy; the JSON may be missing briefly; the
user may be offline. None of those should degrade the game experience.

### Regeneration (site side)

Glyphs are generated from `assets/icons/*.png` in this repo. To rebuild:

```bash
make ascii-art
```

This runs `tools/build_ascii_art.py`, which:

1. Loads each tile PNG.
2. Applies an iOS-style squircle mask (superellipse, n=5).
3. Flattens onto black.
4. Converts to ASCII via the directional pipeline from `ascii.js`.
5. Writes `ascii-art.json`.

Commit + push to `main`; GitHub Pages serves it from
`https://wabbazzar.com/ascii-art.json` within ~1 minute.

---

## 2. Easter-egg entry URL

### URL

```
https://wabbazzar.com/puffacles/?bg=wabbazzar
```

The site's easter egg (triggered by a long-press on the portfolio) loads
this URL in a full-screen iframe after a shatter animation. The URL is
hardcoded in [`easter-egg.js`](../easter-egg.js) (constant `PUFFACLES_URL`).

### Query params

| Param | Value        | Meaning                                                                    |
| ----- | ------------ | -------------------------------------------------------------------------- |
| `bg`  | `wabbazzar`  | Use the ASCII-rain background fetched from `/ascii-art.json`.              |
| `bg`  | (absent/other) | Default background (currently: desert).                                  |

The game SHOULD treat `?bg=wabbazzar` as a stable key. Adding new modes is
fine (`?bg=<new>`), but `?bg=wabbazzar` MUST continue to mean "ASCII rain
from `/ascii-art.json`".

---

## 3. Exit handshake (postMessage)

The portfolio wraps the game in an iframe. Once the game has focus, ESC
keydowns don't cross the iframe boundary back to the parent. The parent
already shows a `✕ exit` button top-right, but the game MAY optionally
provide an in-game exit that closes the iframe.

To trigger exit from inside the game, `postMessage` to the parent:

```js
// Form A — bare string
window.parent.postMessage("puffacles:exit", "*");

// Form B — object (preferred; lets us add fields later)
window.parent.postMessage({ type: "puffacles:exit" }, "*");
```

The parent listens for either form and runs the reverse-shatter dismissal.
See [`easter-egg.js`](../easter-egg.js), function `playShatter` → `onMsg`.

**Security note:** the parent currently accepts `postMessage` from any
origin because the iframe is same-origin. If puffacles ever moves to a
different origin, the parent will need to check `ev.origin` explicitly.

### Reserved message types

The `puffacles:` prefix is reserved for game → site messages. Current:

- `puffacles:exit` — dismiss the iframe and restore the portfolio.

Future candidates (not yet implemented): `puffacles:ready`,
`puffacles:score`, `puffacles:error`.

### Parallel integrations (same handshake pattern)

The site embeds two other sub-deploys in the same full-screen iframe
overlay with the same bottom-right `✕ exit` button. They follow the same
`<label>:exit` postMessage convention:

| Integration | Entry                                                        | Exit postMessage  |
| ----------- | ------------------------------------------------------------ | ----------------- |
| puffacles   | long-press on the portfolio (shatter animation)              | `puffacles:exit`  |
| tetris      | fast triple-tap on the portfolio (shatter animation)         | `tetris:exit`     |
| portavec    | clicking a `wabbazzar.com/portavec/` link (plain cross-fade) | `portavec:exit`   |

The `✕ exit` button lives in the bottom-right of the iframe overlay so
it doesn't collide with the scoreboards/HUDs that games typically pin
to the top. Games may display a scoreboard anywhere that avoids that
corner.

Implementing `<label>:exit` on the sub-deploy is optional but
encouraged: it lets the game provide its own "Back to wabbazzar" button
in addition to the parent's overlay button, which is useful on mobile
where the overlay button may be covered by virtual keyboards or the
safe-area inset.

---

## 4. Ownership split

| Concern                                  | Owner            |
| ---------------------------------------- | ---------------- |
| `ascii-art.json` shape + content         | wabbazzar-site   |
| Squircle/corner-clip of glyphs           | wabbazzar-site   |
| Easter-egg trigger (long-press gesture)  | wabbazzar-site   |
| Shatter animation + iframe lifecycle     | wabbazzar-site   |
| `PUFFACLES_URL` constant                 | wabbazzar-site   |
| Game rendering (including how it draws   | puffacles        |
|  ASCII glyphs, horizon depth-sort, etc.) |                  |
| `?bg=wabbazzar` fetch + fallback         | puffacles        |
| `postMessage("puffacles:exit")` emission | puffacles        |
| Error handling inside the iframe         | puffacles        |

---

## 5. Failure surface (what each side should handle)

### Site side (this repo)

- Puffacles URL returns non-200 → iframe shows broken page. The easter egg
  still plays the shatter; the game is just missing. User can dismiss with
  the `✕ exit` button.
- Puffacles emits an unknown `postMessage` type → site ignores it silently.

### Puffacles side

- `/ascii-art.json` fetch fails or returns bad data → silently use default
  background (see §1 "Fallback behavior").
- Parent does not respond to `puffacles:exit` → game continues unharmed
  (no blocking wait for ack).
- Missing `?bg=` param → default background.

---

## 6. Change process

1. Draft the change in an issue on the repo that owns the affected concern
   (see §4).
2. Tag a maintainer on the other repo.
3. Once merged, update this document.
4. Ship the consumer (`wabbazzar-site` for JSON changes; `puffacles` for URL
   changes) **after** the producer.

Breaking changes SHOULD bump `version` in the JSON and be gated by it on the
consumer side, so old + new versions can coexist during rollout.
