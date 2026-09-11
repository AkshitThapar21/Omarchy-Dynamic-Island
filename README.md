# Dynamic Island for Omarchy Quattro

A sleek, interactive dynamic island bar-widget for Omarchy Quattro that expands on hover to display now-playing MPRIS track metadata, live animated audio waveforms, volume scrubbing, and playback controls.

## Features

- **Hover Expansion:** Expands width smoothly on hover to open a quick-controls panel with debounced timers (~160ms open, ~280ms close) to eliminate flicker during fast cursor movements.
- **Hover Bridging:** Stays open seamlessly while hovering either the pill on the bar or the expanded panel.
- **MPRIS Controls:** Play/Pause, Next Track, and Previous Track controls with live status sync.
- **Live Audio Waveform:** 32-bar animated harmonic waveform layer rendered behind the playback controls.
- **Interactive Volume Slider:** Pipewire-integrated volume scrubbing slider with live percentage badge and mute toggle.
- **Web App & PWA Detection:** Recognizes PWAs (Apple Music, YouTube Music, Spotify, Plex, Jellyfin, etc.) and web media directly via Wayland toplevel mapping.
- **Multi-Player Support:** Detects and switches between active media players (Spotify, Firefox, Chromium, Apple Music, VLC, mpv, etc.).
- **Zero Hardcoded Colors:** 100% theme-adaptive via `qs.Commons Style` and `Color` design tokens.

## Security & Privacy Policy

- **Untrusted Text Sanitization:** All user-facing text sinks (track title, artist, album, player identity, desktop entry, DBus names, and window titles) explicitly enforce `textFormat: Text.PlainText` and control-character stripping.
- **No Artwork Loading:** The plugin intentionally ignores MPRIS artwork URLs and never assigns a player-provided URL or pathname to `Image.source`. It uses theme-native source glyphs instead.
- **No Child Processes:** The plugin does not spawn helpers or shell commands. Volume controls use Quickshell's typed PipeWire API directly.
- **Pre-Conversion Type Bounds:** MPRIS metadata dictionary inspection rejects compound objects prior to string conversion and strictly bounds array items (max 5 items, 40 chars each) to prevent memory allocation attacks.
- **Resource Limits:** Collection scanning for players and Wayland toplevels is strictly capped with safe slices to prevent resource exhaustion.

## Requirements

- Omarchy Quattro with Hyprland, Quickshell, and PipeWire.
- Any standard MPRIS-compatible media player or browser (Chromium, Firefox, Spotify, Apple Music PWA, VLC, MPV, etc.).

## Installation & Management

### 1. Install via Git
```bash
omarchy plugin add https://github.com/AkshitThapar21/Omarchy-Dynamic-Island.git --enable
```

### 2. Positioning on the Bar
```bash
omarchy bar move akshit.island --section center
```

### 3. Running Adversarial Tests
```bash
node tests/test_adversarial.js
```

### 4. Update Plugin
```bash
omarchy plugin update akshit.island
```

### 5. Remove Plugin
```bash
omarchy plugin disable akshit.island
omarchy plugin remove akshit.island
```

## License

[MIT License](LICENSE) © 2026 Akshit
