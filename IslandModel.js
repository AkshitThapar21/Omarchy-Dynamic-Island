.pragma library

// Event sources aggregator & helpers for Dynamic Island

function playerKey(player) {
  if (!player) return ""
  return String(player.dbusName || player.desktopEntry || player.identity || "")
}

function resolveActivePlayer(players, preferredKey) {
  if (!players || players.length === 0) return null

  // 1. If the user explicitly selected a player, use it if still valid
  if (preferredKey) {
    for (var i = 0; i < players.length; i++) {
      if (players[i] && playerKey(players[i]) === preferredKey) {
        return players[i]
      }
    }
  }

  // 2. Playing player with metadata
  for (var j = 0; j < players.length; j++) {
    var p = players[j]
    if (p && p.isPlaying && (p.trackTitle || p.trackArtist)) {
      return p
    }
  }

  // 3. Any playing player
  for (var k = 0; k < players.length; k++) {
    var p2 = players[k]
    if (p2 && p2.isPlaying) {
      return p2
    }
  }

  // 4. Any player with metadata
  for (var m = 0; m < players.length; m++) {
    var p3 = players[m]
    if (p3 && (p3.trackTitle || p3.trackArtist)) {
      return p3
    }
  }

  return players[0] || null
}

function detectPwaFromToplevels(toplevels) {
  if (!toplevels || !Array.isArray(toplevels) || toplevels.length === 0) return null

  for (var i = 0; i < toplevels.length; i++) {
    var top = toplevels[i]
    if (!top) continue
    var appId = String(top.appId || "").toLowerCase()
    var title = String(top.title || "").toLowerCase()

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
    // 13. Discord PWA
    if (appId.indexOf("discord.com") !== -1 || title.indexOf("discord") !== -1) {
      return { name: "Discord", icon: "󰙯", brand: "discord" }
    }
    // 14. WhatsApp PWA
    if (appId.indexOf("whatsapp.com") !== -1 || title.indexOf("whatsapp") !== -1) {
      return { name: "WhatsApp", icon: "󰖣", brand: "whatsapp" }
    }
    // 15. Telegram PWA
    if (appId.indexOf("telegram.org") !== -1 || title.indexOf("telegram") !== -1) {
      return { name: "Telegram", icon: "󰎤", brand: "telegram" }
    }
    // 16. Reddit PWA
    if (appId.indexOf("reddit.com") !== -1 || title.indexOf("reddit") !== -1) {
      return { name: "Reddit", icon: "󰑍", brand: "reddit" }
    }
    // 17. X / Twitter PWA
    if (appId.indexOf("twitter.com") !== -1 || appId.indexOf("x.com") !== -1 || title.indexOf("twitter") !== -1) {
      return { name: "X", icon: "󰕄", brand: "twitter" }
    }
    // 18. Generic Chrome PWA AppID format: chrome-<domain>-Default
    var pwaMatch = appId.match(/^chrome-([a-zA-Z0-9._-]+)-default$/i)
    if (pwaMatch && pwaMatch[1]) {
      var domain = pwaMatch[1].replace(/__.*$/, "").replace(/_/g, ".")
      var clean = domain.split(".")[0]
      if (clean) clean = clean.charAt(0).toUpperCase() + clean.slice(1)
      return { name: clean || "Web App", icon: "󰎆", brand: "pwa" }
    }
  }

  return null
}

function detectSource(player, toplevels) {
  if (!player) return { name: "System", icon: "󰎆", brand: "system" }

  var title = String(player.trackTitle || "")
  var artist = String(player.trackArtist || "")
  var album = String(player.trackAlbum || "")
  var artUrl = String(player.trackArtUrl || "")
  var url = String(player.trackUrl || "")
  var identity = String(player.identity || "")
  var desktopEntry = String(player.desktopEntry || "")
  var dbusName = String(player.dbusName || "")

  // Collect any raw metadata properties if available
  var rawMeta = ""
  if (player.trackMetadata) {
    try {
      for (var k in player.trackMetadata) {
        rawMeta += " " + String(player.trackMetadata[k] || "")
      }
    } catch (e) {}
  }
  if (player.metadata) {
    try {
      for (var m in player.metadata) {
        rawMeta += " " + String(player.metadata[m] || "")
      }
    } catch (e2) {}
  }

  // PWA (Progressive Web App) and custom webapp name detection
  var pwaCandidate = ""
  if (desktopEntry) {
    var deClean = desktopEntry.replace(/\.desktop$/i, "").replace(/^app-/, "").replace(/^[a-z0-9._-]+-([a-zA-Z0-9]+)-Default$/, "$1").trim()
    if (deClean && !/^chrome-[a-z0-9]+-Default$/i.test(deClean) && !/^(chromium|firefox|google-chrome|brave|microsoft-edge|opera|vivaldi)$/i.test(deClean)) {
      pwaCandidate = deClean.charAt(0).toUpperCase() + deClean.slice(1)
    }
  }
  if (!pwaCandidate && identity && !/^(Chromium|Google Chrome|Mozilla Firefox|Firefox|Brave|Microsoft Edge|Opera|Vivaldi)$/i.test(identity.trim())) {
    pwaCandidate = identity.trim()
  }

  // If the media is being hosted by a browser (Chromium, Chrome, Brave, Firefox, etc.), check if an active PWA window is open
  var isBrowser = (identity.indexOf("Chromium") !== -1 || desktopEntry.indexOf("chromium") !== -1 || dbusName.indexOf("chromium") !== -1 ||
                   identity.indexOf("Chrome") !== -1 || desktopEntry.indexOf("chrome") !== -1 || dbusName.indexOf("chrome") !== -1 ||
                   identity.indexOf("Brave") !== -1 || desktopEntry.indexOf("brave") !== -1 || dbusName.indexOf("brave") !== -1 ||
                   identity.indexOf("Firefox") !== -1 || desktopEntry.indexOf("firefox") !== -1 || dbusName.indexOf("firefox") !== -1 ||
                   identity.indexOf("Mozilla") !== -1)

  if (isBrowser && toplevels && Array.isArray(toplevels)) {
    var pwaFound = detectPwaFromToplevels(toplevels)
    if (pwaFound) {
      return pwaFound
    }
  }

  var allText = (title + " " + artist + " " + album + " " + artUrl + " " + url + " " + rawMeta + " " + identity + " " + desktopEntry + " " + dbusName).toLowerCase()

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

  var clean = identity || desktopEntry || "Media Player"
  clean = clean.replace(/^org\.mpris\.MediaPlayer2\./, "")
  clean = clean.replace(/\.instance[0-9]+$/, "")
  clean = clean.charAt(0).toUpperCase() + clean.slice(1)
  return { name: clean, icon: "󰎆", brand: "generic" }
}

function cleanTrackInfo(title, artist) {
  var cleanTitle = String(title || "").trim()
  var cleanArtist = String(artist || "").trim()

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

  return {
    title: cleanTitle || (title ? String(title) : "No Track"),
    artist: cleanArtist || (artist ? String(artist) : "")
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
