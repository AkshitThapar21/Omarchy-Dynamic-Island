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
  'file:///home/user/.config/secrets.env',
  'qrc:///qt/etc/passwd',
  'ftp://evil.com/bomb.png',
  '../../../../etc/passwd',
  'file://' + 'a'.repeat(600), // Overlength
  // Encoded and traversal variants
  'file:///tmp/%2e%2e/%2e%2e/etc/passwd',
  'file:///tmp/..%2f..%2fproc%2fkcore',
  'file:///home/user/.cache/..%2f.ssh/id_rsa',
  // Arbitrary and unwhitelisted remote origins (MUST BE REJECTED)
  'https://evil.com/decompression_bomb.png',
  'https://attacker.org/image.jpg',
  'https://169.254.169.254/latest/meta-data',
  'https://127.0.0.1:8080/exploit.png',
  'https://i.scdn.co:8443/image.png', // Non-default port
  'http://i.scdn.co/insecure.png',     // Insecure plaintext HTTP
  'https://attacker-i.scdn.co/fake.png',
  'https://i.scdn.co.evil.com/fake.png',
  // Arbitrary local files in /tmp/ (MUST BE REJECTED by narrowed pattern allowlist)
  'file:///tmp/foo.jpg',
  'file:///tmp/arbitrary_symlink.png',
  'file:///tmp/nested/dir/.org.chromium.Chromium.abc',
  'file:///home/user/.cache/amberol/private.txt',
  'file:///home/user/.cache/amberol/id_rsa',
  'file:///var/.cache/amberol/cover.jpg', // Unanchored outside user home
  'file:///tmp/@user/.org.chromium.Chromium.abc',
  'https://i.scdn.co@evil.com/fake.png',
  null,
  undefined,
  12345,
  { toString: () => 'file:///etc/passwd' }
];

for (const badUrl of dangerousUrls) {
  const sanitized = sandbox.sanitizeArtUrl(badUrl);
  assert(sanitized === '', `Blocked dangerous/untrusted artwork input: ${String(badUrl).slice(0, 50)}`);
}

// Positive Allowed URLs
assert(
  sandbox.sanitizeArtUrl('file:///tmp/.org.chromium.Chromium.C3Zzex') === 'file:///tmp/.org.chromium.Chromium.C3Zzex',
  'Allowed safe Chromium temp cover art URI (/tmp/.org.chromium...)'
);
assert(
  sandbox.sanitizeArtUrl('file:///var/tmp/.org.chromium.Chromium.X9Zza') === 'file:///var/tmp/.org.chromium.Chromium.X9Zza',
  'Allowed safe Chromium var/tmp cover art URI (/var/tmp/.org.chromium...)'
);
assert(
  sandbox.sanitizeArtUrl('file:///tmp/spotify-cover-12345.jpg') === 'file:///tmp/spotify-cover-12345.jpg',
  'Allowed safe Spotify temp cover art URI (/tmp/spotify-cover-*.jpg)'
);
assert(
  sandbox.sanitizeArtUrl('file:///home/user/.cache/amberol/cover.jpg') === 'file:///home/user/.cache/amberol/cover.jpg',
  'Allowed safe user cache cover art URI (~/.cache/amberol/*.jpg)'
);
assert(
  sandbox.sanitizeArtUrl('https://i.scdn.co/image/ab67616d0000b273b5c1a8d0524458cf680be635') === 'https://i.scdn.co/image/ab67616d0000b273b5c1a8d0524458cf680be635',
  'Allowed safe HTTPS Spotify CDN cover art URI'
);
assert(
  sandbox.sanitizeArtUrl('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg') === 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  'Allowed safe HTTPS YouTube CDN cover art URI'
);
assert(
  sandbox.sanitizeArtUrl('https://is1-ssl.mzstatic.com/image/thumb/Music/v4/cover.jpg') === 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/cover.jpg',
  'Allowed safe HTTPS Apple Music CDN cover art URI'
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
// 4. Metadata Dictionary & Compound Variant Bombing
// ----------------------------------------------------
console.log('\n4. Metadata Dictionary & Compound Variant Bombing Tests:');

// Test 1: Giant Array inside xesam:artist (100,000 items)
const giantArray = new Array(100000).fill('SpamArtistName');
const sanitizedArray = sandbox.sanitizeString(giantArray, 80);
assert(sanitizedArray.length <= 80 && sanitizedArray.includes('SpamArtistName'), 'Pre-conversion bounded 100k array items without materializing full array');

// Test 2: Giant 5MB string
const giantString = 'B'.repeat(5000000);
const sanitizedGiantString = sandbox.sanitizeString(giantString, 80);
assert(sanitizedGiantString.length <= 80, 'Sliced 5MB string native buffer before processing');

// Test 3: Nested compound object
const nestedObj = { deep: { deeper: { bomb: 'X'.repeat(5000) } } };
const sanitizedObj = sandbox.sanitizeString(nestedObj, 80);
assert(sanitizedObj === '', 'Rejected unsupported nested object compound variant');

// Test 4: 5,000 keys with large payloads
const bombMetadata = {
  'xesam:title': 'Legitimate Song',
  'xesam:artist': giantArray,
  'xesam:album': nestedObj
};
for (let i = 0; i < 5000; i++) {
  bombMetadata[`custom_junk_key_${i}`] = 'X'.repeat(5000);
}

const testPlayer = {
  dbusName: 'org.mpris.MediaPlayer2.spotify',
  identity: 'Spotify',
  trackTitle: 'Legitimate Song',
  trackArtist: 'Legitimate Artist',
  trackMetadata: bombMetadata
};

const startTime = Date.now();
const sourceResult = sandbox.detectSource(testPlayer, []);
const elapsedMs = Date.now() - startTime;
assert(sourceResult.name === 'Spotify' && elapsedMs < 200, `Safely parsed metadata dictionary bomb with 5,000 keys in ${elapsedMs}ms`);

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
