import React, { useState, useEffect } from "react"
import { useObject } from "../hooks/useObject"
import Slider from "./Slider"

// Familiar icons for the editable built-ins, used when they render generically
// without a custom icon set.
const builtInIcons = { "0x12": "E793", "0x62": "E767", "0x60": "E839" }

export default function DDCCISliders(props) {
    const { monitor, monitorFeatures } = props

    const featureSettings = window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]

    const defaultValues = {}

    for (const vcp in monitor?.features) {
        // Input (0x60) is special: in its default rendering we keep the whole
        // [current, [list]] array; once a custom control type is chosen it uses the
        // scalar current value like every other code.
        if (vcp === "0x60" && !featureSettings?.["0x60"]?.controlType) {
            defaultValues[vcp] = monitor?.features?.[vcp] ?? 0
        } else {
            defaultValues[vcp] = monitor?.features?.[vcp]?.[0] ?? 0
        }
    }
    const [values, setValues] = useObject(defaultValues)

    // Tracks which custom dropdown (by vcp) is currently expanded. Using a
    // self-contained dropdown instead of a native <select> avoids the OS popup
    // that would blur (and auto-hide) the panel.
    const [openDropdown, setOpenDropdown] = useState(null)
    useEffect(() => {
        const el = document.getElementById("panel")
        if (el && window.sendHeight) window.sendHeight(el.offsetHeight)
    }, [openDropdown])

    const inputsData = {
        1: "VGA-1",
        2: "VGA-2",
        3: "DVI-1",
        4: "DVI-2",
        5: "Composite video 1",
        6: "Composite video 2",
        7: "S-Video-1",
        8: "S-Video-2",
        9: "Tuner-1",
        10: "Tuner-2",
        11: "Tuner-3",
        12: "Component video (YPrPb/YCrCb) 1",
        13: "Component video (YPrPb/YCrCb) 2",
        14: "Component video (YPrPb/YCrCb) 3",
        15: "DisplayPort-1",
        16: "DisplayPort-2",
        17: "HDMI-1",
        18: "HDMI-2"
    }

    const changeInputsState = (code) => {
        const a = [code, [...values["0x60"][1]]]
        setValues({ ["0x60"]: a })
    }

    // Apply a group slider change. When the group is linked ("move all together"),
    // shift every member by the same delta (clamped to each member's bounds) so the
    // relative offsets are preserved; otherwise just move the one member.
    const handleGroupChange = (g, member, val) => {
        if (g.linked) {
            const delta = val - (values[member.vcp] ?? 0)
            const updates = {}
            ;(g.members || []).forEach(m => {
                if (!m || !m.vcp) return
                const code = parseInt(m.vcp)
                if (isNaN(code)) return
                const min = (m.min ?? 0), max = (m.max ?? 100)
                let nv = (values[m.vcp] ?? 0) + delta
                if (nv < min) nv = min
                if (nv > max) nv = max
                updates[m.vcp] = nv
                setVCP(monitor.id, code, nv)
            })
            setValues(updates)
        } else {
            const code = parseInt(member.vcp)
            if (isNaN(code)) return
            setValues({ [member.vcp]: val })
            setVCP(monitor.id, code, val)
        }
    }

    // Render a feature group as a column of labeled sliders under one icon.
    const renderGroup = (g) => {
        const members = (g.members || []).filter(m => m && m.vcp)
        if (!members.length) return null
        let icon
        if (g.iconType === "windows" && g.icon) {
            icon = (<span className="icon vfix" dangerouslySetInnerHTML={{ __html: `&#x${g.icon};` }}></span>)
        } else if (g.iconType === "text" && g.iconText) {
            icon = (<span className="icon icon-text vfix">{g.iconText}</span>)
        } else {
            icon = (<span className="icon vfix">&#xE790;</span>)
        }
        return (
            <div className="feature-row feature-group-row" key={monitor.key + "_" + g.id}>
                <div className="feature-icon">{icon}</div>
                <div className="feature-group-sliders">
                    {members.map((m, idx) => (
                        <div className="feature-group-slider" key={m.vcp + "_" + idx}>
                            <Slider type="custom" min={(m.min ?? 0)} max={(m.max ?? 100)} step={(m.step ?? 1)} name={m.label || m.vcp} icon={false} height={"short"} monitorID={monitor.id} level={values[m.vcp] ?? 0} monitorName={monitor.name} monitortype={monitor.type} onChange={val => handleGroupChange(g, m, val)} scrollAmount={props.scrollAmount} />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    let extraHTML = []

    if (monitor?.features) {
        // Brightness/backlight/power are rendered elsewhere; everything else
        // (contrast/volume/input + custom codes + groups) follows the saved order,
        // with sensible defaults for the editable built-ins. Codes that belong to a
        // group are rendered inside the group, not standalone.
        const groups = (window.settings?.monitorFeatureGroups?.[monitor?.hwid[1]]) || []
        const groupedVcps = new Set()
        groups.forEach(g => (g.members || []).forEach(m => { if (m && m.vcp) groupedVcps.add(m.vcp) }))

        const fixedKeys = ["0x10", "0x13", "0xD6"]
        const defaultOrder = { "0x12": 0, "0x62": 1, "0x60": 2 }
        const orderOf = (v) => (featureSettings?.[v]?.order ?? defaultOrder[v] ?? 9999)
        const allKeys = Object.keys(monitor.features)
        const featureKeys = allKeys.filter(k => !fixedKeys.includes(k) && !groupedVcps.has(k))
        const renderList = [
            ...featureKeys.map(vcp => ({ kind: "feature", vcp, order: orderOf(vcp) })),
            ...groups.filter(g => g.enabled).map(g => ({ kind: "group", group: g, order: (g.order ?? 9999) }))
        ].sort((a, b) => a.order - b.order)

        for (const item of renderList) {
            if (item.kind === "group") {
                const groupHTML = renderGroup(item.group)
                if (groupHTML) extraHTML.push(groupHTML)
                continue
            }
            const vcp = item.vcp

            const feature = monitor.features[vcp]
            const featSettings = featureSettings?.[vcp] ?? {}
            // Editable built-ins (contrast/volume/input) keep their special rendering
            // until the user explicitly chooses a control type, then use the generic path.
            const usesSpecial = (vcp === "0x12" || vcp === "0x62" || vcp === "0x60") && !featSettings.controlType
            const allowWithoutValue = (featSettings.controlType === "actions")
            if ((feature || allowWithoutValue) && monitorFeatures?.[vcp] && !(featSettings.linked)) {
                // Feature is enabled and not linked (action buttons may render without a current value)
                if (usesSpecial && vcp === "0x12") {
                    // Contrast
                    extraHTML.push(
                        <div className="feature-row feature-contrast" key={monitor.key + "_" + vcp}>
                            <div className="feature-icon"><span className="icon vfix">&#xE793;</span></div>
                            <Slider type="contrast" monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val * (monitor.features[vcp][1] / 100)) }} scrollAmount={props.scrollAmount} />
                        </div>
                    )
                } else if (usesSpecial && vcp === "0x62") {
                    // Volume
                    extraHTML.push(
                        <div className="feature-row feature-volume" key={monitor.key + "_" + vcp}>
                            <div className="feature-icon"><span className="icon vfix">&#xE767;</span></div>
                            <Slider type="volume" monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val * (monitor.features[vcp][1] / 100)) }} scrollAmount={props.scrollAmount} />
                        </div>
                    )
                } else if (usesSpecial && vcp === "0x60") {
                    // Input
                    extraHTML.push(
                        <div className="feature-row feature-inputs" key={monitor.key + "_" + vcp}>
                            <div className="feature-icon"><span className="icon vfix">&#xE839;</span></div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                                {values["0x60"][1].map(e =>
                                    <button key={e + monitor.id} className={values["0x60"][0] === e ? "button disabled" : "button"} disabled={values["0x60"][0] === e} onClick={() => { setVCP(monitor.id, parseInt(vcp), e); changeInputsState(e) }}>{inputsData[e]}</button>
                                )}
                            </div>
                        </div >
                    )
                } else {
                    // Custom feature — render based on its configured control type
                    const settings = featSettings
                    const type = settings.controlType || "slider"
                    const optionList = Array.isArray(settings.values) ? settings.values : []
                    const featureMax = (Array.isArray(feature) && feature[1] ? feature[1] : 100)

                    let icon
                    if (settings?.iconType === "windows" && settings?.icon) {
                        icon = (<span className="icon vfix" dangerouslySetInnerHTML={{ __html: `&#x${settings.icon};` }}></span>)
                    } else if (settings?.iconType === "text" && settings?.iconText) {
                        icon = (<span className="icon icon-text vfix">{settings.iconText}</span>)
                    } else if (builtInIcons[vcp]) {
                        // Editable built-in with no custom icon — keep its familiar icon.
                        icon = (<span className="icon vfix" dangerouslySetInnerHTML={{ __html: `&#x${builtInIcons[vcp]};` }}></span>)
                    } else {
                        // Default
                        icon = (<span className="icon vfix">&#xe897;</span>)
                    }

                    if (type === "buttons" || type === "actions") {
                        extraHTML.push(
                            <div className="feature-row feature-buttons-row" key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <div className="feature-buttons">
                                    {optionList.map((opt, idx) => {
                                        const active = (type === "buttons" && values[vcp] === opt.value)
                                        return (<button key={idx + "_" + monitor.id} className={active ? "button disabled" : "button"} disabled={active} onClick={() => { setVCP(monitor.id, parseInt(vcp), opt.value); setValues({ [vcp]: opt.value }) }}>{opt.label || opt.value}</button>)
                                    })}
                                </div>
                            </div>
                        )
                    } else if (type === "dropdown") {
                        const current = values[vcp]
                        const currentOpt = optionList.find(o => o.value === current)
                        const isOpen = (openDropdown === vcp)
                        extraHTML.push(
                            <div className={"feature-row feature-dropdown-row" + (isOpen ? " open" : "")} key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <div className="feature-dropdown">
                                    <button className="feature-dropdown-toggle" onClick={() => setOpenDropdown(isOpen ? null : vcp)}>
                                        <span className="feature-dropdown-label">{currentOpt ? (currentOpt.label || currentOpt.value) : (current ?? "—")}</span>
                                        <span className="icon chevron" dangerouslySetInnerHTML={{ __html: "&#xE70D;" }}></span>
                                    </button>
                                    {isOpen ?
                                        <div className="feature-dropdown-list">
                                            {optionList.map((opt, idx) =>
                                                <button key={idx} className={"feature-dropdown-option" + (opt.value === current ? " selected" : "")} onClick={() => { setVCP(monitor.id, parseInt(vcp), opt.value); setValues({ [vcp]: opt.value }); setOpenDropdown(null) }}>{opt.label || opt.value}</button>
                                            )}
                                        </div>
                                        : null}
                                </div>
                            </div>
                        )
                    } else if (type === "toggle") {
                        const offVal = (optionList[0]?.value ?? 0)
                        const onVal = (optionList[1]?.value ?? 1)
                        const isOn = (values[vcp] === onVal)
                        extraHTML.push(
                            <div className="feature-row" key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <label className="feature-toggle-switch">
                                    <input type="checkbox" checked={isOn} onChange={e => { const v = (e.target.checked ? onVal : offVal); setVCP(monitor.id, parseInt(vcp), v); setValues({ [vcp]: v }) }} />
                                    <span className="track"></span>
                                </label>
                            </div>
                        )
                    } else if (type === "info") {
                        // Read-only info value (just display, no control)
                        const current = (Array.isArray(feature) ? feature[0] : values[vcp])
                        extraHTML.push(
                            <div className="feature-row feature-info-row" key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <div className="feature-info-value">{current ?? "—"}</div>
                            </div>
                        )
                    } else {
                        // Slider — raw min/max/step, sends the raw value directly
                        const sMin = (settings.sliderMin ?? 0)
                        const sMax = (settings.sliderMax ?? 100)
                        const sStep = (settings.step ?? 1)
                        extraHTML.push(
                            <div className="feature-row feature-volume" key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <Slider type="custom" min={sMin} max={sMax} step={sStep} monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val) }} scrollAmount={props.scrollAmount} />
                            </div>
                        )
                    }
                }
            }

        }
    }

    return (
        <>
            {extraHTML}
        </>
    )
}

function setVCP(monitor, code, value) {
    window.dispatchEvent(new CustomEvent("setVCP", {
        detail: {
            monitor,
            code,
            value
        }
    }))
}