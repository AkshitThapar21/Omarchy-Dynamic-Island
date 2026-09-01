import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import Quickshell.Services.Mpris
import Quickshell.Services.Pipewire
import qs.Commons
import qs.Ui
import "IslandModel.js" as IslandModel

Panel {
  id: root
  moduleName: "akshit.island"
  ipcTarget: "akshit.island"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  // Player selection state (avoids auto-playing on selection)
  property string selectedPlayerKey: ""

  // Hover containment
  property bool panelHovered: false

  // Wayland toplevels for deep PWA detection
  readonly property var toplevels: ToplevelManager.toplevels ? ToplevelManager.toplevels.values : []

  // Audio sink & volume properties
  readonly property var audioSink: Pipewire.defaultAudioSink
  readonly property real audioVolume: audioSink && audioSink.audio ? audioSink.audio.volume : 1.0
  readonly property bool audioMuted: audioSink && audioSink.audio ? audioSink.audio.muted : false

  function setAudioVolume(val) {
    if (audioSink && audioSink.audio) {
      var clamped = Math.max(0.0, Math.min(1.0, val))
      audioSink.audio.volume = clamped
      if (audioSink.audio.muted && clamped > 0) {
        audioSink.audio.muted = false
      }
    }
  }

  function toggleAudioMute() {
    if (audioSink && audioSink.audio) {
      audioSink.audio.muted = !audioSink.audio.muted
    }
  }

  function volumeIcon(vol, muted) {
    if (muted || vol <= 0.001) return ""
    if (vol >= 0.67) return ""
    if (vol >= 0.33) return ""
    return ""
  }

  // MPRIS Services & Active Player Resolution
  readonly property var players: Mpris.players ? Mpris.players.values : []
  readonly property var activePlayer: IslandModel.resolveActivePlayer(players, selectedPlayerKey)
  readonly property bool hasMedia: activePlayer !== null && (activePlayer.trackTitle || activePlayer.trackArtist)
  readonly property bool isPlaying: activePlayer ? (activePlayer.isPlaying === true) : false

  // Real Brand / Source Detection & Clean Metadata
  readonly property var sourceInfo: IslandModel.detectSource(activePlayer, toplevels)
  readonly property var cleanedTrack: IslandModel.cleanTrackInfo(activePlayer ? activePlayer.trackTitle : "", activePlayer ? activePlayer.trackArtist : "")
  readonly property string title: hasMedia ? cleanedTrack.title : "No Media Playing"
  readonly property string artist: hasMedia ? (cleanedTrack.artist || sourceInfo.name) : "Standby"
  readonly property string album: activePlayer && activePlayer.trackAlbum ? IslandModel.sanitizeString(activePlayer.trackAlbum, 80) : ""
  readonly property string artUrl: IslandModel.sanitizeArtUrl(activePlayer ? (activePlayer.trackArtUrl || "") : "")
  readonly property string playerIdentity: sourceInfo.name

  readonly property color contentForeground: bar && bar.barForeground ? bar.barForeground : Color.foreground
  readonly property string contentFontFamily: bar && bar.fontFamily ? bar.fontFamily : Style.font.family

  function refresh() {
    // Refresh triggered
  }

  function togglePlay() {
    var p = activePlayer
    if (!p) return
    if (p.canTogglePlaying) {
      p.togglePlaying()
    } else if (p.isPlaying && p.canPause) {
      p.pause()
    } else if (!p.isPlaying && p.canPlay) {
      p.play()
    }
  }

  function nextTrack() {
    var p = activePlayer
    if (p && p.canGoNext) p.next()
  }

  function prevTrack() {
    var p = activePlayer
    if (p && p.canGoPrevious) p.previous()
  }

  PopupCard {
    id: panel
    anchorItem: root.anchorItem
    bar: root.bar
    open: root.opened
    centerOnBar: true
    triggerMode: "hover"
    contentWidth: panel.fittedContentWidth(Style.space(380))
    contentHeight: panel.fittedContentHeight(mainColumn.implicitHeight)

    onOpenChanged: {
      if (open) {
        Qt.callLater(function() {
          if (keyCatcher) keyCatcher.forceActiveFocus()
        })
      } else {
        root.panelHovered = false
        if (root.hostWidget) root.hostWidget.remotePanelHovered = false
      }
    }

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent

      HoverHandler {
        id: cardHoverHandler
        onHoveredChanged: {
          root.panelHovered = hovered
          if (root.hostWidget) {
            root.hostWidget.remotePanelHovered = hovered
          }
        }
      }

      onCloseRequested: root.close()
      onActivateRequested: root.togglePlay()
      onMoveRequested: function(dx, dy) {
        if (dx < 0) root.prevTrack()
        else if (dx > 0) root.nextTrack()
        if (dy > 0) root.setAudioVolume(root.audioVolume + 0.05)
        else if (dy < 0) root.setAudioVolume(root.audioVolume - 0.05)
      }
      onTextKey: function(t) {
        if (t === " ") root.togglePlay()
        else if (t === "n" || t === "l") root.nextTrack()
        else if (t === "p" || t === "h") root.prevTrack()
        else if (t === "+" || t === "=" || t === "k") root.setAudioVolume(root.audioVolume + 0.05)
        else if (t === "-" || t === "_" || t === "j") root.setAudioVolume(root.audioVolume - 0.05)
        else if (t === "m") root.toggleAudioMute()
      }

      Item {
        id: animWrapper
        anchors.fill: parent

        property real animProgress: 0.0
        property real animScale: 0.88
        property real animY: -16
        property real animOpacity: 0.0

        ParallelAnimation {
          id: openAnimation
          running: false
          NumberAnimation {
            target: animWrapper
            property: "animProgress"
            from: 0.0
            to: 1.0
            duration: 320
            easing.type: Easing.OutCubic
          }
          NumberAnimation {
            target: animWrapper
            property: "animScale"
            from: 0.88
            to: 1.0
            duration: 340
            easing.type: Easing.OutBack
            easing.overshoot: 1.14
          }
          NumberAnimation {
            target: animWrapper
            property: "animY"
            from: -16
            to: 0
            duration: 300
            easing.type: Easing.OutCubic
          }
          NumberAnimation {
            target: animWrapper
            property: "animOpacity"
            from: 0.0
            to: 1.0
            duration: 220
            easing.type: Easing.OutQuad
          }
        }

        Connections {
          target: root
          function onOpenedChanged() {
            if (root.opened) {
              openAnimation.restart()
            } else {
              openAnimation.stop()
              animWrapper.animScale = 0.88
              animWrapper.animY = -16
              animWrapper.animOpacity = 0.0
              animWrapper.animProgress = 0.0
            }
          }
        }

        ColumnLayout {
          id: mainColumn
          anchors.left: parent.left
          anchors.right: parent.right
          anchors.top: parent.top
          spacing: Style.space(12)
          transformOrigin: Item.Top

          y: animWrapper.animY
          scale: animWrapper.animScale
          opacity: animWrapper.animOpacity

        // 1. Header Bar: Island Identity & Source Badge
        RowLayout {
          Layout.fillWidth: true
          spacing: Style.space(8)

          Row {
            spacing: Style.space(6)
            Layout.alignment: Qt.AlignVCenter

            Rectangle {
              width: Style.space(8)
              height: Style.space(8)
              radius: 4
              anchors.verticalCenter: parent.verticalCenter
              color: root.isPlaying ? Color.accent : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.4)

              Behavior on color { ColorAnimation { duration: 150 } }
            }

            Text {
              text: "DYNAMIC ISLAND"
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.65)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.capitalization: Font.AllUppercase
              renderType: Text.NativeRendering
              anchors.verticalCenter: parent.verticalCenter
            }
          }

          Item { Layout.fillWidth: true }

          // Real Service/App Source Badge (e.g. YouTube, Spotify, Apple Music, Browser)
          BorderSurface {
            id: sourceBadge
            Layout.alignment: Qt.AlignVCenter
            implicitHeight: Math.max(Style.space(22), badgeRow.implicitHeight + Style.space(6))
            implicitWidth: badgeRow.implicitWidth + Style.space(14)
            radius: Style.cornerRadius
            color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08)
            borderSpec: Border.flat(Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.15), 1)

            // Smooth scale bounce on sound source change
            scale: 1.0

            SequentialAnimation on scale {
              id: badgePopAnim
              running: false
              NumberAnimation { from: 0.88; to: 1.06; duration: 130; easing.type: Easing.OutQuad }
              NumberAnimation { from: 1.06; to: 1.0; duration: 110; easing.type: Easing.OutBack }
            }

            Connections {
              target: root
              function onPlayerIdentityChanged() { badgePopAnim.restart() }
            }

            Row {
              id: badgeRow
              spacing: Style.space(5)
              anchors.centerIn: parent

              Text {
                text: root.sourceInfo.icon
                textFormat: Text.PlainText
                color: root.isPlaying ? Color.accent : root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
                renderType: Text.NativeRendering
                anchors.verticalCenter: parent.verticalCenter
              }

              Text {
                id: badgeText
                text: root.playerIdentity
                textFormat: Text.PlainText
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.caption
                font.bold: true
                elide: Text.ElideRight
                renderType: Text.NativeRendering
                anchors.verticalCenter: parent.verticalCenter
                Layout.maximumWidth: Style.space(160)
              }
            }
          }
        }

        // 2. Main Hero: Track Art + Info
        RowLayout {
          Layout.fillWidth: true
          spacing: Style.space(12)

          // Album Art or Music Glyph with bounded decoding & safe sizing
          Rectangle {
            id: artBox
            Layout.preferredWidth: Style.space(68)
            Layout.preferredHeight: Style.space(68)
            radius: Math.min(Style.cornerRadius, Style.space(10))
            color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08)
            border.width: 1
            border.color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.15)
            layer.enabled: true
            layer.smooth: true

            scale: 1.0
            opacity: 1.0

            SequentialAnimation on scale {
              id: artPopAnim
              running: false
              NumberAnimation { from: 0.91; to: 1.04; duration: 140; easing.type: Easing.OutQuad }
              NumberAnimation { from: 1.04; to: 1.0; duration: 120; easing.type: Easing.OutBack }
            }

            SequentialAnimation on opacity {
              id: artFadeAnim
              running: false
              NumberAnimation { from: 0.4; to: 1.0; duration: 200; easing.type: Easing.OutQuad }
            }

            Connections {
              target: root
              function onTitleChanged() {
                artPopAnim.restart()
                artFadeAnim.restart()
              }
              function onSelectedPlayerKeyChanged() {
                artPopAnim.restart()
                artFadeAnim.restart()
              }
            }

            Image {
              id: artImage
              anchors.fill: parent
              source: root.artUrl
              fillMode: Image.PreserveAspectCrop
              asynchronous: true
              cache: true
              sourceSize.width: 128
              sourceSize.height: 128
              visible: root.artUrl !== "" && status === Image.Ready
            }

            Text {
              anchors.centerIn: parent
              visible: !artImage.visible
              text: root.sourceInfo.icon
              textFormat: Text.PlainText
              color: root.hasMedia ? Color.accent : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.3)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.display
              renderType: Text.NativeRendering
            }
          }

          // Track Details
          ColumnLayout {
            Layout.fillWidth: true
            spacing: Style.space(3)

            Text {
              Layout.fillWidth: true
              text: root.title
              textFormat: Text.PlainText
              color: root.contentForeground
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.subtitle
              font.bold: true
              elide: Text.ElideRight
              renderType: Text.NativeRendering
            }

            Text {
              Layout.fillWidth: true
              text: root.artist
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.75)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.bodySmall
              elide: Text.ElideRight
              renderType: Text.NativeRendering
            }

            Text {
              Layout.fillWidth: true
              text: root.album
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
              renderType: Text.NativeRendering
              visible: root.album !== ""
            }

            Text {
              text: root.isPlaying ? "Playing on " + root.sourceInfo.name : (root.hasMedia ? "Paused" : "Idle")
              textFormat: Text.PlainText
              color: root.isPlaying ? Color.accent : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              renderType: Text.NativeRendering
            }
          }
        }

        // 3. Playback Controls Bar with Dynamic Audio Waveform Background
        BorderSurface {
          Layout.fillWidth: true
          implicitHeight: Style.space(56)
          radius: Style.cornerRadius
          clip: true
          color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.05)
          borderSpec: Border.flat(Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.12), 1)

          // Dynamic Waveform Layer (Behind media controls)
          Item {
            anchors.fill: parent
            anchors.leftMargin: Style.space(8)
            anchors.rightMargin: Style.space(8)
            opacity: root.isPlaying ? 0.38 : 0.12

            Behavior on opacity {
              NumberAnimation { duration: 320; easing.type: Easing.OutQuad }
            }

            Row {
              anchors.centerIn: parent
              spacing: Style.space(3.5)

              Repeater {
                model: 32

                Rectangle {
                  id: waveBar
                  required property int index
                  width: Style.space(3)
                  radius: Style.space(1.5)
                  anchors.verticalCenter: parent.verticalCenter
                  color: Color.accent

                  // Normalized distance from center for curved profile
                  readonly property real normDist: Math.abs(index - 15.5) / 16.0
                  readonly property real profileScale: Math.max(0.35, 1.0 - normDist * 0.5)

                  // Base idle height
                  readonly property real idleHeight: Math.max(Style.space(3), Style.space(18) * profileScale * (0.3 + (index % 4) * 0.15))

                  // Dynamic target heights with harmonic variations
                  readonly property real minH: Style.space(3) + (index % 3) * Style.space(2)
                  readonly property real maxH: Math.max(minH + Style.space(8), (Style.space(10) + ((index * 9) % 36) * Style.space(1.1)) * profileScale)

                  implicitHeight: root.isPlaying ? minH : idleHeight

                  SequentialAnimation on height {
                    running: root.isPlaying
                    loops: Animation.Infinite
                    NumberAnimation {
                      from: waveBar.minH
                      to: waveBar.maxH
                      duration: 200 + ((index * 47) % 280)
                      easing.type: Easing.InOutSine
                    }
                    NumberAnimation {
                      from: waveBar.maxH
                      to: waveBar.minH
                      duration: 200 + ((index * 47) % 280)
                      easing.type: Easing.InOutSine
                    }
                  }
                }
              }
            }
          }

          // Floating Controls Row (Foreground)
          RowLayout {
            anchors.centerIn: parent
            spacing: Style.space(26)

            // Previous Button
            BorderSurface {
              id: prevBtn
              Layout.preferredWidth: Style.space(36)
              Layout.preferredHeight: Style.space(36)
              radius: Math.round(width / 2)
              color: prevMouse.containsMouse
                ? Style.hoverFillFor(root.contentForeground, root.contentForeground)
                : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08)

              Text {
                anchors.centerIn: parent
                text: "󰒮"
                textFormat: Text.PlainText
                color: root.activePlayer && root.activePlayer.canGoPrevious ? root.contentForeground : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.3)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.title
                renderType: Text.NativeRendering
              }

              MouseArea {
                id: prevMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: root.activePlayer && root.activePlayer.canGoPrevious ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: root.prevTrack()
              }
            }

            // Play / Pause Button with optical glyph centering & accent halo
            BorderSurface {
              id: playBtn
              Layout.preferredWidth: Style.space(44)
              Layout.preferredHeight: Style.space(44)
              radius: Math.round(width / 2)
              color: playMouse.containsMouse
                ? Style.hoverFillFor(Color.accent, Color.accent)
                : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.16)
              borderSpec: Border.flat(Color.accent, 1)

              Text {
                anchors.centerIn: parent
                anchors.horizontalCenterOffset: root.isPlaying ? 0 : Style.space(1.5)
                text: root.isPlaying ? "󰏤" : "󰐊"
                textFormat: Text.PlainText
                color: Color.accent
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.heading
                renderType: Text.NativeRendering
              }

              MouseArea {
                id: playMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.togglePlay()
              }
            }

            // Next Button
            BorderSurface {
              id: nextBtn
              Layout.preferredWidth: Style.space(36)
              Layout.preferredHeight: Style.space(36)
              radius: Math.round(width / 2)
              color: nextMouse.containsMouse
                ? Style.hoverFillFor(root.contentForeground, root.contentForeground)
                : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08)

              Text {
                anchors.centerIn: parent
                text: "󰒭"
                textFormat: Text.PlainText
                color: root.activePlayer && root.activePlayer.canGoNext ? root.contentForeground : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.3)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.title
                renderType: Text.NativeRendering
              }

              MouseArea {
                id: nextMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: root.activePlayer && root.activePlayer.canGoNext ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: root.nextTrack()
              }
            }
          }
        }

        // 4. Volume Control Bar
        BorderSurface {
          Layout.fillWidth: true
          implicitHeight: Style.space(38)
          radius: Style.cornerRadius
          color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.05)
          borderSpec: Border.flat(Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.12), 1)

          RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Style.space(10)
            anchors.rightMargin: Style.space(10)
            spacing: Style.space(10)

            // Mute / Speaker Icon Button
            BorderSurface {
              Layout.preferredWidth: Style.space(26)
              Layout.preferredHeight: Style.space(26)
              radius: Math.round(width / 2)
              color: muteMouse.containsMouse
                ? Style.hoverFillFor(root.contentForeground, root.contentForeground)
                : "transparent"

              Text {
                anchors.centerIn: parent
                text: root.volumeIcon(root.audioVolume, root.audioMuted)
                textFormat: Text.PlainText
                color: root.audioMuted ? Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.4) : Color.accent
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.body
                renderType: Text.NativeRendering
              }

              MouseArea {
                id: muteMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: root.toggleAudioMute()
              }
            }

            // Smooth Interactive Volume Slider
            Item {
              id: sliderContainer
              Layout.fillWidth: true
              Layout.preferredHeight: Style.space(24)

              readonly property real progress: Math.max(0.0, Math.min(1.0, root.audioMuted ? 0.0 : root.audioVolume))

              // Background track
              Rectangle {
                id: volTrack
                anchors.verticalCenter: parent.verticalCenter
                anchors.left: parent.left
                anchors.right: parent.right
                height: Style.space(5)
                radius: height / 2
                color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.12)
              }

              // Active fill bar
              Rectangle {
                id: volFill
                anchors.verticalCenter: volTrack.verticalCenter
                anchors.left: volTrack.left
                height: volTrack.height
                radius: volTrack.radius
                color: root.audioMuted ? Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.3) : Color.accent
                width: Math.max(0, volTrack.width * sliderContainer.progress)

                Behavior on width {
                  enabled: !sliderMouse.drag.active
                  NumberAnimation { duration: 100; easing.type: Easing.OutQuad }
                }
              }

              // Drag Knob
              BorderSurface {
                id: volKnob
                width: Style.space(14)
                height: Style.space(14)
                radius: width / 2
                color: root.audioMuted ? Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5) : Color.accent
                borderSpec: Border.flat(Color.popups.background, 2)
                anchors.verticalCenter: volTrack.verticalCenter
                x: Math.max(0, Math.min(volTrack.width - width, volTrack.width * sliderContainer.progress - width / 2))
                scale: sliderMouse.containsMouse || sliderMouse.drag.active ? 1.25 : 1.0

                Behavior on scale {
                  NumberAnimation { duration: 120; easing.type: Easing.OutCubic }
                }
              }

              MouseArea {
                id: sliderMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor

                function updateVolumeFromPos(posX) {
                  var ratio = Math.max(0.0, Math.min(1.0, posX / width))
                  root.setAudioVolume(ratio)
                }

                onPressed: function(mouse) {
                  updateVolumeFromPos(mouse.x)
                }

                onPositionChanged: function(mouse) {
                  if (pressed) {
                    updateVolumeFromPos(mouse.x)
                  }
                }

                onWheel: function(wheel) {
                  var delta = wheel.angleDelta.y > 0 ? 0.05 : -0.05
                  root.setAudioVolume(root.audioVolume + delta)
                }
              }
            }

            // Volume Percentage Label
            Text {
              text: (root.audioMuted ? "0" : Math.round(root.audioVolume * 100)) + "%"
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.75)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              renderType: Text.NativeRendering
              Layout.preferredWidth: Style.space(34)
              horizontalAlignment: Text.AlignRight
              Layout.alignment: Qt.AlignVCenter
            }
          }
        }

        // 5. Multiple Players Switcher (Flow layout with auto-wrap, click to switch without auto-play)
        ColumnLayout {
          Layout.fillWidth: true
          spacing: Style.space(6)
          visible: root.players.length > 1

          Text {
            text: "SELECT MEDIA SOURCE"
            textFormat: Text.PlainText
            color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.caption
            font.capitalization: Font.AllUppercase
            renderType: Text.NativeRendering
          }

          Flow {
            Layout.fillWidth: true
            spacing: Style.space(6)

            Repeater {
              model: IslandModel.boundPlayerList(root.players, 6)

              delegate: BorderSurface {
                required property var modelData
                readonly property var itemSource: IslandModel.detectSource(modelData, root.toplevels)
                readonly property bool isCurrent: root.activePlayer === modelData
                implicitHeight: Style.space(26)
                implicitWidth: chipRow.implicitWidth + Style.space(12)
                radius: Style.cornerRadius
                color: isCurrent
                  ? Style.hoverFillFor(Color.accent, Color.accent)
                  : (chipMouse.containsMouse ? Style.hoverFillFor(root.contentForeground, root.contentForeground) : "transparent")
                borderSpec: Border.flat(isCurrent ? Color.accent : Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.15), 1)

                scale: isCurrent ? 1.04 : (chipMouse.containsMouse ? 1.02 : 1.0)

                Behavior on scale {
                  NumberAnimation { duration: 160; easing.type: Easing.OutBack }
                }

                Behavior on color {
                  ColorAnimation { duration: 140 }
                }

                Row {
                  id: chipRow
                  anchors.centerIn: parent
                  spacing: Style.space(4)

                  Text {
                    text: modelData.isPlaying ? "󰎆" : itemSource.icon
                    textFormat: Text.PlainText
                    color: isCurrent ? Color.accent : root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                    renderType: Text.NativeRendering
                    anchors.verticalCenter: parent.verticalCenter
                  }

                  Text {
                    text: itemSource.name
                    textFormat: Text.PlainText
                    color: isCurrent ? Color.accent : root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: isCurrent
                    renderType: Text.NativeRendering
                    anchors.verticalCenter: parent.verticalCenter
                  }
                }

                MouseArea {
                  id: chipMouse
                  anchors.fill: parent
                  hoverEnabled: true
                  cursorShape: Qt.PointingHandCursor
                  onClicked: {
                    var key = IslandModel.playerKey(modelData)
                    root.selectedPlayerKey = key
                    if (root.hostWidget) {
                      root.hostWidget.selectedPlayerKey = key
                    }
                  }
                }
              }
            }
          }
        }

        // 5. Extensible Event Sources Area (Aggregator design for reminders, OSDs, notifications)
        BorderSurface {
          Layout.fillWidth: true
          implicitHeight: Style.space(32)
          radius: Style.cornerRadius
          color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.03)
          borderSpec: Border.flat(Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.08), 1)

          RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Style.space(8)
            anchors.rightMargin: Style.space(8)
            spacing: Style.space(8)

            Text {
              text: "󰋽"
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              renderType: Text.NativeRendering
            }

            Text {
              Layout.fillWidth: true
              text: "Dynamic Island Engine active • System controls ready"
              textFormat: Text.PlainText
              color: Qt.rgba(root.contentForeground.r, root.contentForeground.g, root.contentForeground.b, 0.5)
              font.family: root.contentFontFamily
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
              renderType: Text.NativeRendering
            }
          }
        }
      }
    }
  }
}
}
