# Security Policy & Architecture

This document describes the threat model, security controls, and residual risk analysis for the **Dynamic Island** plugin (`akshit.island`).

## Threat Model & Security Controls

### 1. Untrusted Text Rendering & XSS Protection
- **Vulnerability:** Malicious MPRIS players or web pages passing HTML/Rich-Text tags (e.g. `<img src=x onerror=...>`, `<script>`, `<style>`) via `xesam:title`, `xesam:artist`, `xesam:album`, or window titles to execute code or disrupt layout.
- **Mitigation:**
  - Every single `Text` element across `BarWidget.qml` and `Panel.qml` (23 total Text elements) explicitly enforces `textFormat: Text.PlainText`.
  - Non-printable ASCII control characters (`\x00`–`\x1F`, `\x7F`) are stripped from all incoming metadata strings.
  - String lengths are hard-capped prior to rendering.

### 2. Zero External Network Footprint (Zero-Trust)
- **Vulnerability:** Malicious remote URLs attempting SSRF, port scanning, decompression bombs, slowloris/hung connections, arbitrary response bytes, unverified redirects, or image decoder exploits against the long-lived Wayland shell process.
- **Mitigation:**
  - Remote external artwork fetching (`http://`, `https://`) has been **completely removed**. `sanitizeArtUrl()` rejects all non-`file://` schemes.
  - The plugin performs **zero outbound network requests**, eliminating any possibility of remote payload delivery or data exfiltration.
  - When playing remote streams (Spotify Web, YouTube, SoundCloud, etc.), the panel displays crisp, theme-native vector glyphs and brand accent colors with zero network overhead.

### 3. Local File Scheme & Physical Canonical Containment
- **Vulnerability:** Malicious `file://` URIs attempting directory traversal (`%2e%2e`), sensitive system file exfiltration (`/etc/shadow`, `/proc/kcore`), or symlinks inside allowed directories pointing to sensitive private files (`/tmp/foo.jpg -> ~/.ssh/id_rsa`).
- **Mitigation:**
  - **Stage 1 (Syntax & Positive Root Filtering):** `isAllowedLocalPath()` in `IslandModel.js` decodes percent-encoded bytes (`decodeURIComponent`), normalizes path segments (resolving `.` and `..`), and ensures the path is anchored strictly beneath positive roots:
    - User cache / icon roots: `/home/<user>/.cache/` and `/home/<user>/.local/share/` with verified image extensions (`.jpg`, `.png`, `.webp`, `.svg`, `.bmp`, `.ico`).
    - Ephemeral MPRIS roots: Direct children of `/tmp/` and `/var/tmp/` matching real MPRIS client naming schemes (`.org.chromium.Chromium.*`, `spotify-cover-*`, `vlc-art-*`).
    - Browser MPRIS ephemeral artwork: Strictly isolated thumbnail directories for Gecko and Chromium browsers (`~/.config/(zen|firefox|librewolf|floorp|waterfox|torbrowser|palemoon)/firefox-mpris/`, `~/.mozilla/firefox-mpris/`, and Flatpak profiles) matching `^[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|bmp|gif|svg)$`. Any other `.config` files or sensitive paths remain strictly forbidden.
  - **Stage 2 (Physical Inode Resolution & Symlink Rejection):** In `Panel.qml`, candidate local files are resolved through `realpath -e -P`.
    - **Symlink Rejection:** The physical canonical path returned by `realpath -e -P` must match the input candidate path exactly (`resolved === candidatePath`). If any component of the path is a symlink, it is rejected immediately.
    - **Containment Verification:** The physical resolved path is re-verified against `isAllowedLocalPath(resolved)`. If the target resides outside the allowed roots, it is dropped.
    - **Memory Bounding:** Image decoding is capped with `sourceSize: 128x128`.

### 4. Generation-Bound Lifecycle & Cancellation
- Monotonic generation counter (`artworkGeneration`) in `Panel.qml` tracks track/player changes.
- Rapid skipping immediately blanks `activeArtworkSource = ""` to abort in-flight Qt image decodes, cancels any pending `localArtResolver` process, and drops stale results if the generation changed during resolution.

### 5. Memory & Denial-of-Service Defense
- Metadata inspection type-checks before conversion, slicing native string buffers first and capping array elements (max 5 items, 40 chars each) to prevent materialization of multi-megabyte D-Bus variants.
