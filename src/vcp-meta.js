/**
 * Category + suggested control type for well-known MCCS VCP codes, so any monitor's
 * codes can be auto-classified into a sensible control.
 *
 * category: "info" (read-only) | "continuous" | "discrete" | "action"
 * control:  the default controlType to use ("info" | "slider" | "buttons" | "toggle" | "actions")
 *
 * Codes not listed here fall back to capability-based detection (a value list → buttons,
 * otherwise a slider).
 */
module.exports = {
    0x01: { category: "action", control: "actions" },        // Degauss
    0x02: { category: "info", control: "info" },             // New control value (status)
    0x04: { category: "action", control: "actions" },        // Restore factory defaults
    0x05: { category: "action", control: "actions" },        // Restore factory luminance/contrast
    0x06: { category: "action", control: "actions" },        // Restore factory geometry
    0x08: { category: "action", control: "actions" },        // Restore factory color
    0x0a: { category: "action", control: "actions" },        // Restore factory TV defaults
    0x10: { category: "continuous", control: "slider" },     // Luminance
    0x12: { category: "continuous", control: "slider" },     // Contrast
    0x13: { category: "continuous", control: "slider" },     // Backlight control
    0x14: { category: "discrete", control: "buttons" },      // Select color preset
    0x16: { category: "continuous", control: "slider" },     // Video gain (red)
    0x18: { category: "continuous", control: "slider" },     // Video gain (green)
    0x1a: { category: "continuous", control: "slider" },     // Video gain (blue)
    0x52: { category: "info", control: "info" },             // Active control (status)
    0x60: { category: "discrete", control: "buttons" },      // Input source
    0x62: { category: "continuous", control: "slider" },     // Audio speaker volume
    0x6c: { category: "continuous", control: "slider" },     // Video black level (red)
    0x6e: { category: "continuous", control: "slider" },     // Video black level (green)
    0x70: { category: "continuous", control: "slider" },     // Video black level (blue)
    0x72: { category: "continuous", control: "slider" },     // Gamma
    0x86: { category: "discrete", control: "buttons" },      // Display scaling
    0x87: { category: "continuous", control: "slider" },     // Sharpness
    0x8a: { category: "continuous", control: "slider" },     // Color saturation
    0x8d: { category: "discrete", control: "toggle" },       // Audio mute
    0x90: { category: "continuous", control: "slider" },     // Hue
    0xaa: { category: "discrete", control: "buttons" },      // Screen orientation
    0xac: { category: "info", control: "info" },             // Horizontal frequency
    0xae: { category: "info", control: "info" },             // Vertical frequency
    0xb2: { category: "info", control: "info" },             // Flat panel sub-pixel layout
    0xb6: { category: "info", control: "info" },             // Display technology type
    0xc0: { category: "info", control: "info" },             // Display usage time
    0xc6: { category: "info", control: "info" },             // Application enable key
    0xc8: { category: "info", control: "info" },             // Display controller ID
    0xc9: { category: "info", control: "info" },             // Display firmware level
    0xca: { category: "discrete", control: "toggle" },       // OSD / button control
    0xcc: { category: "discrete", control: "buttons" },      // OSD language
    0xd6: { category: "discrete", control: "buttons" },      // Power mode
    0xda: { category: "discrete", control: "buttons" },      // Scan mode
    0xdc: { category: "discrete", control: "buttons" },      // Display application / picture mode
    0xdf: { category: "info", control: "info" }              // VCP version
}
