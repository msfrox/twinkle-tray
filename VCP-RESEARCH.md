# DDC/CI VCP Code Research Notes

Working reference for mapping monitor VCP codes (esp. LG manufacturer-specific codes
in the `0xE0–0xFF` range). Seed for a future community/universal code table.

## Key takeaways
- Manufacturer-specific codes (`0xE0–0xFF`) are **not** in any public spec. Tools like
  `ddcutil` deliberately don't interpret them — "the only way to know is by testing."
- `ddcutil` solves per-model differences with **User Defined Feature (UDF)** files keyed by
  **EDID** (3-char manufacturer id + model name + integer product number). This is a proven
  schema for our planned online DB.
- `ddccontrol-db` is an existing community database of monitor configs (good model / possible
  contribution target).
- **Laptop internal panels**: controlled via **WMI** (`WmiMonitorBrightnessMethods`),
  **brightness only** — no DDC/CI VCP. So for built-in laptop displays there is essentially
  nothing extra to expose beyond brightness (which Twinkle Tray already does).
- LG codes are largely **shared across models, but values differ per model** — exactly why a
  per-model DB + on-device discovery both matter.

## LG 27UD58 — reverse-engineered reference (from ddccontrol-db #80)
| Code | Control | Values |
|------|---------|--------|
| 0x15 | Picture Mode | 1=Reader, 6=Color Weakness, 9=Dark Room 1, 10=Dark Room 2, 11=Custom, 13=RTS Game, 14=Custom Game, 28=FPS Game 1, 29=FPS Game 2, 32=Photo, 48=Cinema |
| 0x87 | Sharpness | 0–100 |
| 0xF5 | Aspect Ratio | 1=Wide, 2=Original |
| 0xF6 | Smart Energy Saving | 0=Off, 1=Low, 2=High |
| 0xF7 | Response Time | 0=Off, 1=High, 2=Middle, 3=Low |
| 0xF8 | FreeSync | 0=Off, 2=Basic, 3=Extended |
| 0xF9 | Black Stabilizer | 0–100 |
| 0xFE | Gamma | 1=Gamma 0, 2=Gamma 1, 3=Gamma 2, 4=Off |
| 0x92 | OSD Language | 0=English, 11776=German, … |

**Black Stabilizer quirk (some LG HDR models):** set values normalized to **0–20**, and the
monitor reports the value **×5** (0–100). Matches the "moves in multiples of 5" behavior —
handle with a stepped slider.

## LG MQ780 (our test monitor) — capability string
```
vcp(02 04 05 08 10 12 14(05 08 0B) 16 18 1A 52 60(11 12 0F 10) AC AE B2 B6 C0 C6 C8 C9
D6(01 04) DF 62 8D F4 F5(01 02 03 04) F6(00 01 02) 4D 4E 4F
15(01 06 11 13 14 15 18 19 20 22 23 24 28 29 32 48) F7(00 01 02 03) F8(00 01) F9 EF
FA(00 01) FD(00 01) FE(00 01 02) FF) mccs_ver(2.1)
```

### Cross-referenced guesses for MQ780 (verify with scan/discovery)
| Code | Likely (from 27UD58) | MQ780 values | Confidence |
|------|----------------------|--------------|-----------|
| 0x15 | Picture Mode / Color Space | many | confirmed (user-mapped; richer color-space set than 27UD58) |
| 0xF6 | Smart Energy Saving | 0,1,2 | high (exact match) |
| 0xF7 | Response Time | 0,1,2,3 | high (exact match) |
| 0xF9 | Black Stabilizer | continuous | confirmed by user |
| 0xFE | Gamma | 0,1,2 | medium |
| 0xF8 | FreeSync / Adaptive-Sync | 0,1 | medium (off/on; may be unavailable over USB-C DP-alt) |
| 0xF5 | Aspect Ratio | 1,2,3,4 | medium (more options than 27UD58) |
| 0xF4 | continuous — Sharpness? Super-Res? Color temp? | — | unknown |
| 0xFA, 0xFD | on/off toggles | 0,1 | unknown |
| 0x4D, 0x4E, 0x4F, 0xEF, 0xFF | — | — | unknown |

### MQ780 0x15 values mapped so far (user testing — decimal)
1=Reader, 6=Color Weakness, 15=sRGB, 22=EBU, 23=REC709, 24=SMPTE-C, 25=DCI-P3, 30=FPS,
31=RTS, 39=HDR Effect, 46=Gamer 2, 49=Vivid, 50=REC-2020, 52=BT.2100 PQ, 56/57=P3-D65.
**Cinema** not yet found — use scan-and-compare (set Cinema in LG app → re-scan) to pin it.

## Standard MCCS quick reference (common codes)
| Code | Feature | Type | Notes |
|------|---------|------|-------|
| 0x10 | Luminance (brightness) | continuous | main backlight |
| 0x12 | Contrast | continuous | |
| 0x14 | Select colour preset | discrete | colour temperature (5000K/6500K/9300K/sRGB/user…) |
| 0x16 / 0x18 / 0x1A | Video gain R / G / B | continuous | RGB white balance |
| 0x6C / 0x6E / 0x70 | Video black level R / G / B | continuous | |
| 0x60 | Input source | discrete | 0F=DP1,10=DP2,11=HDMI1,12=HDMI2 (etc.) |
| 0x62 | Speaker volume | continuous | |
| 0x8D | Audio mute | discrete | 1=mute, 2=unmute |
| 0x72 | Gamma | continuous | |
| 0x87 | Sharpness | continuous | |
| 0x8A | Colour saturation | continuous | |
| 0x90 | Hue | continuous | |
| 0xAA | Screen orientation | discrete | 1=0°,2=90°,3=180°,4=270° |
| 0xCC | OSD language | discrete | |
| 0xD6 | Power mode | discrete | 1=on, 4=standby, 5=off |
| 0x04 / 0x05 / 0x06 / 0x08 | Restore factory (all / lum+contrast / geometry / colour) | write-only action | momentary |
| 0x01 | Degauss | write-only action | CRT only |
| 0xAC / 0xAE | Horizontal / vertical frequency | read-only info | |
| 0xB2 | Flat-panel sub-pixel layout | read-only info | |
| 0xB6 | Display technology type | read-only info | |
| 0xC0 | Display usage time | read-only info | hours powered |
| 0xC6 / 0xC8 | Application enable key / controller ID | read-only info | |
| 0xC9 | Display firmware level | read-only info | |
| 0xDF | VCP (MCCS) version | read-only info | |
| 0xE0–0xFF | Manufacturer-specific | varies | undocumented — discover by testing |

## LG MQ780 — recommended profile to set up now
Add each via **DDC/CI Features → + Add** (or the code list), pick the control type, label the values.
✓ confirmed · 🔶 likely (from LG 27UD58 / your testing) · ❓ unknown (use Discover/Scan).

| Code | What it is | Suggested control | Values / labels | Conf. |
|------|-----------|-------------------|-----------------|-------|
| 0x10 | Brightness | Slider *(built-in)* | 0–100 | ✓ |
| 0x12 | Contrast | Slider *(built-in)* | 0–100 | ✓ |
| 0x62 | Volume | Slider *(built-in)* | 0–100 | ✓ |
| 0x60 | Input | Buttons *(built-in)* | DP-1/DP-2/HDMI-1/HDMI-2 | ✓ |
| 0xD6 | Power | Buttons *(built-in)* | 1=On, 4=Off | ✓ |
| 0x15 | Picture / Colour-space mode | **Dropdown** | your map: Reader/Color-Weakness/sRGB/EBU/REC709/SMPTE-C/DCI-P3/FPS/RTS/HDR-Effect/Vivid/Gamer2/REC-2020/BT.2100-PQ/P3-D65/Cinema | ✓ mapped |
| 0xF9 | Black Stabilizer | **Slider, step 5** | 0–100 | ✓ |
| 0xF7 | Response Time | **Buttons** | 0=Off,1,2,3 (Fast/Faster/…) | 🔶 high |
| 0xF6 | Smart Energy Saving | **Buttons** | 0=Off,1=Low,2=High | 🔶 high |
| 0x14 | Colour temperature | Buttons | 5,8,11 → Warm/Medium/Cool (verify) | 🔶 |
| 0x16/0x18/0x1A | RGB gain (R/G/B) | Sliders ×3 *(group later)* | 0–100 each | ✓ |
| 0x8D | Audio mute | Toggle | 1=Mute, 2=Unmute | 🔶 |
| 0xF8 | FreeSync / Adaptive-Sync | Toggle | 0=Off, 1=On | 🔶 |
| 0xFE | Gamma | Buttons | 0,1,2 (Gamma modes) | 🔶 |
| 0xF5 | Aspect Ratio (likely) | Buttons | 1–4 (Wide/Original/…) | 🔶 |
| 0xF4 | unknown continuous (Sharpness/Super-Res?) | Slider | 0–? | ❓ |
| 0xFA / 0xFD | unknown on/off (DAS? HDR? crosshair?) | Toggle | 0/1 | ❓ |
| 0x4D/0x4E/0x4F · 0xEF · 0xFF | unknown vendor | Discover | — | ❓ |
| 0x04 / 0x05 / 0x08 | Restore defaults (factory / lum+contrast / colour) | Action buttons | momentary | ✓ |
| 0x02 · 0x52 · 0xAC · 0xAE · 0xB2 · 0xB6 · 0xC0 · 0xC6 · 0xC8 · 0xC9 · 0xDF | Status / info | **Info (read-only)** | — | ✓ |

## Other brands & the community DB schema
- **ddccontrol-db** keys each monitor by **Plug-and-Play ID** (3–4 char vendor + 4-char hex
  product, e.g. `GSM5B55` = an LG, `DEL4063` = a Dell). Each profile is XML with controls
  grouped into categories; there's a "how to add a monitor" guide and PRs are welcome. This is
  our model for a universal DB and a contribution target. **Our MQ780's PnP id is `GSM5BF6`.**
- **Dell**: implements standard MCCS well; won't publish proprietary codes, but
  brightness/contrast/input/presets work. ddccontrol-db already has Dell profiles. There's even
  a Twinkle Tray discussion asking for Dell VCP codes — community demand exists in-project.
- **Samsung**: DDC/CI is **spotty** — frequently disabled on DisplayPort entirely, few
  documented vendor codes. Input select works on some (5 = HDMI-1, 6 = HDMI-2). Expect partial
  support; not every Samsung is controllable.
- **Takeaway for "master profiles":** a brand superset works as a universal-remote-style profile,
  but per-model capability varies a lot (esp. Samsung). Pair the brand profile with on-device
  capability detection + our control-type metadata, and degrade gracefully.

## Sources
- [ddccontrol-db #80 — LG 27UD58 reverse-engineered codes](https://github.com/ddccontrol/ddccontrol-db/issues/80)
- [ddcutil — Control monitor settings via DDC/CI](https://github.com/rockowitz/ddcutil)
- [ddcutil #529 — LG Black Stabilizer (0–20 ×5 quirk)](https://github.com/rockowitz/ddcutil/issues/529)
- [ddcutil — User Defined Features (per-EDID schema)](https://www.ddcutil.com/udf/)
- [ddcutil — Monitor notes](https://www.ddcutil.com/archived/monitor_notes/)
- [MartinGC94/MonitorConfig — PowerShell DDC/CI](https://github.com/MartinGC94/MonitorConfig)
- [monitorcontrol — Python DDC/CI](https://pypi.org/project/monitorcontrol/)
- [ddccontrol-db — community monitor DB](https://github.com/ddccontrol/ddccontrol-db)
- [ddccontrol-db — how to add a monitor](https://github.com/ddccontrol/ddccontrol-db/blob/master/doc/how-to-add-a-monitor.md)
- [ddccontrol-db — example LG profile GSM5B55.xml](https://github.com/ddccontrol/ddccontrol-db/blob/master/db/monitor/GSM5B55.xml)
- [ddccontrol-db #70 — Dell U3818DW profile](https://github.com/ddccontrol/ddccontrol-db/issues/70)
- [Twinkle Tray discussion #1083 — VCP codes for Dell](https://github.com/xanderfrangos/twinkle-tray/discussions/1083)
- [VESA DDC/CI 1.1 spec (PDF)](https://glenwing.github.io/docs/VESA-DDCCI-1.1.pdf)
