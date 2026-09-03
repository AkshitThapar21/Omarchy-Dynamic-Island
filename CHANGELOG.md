# Changelog

All notable changes to the **Dynamic Island** plugin (`akshit.island`) are documented in this file.

## [1.1.0] - Production Hardening & Marketplace Release

### Added
- **Plugin Settings Schema:** Exposed user-configurable settings in `manifest.json`:
  - `hoverOpenDelay` (default: 160ms): Cursor hover debounce delay before opening.
  - `hoverCloseDelay` (default: 280ms): Cursor exit debounce delay before closing.
  - `panelWidth` (default: 380px): Configurable width for the expanded card.
  - `preferredPlayer` (default: ""): Priority MPRIS player when multiple are active.
- **Keyboard Accessibility:** Full keyboard navigation support:
  - `Space` / `Return`: Toggle expanded panel from focused bar widget.
  - `Escape`: Close expanded panel.
  - `n` / `l`: Next track.
  - `p` / `h`: Previous track.
  - `+` / `-`: Adjust volume.
  - `m`: Toggle mute.
  - Visual keyboard focus ring respecting shell palette and focus border styles.
- **Reduced Motion Support:** Respects shell `animationsEnabled` and `foregroundAnimationEnabled` flags, disabling spring overshoot and easing transitions for motion-sensitive environments.

### Optimized & Hardened
- **Strict Remote Origin Allowlist:** Restricted cover art fetching to trusted media CDNs (Spotify, YouTube, Apple Music, SoundCloud, Bandcamp, Deezer, Tidal) over HTTPS on default port 443; rejected unwhitelisted hosts and custom ports.
- **Positive Local Root Allowlist & Canonicalization:** Local cover paths decode percent-encoding, resolve traversal sequences, and strictly enforce positive allowed directory roots (`/tmp/`, `/var/tmp/`, `~/.cache/`, `~/.local/share/icons/`, `~/.local/share/thumbnails/`).
- **Pre-Conversion Type Bounds:** Metadata inspection type-checks before string conversion, slicing native string buffers and bounding array items (max 5 items, 40 chars each) to protect against memory allocation attacks.
- **Generation-Bound Artwork Loader:** Artwork requests use a monotonic generation counter with cancellation and stale-result rejection during rapid track/player switches.
- **Resource Discipline:** Waveform visualizer animations automatically pause when the panel is closed or playback stops, ensuring 0% background CPU usage.
- **Debounced Hover Timers:** Single-shot timers with opposing cross-cancellation to prevent animation racing during rapid cursor hover.
- **Failure Resilience:** Late DBus registration recovery and graceful handling of abruptly terminated media players without UI hangs.
- **Visual Transitions:** Smoothed idle-to-active bar layout expansion using `Easing.OutCubic` curve with zero hard-cuts.

## [1.0.0] - Initial Release
- Interactive bar pill widget with media playback information and source detection.
- Expanded quick-control popup panel with 32-bar audio visualizer and multi-player switcher.
- Full compliance with Omarchy untrusted text PlainText and bounded artwork sanitization policies.
