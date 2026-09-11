# Changelog

All notable changes to the **Dynamic Island** plugin (`akshit.island`) are documented in this file.

## [1.1.2] - Volume control fix

### Changed
- **Perceptual volume slider:** Map the linear UI percentage through a square-root curve when writing PipeWire volume, and apply the inverse when displaying it. Low slider positions are no longer almost silent.

## [1.1.1] - Security remediation

### Changed
- **Removed all MPRIS artwork loading:** The plugin no longer reads `trackArtUrl`, resolves filesystem paths, or assigns untrusted URLs or paths to QML `Image.source`.
- **Removed child-process execution:** The previous `realpath`, `omarchy-audio-output-sink`, and `wpctl` routes are gone. Volume controls use Quickshell's typed PipeWire API.
- **Added regression tests:** The adversarial suite now asserts that artwork loading and process execution cannot be reintroduced accidentally.

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
- **Zero External Network Artwork (Zero-Trust):** Removed remote HTTP/HTTPS image fetching entirely to eliminate external attack surfaces, response-byte overruns, unverified redirects, and remote image decoder exploits. Remote media tracks display theme-native vector brand glyphs and accent colors.
- **Canonical Local Artwork Containment & Symlink Rejection:** Local `file://` URIs are validated through a two-stage containment pipeline: syntax and path normalization in `IslandModel.js`, followed by physical inode resolution via `realpath -e -P` in `Panel.qml`. Any symlinks (`resolved !== candidate`) or targets outside verified positive roots (`~/.cache/`, `~/.local/share/`, `/tmp/`, `/var/tmp/`) are strictly rejected.
- **Pre-Conversion Type Bounds:** Metadata inspection type-checks before string conversion, slicing native string buffers and bounding array items (max 5 items, 40 chars each) to protect against memory allocation attacks.
- **Generation-Bound Artwork Loader:** Artwork requests use a monotonic `artworkGeneration` counter with process cancellation and stale-result rejection during rapid track/player switches. Image decoding is memory-bounded with `sourceSize: 128x128`.
- **Resource Discipline:** Waveform visualizer animations automatically pause when the panel is closed or playback stops, ensuring 0% background CPU usage.
- **Debounced Hover Timers:** Single-shot timers with opposing cross-cancellation to prevent animation racing during rapid cursor hover.
- **Failure Resilience:** Late DBus registration recovery and graceful handling of abruptly terminated media players without UI hangs.
- **Visual Transitions:** Smoothed idle-to-active bar layout expansion using `Easing.OutCubic` curve with zero hard-cuts.

## [1.0.0] - Initial Release
- Interactive bar pill widget with media playback information and source detection.
- Expanded quick-control popup panel with 32-bar audio visualizer and multi-player switcher.
- Full compliance with Omarchy untrusted text PlainText and bounded artwork sanitization policies.
