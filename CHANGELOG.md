# Changelog

All notable changes to this fork's **custom DDC/CI controls** work are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/) and the project
uses [Semantic Versioning](https://semver.org/).

**Versioning scheme:** `1.17.2-ddc.N` — based on upstream **Twinkle Tray 1.17.2**, where
`ddc.N` is this fork's DDC-features build number. Upstream changes keep their own versions.

## Version history

| Version | Date | Summary |
|---------|------|---------|
| [1.17.2-ddc.7](#1172-ddc7---2026-06-18) | 2026-06-18 | Active/Disconnected monitor groups + collapsible monitors on the Features page; new Dashboard page; per-feature placement (Panel/Dashboard/Both) |
| [1.17.2-ddc.6](#1172-ddc6---2026-06-18) | 2026-06-18 | Grouped / multi-control features (e.g. RGB gain) with a "move all together" link and one-click RGB preset |
| [1.17.2-ddc.5](#1172-ddc5---2026-06-18) | 2026-06-18 | Editable built-ins (contrast/volume/input) with safe dual-path rendering; unified drag-reorder for built-ins + custom features |
| [1.17.2-ddc.4](#1172-ddc4---2026-06-18) | 2026-06-18 | More icons, control-type-neutral labels, drag-reorder the feature list, full code-reference table |
| [1.17.2-ddc.3](#1172-ddc3---2026-06-18) | 2026-06-18 | Auto-classification, read-only/info type, rename, drag-reorder, stepped slider, defaults/reset |
| [1.17.2-ddc.2](#1172-ddc2---2026-06-17) | 2026-06-17 | Export/import config, research docs |
| [1.17.2-ddc.1](#1172-ddc1---2026-06-17) | 2026-06-17 | Custom control types, discovery + scan tools |

---

## [1.17.2-ddc.7] - 2026-06-18

### Added
- **Active / Disconnected monitor groups** (#13): the DDC/CI Features page now splits
  displays into *Active monitors* and *Disconnected monitors*. A display with saved
  config that isn't currently connected stays listed (and its settings stay editable)
  instead of vanishing.
- **Collapsible monitors**: every monitor section on the Features page and the Dashboard
  can be collapsed to save space (disconnected ones start collapsed).
- **Dashboard page** (#12): a new settings page that mirrors the active/disconnected +
  collapsible layout and lets you adjust DDC/CI features without opening the taskbar
  flyout (reuses the panel controls live).
- **Per-feature placement** (#12): each feature/group has a **"Show in"** setting —
  *Panel & Dashboard* (default), *Panel only*, or *Dashboard only* — so rarely-used
  controls can live on the Dashboard instead of cluttering the flyout.

### Notes
- Disconnected displays are reconstructed from saved config (`monitorFeatures` /
  `monitorFeaturesSettings` / `monitorFeatureGroups`); they show their internal hardware
  ID as the name. Live control of a disconnected display resumes on reconnect.

## [1.17.2-ddc.6] - 2026-06-18

### Added
- **Grouped / multi-control features** (#11): bundle several VCP codes into one
  feature (e.g. RGB gain = `0x16`/`0x18`/`0x1A`). Each member renders as a labeled
  slider in the brightness panel under a single icon.
  - **"Move all sliders together"** link: dragging one member shifts the rest by the
    same amount (clamped per member), preserving their relative offsets.
  - **"Apply to all"**: write one value to every member at once.
  - **One-click RGB preset** seeds red/green/blue; or add any codes manually with
    per-member label, min, max and step.
- Groups drag-reorder in one combined list with built-in and custom features, and are
  persisted per-monitor (`monitorFeatureGroups`), included in export/import.

## [1.17.2-ddc.5] - 2026-06-18

### Added
- **Editable built-ins** (#14): contrast (`0x12`), volume (`0x62`) and input (`0x60`)
  are now first-class, editable features — rename, choose a control type, edit/label
  values, set a default, and drag-reorder them alongside custom features. Built-ins are
  non-deletable; brightness (`0x10`) and power (`0xD6`) stay special/system-integrated.
- **Unified feature ordering**: built-in editables and custom codes share one
  drag-reorder list in settings, and the brightness panel honors that order (built-ins
  default to contrast → volume → input, then customs).

### Changed
- **Safe dual-path rendering**: until you pick a control type, contrast/volume keep their
  familiar percentage slider and input keeps its button row (unchanged behavior). The
  moment you choose a control type, that feature switches to the generic renderer (buttons,
  dropdown, toggle, raw slider, action buttons, or info) using your value labels.

## [1.17.2-ddc.4] - 2026-06-18

### Added
- More icons in the icon picker; renamed "Slider Indicator Type" / "Slider Icon" to
  control-type-neutral labels ("Indicator type" / "Icon" / "Label text").
- **Drag-to-reorder the feature list** (handle on each feature) — the brightness panel
  renders custom features in your chosen order.
- `VCP-RESEARCH.md`: a standard MCCS quick-reference table and an actionable **LG MQ780
  recommended profile** (per-code meaning + suggested control type).

### Fixed
- Custom slider features persist explicit bounds (0–100) on setup, so the panel no longer falls
  back to the monitor's reported max (a garbage 255 on some vendor codes like `0xF9`).

## [1.17.2-ddc.3] - 2026-06-18
Commit `67e6e78` (+ docs/drag-reorder follow-up).

### Added
- **MCCS metadata table** (`src/vcp-meta.js`) — categorizes standard VCP codes (info /
  continuous / discrete / action) with a default control type.
- **Auto-classification**: any code added on any monitor is automatically given a sensible
  control — info → read-only, continuous → slider, discrete → buttons/dropdown, action →
  buttons; unknown vendor codes fall back to capability detection. The detected default is
  now persisted so the brightness panel renders the right control immediately.
- **Read-only "info" control type** for status codes (technology type, sub-pixel layout,
  frequencies, firmware, version…) — displays the value, no control.
- **Rename** field for custom features (title shows the name + grayed `0x..` code).
- **Drag-to-reorder** value lists (drag handle, via react-beautiful-dnd).
- **Stepped slider** — raw min/max/step; sends raw values (no more `value*max/100` scaling).
- **Defaults**: per-feature default value + "reset to default" (live write), and
  "save current as defaults" in the scanner (capture after a factory reset).

### Fixed
- Non-continuous VCP features no longer forced onto a 0–100% scale (addresses upstream #1241).

## [1.17.2-ddc.2] - 2026-06-17
Commit `3ebf7a6`.

### Added
- **Export / import config** — save monitor feature setup (control types, value labels, code
  mappings) to a JSON file and merge it back. Backup + sharing.
- `VCP-RESEARCH.md` and `BACKLOG.md` research/roadmap docs.

## [1.17.2-ddc.1] - 2026-06-17
Commit `82e444b`.

### Added
- **Per-feature control types**: slider, buttons, dropdown, toggle, action buttons.
- **Custom in-panel dropdown** (no native `<select>`, so it can't blur/close the panel).
- Auto-sizing button rows; one-click **+ Add** for any reported VCP code.
- **Discovery/training tool** (step a raw value 0–255 live and name values).
- **Scan & compare tool** (read all reported codes; highlight what changed).
- Grayed `0x..` code tags on feature titles.

[1.17.2-ddc.3]: https://github.com/msfrox/twinkle-tray/commits/custom-control-types
[1.17.2-ddc.2]: https://github.com/msfrox/twinkle-tray/commit/3ebf7a6
[1.17.2-ddc.1]: https://github.com/msfrox/twinkle-tray/commit/82e444b
