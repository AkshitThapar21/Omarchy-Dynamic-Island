# Dynamic Island for Omarchy Quattro

A sleek, interactive dynamic island bar-widget for Omarchy Quattro that expands on hover to display now-playing MPRIS track metadata, rich album artwork, live animated audio waveforms, volume scrubbing, and playback controls.

## Features

- **Hover Expansion:** Expands width smoothly on hover to open a quick-controls panel with debounced timers (~160ms open, ~280ms close) to eliminate flicker during fast cursor movements.
- **Hover Bridging:** Stays open seamlessly while hovering either the pill on the bar or the expanded panel.
- **MPRIS Controls:** Play/Pause, Next Track, and Previous Track controls with live status sync.
- **Live Audio Waveform:** 32-bar animated harmonic waveform layer rendered behind the playback controls.
- **Interactive Volume Slider:** Pipewire-integrated volume scrubbing slider with live percentage badge and mute toggle.
- **Web App & PWA Detection:** Recognizes PWAs (Apple Music, YouTube Music, Spotify, Plex, Jellyfin, etc.) and web media directly via Wayland toplevel detection.
- **Multi-Player Support:** Detects and switches between active media players (Spotify, Firefox, Chromium, Apple Music, VLC, mpv, etc.).
- **Keyboard Navigation:** Uses `PanelKeyCatcher`:
  - `Space` — Toggle Play/Pause
  - `←` / `h` / `p` — Previous Track
  - `→` / `l` / `n` — Next Track
  - `↑` / `+` / `k` — Volume Up (+5%)
  - `↓` / `-` / `j` — Volume Down (-5%)
  - `m` — Toggle Mute
  - `Esc` — Dismiss Panel
- **Zero Hardcoded Colors:** 100% theme-adaptive via `qs.Commons Style` and `Color` design tokens.

## Requirements

- Omarchy Quattro with Hyprland and Quickshell.
- Any standard MPRIS-compatible media player or browser (Chromium, Firefox, Spotify, Apple Music PWA, VLC, MPV, etc.).

## Installation & Management

### 1. Install via Git
```bash
omarchy plugin add https://github.com/<your-username>/omarchy-dynamic-island.git --enable
```

### 2. Positioning on the Bar
```bash
omarchy bar move akshit.island --section center
```

### 3. Update Plugin
```bash
omarchy plugin update akshit.island
```

### 4. Remove Plugin
```bash
omarchy plugin disable akshit.island
omarchy plugin remove akshit.island
```

## License

[MIT License](LICENSE) © 2026 Akshit
