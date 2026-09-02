import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Wayland
import Quickshell.Io
import Quickshell.Services.Mpris
import qs.Commons
import qs.Ui
import "IslandModel.js" as IslandModel

BarWidget {
  id: root
  moduleName: "akshit.island"

  // Configurability Settings
  readonly property int hoverOpenDelay: Math.max(0, root.setting("hoverOpenDelay", 160))
  readonly property int hoverCloseDelay: Math.max(0, root.setting("hoverCloseDelay", 280))
  readonly property int configuredPanelWidth: Math.max(280, root.setting("panelWidth", 380))
  readonly property string configuredPreferredPlayer: root.setting("preferredPlayer", "")

  // MPRIS Service tracking & selection
  property string selectedPlayerKey: ""
  readonly property var players: Mpris.players ? Mpris.players.values : []
  readonly property var activePlayer: IslandModel.resolveActivePlayer(players, selectedPlayerKey || configuredPreferredPlayer)
  readonly property bool hasMedia: activePlayer !== null && (activePlayer.trackTitle || activePlayer.trackArtist) && (activePlayer.isPlaying || activePlayer.canTogglePlaying || activePlayer.canPlay || activePlayer.canPause)
  readonly property bool isPlaying: activePlayer ? (activePlayer.isPlaying === true && (activePlayer.canTogglePlaying || activePlayer.canPause || activePlayer.canPlay)) : false

  // Reduced motion support
  readonly property bool animationsEnabled: root.bar ? root.bar.foregroundAnimationEnabled : true

  // Keyboard accessibility
  focus: true
  activeFocusOnTab: true
  Keys.onReturnPressed: root.togglePanel()
  Keys.onSpacePressed: root.togglePanel()
  Keys.onEscapePressed: if (root.opened) root.close()

  // Wayland toplevels for deep PWA detection
  readonly property var toplevels: ToplevelManager.toplevels ? ToplevelManager.toplevels.values : []

  // Brand / Source & Clean Metadata
  readonly property var sourceInfo: IslandModel.detectSource(activePlayer, toplevels)
  readonly property var cleanedTrack: IslandModel.cleanTrackInfo(activePlayer ? activePlayer.trackTitle : "", activePlayer ? activePlayer.trackArtist : "")
  readonly property string title: cleanedTrack.title
  readonly property string artist: cleanedTrack.artist
  readonly property string artUrl: activePlayer ? (activePlayer.trackArtUrl || "") : ""

  // Active event aggregator resolution
  readonly property var activeEvent: IslandModel.computeActiveEvent(activePlayer, [], toplevels)

  // Robust hover bridging state
  readonly property bool pillHovered: pillHoverHandler.hovered
  property bool remotePanelHovered: false
  readonly property bool panelHovered: remotePanelHovered || (panelLoader.item ? panelLoader.item.panelHovered === true : false)
  readonly property bool hoverActive: pillHovered || panelHovered

  // Panel Open / Close Contract
  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false

  function open() {
    if (panelLoader.item) panelLoader.item.open()
  }

  function close() {
    if (panelLoader.item) panelLoader.item.close()
  }

  function togglePanel() {
    if (panelLoader.item) panelLoader.item.toggle()
  }

  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function closeForPopoutSwitch() {
    if (panelLoader.item) panelLoader.item.closeForPopoutSwitch()
  }

  function refresh() {
    if (panelLoader.item && panelLoader.item.refresh) panelLoader.item.refresh()
  }

  // Debounced single-shot hover logic with cross-timer cancellation
  onHoverActiveChanged: {
    if (hoverActive) {
      closeTimer.stop()
      if (!root.opened) {
        openTimer.restart()
      }
    } else {
      openTimer.stop()
      if (root.opened) {
        closeTimer.restart()
      }
    }
  }

  Timer {
    id: openTimer
    interval: root.hoverOpenDelay
    repeat: false
    onTriggered: {
      if (root.hoverActive && !root.opened) {
        root.open()
      }
    }
  }

  Timer {
    id: closeTimer
    interval: root.hoverCloseDelay
    repeat: false
    onTriggered: {
      if (!root.hoverActive && root.opened) {
        root.close()
      }
    }
  }

  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("settings" in target) target.settings = root.settings
    if ("anchorItem" in target) target.anchorItem = pillContainer
    if ("hostWidget" in target) target.hostWidget = root
    if ("selectedPlayerKey" in target) target.selectedPlayerKey = root.selectedPlayerKey
  }

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()
  onSelectedPlayerKeyChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
    }
  }

  IpcHandler {
    target: "akshit.island"

    function open() { root.open() }
    function close() { root.close() }
    function show() { root.open() }
    function hide() { root.close() }
    function toggle() { root.togglePanel() }
    function refresh() { root.broadcast("refresh") }
  }

  implicitWidth: pillContainer.implicitWidth
  implicitHeight: pillContainer.implicitHeight

  // Pill visuals
  BorderSurface {
    id: pillContainer
    anchors.centerIn: parent

    readonly property color fg: root.bar && root.bar.barForeground ? root.bar.barForeground : Color.foreground
    readonly property string fontFam: root.bar && root.bar.fontFamily ? root.bar.fontFamily : Style.font.family

    readonly property real basePaddingX: root.hasMedia ? Style.space(10) : Style.space(6)
    readonly property real pillHeight: Math.max(Style.space(22), root.barSize - Style.space(4))

    implicitHeight: root.vertical ? (root.hasMedia ? Style.space(64) : Style.space(32)) : pillHeight
    implicitWidth: {
      if (root.vertical) return root.barSize
      if (root.hasMedia) {
        var textW = trackLabel.implicitWidth + (artistLabel.text !== "" ? artistLabel.implicitWidth + Style.space(8) : 0)
        return Math.min(Style.space(240), Math.max(Style.space(110), textW + Style.space(56)))
      }
      return Style.space(34)
    }

    radius: Math.round(implicitHeight / 2)
    color: root.hoverActive || root.opened || root.activeFocus
      ? Style.hoverFillFor(fg, fg)
      : (root.isPlaying ? Qt.rgba(fg.r, fg.g, fg.b, 0.12) : Qt.rgba(fg.r, fg.g, fg.b, 0.06))

    borderSpec: Border.flat(
      root.activeFocus
        ? Color.accent
        : (root.hoverActive || root.opened ? Color.accent : Qt.rgba(fg.r, fg.g, fg.b, 0.18)),
      root.activeFocus ? 2 : 1
    )

    Behavior on color {
      enabled: root.animationsEnabled
      ColorAnimation { duration: 140 }
    }

    Behavior on implicitWidth {
      enabled: root.animationsEnabled
      NumberAnimation { duration: 220; easing.type: Easing.OutCubic }
    }

    // 1. Idle Compact Icon (Centered when no media)
    Text {
      anchors.centerIn: parent
      visible: !root.vertical && !root.hasMedia
      text: "󰎆"
      textFormat: Text.PlainText
      color: root.hoverActive ? Color.accent : Qt.rgba(pillContainer.fg.r, pillContainer.fg.g, pillContainer.fg.b, 0.7)
      font.family: pillContainer.fontFam
      font.pixelSize: Style.font.iconSmall
      renderType: Text.NativeRendering
    }

    // 2. Active Horizontal Layout (When media is present)
    RowLayout {
      id: contentRow
      anchors.fill: parent
      anchors.leftMargin: pillContainer.basePaddingX
      anchors.rightMargin: pillContainer.basePaddingX
      spacing: Style.space(6)
      visible: !root.vertical && root.hasMedia

      // Source/Equalizer Icon container
      Item {
        Layout.preferredWidth: Style.space(14)
        Layout.preferredHeight: Style.space(14)
        Layout.alignment: Qt.AlignVCenter

        // 3-Bar Equalizer rising from bottom baseline when actively playing
        Item {
          anchors.centerIn: parent
          width: Style.space(12)
          height: Style.space(12)
          visible: root.isPlaying

          Rectangle {
            x: 0
            anchors.bottom: parent.bottom
            width: Style.space(2)
            radius: 1
            color: pillContainer.fg
            SequentialAnimation on height {
              running: root.isPlaying && root.animationsEnabled
              loops: Animation.Infinite
              NumberAnimation { from: Style.space(3); to: Style.space(12); duration: 280; easing.type: Easing.InOutQuad }
              NumberAnimation { from: Style.space(12); to: Style.space(3); duration: 280; easing.type: Easing.InOutQuad }
            }
          }

          Rectangle {
            x: Style.space(4)
            anchors.bottom: parent.bottom
            width: Style.space(2)
            radius: 1
            color: pillContainer.fg
            SequentialAnimation on height {
              running: root.isPlaying && root.animationsEnabled
              loops: Animation.Infinite
              NumberAnimation { from: Style.space(12); to: Style.space(4); duration: 220; easing.type: Easing.InOutQuad }
              NumberAnimation { from: Style.space(4); to: Style.space(12); duration: 220; easing.type: Easing.InOutQuad }
            }
          }

          Rectangle {
            x: Style.space(8)
            anchors.bottom: parent.bottom
            width: Style.space(2)
            radius: 1
            color: pillContainer.fg
            SequentialAnimation on height {
              running: root.isPlaying && root.animationsEnabled
              loops: Animation.Infinite
              NumberAnimation { from: Style.space(2); to: Style.space(9); duration: 320; easing.type: Easing.InOutQuad }
              NumberAnimation { from: Style.space(9); to: Style.space(2); duration: 320; easing.type: Easing.InOutQuad }
            }
          }
        }

        // Real source icon when paused (e.g. YouTube, Spotify, etc.)
        Text {
          anchors.centerIn: parent
          visible: !root.isPlaying
          text: root.sourceInfo.icon
          textFormat: Text.PlainText
          color: pillContainer.fg
          font.family: pillContainer.fontFam
          font.pixelSize: Style.font.caption
          renderType: Text.NativeRendering
        }
      }

      // Title & Artist Text with clean ellipsis elision
      RowLayout {
        Layout.fillWidth: true
        Layout.alignment: Qt.AlignVCenter
        spacing: Style.space(4)

        Text {
          id: trackLabel
          Layout.fillWidth: true
          text: root.title
          textFormat: Text.PlainText
          color: pillContainer.fg
          font.family: pillContainer.fontFam
          font.pixelSize: Style.font.bodySmall
          font.bold: true
          elide: Text.ElideRight
          renderType: Text.NativeRendering
          Layout.alignment: Qt.AlignVCenter
        }

        Text {
          id: artistLabel
          text: root.artist ? "· " + root.artist : ""
          textFormat: Text.PlainText
          color: Qt.rgba(pillContainer.fg.r, pillContainer.fg.g, pillContainer.fg.b, 0.65)
          font.family: pillContainer.fontFam
          font.pixelSize: Style.font.caption
          elide: Text.ElideRight
          renderType: Text.NativeRendering
          visible: root.artist !== "" && root.artist !== root.title
          Layout.alignment: Qt.AlignVCenter
          Layout.maximumWidth: Style.space(70)
        }
      }

      // Trailing Status Indicator Container (Symmetrical to left icon slot)
      Item {
        Layout.preferredWidth: Style.space(14)
        Layout.preferredHeight: Style.space(14)
        Layout.alignment: Qt.AlignVCenter

        Rectangle {
          anchors.centerIn: parent
          width: Style.space(5)
          height: Style.space(5)
          radius: 3
          color: root.isPlaying ? Color.accent : Qt.rgba(pillContainer.fg.r, pillContainer.fg.g, pillContainer.fg.b, 0.35)

          Behavior on color {
            ColorAnimation { duration: 150 }
          }
        }
      }
    }

    // 3. Vertical Layout for vertical bars
    ColumnLayout {
      anchors.fill: parent
      anchors.margins: Style.space(4)
      spacing: Style.space(4)
      visible: root.vertical

      Text {
        Layout.alignment: Qt.AlignHCenter
        text: root.isPlaying ? "󰎆" : (root.hasMedia ? root.sourceInfo.icon : "󰃰")
        textFormat: Text.PlainText
        color: pillContainer.fg
        font.family: pillContainer.fontFam
        font.pixelSize: Style.font.iconSmall
        renderType: Text.NativeRendering
      }

      Rectangle {
        Layout.alignment: Qt.AlignHCenter
        Layout.preferredWidth: Style.space(4)
        Layout.preferredHeight: Style.space(4)
        radius: 2
        visible: root.hasMedia
        color: root.isPlaying ? Color.accent : Qt.rgba(pillContainer.fg.r, pillContainer.fg.g, pillContainer.fg.b, 0.4)
      }
    }

    // Dedicated HoverHandler for rock-solid hover tracking
    HoverHandler {
      id: pillHoverHandler
    }

    // MouseArea for click/scroll actions
    MouseArea {
      id: pillMouseArea
      anchors.fill: parent
      cursorShape: Qt.PointingHandCursor
      acceptedButtons: Qt.LeftButton | Qt.RightButton | Qt.MiddleButton

      onClicked: function(mouse) {
        if (mouse.button === Qt.RightButton || mouse.button === Qt.MiddleButton) {
          if (root.activePlayer && root.activePlayer.canTogglePlaying) {
            root.activePlayer.togglePlaying()
          }
        } else {
          root.togglePanel()
        }
      }

      onWheel: function(wheel) {
        if (!root.activePlayer) return
        if (wheel.angleDelta.y > 0 && root.activePlayer.canGoPrevious) {
          root.activePlayer.previous()
        } else if (wheel.angleDelta.y < 0 && root.activePlayer.canGoNext) {
          root.activePlayer.next()
        }
      }
    }
  }
}
