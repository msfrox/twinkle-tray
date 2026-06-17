import React, { useState, useEffect } from "react"
import { useObject } from "../hooks/useObject"
import Slider from "./Slider"

export default function DDCCISliders(props) {
    const { monitor, monitorFeatures } = props

    const defaultValues = {}

    for (const vcp in monitor?.features) {
        defaultValues[vcp] = vcp === "0x60"
            ? monitor?.features?.[vcp] ?? 0
            : monitor?.features?.[vcp]?.[0] ?? 0
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

    let extraHTML = []
    const featureSettings = window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]

    if (monitor?.features) {
        let i = 0
        for (const vcp in monitor.features) {
            i++

            if (vcp == "0x10" || vcp == "0x13" || vcp == "0xD6") {
                continue; // Skip if brightness or power state
            }

            const feature = monitor.features[vcp]
            const featSettings = featureSettings?.[vcp] ?? {}
            const isBuiltInFeature = (vcp === "0x12" || vcp === "0x62" || vcp === "0x60")
            const allowWithoutValue = (!isBuiltInFeature && featSettings.controlType === "actions")
            if ((feature || allowWithoutValue) && monitorFeatures?.[vcp] && !(featSettings.linked)) {
                // Feature is enabled and not linked (action buttons may render without a current value)
                if (vcp === "0x12") {
                    // Contrast
                    extraHTML.push(
                        <div className="feature-row feature-contrast" key={monitor.key + "_" + vcp}>
                            <div className="feature-icon"><span className="icon vfix">&#xE793;</span></div>
                            <Slider type="contrast" monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val * (monitor.features[vcp][1] / 100)) }} scrollAmount={props.scrollAmount} />
                        </div>
                    )
                } else if (vcp === "0x62") {
                    // Volume
                    extraHTML.push(
                        <div className="feature-row feature-volume" key={monitor.key + "_" + vcp}>
                            <div className="feature-icon"><span className="icon vfix">&#xE767;</span></div>
                            <Slider type="volume" monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val * (monitor.features[vcp][1] / 100)) }} scrollAmount={props.scrollAmount} />
                        </div>
                    )
                } else if (vcp === "0x60") {
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
                    } else {
                        // Slider (default)
                        extraHTML.push(
                            <div className="feature-row feature-volume" key={monitor.key + "_" + vcp}>
                                <div className="feature-icon">{icon}</div>
                                <Slider type="custom" monitorID={monitor.id} level={values[vcp]} monitorName={monitor.name} monitortype={monitor.type} onChange={val => { setValues({ [vcp]: val }); setVCP(monitor.id, parseInt(vcp), val * (featureMax / 100)) }} scrollAmount={props.scrollAmount} />
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