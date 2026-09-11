# Security Policy

Dynamic Island runs inside the user's long-lived Omarchy shell process. It
treats MPRIS metadata and Wayland toplevel metadata as untrusted.

## Boundaries

- User-controlled text is bounded, stripped of ASCII control characters, and
  rendered with `Text.PlainText`.
- Player and toplevel collection scans are capped before source detection and
  rendering.
- Compound metadata values are rejected before conversion; supported arrays are
  limited by item count and per-item length.
- MPRIS artwork is intentionally unsupported. The plugin never reads
  `trackArtUrl`, resolves player-supplied filesystem paths, fetches artwork, or
  assigns a player-supplied value to QML `Image.source`.
- The plugin does not spawn child processes or execute shell commands. Volume
  changes use Quickshell's typed PipeWire API.

## Network and files

The plugin makes no network requests and does not read media artwork or other
player-supplied files. It reads only MPRIS, PipeWire, and Wayland metadata made
available by the Omarchy/Quickshell runtime.

## Verification

Run the offline adversarial checks with:

```bash
node tests/test_adversarial.js
```

The suite includes regression checks that fail if MPRIS artwork consumption,
QML image-source loading, helper processes, or shell commands are reintroduced.
