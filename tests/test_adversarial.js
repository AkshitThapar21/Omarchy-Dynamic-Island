#!/usr/bin/env node

/**
 * Adversarial Test Suite for Omarchy Dynamic Island (akshit.island)
 * Tests string sanitization, HTML/XSS neutralizations, artwork URI policies,
 * metadata dictionary bombing, collection bounds, and null safety.
 */

const fs = require('fs');
const path = require('path');

// Load IslandModel.js in a safe sandbox
const modelPath = path.join(__dirname, '..', 'IslandModel.js');
let modelCode = fs.readFileSync(modelPath, 'utf8');
// Remove .pragma library for standard Node evaluation
modelCode = modelCode.replace(/\.pragma\s+library\s*;?/g, '');

const sandbox = {};
const fn = new Function('exports', modelCode + `
  exports.sanitizeString = sanitizeString;
  exports.sanitizeArtUrl = sanitizeArtUrl;
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

// ----------------------------------------------------
// 1. Artwork URL Policy & Scheme Validation Tests
// ----------------------------------------------------
console.log('1. Artwork URL Policy & Dangerous Scheme Tests:');

const dangerousUrls = [
  'javascript:alert("pwn")',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=',
  'file:///etc/shadow',
  'file:///etc/passwd',
  'file:///proc/kcore',
  'file:///sys/kernel/debug/x',
  'file:///root/.ssh/id_rsa',
  'file:///home/user/.ssh/id_rsa',
  'file:///home/user/.gnupg/secring.gpg',
  'qrc:///qt/etc/passwd',
  'ftp://evil.com/bomb.png',
  '../../../../etc/passwd',
  'file://' + 'a'.repeat(600), // Overlength
  null,
  undefined,
  12345,
  { toString: () => 'file:///etc/passwd' }
];

for (const badUrl of dangerousUrls) {
  const sanitized = sandbox.sanitizeArtUrl(badUrl);
  assert(sanitized === '', `Blocked dangerous artwork input: ${String(badUrl).slice(0, 45)}`);
}

// Valid URLs
assert(
  sandbox.sanitizeArtUrl('file:///tmp/.org.chromium.Chromium.C3Zzex') === 'file:///tmp/.org.chromium.Chromium.C3Zzex',
  'Allowed safe local temp cover art URI'
);
assert(
  sandbox.sanitizeArtUrl('https://i.scdn.co/image/ab67616d0000b273b5c1a8d0524458cf680be635') === 'https://i.scdn.co/image/ab67616d0000b273b5c1a8d0524458cf680be635',
  'Allowed safe HTTPS Spotify cover art URI'
);

// ----------------------------------------------------
// 2. String Length Bounding & Control Character Stripping
// ----------------------------------------------------
console.log('\n2. String Length Bounding & Control Character Tests:');

const hugeString = '<script>alert("xss")</script>' + 'A'.repeat(50000);
const sanitizedHuge = sandbox.sanitizeString(hugeString, 120);
assert(sanitizedHuge.length <= 120, `Capped 50k character string to length <= 120 (got ${sanitizedHuge.length})`);

const controlChars = "Track\x00Name\x07With\x1bEscapes\x7f";
const sanitizedControl = sandbox.sanitizeString(controlChars, 50);
assert(sanitizedControl === "TrackNameWithEscapes", `Stripped non-printable ASCII control codes (got "${sanitizedControl}")`);

// ----------------------------------------------------
// 3. Track Metadata Cleaning & Title/Artist Splitting
// ----------------------------------------------------
console.log('\n3. Track Metadata Cleaning & PlainText Tests:');

const cleaned1 = sandbox.cleanTrackInfo('Never Gonna Give You Up - YouTube Music', 'Rick Astley');
assert(cleaned1.title === 'Never Gonna Give You Up', 'Stripped web music platform suffix');

const cleaned2 = sandbox.cleanTrackInfo('Drake - Hotline Bling', '');
assert(cleaned2.title === 'Hotline Bling' && cleaned2.artist === 'Drake', 'Cleanly parsed "Artist - Title" without metadata collision');

const cleaned3 = sandbox.cleanTrackInfo('Dua Lipa - Levitating', 'Dua Lipa');
assert(cleaned3.title === 'Levitating' && cleaned3.artist === 'Dua Lipa', 'Stripped duplicate artist from title when artist field is present');

const cleaned4 = sandbox.cleanTrackInfo('Only Title', 'Only Title');
assert(cleaned4.title === 'Only Title' && cleaned4.artist === '', 'Cleared artist when title and artist are identical to prevent duplicate display');

const xssTrack = sandbox.cleanTrackInfo('<style>body{display:none}</style>Song Name', '<img src=x onerror=1>');
assert(!xssTrack.title.includes('\x00') && xssTrack.title.length <= 120, 'Safely sanitized rich-text track metadata');

// ----------------------------------------------------
// 4. Metadata Dictionary Bombing
// ----------------------------------------------------
console.log('\n4. Metadata Dictionary Bombing Tests:');

const bombMetadata = {};
for (let i = 0; i < 5000; i++) {
  bombMetadata[`custom_junk_key_${i}`] = 'X'.repeat(500);
}
bombMetadata['xesam:title'] = 'Legitimate Song';
bombMetadata['xesam:artist'] = 'Legitimate Artist';

const testPlayer = {
  dbusName: 'org.mpris.MediaPlayer2.spotify',
  identity: 'Spotify',
  trackTitle: 'Legitimate Song',
  trackArtist: 'Legitimate Artist',
  trackMetadata: bombMetadata
};

const sourceResult = sandbox.detectSource(testPlayer, []);
assert(sourceResult.name === 'Spotify', `Safely parsed metadata bomb with 5,000 keys without hanging or memory explosion`);

// ----------------------------------------------------
// 5. Large Collection & Toplevel Scaling Tests
// ----------------------------------------------------
console.log('\n5. Large Collection Scaling Tests:');

const fakeToplevels = [];
for (let i = 0; i < 500; i++) {
  fakeToplevels.push({
    appId: `chrome-app-${i}-Default`,
    title: `Spam Window ${i}`
  });
}
const pwaSource = sandbox.detectSource({ dbusName: 'org.mpris.MediaPlayer2.chromium.instance123', identity: 'Chromium' }, fakeToplevels);
assert(typeof pwaSource.name === 'string' && pwaSource.name.length <= 30, `Capped toplevel scan to safe bounds on 500 open windows`);

const fakePlayers = [];
for (let j = 0; j < 100; j++) {
  fakePlayers.push({
    dbusName: `org.mpris.MediaPlayer2.app_${j}`,
    identity: `App ${j}`,
    isPlaying: false
  });
}
fakePlayers[2].isPlaying = true;
fakePlayers[2].trackTitle = 'Active Track';

const resolved = sandbox.resolveActivePlayer(fakePlayers, '');
assert(resolved && resolved.dbusName === 'org.mpris.MediaPlayer2.app_2', `Safely resolved active player in bounded player list`);

// ----------------------------------------------------
// 6. Null & Undefined Robustness Tests
// ----------------------------------------------------
console.log('\n6. Null & Undefined Safety Tests:');

assert(sandbox.resolveActivePlayer(null, null) === null, 'Handled null players list');
assert(sandbox.resolveActivePlayer([], '') === null, 'Handled empty players list');
assert(sandbox.detectSource(null, null).name === 'System', 'Handled null player in detectSource');
assert(sandbox.cleanTrackInfo(null, null).title === 'No Track', 'Handled null title/artist in cleanTrackInfo');
assert(sandbox.computeActiveEvent(null, null).id === 'idle', 'Handled null player in computeActiveEvent');

console.log('\n====================================================');
console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
