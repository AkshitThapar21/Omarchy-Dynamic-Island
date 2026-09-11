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
const giantArray = new Array(100000).fill('SpamArtistName');
assert(sandbox.sanitizeString(giantArray, 80).length <= 80,
  'Bounds large metadata arrays before joining');
assert(sandbox.sanitizeString({ deep: { bomb: 'X'.repeat(5000) } }, 80) === '',
  'Rejects compound metadata objects without conversion');

console.log('\n4. Metadata, player, and toplevel collection bounds:');
const cleaned = sandbox.cleanTrackInfo('Dua Lipa - Levitating', 'Dua Lipa');
assert(cleaned.title === 'Levitating' && cleaned.artist === 'Dua Lipa',
  'Prevents duplicate artist display');
const fakeToplevels = Array.from({ length: 500 }, (_, i) => ({ appId: `chrome-app-${i}`, title: `Window ${i}` }));
const pwaSource = sandbox.detectSource({ dbusName: 'org.mpris.MediaPlayer2.chromium', identity: 'Chromium' }, fakeToplevels);
assert(typeof pwaSource.name === 'string' && pwaSource.name.length <= 30,
  'Bounds source detection across 500 toplevels');
const fakePlayers = Array.from({ length: 100 }, (_, i) => ({ dbusName: `org.mpris.MediaPlayer2.app_${i}`, identity: `App ${i}`, isPlaying: false }));
fakePlayers[2].isPlaying = true;
fakePlayers[2].trackTitle = 'Active Track';
assert(sandbox.resolveActivePlayer(fakePlayers, '').dbusName === 'org.mpris.MediaPlayer2.app_2',
  'Resolves an active player within the bounded player list');

console.log('\n5. Null safety:');
assert(sandbox.resolveActivePlayer(null, null) === null, 'Handles a null player list');
assert(sandbox.detectSource(null, null).name === 'System', 'Handles a null player');
assert(sandbox.cleanTrackInfo(null, null).title === 'No Track', 'Handles null track metadata');
assert(sandbox.computeActiveEvent(null, null).id === 'idle', 'Handles no active events');

console.log('\n====================================================');
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log('====================================================\n');

if (failed > 0) process.exit(1);
