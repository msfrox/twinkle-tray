# Twinkle Tray — Custom DDC/CI Controls: Backlog

Working notes for the `custom-control-types` branch (fork: `msfrox/twinkle-tray`).
Goal: turn custom DDC/CI features into first-class, non-slider controls and make the
whole thing useful for **all** monitors/laptops, not just the LG MQ780 we're testing on.

> Note: this file is a working tracker for the fork. It can be excluded from any
> eventual upstream PR if the maintainer doesn't want it.

---

## ✅ Done (this branch)
- Per-feature **control types**: slider, buttons, dropdown, toggle, action buttons.
- Auto-detect discrete values from the display's capability report; persist the
  detected default so the panel renders the right control (long lists → dropdown).
- Custom dropdown in the panel (no native `<select>`, so it can't blur/close the panel).
- Buttons rows auto-size (no overflow/overlap); panel grows to fit.
- One-click **+ Add** for any reported VCP code.
- **Discovery / training tool**: step a raw value 0–255 (wheel/arrows/buttons), write
  live, name + save found values (auto-advance).
- **Scan & compare tool**: read all reported codes' current values; change a setting in
  the monitor's own software, re-scan, and changed values are highlighted.
- Grayed **`0x..` code tags** on every feature title for identification.

## ▶ In progress / next
- [ ] **Export / import settings** (NEXT) — write config (incl. code mappings) to a JSON
      file and load it back. Backup + sharing. Solves "store training data safe."
- [ ] **Rename** custom features (dedicated name field).
- [ ] **Reorder** value lists (move up/down).
- [ ] **Stepped slider** — slider with a configurable step (e.g. Black Stabilizer `0xF9`
      moves in multiples of 5). Send raw values (current slider scales by max/100, which
      mangles raw values — fix as part of this).
- [ ] **Defaults capture & reset** — capture factory-default values (after a reset, or via
      a scan) and offer per-feature / global "reset to default."
- [ ] **Read-only / info control type** — some codes are *information*, not settings (e.g.
      Display Technology Type `0xB6`, Sub-pixel layout `0xB2`, usage time `0xC6`, firmware
      `0xC9`, frequencies `0xAC`/`0xAE`). Add a "display only" control type that just shows
      the value — not a slider/switch/button.

## 📋 Backlog (bigger pieces)

### Online settings database (community config sharing)
- On first run / new-monitor detection: identify the model, query an **online database**
  for a known config, and **download + apply** it automatically.
- Fallback: fetch the correct config from a **GitHub** repo of community configs.
- **Upload** a user's training data (code → label maps) to the database.
- **Conflict resolution** when a model config already exists (merge, versioning, or
  voting/curation). Need a schema keyed by model (and possibly firmware).
- Privacy: opt-in upload; no personal data, just model + VCP maps.
- **Use one universal source — don't fracture the community.** Align with / contribute to an
  existing DB (`ddccontrol-db`, or `ddcutil` UDF format keyed by EDID) instead of a competing silo.
- **Hybrid data model (important):** community DBs store *what* a code is (code → meaning), but
  Twinkle Tray also needs *how to render it* (control type, value labels, step, read-only,
  grouping). The app has no AI to infer this, so we keep **our own metadata layer** (control-type
  + UI hints per code/model) layered on top of the community code identities.
- **"Master profiles" per brand** (LG master, Samsung master, …): a feature-rich superset of
  common codes for a brand (or model subset). Like a universal remote — even if a given model
  lacks a feature, the controls that *do* map work, and the rest are harmless no-ops. Build the
  **LG master profile first** as a proof of concept. Large effort, likely needs going through the
  whole community DB brand by brand.

### Grouped / multi-control features
- Some settings are **multiple sliders for one logical control** (e.g. RGB gain =
  `0x16`/`0x18`/`0x1A` red/green/blue). Support grouping several VCP codes into one feature.
- Per-group options: **"move all together"** (link sliders), reset-group, presets.
- Generalize so other multi-part settings (6-axis hue/saturation, etc.) work too.

### Feature placement (panel vs dashboard)
- Not everything belongs in the taskbar popup. Add a per-feature choice of **where it
  appears**: the brightness flyout, and/or a **settings dashboard** panel for the less
  frequently used controls — so you can change them without opening the monitor's OSD.

### Universal monitor / laptop support
- Make this proper for **all displays**, not just LG. Research per-vendor code maps.
- Investigate what **laptop internal panels** expose (often only brightness via WMI /
  high-level APIs, limited/no DDC). Surface whatever is actually controllable.

### Orientation control (OS-level)
- Rotate the display (Landscape / Portrait / flipped). This is **not DDC** — it's an OS
  display-config setting. The bundled `win32-displayconfig` can *read* `rotation` but not
  set it, so this needs **native C++** (`ChangeDisplaySettingsEx` / `SetDisplayConfig`) and
  a module rebuild. Heavier, separate effort.

### Training resilience (monitor disappears mid-test)
- Testing **power-off (`0xD6`) / factory-reset (`0x04`)** makes the monitor briefly vanish;
  the UI currently treats it as "monitor removed" and closes/refreshes the settings,
  breaking a training session. Add a **training/pinned mode** that keeps the feature config
  and discovery state alive across disconnect/reconnect, and tolerates a missing monitor
  without dropping its settings.
