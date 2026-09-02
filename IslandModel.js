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

function isControllable(player) {
  if (!player) return false
  return !!(player.canTogglePlaying || player.canPlay || player.canPause || player.canGoNext || player.canGoPrevious)
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

  // 2. Actively playing player with metadata AND valid playback controls
  for (var j = 0; j < limit; j++) {
    var p = players[j]
    if (p && p.isPlaying && (p.trackTitle || p.trackArtist) && isControllable(p)) {
      return p
    }
  }

  // 3. Any playing player with metadata
  for (var j2 = 0; j2 < limit; j2++) {
    var p2 = players[j2]
    if (p2 && p2.isPlaying && (p2.trackTitle || p2.trackArtist)) {
      return p2
    }
  }

  // 4. Any playing player
  for (var k = 0; k < limit; k++) {
    var p3 = players[k]
    if (p3 && p3.isPlaying) {
      return p3
    }
  }

  // 5. Paused/idle player with metadata that CAN be controlled/played
  for (var m = 0; m < limit; m++) {
    var p4 = players[m]
    if (p4 && (p4.trackTitle || p4.trackArtist) && isControllable(p4)) {
      return p4
    }
  }

  // 6. Any player with metadata
  for (var n = 0; n < limit; n++) {
    var p5 = players[n]
    if (p5 && (p5.trackTitle || p5.trackArtist)) {
      return p5
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

  // Concatenated metadata search string from the ACTIVE playing track
  var allText = (title + " " + artist + " " + album + " " + artUrl + " " + url + " " + rawMeta + " " + identity + " " + desktopEntry + " " + dbusName).slice(0, MAX_ALL_TEXT_LEN).toLowerCase()

  // 1. YouTube Music
  if (allText.indexOf("music.youtube") !== -1 || allText.indexOf("youtube music") !== -1) {
    return { name: "YouTube Music", icon: "󰎆", brand: "ytmusic" }
  }

  // 2. YouTube
  if (allText.indexOf("youtube.com") !== -1 || allText.indexOf("youtu.be") !== -1 || artUrl.indexOf("ytimg.com") !== -1 || allText.indexOf("googlevideo.com") !== -1 || artUrl.indexOf("ggpht.com") !== -1 || allText.indexOf(" - youtube") !== -1) {
    return { name: "YouTube", icon: "󰗃", brand: "youtube" }
  }

  // 3. Spotify
  if (allText.indexOf("spotify") !== -1 || artUrl.indexOf("scdn.co") !== -1 || allText.indexOf("spotify.com") !== -1 || dbusName.indexOf("spotify") !== -1) {
    return { name: "Spotify", icon: "󰓇", brand: "spotify" }
  }

  // 4. Apple Music
  if (allText.indexOf("apple music") !== -1 || allText.indexOf("music.apple.com") !== -1 || artUrl.indexOf("mzstatic.com") !== -1 || allText.indexOf("itunes") !== -1 || dbusName.indexOf("cider") !== -1) {
    return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
  }

  // 5. SoundCloud
  if (allText.indexOf("soundcloud") !== -1 || artUrl.indexOf("sndcdn.com") !== -1) {
    return { name: "SoundCloud", icon: "󰓇", brand: "soundcloud" }
  }

  // 6. Twitch
  if (allText.indexOf("twitch.tv") !== -1 || allText.indexOf("ttv.lol") !== -1 || allText.indexOf("on twitch") !== -1) {
    return { name: "Twitch", icon: "󰕟", brand: "twitch" }
  }

  // 7. Bandcamp
  if (allText.indexOf("bandcamp") !== -1 || artUrl.indexOf("bcbits.com") !== -1) {
    return { name: "Bandcamp", icon: "󰓇", brand: "bandcamp" }
  }

  // 8. Netflix / Streaming
  if (allText.indexOf("netflix") !== -1 || allText.indexOf("nflxvideo") !== -1) {
    return { name: "Netflix", icon: "󰝆", brand: "netflix" }
  }
  if (allText.indexOf("primevideo") !== -1 || (allText.indexOf("amazon") !== -1 && (allText.indexOf("video") !== -1 || allText.indexOf("movie") !== -1))) {
    return { name: "Prime Video", icon: "󰝆", brand: "primevideo" }
  }
  if (allText.indexOf("music.amazon") !== -1) {
    return { name: "Amazon Music", icon: "󰎆", brand: "amazonmusic" }
  }
  if (allText.indexOf("disneyplus") !== -1 || allText.indexOf("disney+") !== -1) {
    return { name: "Disney+", icon: "󰝆", brand: "disneyplus" }
  }

  // 9. Media Server PWAs
  if (allText.indexOf("plex.tv") !== -1 || allText.indexOf("plex.direct") !== -1) return { name: "Plex", icon: "󰚺", brand: "plex" }
  if (allText.indexOf("jellyfin") !== -1) return { name: "Jellyfin", icon: "󰚺", brand: "jellyfin" }
  if (allText.indexOf("emby") !== -1) return { name: "Emby", icon: "󰚺", brand: "emby" }

  // 10. Native desktop audio/video apps
  if (identity.indexOf("Cider") !== -1) return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
  if (identity.indexOf("VLC") !== -1 || desktopEntry.indexOf("vlc") !== -1 || dbusName.indexOf("vlc") !== -1) return { name: "VLC", icon: "󰕼", brand: "vlc" }
  if (identity.indexOf("mpv") !== -1 || desktopEntry.indexOf("mpv") !== -1 || dbusName.indexOf("mpv") !== -1) return { name: "MPV", icon: "󰐊", brand: "mpv" }
  if (identity.indexOf("Rhythmbox") !== -1 || desktopEntry.indexOf("rhythmbox") !== -1) return { name: "Rhythmbox", icon: "󰎆", brand: "rhythmbox" }
  if (identity.indexOf("Audacious") !== -1 || desktopEntry.indexOf("audacious") !== -1) return { name: "Audacious", icon: "󰎆", brand: "audacious" }
  if (identity.indexOf("Amberol") !== -1 || desktopEntry.indexOf("amberol") !== -1) return { name: "Amberol", icon: "󰎆", brand: "amberol" }
  if (identity.indexOf("Strawberry") !== -1 || desktopEntry.indexOf("strawberry") !== -1) return { name: "Strawberry", icon: "󰎆", brand: "strawberry" }
  if (identity.indexOf("Clementine") !== -1 || desktopEntry.indexOf("clementine") !== -1) return { name: "Clementine", icon: "󰎆", brand: "clementine" }
  if (identity.indexOf("Lollypop") !== -1 || desktopEntry.indexOf("lollypop") !== -1) return { name: "Lollypop", icon: "󰎆", brand: "lollypop" }
  if (identity.indexOf("Elisa") !== -1 || desktopEntry.indexOf("elisa") !== -1) return { name: "Elisa", icon: "󰎆", brand: "elisa" }

  // 11. Match open window title if it explicitly matches the playing track
  if (toplevels && toplevels.length && title) {
    var cleanTrack = title.toLowerCase().slice(0, 20)
    if (cleanTrack && cleanTrack !== "no media playing" && cleanTrack !== "no track") {
      var limit = Math.min(toplevels.length, MAX_TOPLEVELS_INSPECTED)
      for (var w = 0; w < limit; w++) {
        var win = toplevels[w]
        if (!win) continue
        var winTitle = sanitizeString(win.title || "", 128).toLowerCase()
        var winAppId = sanitizeString(win.appId || "", 128)
        if (winTitle.indexOf(cleanTrack) !== -1) {
          if (winAppId.indexOf("music.apple.com") !== -1 || winTitle.indexOf("apple music") !== -1) {
            return { name: "Apple Music", icon: "󰎆", brand: "applemusic" }
          }
          if (winAppId.indexOf("music.youtube") !== -1 || winTitle.indexOf("youtube music") !== -1) {
            return { name: "YouTube Music", icon: "󰎆", brand: "ytmusic" }
          }
          if (winAppId.indexOf("youtube.com") !== -1 || winTitle.indexOf("youtube") !== -1) {
            return { name: "YouTube", icon: "󰗃", brand: "youtube" }
          }
          if (winAppId.indexOf("spotify.com") !== -1 || winTitle.indexOf("spotify") !== -1) {
            return { name: "Spotify", icon: "󰓇", brand: "spotify" }
          }
          var pwaMatch = winAppId.match(/^chrome-([a-zA-Z0-9._-]+)-default$/i)
          if (pwaMatch && pwaMatch[1]) {
            var domain = pwaMatch[1].replace(/__.*$/, "").replace(/_/g, ".")
            var cleanPwa = sanitizeString(domain.split(".")[0], 30)
            if (cleanPwa) cleanPwa = cleanPwa.charAt(0).toUpperCase() + cleanPwa.slice(1)
            return { name: cleanPwa || "Web App", icon: "󰎆", brand: "pwa" }
          }
        }
      }
    }
  }

  // 12. Clean Browser & Generic Fallbacks
  if (identity.indexOf("Firefox") !== -1 || desktopEntry.indexOf("firefox") !== -1 || dbusName.indexOf("firefox") !== -1 || identity.indexOf("Mozilla") !== -1) {
    return { name: "Firefox", icon: "󰈹", brand: "firefox" }
  }
  if (identity.indexOf("Zen") !== -1 || desktopEntry.indexOf("zen") !== -1 || dbusName.indexOf("zen") !== -1) {
    return { name: "Zen Browser", icon: "󰈹", brand: "zen" }
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

  // 1. If artist is provided, and title starts with "Artist - ...", strip duplicate artist from title
  if (cleanArtist && cleanTitle.toLowerCase().indexOf(cleanArtist.toLowerCase() + " - ") === 0) {
    cleanTitle = cleanTitle.slice(cleanArtist.length + 3).trim()
  }

  // 2. If artist is empty, but title contains "Artist - Title", split cleanly
  if (!cleanArtist && cleanTitle.indexOf(" - ") !== -1) {
    var parts = cleanTitle.split(" - ")
    if (parts.length >= 2) {
      cleanArtist = parts[0].trim()
      cleanTitle = parts.slice(1).join(" - ").trim()
    }
  }

  // 3. If title and artist ended up identical, clear artist to prevent duplicate display
  if (cleanTitle.toLowerCase() === cleanArtist.toLowerCase()) {
    cleanArtist = ""
  }

  var finalTitle = sanitizeString(cleanTitle || (title ? String(title) : "No Track"), 120)
  var finalArtist = sanitizeString(cleanArtist, 80)

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
