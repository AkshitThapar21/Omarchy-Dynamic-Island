# Security Policy & Architecture

This document describes the threat model, security controls, and residual risk analysis for the **Dynamic Island** plugin (`akshit.island`).

## Threat Model & Security Controls

### 1. Untrusted Text Rendering & XSS Protection
- **Vulnerability:** Malicious MPRIS players or web pages passing HTML/Rich-Text tags (e.g. `<img src=x onerror=...>`, `<script>`, `<style>`) via `xesam:title`, `xesam:artist`, `xesam:album`, or window titles to execute code or disrupt layout.
- **Mitigation:**
  - Every single `Text` element across `BarWidget.qml` and `Panel.qml` (23 total Text elements) explicitly enforces `textFormat: Text.PlainText`.
  - Non-printable ASCII control characters (`\x00`–`\x1F`, `\x7F`) are stripped from all incoming metadata strings.
  - String lengths are hard-capped prior to rendering.

### 2. Remote Artwork Security
- **Vulnerability:** Malicious URLs attempting SSRF, port scanning, decompression bombs, or arbitrary network exfiltration.
- **Mitigation:**
  - `sanitizeArtUrl()` enforces a strict **Positive Remote Origin Allowlist** (HTTPS only, default port 443).
  - Permitted CDN hosts are limited to verified media providers: Spotify (`i.scdn.co`, `*.spotifycdn.com`, `mosaic.scdn.co`), YouTube / Google (`i.ytimg.com`, `yt3.ggpht.com`, `lh3.googleusercontent.com`), Apple Music (`is*-ssl.mzstatic.com`), SoundCloud (`*.sndcdn.com`), Bandcamp (`*.bcbits.com`), Deezer (`*.dzcdn.net`), and Tidal (`resources.tidal.com`).
  - Plaintext HTTP, custom ports, IP addresses, localhost, and arbitrary external domains are rejected.
  - Image decoding is memory-bounded with `sourceSize: 128x128` to prevent texture decompression bombs.

### 3. Local File Scheme & Path Validation
- **Vulnerability:** Malicious `file://` URIs attempting directory traversal (`%2e%2e`), sensitive system file exfiltration (`/etc/shadow`, `/proc/kcore`), or symlink dereferencing to private user files (`~/.ssh/id_rsa`).
- **Mitigation:**
  - `isAllowedLocalPath()` performs URI percent-decoding and path canonicalization (resolving `.` and `..` segments).
  - **Narrowed Pattern Allowlist:** Acceptance in `/tmp/` and `/var/tmp/` is restricted to known ephemeral MPRIS client filename conventions:
    - Chromium/Chrome/Brave/Edge/Plasma: `/tmp/.\w+\.[a-zA-Z0-9_-]+` (e.g. `.org.chromium.Chromium.C3Zzex`)
    - Spotify/VLC/Electron: `/tmp/(spotify-cover|spotify|vlc-art|chromium-media|electron-mpris)-[a-zA-Z0-9._-]+\.(jpe?g|png|webp|bmp)`
    - Arbitrary filenames in `/tmp/` (e.g. `/tmp/foo.jpg`, `/tmp/id_rsa`) are rejected.
  - User cache roots (`~/.cache/`, `~/.local/share/`) require verified media subdirectories (`amberol`, `spotify`, `vlc`, `media-art`, `elisa`, `rhythmbox`, `thumbnails`, `icons`) and strict image file extensions (`.jpg`, `.png`, `.webp`, `.svg`, `.bmp`, `.ico`).
  - Access to sensitive user/system paths (`.ssh`, `.gnupg`, `.config`, `shadow`, `passwd`) is explicitly blocked.

### 4. Residual Risk Analysis (Symlinks in `/tmp/`)
- **Accepted Residual Risk:** Because pure QML/JS execution lacks a synchronous `realpath()` / `readlink -f` primitive without blocking the Wayland GUI thread on every MPRIS signal, a local process with write permissions to `/tmp/` could theoretically create a symlink that matches the exact ephemeral MPRIS filename pattern of an active browser instance (e.g. `/tmp/.org.chromium.Chromium.XYZ123 -> /home/user/.ssh/id_rsa`).
- **Why it is accepted:** 
  1. An attacker capable of predicting or creating race-condition symlinks matching dynamic ephemeral browser PIDs/handles already possesses local code execution under the user's UID.
  2. QML's `Image` element only attempts to decode images and will fail silently (`status: Image.Error`) when encountering non-image data (such as SSH private keys, text files, or binaries), dropping the source immediately without data leakage.

### 5. Memory & Denial-of-Service Defense
- Metadata inspection type-checks before conversion, slicing native string buffers first and capping array elements (max 5 items, 40 chars each) to prevent materialization of multi-megabyte D-Bus variants.
- Monotonic generation counter (`artworkGeneration`) cancels in-flight decodes and drops stale responses during rapid track skipping.
