# Claude Configuration

## Commit Messages
- Do not include Claude Code generation footprint
- Use clean, descriptive commit messages without attribution
- Keep commits concise and focused on the actual changes

## Puffacles contract

This site coordinates with a separate deploy at `https://wabbazzar.com/puffacles/`
via:

- `ascii-art.json` at the site root (consumed by the game).
- The long-press easter egg in `easter-egg.js`, which loads the game in an
  iframe via `PUFFACLES_URL = "https://wabbazzar.com/puffacles/?bg=wabbazzar"`.
- A `postMessage("puffacles:exit")` handshake for in-game exit.

**Before changing any of those interfaces, read [`docs/puffacles-contract.md`](docs/puffacles-contract.md).**
That file is the authoritative spec shared with the puffacles agent; drifting
from it silently breaks the game in production. Any change to the JSON shape,
the iframe URL, or the postMessage protocol requires updating the doc *and*
coordinating with the puffacles maintainer.

## Regenerating ascii-art.json

`make ascii-art` runs `tools/build_ascii_art.py`, which applies an iOS
squircle mask to each tile icon before ASCII conversion. Glyphs ship with
their rounded corners baked in — do not double-clip on the consumer side.