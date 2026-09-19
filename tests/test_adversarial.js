#!/usr/bin/env node

/**
 * Offline adversarial checks for Dynamic Island. These tests cover the
 * untrusted metadata boundary and ensure no MPRIS artwork path reaches QML.
 */

const fs = require('fs');
const path = require('path');

const pluginDir = path.join(__dirname, '..');
const modelPath = path.join(pluginDir, 'IslandModel.js');
let modelCode = fs.readFileSync(modelPath, 'utf8');
modelCode = modelCode.replace(/\.pragma\s+library\s*;?/g, '');

const sandbox = {};
const fn = new Function('exports', modelCode + `
  exports.sanitizeString = sanitizeString;
  exports.pipewireVolumeFromUi = pipewireVolumeFromUi;
  exports.uiVolumeFromPipewire = uiVolumeFromPipewire;
  exports.cleanTrackInfo = cleanTrackInfo;
  exports.detectSource = detectSource;
  exports.resolveActivePlayer = resolveActivePlayer;
  exports.computeActiveEvent = computeActiveEvent;
  exports.safeInteger = safeInteger;
  exports.safeString = safeString;
`);
fn(sandbox);

let passed = 0;
let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('Running Adversarial & Security Test Suite');
console.log('====================================================\n');

console.log('1. Artwork boundary removal:');
const sources = modelCode
  + fs.readFileSync(path.join(pluginDir, 'Panel.qml'), 'utf8')
  + fs.readFileSync(path.join(pluginDir, 'BarWidget.qml'), 'utf8');
assert(!/trackArtUrl|sanitizeArtUrl|isAllowedLocalPath|activeArtworkSource|localArtResolver/.test(sources),
  'Does not consume MPRIS artwork paths or retain an artwork loader');
assert(!/\bProcess\s*\{|\bStdioCollector\b|\bbar\.run\s*\(/.test(sources),
  'Does not spawn helpers or execute shell commands');
assert(!/\bImage\s*\{[\s\S]*?\bsource\s*:/.test(sources),
  'Does not pass an untrusted URL or path to QML Image.source');
assert(/lastKnownSnapshot/.test(sources) && /livePlayer/.test(sources) && /activePlayer/.test(sources),
  'Separates live player QObject from display snapshot data');
assert(/hasMedia:\s*(?:activePlayer|snapshot)/.test(sources),
  'Keeps paused metadata visible without requiring isPlaying');
assert(/isPlayerLive/.test(sources) && /canTogglePlay/.test(sources),
  'Guards player controls with verified collection liveness');

console.log('\n2. Perceptual volume mapping:');
const backendAt30 = sandbox.pipewireVolumeFromUi(0.30);
assert(backendAt30 > 0.5 && backendAt30 < 0.6,
  'Maps a 30% UI value above the near-mute linear amplitude');
assert(Math.abs(sandbox.uiVolumeFromPipewire(backendAt30) - 0.30) < 0.000001,
  'Round-trips the displayed volume percentage');

console.log('\n3. String bounds and plain-text safety:');
const hugeString = '<script>alert("xss")</script>' + 'A'.repeat(50000);
assert(sandbox.sanitizeString(hugeString, 120).length <= 120,
  'Caps a 50k-character metadata string before rendering');
assert(sandbox.sanitizeString('Track\x00Name\x07With\x1bEscapes\x7f', 50) === 'TrackNameWithEscapes',
  'Strips non-printable control characters');
assert(sandbox.sanitizeString('<img src=x onerror=1>', 80).indexOf('\x00') === -1,
  'Keeps rich-text-looking metadata as inert plain text');
assert(sandbox.sanitizeString(Infinity, 80) === '' && sandbox.sanitizeString(NaN, 80) === '',
  'Rejects non-finite numeric metadata');
assert(sandbox.sanitizeString(true, 80) === 'true' && sandbox.sanitizeString(false, 80) === 'false',
  'Normalizes boolean metadata safely');
const giantArray = new Array(100000).fill('SpamArtistName');
assert(sandbox.sanitizeString(giantArray, 80).length <= 80,
  'Bounds large metadata arrays before joining');
assert(sandbox.sanitizeString(['Artist A', 'Artist B', 'Artist C', 'Artist D', 'Artist E', 'Artist F'], 200)
    .split(', ').length === 5,
  'Caps array metadata to five items');
assert(sandbox.sanitizeString(['A'.repeat(100)], 80).length <= 40,
  'Caps each array item before joining');
assert(sandbox.sanitizeString({ deep: { bomb: 'X'.repeat(5000) } }, 80) === '',
  'Rejects compound metadata objects without conversion');

console.log('\n4. Track metadata cleaning:');
const cleaned1 = sandbox.cleanTrackInfo('Never Gonna Give You Up - YouTube Music', 'Rick Astley');
assert(cleaned1.title === 'Never Gonna Give You Up', 'Strips YouTube Music suffix');
const cleaned2 = sandbox.cleanTrackInfo('Drake - Hotline Bling', '');
assert(cleaned2.title === 'Hotline Bling' && cleaned2.artist === 'Drake', 'Splits Artist - Title when artist is absent');
const cleaned3 = sandbox.cleanTrackInfo('Dua Lipa - Levitating', 'Dua Lipa');
assert(cleaned3.title === 'Levitating' && cleaned3.artist === 'Dua Lipa', 'Prevents duplicate artist display');
const cleaned4 = sandbox.cleanTrackInfo('Only Title', 'Only Title');
assert(cleaned4.title === 'Only Title' && cleaned4.artist === '', 'Clears identical artist and title');
const cleaned5 = sandbox.cleanTrackInfo('<style>body{display:none}</style>Song Name', '<img src=x onerror=1>');
assert(cleaned5.title.length <= 120 && cleaned5.artist.length <= 80, 'Bounds rich-text-looking track metadata');

console.log('\n5. Metadata dictionary and source detection bounds:');
const bombMetadata = {
  'xesam:title': 'Legitimate Song',
  'xesam:artist': giantArray,
  'xesam:album': { deep: { deeper: { bomb: 'X'.repeat(5000) } } }
};
for (let i = 0; i < 5000; i++) bombMetadata[`custom_junk_key_${i}`] = 'X'.repeat(5000);
const bombPlayer = {
  dbusName: 'org.mpris.MediaPlayer2.spotify',
  identity: 'Spotify',
  trackTitle: 'Legitimate Song',
  trackArtist: 'Legitimate Artist',
  trackMetadata: bombMetadata
};
const startTime = Date.now();
const bombResult = sandbox.detectSource(bombPlayer, []);
assert(bombResult.name === 'Spotify' && Date.now() - startTime < 200,
  'Handles a 5,000-key metadata dictionary within a bounded time');
assert(sandbox.detectSource({ identity: 'Spotify', trackTitle: 'Song' }, []).brand === 'spotify',
  'Detects Spotify from sanitized identity');
assert(sandbox.detectSource({ identity: 'VLC media player', trackTitle: 'Song' }, []).brand === 'vlc',
  'Detects VLC from sanitized identity');
assert(sandbox.detectSource({ identity: 'Apple Music', trackTitle: 'Song' }, []).brand === 'applemusic',
  'Detects Apple Music from sanitized identity');
assert(sandbox.detectSource({ identity: 'YouTube Music', trackTitle: 'Song' }, []).brand === 'ytmusic',
  'Detects YouTube Music from sanitized identity');

console.log('\n6. Metadata, player, and toplevel collection bounds:');
const fakeToplevels = Array.from({ length: 500 }, (_, i) => ({ appId: `chrome-app-${i}`, title: `Window ${i}` }));
const pwaSource = sandbox.detectSource({ dbusName: 'org.mpris.MediaPlayer2.chromium', identity: 'Chromium' }, fakeToplevels);
assert(typeof pwaSource.name === 'string' && pwaSource.name.length <= 30,
  'Bounds source detection across 500 toplevels');
const fakePlayers = Array.from({ length: 100 }, (_, i) => ({ dbusName: `org.mpris.MediaPlayer2.app_${i}`, identity: `App ${i}`, isPlaying: false }));
fakePlayers[2].isPlaying = true;
fakePlayers[2].trackTitle = 'Active Track';
assert(sandbox.resolveActivePlayer(fakePlayers, '').dbusName === 'org.mpris.MediaPlayer2.app_2',
  'Resolves an active player within the bounded player list');
const preferred = sandbox.resolveActivePlayer(fakePlayers, 'org.mpris.MediaPlayer2.app_5');
assert(preferred && preferred.dbusName === 'org.mpris.MediaPlayer2.app_5',
  'Honors a preferred player key within the inspection bound');
const paused = fakePlayers[5];
paused.trackTitle = 'Paused Track';
paused.canPlay = true;
assert(sandbox.resolveActivePlayer(fakePlayers, '').dbusName === 'org.mpris.MediaPlayer2.app_2',
  'Prioritizes actively playing media over paused controllable media');

const activeEvent = sandbox.computeActiveEvent({ trackTitle: 'Song', trackArtist: 'Artist', identity: 'Spotify', isPlaying: true }, [], []);
assert(activeEvent.id === 'media' && activeEvent.priority === 80, 'Creates a high-priority active media event');
const idleEvent = sandbox.computeActiveEvent(null, [{ id: 'notification', active: true, priority: 10 }], []);
assert(idleEvent.id === 'notification', 'Selects an active extra event when no media is playing');

console.log('\n7. Null and empty safety:');
assert(sandbox.resolveActivePlayer(null, null) === null, 'Handles a null player list');
assert(sandbox.resolveActivePlayer([], '') === null, 'Handles an empty player list');
assert(sandbox.detectSource(null, null).name === 'System', 'Handles a null player');
assert(typeof sandbox.detectSource({}, []).name === 'string', 'Handles an empty player object');
assert(sandbox.cleanTrackInfo(null, null).title === 'No Track', 'Handles null track metadata');
assert(sandbox.cleanTrackInfo('', '').title === 'No Track', 'Handles empty track metadata');
assert(sandbox.computeActiveEvent(null, null).id === 'idle', 'Handles no active events');
assert(sandbox.computeActiveEvent(null, []).id === 'idle', 'Handles an empty event list');

console.log('\n8. Settings defense and safe helpers:');
assert(sandbox.safeInteger('250', 160, 0, 1000) === 250, 'Parses valid integer setting');
assert(sandbox.safeInteger(-50, 160, 0, 1000) === 0, 'Clamps integer setting to minimum bound');
assert(sandbox.safeInteger(5000, 160, 0, 1000) === 1000, 'Clamps integer setting to maximum bound');
assert(sandbox.safeInteger('not_a_number', 160, 0, 1000) === 160, 'Falls back safely on NaN setting value');
assert(sandbox.safeInteger(undefined, 160, 0, 1000) === 160, 'Falls back safely on undefined setting value');
assert(sandbox.safeString('  Spotify  ', '', 64) === 'Spotify', 'Trims valid string setting');
assert(sandbox.safeString('A'.repeat(200), '', 64).length === 64, 'Caps string setting to max length');
assert(sandbox.safeString(null, 'default', 64) === 'default', 'Falls back safely on null string setting');

console.log('\n====================================================');
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log('====================================================\n');

if (failed > 0) process.exit(1);

