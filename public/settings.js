// Saved to localStorage. Every access is wrapped in try/catch, so defaults are used if it fails.
const SETTINGS_KEY = "enchantedChessSettings"

// [shadow, mid, highlight], applied to the dark tiles only. null means plain marble.
const BOARD_FLAVOURS = [
  { name: "Marble", ramp: null },
  { name: "Blueberry", ramp: [[12, 30, 74], [58, 120, 216], [190, 224, 255]] },
  { name: "Tomato", ramp: [[58, 12, 8], [186, 46, 22], [255, 198, 150]] },
  { name: "Apple", ramp: [[8, 42, 24], [40, 146, 78], [196, 240, 200]] },
  { name: "Grape", ramp: [[36, 12, 62], [124, 56, 200], [226, 200, 255]] },
  { name: "Orange", ramp: [[46, 28, 4], [190, 134, 26], [255, 226, 160]] }
]

const Settings = {
  showFps: false,
  invertCamera: false,
  reduceMotion: false,
  cameraSpeed: 1,
  moveHints: true,
  boardFlavour: 0,

  // Not saved: fullscreen only works from a click, so it cannot be turned back on at startup.
  fullscreen: false,

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
      for (const key of Object.keys(saved)) {
        // JSON has no functions, so a type match is enough
        if (typeof this[key] === typeof saved[key]) this[key] = saved[key]
      }
    } catch (error) {}
    return this
  },

  save() {
    try {
      const { load, save, set, fullscreen, ...values } = this
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(values))
    } catch (error) {}
  },

  set(key, value) {
    this[key] = value
    if (key === "fullscreen") fullscreen(value)
    this.save()
  }
}
