# Claude Configuration

## Commit Messages
- Do not include Claude Code generation footprint
- Use clean, descriptive commit messages without attribution
- Keep commits concise and focused on the actual changes

## Iframe integrations (puffacles, tetris, portavec)

This site embeds three separate deploys in a full-screen iframe overlay
with a shared bottom-right `✕ exit` button:

- `https://wabbazzar.com/puffacles/` — long-press easter egg. Also consumes
  `ascii-art.json` at the site root.
- `https://wabbazzar.com/tetris/` — triple-tap easter egg.
- `https://wabbazzar.com/portavec/` — intercepted from regular link clicks on
  the portfolio so portavec loads in-frame (with the exit button serving as
  the back button) instead of navigating away.

All three accept a `postMessage("<label>:exit")` from the iframe to dismiss.
URLs are hardcoded in `easter-egg.js`; the portavec click interceptor matches
via `PORTAVEC_HREF_RE`.

**Before changing any of those interfaces, read [`docs/puffacles-contract.md`](docs/puffacles-contract.md).**
That file is the authoritative spec; drifting from it silently breaks
production. Any change to the JSON shape, iframe URLs, or postMessage
protocol requires updating the doc *and* coordinating with the respective
sub-deploy maintainer.

## Regenerating ascii-art.json

`make ascii-art` runs `tools/build_ascii_art.py`, which applies an iOS
squircle mask to each tile icon before ASCII conversion. Glyphs ship with
their rounded corners baked in — do not double-clip on the consumer side.