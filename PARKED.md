# Parked — 2026-11-16

This fork is parked. Nothing here is abandoned or broken; it is just not being worked on.

**Why:** Twinkle Tray is a Windows app, and Shehan's daily machine has been Linux (CachyOS,
Hyprland) since mid-2026. The last work here was 2026-06-18. Finishing and testing the
upstream pull request needs a Windows machine with DDC/CI monitors attached.

**State when parked**

- Branch `custom-control-types`, at `v1.17.2-ddc.7`: custom DDC/CI controls, editable
  built-ins (contrast, volume, input), grouped controls (RGB, move together), drag-to-reorder,
  Active/Disconnected groups and a Dashboard.
- The upstream pull request was **never opened**. `BACKLOG.md` → "Upstream PR notes" has the
  plan: credit upstream PR #790, resolve issue #1241. Upstream PR #1262 was active when this
  was last checked (2026-06); check it again before picking this up.
- `VCP-RESEARCH.md` is the part with lasting value: MCCS code reference, the manufacturer range
  0xE0–0xFF, the full LG 27UD58 / MQ780 tables (picture modes on 0x15, the black-stabiliser
  ×5 quirk), and why laptop panels are brightness-only.

**Where the research went:** Brilliant Settings' monitor page borrows it: card BS8 in
`~/Projects/brilliant-settings/TASKS.md` (contrast, input source, power mode, a per-model
profile for the LG codes, capability strings cached per monitor).

**To pick it up again:** read `BACKLOG.md` "Next (in order)", rebase on `upstream/master`, and
test on Windows before opening the PR.
