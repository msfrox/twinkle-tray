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

## Upstream PR notes (when we submit)
Our work directly matches existing community demand and the maintainer's stated intent —
reference these in the PR:
- **PR #790** (jessicah, WIP "use buttons for commands with a fixed set of values"). Maintainer
  (@xanderfrangos) said his intent was *"an option in the new DDC/CI Features settings, per
  feature, allowing users to manually define values for a VCP code instead [of a percentage]"* —
  exactly what we built. Credit it; our work completes that vision.
- **Issue #1241** ("disable percentage mapping for non-continuous VCP features") — our raw-value
  controls + control types **resolve** this. Also relates to #1259/#1260 (slider scroll step) and
  the stepped slider.
- Dominant issue theme = **DDC detection reliability/instability** (#1256, #1233, #1238, #1228,
  #1242, #1222, …) and active PR **#1262** (detection reliability). Our "training resilience"
  (monitor disappears mid-test) fits this; build on #1262, don't conflict.
- Dev tip from maintainer: **`Ctrl+I`** opens the inspector/devtools in-app (CSS debugging).
- Most of the 302 forks are dormant/translation mirrors, but a few are active and instructive:
  - **twinkle-tray-plus** (atSridharIyer, active) — brightness+contrast **presets** (Save/Load
    slots, "Dark" zero-all, auto Previous-state), **per-display power** (DDC backlight-off; the
    monitor stays *logically connected*), contrast-linking, mute-on-dark, display-sleep-timer.
    All gated behind an opt-in **"Plus" toggle** in Settings. Complementary to us (presets/
    contrast/power vs our generic VCP control types + discovery). Also hit a **VS2026 native
    build issue**, fixed via a CL define / patch-package — note if we see build errors.
  - **twinkletrayplusplus** (anmolbyte) — early **C#/Avalonia rewrite** experiment; references
    **Monitorian** (a mature C# Windows brightness tool — good reference implementation).
  - **twinkle-tray-iBasso-Macchiato** — niche repurpose (controls a DAC's volume), not relevant.

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
- Insight from twinkle-tray-plus: a DDC **backlight-off** leaves the monitor *logically connected*
  (Windows still sees it), whereas a full power-off (`0xD6=5`) can truly disconnect it. For
  testing, prefer backlight-off semantics where possible, and/or pin the training UI so a
  transient disconnect doesn't wipe the in-progress config.

### Brightness/contrast presets (from twinkle-tray-plus)
- Named brightness+contrast snapshots with Save/Load slots, a "Dark" (zero-all) action, and
  auto-captured "Previous" state. Richer evolution of our defaults/reset idea.
