.pragma library

// Security & sanitization limits
var MAX_STRING_LEN = 128
var MAX_ALL_TEXT_LEN = 1024
var MAX_TOPLEVELS_INSPECTED = 16
var MAX_PLAYERS_INSPECTED = 10

function sanitizeString(val, maxLen) {
  if (val === null || val === undefined) return ""
  var str = String(val)
  // Strip control characters & null bytes
  str = str.replace(/[\x00-\x1F\x7F]/g, "").trim()
  var limit = maxLen || MAX_STRING_LEN
  return str.length > limit ? str.slice(0, limit) : str
}

// Bounded artwork URL sanitizer
function sanitizeArtUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string" || rawUrl.length > 512) return ""
  var url = sanitizeString(rawUrl, 512)
  if (!url || url.length < 5) return ""

  // Deny dangerous / forbidden schemes and path traversals
  if (/^(\.\.|\/)/.test(url) || url.indexOf("..") !== -1) return ""
  if (/^(javascript|data|qrc|ftp|view-source|blob):/i.test(url)) return ""

  // Local file scheme validation
  if (/^file:\/\//i.test(url)) {
    // Prohibit sensitive system/user directories
    if (/^file:\/\/(proc|sys|dev|etc|root|var\/log)/i.test(url.replace(/^file:\/\//i, "file:/"))) return ""
    if (/^file:\/\/\/etc/i.test(url) || /^file:\/\/\/proc/i.test(url) || /^file:\/\/\/sys/i.test(url) || /^file:\/\/\/dev/i.test(url) || /^file:\/\/\/root/i.test(url)) return ""
    if (/\.(ssh|gnupg|bashrc|zshrc|profile|shadow|passwd)/i.test(url)) return ""
    return url
  }

  // Remote HTTP/HTTPS scheme validation (bounded URL structure)
  if (/^https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]{1,5})?(\/[^\s<>"'{}|\\^`\x00-\x1F\x7F]*)?$/i.test(url)) {
    return url
  }

  return ""
}

function playerKey(player) {
  if (!player) return ""
  var raw = player.dbusName || player.desktopEntry || player.identity || ""
  return sanitizeString(raw, 128)
}

function resolveActivePlayer(players, preferredKey) {
  if (!players || !players.length || players.length === 0) return null
  var limit = Math.min(players.length, MAX_PLAYERS_INSPECTED)

  // 1. If the user explicitly selected a player, use it if still valid
  if (preferredKey) {
    for (var i = 0; i < limit; i++) {
      if (players[i] && playerKey(players[i]) === preferredKey) {
        return players[i]
      }
    }
  }

  // 2. Playing player with metadata
  for (var j = 0; j < limit; j++) {
    var p = players[j]
    if (p && p.isPlaying && (p.trackTitle || p.trackArtist)) {
      return p
    }
  }

  // 3. Any playing player
  for (var k = 0; k < limit; k++) {
    var p2 = players[k]
    if (p2 && p2.isPlaying) {
      return p2
    }
  }

  // 4. Any player with metadata
  for (var m = 0; m < limit; m++) {
    var p3 = players[m]
    if (p3 && (p3.trackTitle || p3.trackArtist)) {
      return p3
    }
  }

  return players[0] || null
}

function boundPlayerList(players, maxCount) {
  if (!players || !players.length) return []
  var res = []
  var count = Math.min(players.length, maxCount || 6)
  for (var i = 0; i < count; i++) {
    if (players[i]) res.push(players[i])
  }
  return res
}

function detectPwaFromToplevels(toplevels, currentTitle) {
  if (!toplevels || !toplevels.length || toplevels.length === 0) return null
  var limit = Math.min(toplevels.length, MAX_TOPLEVELS_INSPECTED)
  var cleanCurrent = (currentTitle || "").toLowerCase()

  // PASS 1: Explicitly check for known Music / Video / Media services across all windows
  for (var i = 0; i < limit; i++) {
    var top = toplevels[i]
    if (!top) continue
    var appId = sanitizeString(top.appId || "", 128).toLowerCase()
    var title = sanitizeString(top.title || "", 128).toLowerCase()

    // 1. Apple Music PWA
    if (appId.indexOf("music.apple.com") !== -1 || appId.indexOf("apple-music") !== -1 || title.indexOf("apple music") !== -1 || title.indexOf("apple music") !== -1) {
      return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
    }
    // 2. YouTube Music PWA
    if (appId.indexOf("music.youtube") !== -1 || title.indexOf("youtube music") !== -1) {
      return { name: "YouTube Music", icon: "󰎆", brand: "ytmusic" }
    }
    // 3. YouTube PWA
    if (appId.indexOf("youtube.com") !== -1 || appId.indexOf("youtu.be") !== -1 || (title.indexOf("youtube") !== -1 && title.indexOf("music.youtube") === -1)) {
      return { name: "YouTube", icon: "󰗃", brand: "youtube" }
    }
    // 4. Spotify PWA
    if (appId.indexOf("spotify.com") !== -1 || title.indexOf("spotify") !== -1) {
      return { name: "Spotify", icon: "󰓇", brand: "spotify" }
    }
    // 5. SoundCloud PWA
    if (appId.indexOf("soundcloud.com") !== -1 || title.indexOf("soundcloud") !== -1) {
      return { name: "SoundCloud", icon: "󰓇", brand: "soundcloud" }
    }
    // 6. Twitch PWA
    if (appId.indexOf("twitch.tv") !== -1 || title.indexOf("twitch") !== -1) {
      return { name: "Twitch", icon: "󰕟", brand: "twitch" }
    }
    // 7. Bandcamp PWA
    if (appId.indexOf("bandcamp.com") !== -1 || title.indexOf("bandcamp") !== -1) {
      return { name: "Bandcamp", icon: "󰓇", brand: "bandcamp" }
    }
    // 8. Netflix PWA
    if (appId.indexOf("netflix.com") !== -1 || title.indexOf("netflix") !== -1) {
      return { name: "Netflix", icon: "󰝆", brand: "netflix" }
    }
    // 9. Prime Video / Amazon Music PWA
    if (appId.indexOf("primevideo.com") !== -1 || title.indexOf("prime video") !== -1) {
      return { name: "Prime Video", icon: "󰝆", brand: "primevideo" }
    }
    if (appId.indexOf("music.amazon") !== -1 || title.indexOf("amazon music") !== -1) {
      return { name: "Amazon Music", icon: "󰎆", brand: "amazonmusic" }
    }
    // 10. Plex / Jellyfin / Emby PWAs
    if (appId.indexOf("plex.tv") !== -1 || appId.indexOf("plex.direct") !== -1 || title.indexOf("plex") !== -1) {
      return { name: "Plex", icon: "󰚺", brand: "plex" }
    }
    if (appId.indexOf("jellyfin") !== -1 || title.indexOf("jellyfin") !== -1) {
      return { name: "Jellyfin", icon: "󰚺", brand: "jellyfin" }
    }
    if (appId.indexOf("emby") !== -1 || title.indexOf("emby") !== -1) {
      return { name: "Emby", icon: "󰚺", brand: "emby" }
    }
    // 11. Audiobookshelf / Audible PWA
    if (appId.indexOf("audiobookshelf") !== -1 || appId.indexOf("audible") !== -1 || title.indexOf("audiobookshelf") !== -1 || title.indexOf("audible") !== -1) {
      return { name: "Audiobook", icon: "󰂿", brand: "audiobookshelf" }
    }
    // 12. Pocket Casts / Podcasts PWA
    if (appId.indexOf("pocketcasts.com") !== -1 || title.indexOf("pocket casts") !== -1) {
      return { name: "Pocket Casts", icon: "󰦔", brand: "podcasts" }
    }
  }

  // PASS 2: If a window's title matches the currently playing track title
  if (cleanCurrent && cleanCurrent !== "no media playing" && cleanCurrent !== "no track") {
    for (var j = 0; j < limit; j++) {
      var top2 = toplevels[j]
      if (!top2) continue
      var tTitle = sanitizeString(top2.title || "", 128).toLowerCase()
      var tAppId = sanitizeString(top2.appId || "", 128)
      if (tTitle.indexOf(cleanCurrent.slice(0, 20)) !== -1) {
        var pwaMatch = tAppId.match(/^chrome-([a-zA-Z0-9._-]+)-default$/i)
        if (pwaMatch && pwaMatch[1]) {
          var domain = pwaMatch[1].replace(/__.*$/, "").replace(/_/g, ".")
          var clean = sanitizeString(domain.split(".")[0], 30)
          if (clean) clean = clean.charAt(0).toUpperCase() + clean.slice(1)
          return { name: clean || "Web App", icon: "󰎆", brand: "pwa" }
        }
      }
    }
  }

  return null
}

function detectSource(player, toplevels) {
  if (!player) return { name: "System", icon: "󰎆", brand: "system" }

  var title = sanitizeString(player.trackTitle || "", 128)
  var artist = sanitizeString(player.trackArtist || "", 128)
  var album = sanitizeString(player.trackAlbum || "", 128)
  var artUrl = sanitizeString(player.trackArtUrl || "", 256)
  var url = sanitizeString(player.trackUrl || "", 256)
  var identity = sanitizeString(player.identity || "", 64)
  var desktopEntry = sanitizeString(player.desktopEntry || "", 64)
  var dbusName = sanitizeString(player.dbusName || "", 64)

  // Bounded inspection of allowed metadata keys only
  var rawMeta = ""
  var ALLOWED_META_KEYS = [
    "mpris:artUrl", "mpris:trackid", "mpris:length",
    "xesam:url", "xesam:title", "xesam:artist", "xesam:album"
  ]

  var metaObj = player.trackMetadata || player.metadata
  if (metaObj && typeof metaObj === "object") {
    try {
      for (var kIdx = 0; kIdx < ALLOWED_META_KEYS.length; kIdx++) {
        var key = ALLOWED_META_KEYS[kIdx]
        if (key in metaObj && metaObj[key] !== undefined && metaObj[key] !== null) {
          var valStr = sanitizeString(metaObj[key], 80)
          if (valStr) rawMeta += " " + valStr
        }
      }
    } catch (e) {}
  }

  // PWA (Progressive Web App) and custom webapp name detection
  var pwaCandidate = ""
  if (desktopEntry) {
    var deClean = desktopEntry.replace(/\.desktop$/i, "").replace(/^app-/, "").replace(/^[a-z0-9._-]+-([a-zA-Z0-9]+)-Default$/, "$1").trim()
    if (deClean && !/^chrome-[a-z0-9]+-Default$/i.test(deClean) && !/^(chromium|firefox|google-chrome|brave|microsoft-edge|opera|vivaldi)$/i.test(deClean)) {
      pwaCandidate = sanitizeString(deClean.charAt(0).toUpperCase() + deClean.slice(1), 30)
    }
  }
  if (!pwaCandidate && identity && !/^(Chromium|Google Chrome|Mozilla Firefox|Firefox|Brave|Microsoft Edge|Opera|Vivaldi)$/i.test(identity.trim())) {
    pwaCandidate = sanitizeString(identity.trim(), 30)
  }

  // If the media is being hosted by a browser, check if an active PWA window is open
  var isBrowser = (identity.indexOf("Chromium") !== -1 || desktopEntry.indexOf("chromium") !== -1 || dbusName.indexOf("chromium") !== -1 ||
                   identity.indexOf("Chrome") !== -1 || desktopEntry.indexOf("chrome") !== -1 || dbusName.indexOf("chrome") !== -1 ||
                   identity.indexOf("Brave") !== -1 || desktopEntry.indexOf("brave") !== -1 || dbusName.indexOf("brave") !== -1 ||
                   identity.indexOf("Firefox") !== -1 || desktopEntry.indexOf("firefox") !== -1 || dbusName.indexOf("firefox") !== -1 ||
                   identity.indexOf("Mozilla") !== -1)

  if (isBrowser && toplevels && toplevels.length) {
    var pwaFound = detectPwaFromToplevels(toplevels, title)
    if (pwaFound) {
      return pwaFound
    }
  }

  var allText = (title + " " + artist + " " + album + " " + artUrl + " " + url + " " + rawMeta + " " + identity + " " + desktopEntry + " " + dbusName).slice(0, MAX_ALL_TEXT_LEN).toLowerCase()

  // 1. YouTube Music (PWA / WebApp / Web)
  if (allText.indexOf("music.youtube") !== -1 || allText.indexOf("youtube music") !== -1 || pwaCandidate.toLowerCase() === "youtube music") {
    return { name: "YouTube Music", icon: "󰎆", brand: "ytmusic" }
  }

  // 2. YouTube (PWA / WebApp / Web)
  if (allText.indexOf("youtube") !== -1 || allText.indexOf("youtu.be") !== -1 || artUrl.indexOf("ytimg.com") !== -1 || allText.indexOf("googlevideo.com") !== -1 || artUrl.indexOf("ggpht.com") !== -1 || pwaCandidate.toLowerCase() === "youtube") {
    return { name: "YouTube", icon: "󰗃", brand: "youtube" }
  }

  // 3. Spotify (PWA / WebApp / Desktop)
  if (allText.indexOf("spotify") !== -1 || artUrl.indexOf("scdn.co") !== -1 || allText.indexOf("spotify.com") !== -1 || pwaCandidate.toLowerCase() === "spotify") {
    return { name: "Spotify", icon: "󰓇", brand: "spotify" }
  }

  // 4. Apple Music / iTunes (PWA / WebApp / Web)
  if (allText.indexOf("apple music") !== -1 || allText.indexOf("music.apple.com") !== -1 || artUrl.indexOf("mzstatic.com") !== -1 || allText.indexOf("itunes") !== -1 || pwaCandidate.toLowerCase() === "apple music") {
    return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
  }

  // 5. SoundCloud (PWA / Web)
  if (allText.indexOf("soundcloud") !== -1 || artUrl.indexOf("sndcdn.com") !== -1 || pwaCandidate.toLowerCase() === "soundcloud") {
    return { name: "SoundCloud", icon: "󰓇", brand: "soundcloud" }
  }

  // 6. Twitch (PWA / Web)
  if (allText.indexOf("twitch") !== -1 || allText.indexOf("ttv.lol") !== -1 || allText.indexOf("twitch.tv") !== -1 || pwaCandidate.toLowerCase() === "twitch") {
    return { name: "Twitch", icon: "󰕟", brand: "twitch" }
  }

  // 7. Bandcamp (PWA / Web)
  if (allText.indexOf("bandcamp") !== -1 || artUrl.indexOf("bcbits.com") !== -1 || pwaCandidate.toLowerCase() === "bandcamp") {
    return { name: "Bandcamp", icon: "󰓇", brand: "bandcamp" }
  }

  // 8. Netflix (PWA / Web)
  if (allText.indexOf("netflix") !== -1 || allText.indexOf("nflxvideo") !== -1 || pwaCandidate.toLowerCase() === "netflix") {
    return { name: "Netflix", icon: "󰝆", brand: "netflix" }
  }

  // 9. Amazon Prime Video / Amazon Music (PWA / Web)
  if (allText.indexOf("primevideo") !== -1 || (allText.indexOf("amazon") !== -1 && (allText.indexOf("video") !== -1 || allText.indexOf("movie") !== -1)) || pwaCandidate.toLowerCase() === "prime video") {
    return { name: "Prime Video", icon: "󰝆", brand: "primevideo" }
  }
  if (allText.indexOf("music.amazon") !== -1 || (allText.indexOf("amazon") !== -1 && allText.indexOf("music") !== -1) || pwaCandidate.toLowerCase() === "amazon music") {
    return { name: "Amazon Music", icon: "󰎆", brand: "amazonmusic" }
  }

  // 10. Disney+ (PWA / Web)
  if (allText.indexOf("disneyplus") !== -1 || allText.indexOf("disney+") !== -1 || pwaCandidate.toLowerCase() === "disney+") {
    return { name: "Disney+", icon: "󰝆", brand: "disneyplus" }
  }

  // 11. Tidal (PWA / Web)
  if (allText.indexOf("tidal") !== -1 || pwaCandidate.toLowerCase() === "tidal") {
    return { name: "Tidal", icon: "󰎆", brand: "tidal" }
  }

  // 12. Deezer (PWA / Web)
  if (allText.indexOf("deezer") !== -1 || pwaCandidate.toLowerCase() === "deezer") {
    return { name: "Deezer", icon: "󰎆", brand: "deezer" }
  }

  // 13. Plex / Jellyfin / Emby (Media Server PWAs)
  if (allText.indexOf("plex.tv") !== -1 || allText.indexOf("plex.direct") !== -1 || pwaCandidate.toLowerCase() === "plex") {
    return { name: "Plex", icon: "󰚺", brand: "plex" }
  }
  if (allText.indexOf("jellyfin") !== -1 || pwaCandidate.toLowerCase() === "jellyfin") {
    return { name: "Jellyfin", icon: "󰚺", brand: "jellyfin" }
  }
  if (allText.indexOf("emby") !== -1 || pwaCandidate.toLowerCase() === "emby") {
    return { name: "Emby", icon: "󰚺", brand: "emby" }
  }

  // 14. Navidrome / Audiobookshelf (Audio PWAs)
  if (allText.indexOf("navidrome") !== -1 || pwaCandidate.toLowerCase() === "navidrome") {
    return { name: "Navidrome", icon: "󰎆", brand: "navidrome" }
  }
  if (allText.indexOf("audiobookshelf") !== -1 || pwaCandidate.toLowerCase() === "audiobookshelf" || allText.indexOf("audible") !== -1) {
    return { name: "Audiobook", icon: "󰂿", brand: "audiobookshelf" }
  }

  // 15. Bilibili (PWA / Web)
  if (allText.indexOf("bilibili") !== -1 || artUrl.indexOf("hdslb.com") !== -1 || pwaCandidate.toLowerCase() === "bilibili") {
    return { name: "Bilibili", icon: "󰚀", brand: "bilibili" }
  }

  // 16. Vimeo (PWA / Web)
  if (allText.indexOf("vimeo") !== -1 || artUrl.indexOf("vimeocdn.com") !== -1 || pwaCandidate.toLowerCase() === "vimeo") {
    return { name: "Vimeo", icon: "󰕼", brand: "vimeo" }
  }

  // 17. Pocket Casts / Podcasts (PWA / Web)
  if (allText.indexOf("pocketcasts") !== -1 || allText.indexOf("podcast") !== -1 || allText.indexOf("overcast.fm") !== -1 || pwaCandidate.toLowerCase() === "pocket casts") {
    return { name: "Podcasts", icon: "󰦔", brand: "podcasts" }
  }

  // 18. Social & Messaging PWAs (Discord, WhatsApp, Telegram, Reddit, X)
  if (allText.indexOf("discord") !== -1 || pwaCandidate.toLowerCase() === "discord") {
    return { name: "Discord", icon: "󰙯", brand: "discord" }
  }
  if (allText.indexOf("whatsapp") !== -1 || pwaCandidate.toLowerCase() === "whatsapp") {
    return { name: "WhatsApp", icon: "󰖣", brand: "whatsapp" }
  }
  if (allText.indexOf("telegram") !== -1 || pwaCandidate.toLowerCase() === "telegram") {
    return { name: "Telegram", icon: "󰎤", brand: "telegram" }
  }
  if (allText.indexOf("reddit") !== -1 || allText.indexOf("redd.it") !== -1 || pwaCandidate.toLowerCase() === "reddit") {
    return { name: "Reddit", icon: "󰑍", brand: "reddit" }
  }
  if (allText.indexOf("twitter") !== -1 || allText.indexOf("twimg.com") !== -1 || (url.indexOf("x.com") !== -1) || pwaCandidate.toLowerCase() === "x") {
    return { name: "X", icon: "󰕄", brand: "twitter" }
  }

  // 19. If a named PWA is identified, use its clean PWA title
  if (pwaCandidate && pwaCandidate !== "System" && pwaCandidate !== "Media Player") {
    return { name: pwaCandidate, icon: "󰎆", brand: "pwa" }
  }

  // 20. Native desktop audio/video apps
  if (dbusName.indexOf("vlc") !== -1 || identity.toLowerCase().indexOf("vlc") !== -1 || desktopEntry.indexOf("vlc") !== -1) {
    return { name: "VLC", icon: "󰕼", brand: "vlc" }
  }
  if (dbusName.indexOf("mpv") !== -1 || identity.toLowerCase().indexOf("mpv") !== -1 || desktopEntry.indexOf("mpv") !== -1) {
    return { name: "MPV", icon: "󰐊", brand: "mpv" }
  }
  if (dbusName.indexOf("rhythmbox") !== -1 || identity.toLowerCase().indexOf("rhythmbox") !== -1) {
    return { name: "Rhythmbox", icon: "󰎆", brand: "rhythmbox" }
  }
  if (dbusName.indexOf("audacious") !== -1 || identity.toLowerCase().indexOf("audacious") !== -1) {
    return { name: "Audacious", icon: "󰎆", brand: "audacious" }
  }
  if (dbusName.indexOf("amberol") !== -1 || identity.toLowerCase().indexOf("amberol") !== -1) {
    return { name: "Amberol", icon: "󰎆", brand: "amberol" }
  }
  if (dbusName.indexOf("cider") !== -1 || identity.toLowerCase().indexOf("cider") !== -1) {
    return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
  }
  if (dbusName.indexOf("strawberry") !== -1 || identity.toLowerCase().indexOf("strawberry") !== -1) {
    return { name: "Strawberry", icon: "󰎆", brand: "strawberry" }
  }
  if (dbusName.indexOf("clementine") !== -1 || identity.toLowerCase().indexOf("clementine") !== -1) {
    return { name: "Clementine", icon: "󰎆", brand: "clementine" }
  }
  if (dbusName.indexOf("lollypop") !== -1 || identity.toLowerCase().indexOf("lollypop") !== -1) {
    return { name: "Lollypop", icon: "󰎆", brand: "lollypop" }
  }
  if (dbusName.indexOf("elisa") !== -1 || identity.toLowerCase().indexOf("elisa") !== -1) {
    return { name: "Elisa", icon: "󰎆", brand: "elisa" }
  }

  // 21. Clean Browser Fallbacks
  if (identity.indexOf("Firefox") !== -1 || desktopEntry.indexOf("firefox") !== -1 || dbusName.indexOf("firefox") !== -1 || identity.indexOf("Mozilla") !== -1) {
    return { name: "Firefox", icon: "󰈹", brand: "firefox" }
  }
  if (identity.indexOf("Chrome") !== -1 || desktopEntry.indexOf("chrome") !== -1 || dbusName.indexOf("chrome") !== -1) {
    return { name: "Chrome", icon: "󰊯", brand: "chrome" }
  }
  if (identity.indexOf("Brave") !== -1 || desktopEntry.indexOf("brave") !== -1 || dbusName.indexOf("brave") !== -1) {
    return { name: "Brave", icon: "󰊯", brand: "brave" }
  }
  if (identity.indexOf("Chromium") !== -1 || desktopEntry.indexOf("chromium") !== -1 || dbusName.indexOf("chromium") !== -1) {
    return { name: "Chromium", icon: "󰊯", brand: "chromium" }
  }
  if (identity.indexOf("Edge") !== -1 || desktopEntry.indexOf("edge") !== -1 || dbusName.indexOf("edge") !== -1) {
    return { name: "Edge", icon: "󰇩", brand: "edge" }
  }
  if (identity.indexOf("Vivaldi") !== -1 || desktopEntry.indexOf("vivaldi") !== -1 || dbusName.indexOf("vivaldi") !== -1) {
    return { name: "Vivaldi", icon: "󰈹", brand: "vivaldi" }
  }
  if (identity.indexOf("Opera") !== -1 || desktopEntry.indexOf("opera") !== -1 || dbusName.indexOf("opera") !== -1) {
    return { name: "Opera", icon: "󰈹", brand: "opera" }
  }

  var clean = sanitizeString(identity || desktopEntry || "Media Player", 30)
  clean = clean.replace(/^org\.mpris\.MediaPlayer2\./, "")
  clean = clean.replace(/\.instance[0-9]+$/, "")
  clean = clean.charAt(0).toUpperCase() + clean.slice(1)
  return { name: clean || "Media Player", icon: "󰎆", brand: "generic" }
}

function cleanTrackInfo(title, artist) {
  var cleanTitle = sanitizeString(title || "", 180)
  var cleanArtist = sanitizeString(artist || "", 120)

  // Remove common website suffixes from title
  cleanTitle = cleanTitle.replace(/\s*-\s*YouTube(?:\s*Music)?\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*\|\s*Spotify\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*SoundCloud\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*Bandcamp\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*on\s*Twitch\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*Twitch\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*Bilibili\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*Vimeo\s*$/i, "")
  cleanTitle = cleanTitle.replace(/\s*-\s*Apple Music\s*$/i, "")

  // If artist is empty, but title contains "Artist - Title", split cleanly
  if (!cleanArtist && cleanTitle.indexOf(" - ") !== -1) {
    var parts = cleanTitle.split(" - ")
    if (parts.length >= 2) {
      cleanArtist = parts[0].trim()
      cleanTitle = parts.slice(1).join(" - ").trim()
    }
  }

  var finalTitle = sanitizeString(cleanTitle || (title ? String(title) : "No Track"), 120)
  var finalArtist = sanitizeString(cleanArtist || (artist ? String(artist) : ""), 80)

  return {
    title: finalTitle || "No Track",
    artist: finalArtist
  }
}

// Extensible event provider aggregator
function computeActiveEvent(mprisPlayer, extraEvents, toplevels) {
  var events = []

  if (mprisPlayer && (mprisPlayer.trackTitle || mprisPlayer.trackArtist || mprisPlayer.isPlaying)) {
    var source = detectSource(mprisPlayer, toplevels)
    var cleaned = cleanTrackInfo(mprisPlayer.trackTitle, mprisPlayer.trackArtist)
    events.push({
      id: "media",
      type: "media",
      priority: mprisPlayer.isPlaying ? 80 : 40,
      title: cleaned.title,
      subtitle: cleaned.artist || source.name,
      icon: source.icon,
      playing: mprisPlayer.isPlaying,
      player: mprisPlayer,
      sourceName: source.name
    })
  }

  if (extraEvents && Array.isArray(extraEvents)) {
    for (var i = 0; i < extraEvents.length; i++) {
      if (extraEvents[i] && extraEvents[i].active) {
        events.push(extraEvents[i])
      }
    }
  }

  if (events.length === 0) {
    return {
      id: "idle",
      type: "idle",
      priority: 0,
      title: "Dynamic Island",
      subtitle: "Ready",
      icon: "󰎆",
      playing: false,
      player: null,
      sourceName: "System"
    }
  }

  events.sort(function(a, b) { return b.priority - a.priority })
  return events[0]
}
