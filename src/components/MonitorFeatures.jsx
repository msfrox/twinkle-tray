import React, { useState, useEffect, useRef } from "react"
import { useObject } from "../hooks/useObject"
import { SettingsOption, SettingsChild } from "./SettingsOption";
import Slider from "./Slider"
import VCP from "../vcp-codes"
import VCPMeta from "../vcp-meta"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
// Brightness/backlight/power stay fully special (system-integrated) and are never
// shown in the generic editor.
const lockedCodes = ["0x10", "0x13", "0xD6"]
// Contrast/volume/input are now first-class editable features (rename, control type,
// values, reorder) but are non-deletable. They share the same generic editor as
// custom codes; the panel keeps their special rendering until a control type is set.
const builtInEditableCodes = ["0x12", "0x62", "0x60"]
// Codes excluded from the "custom features" list and the add-from-list buttons.
const ignoreCodes = [...lockedCodes, ...builtInEditableCodes]
// Default name/icon/control type for the editable built-ins.
const builtInMeta = {
    "0x12": { icon: "E793", labelKey: "PANEL_LABEL_CONTRAST", control: "slider" },
    "0x62": { icon: "E767", labelKey: "PANEL_LABEL_VOLUME", control: "slider" },
    "0x60": { icon: "E839", labelKey: "PANEL_LABEL_INPUTS", control: "buttons" }
}

const deleteIcon = (<span className="icon" dangerouslySetInnerHTML={{ __html: "&#xE74D;" }}></span>)

export default function MonitorFeatures(props) {
    const { monitor, name, monitorFeatures, T, onChange } = props

    const dragIndexRef = useRef(null)

    let extraHTML = []

    // Render a feature title with its VCP code shown grayed for identification.
    const titleWithCode = (label, code) => (<>{label} <span className="vcp-code-tag">{code}</span></>)

    if (monitor.ddcciSupported && Object.keys(monitor.features || {}).length > 0) {

        // Brightness (with VCP Code Selection in expanded section)
        if (monitor.features["0x10"]) {
            const currentBrightnessVCP = window.settings?.userDDCBrightnessVCPs?.[monitor?.hwid?.[1]] || ""
            
            extraHTML.push(
                <SettingsOption className="monitor-feature-item" key="brightness" icon="e706" title={titleWithCode(T.t("PANEL_LABEL_BRIGHTNESS"), "0x10")} expandable={true}>
                    <SettingsChild>
                        <BrightnessFeatureSettings hwid={monitor?.hwid?.[1]} currentBrightnessVCP={currentBrightnessVCP} T={T} />
                    </SettingsChild>
                </SettingsOption>
            )
        }

        const deleteFeature = vcp => {
            if (monitorFeatures[vcp] != undefined) {
                delete window.settings?.monitorFeatures[monitor.hwid[1]][vcp]
            }
            if (window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]?.[vcp] !== undefined) {
                delete window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]?.[vcp]
            }
            window.sendSettings({ monitorFeatures: window.settings?.monitorFeatures, monitorFeaturesSettings: window.settings?.monitorFeaturesSettings })
        }

        const featSettingsOf = (v) => window.settings?.monitorFeaturesSettings?.[monitor?.hwid[1]]?.[v]

        // Feature groups (e.g. RGB gain) bundle several VCP codes into one feature.
        const hwidKey = monitor.hwid[1]
        const groups = (window.settings?.monitorFeatureGroups?.[hwidKey]) || []
        const groupedVcps = new Set()
        groups.forEach(g => (g.members || []).forEach(m => { if (m && m.vcp) groupedVcps.add(m.vcp) }))

        const saveGroups = (extra) => {
            window.sendSettings(Object.assign({
                monitorFeatureGroups: JSON.parse(JSON.stringify(window.settings.monitorFeatureGroups || {}))
            }, extra || {}))
        }

        // Persist a new display order for the features/groups after a drag. Feature
        // tokens are the VCP key; group tokens are "group:<id>".
        const reorderFeatures = (orderedTokens) => {
            if (!window.settings.monitorFeaturesSettings[hwidKey]) window.settings.monitorFeaturesSettings[hwidKey] = {}
            const groupsArr = window.settings.monitorFeatureGroups?.[hwidKey] || []
            orderedTokens.forEach((tok, idx) => {
                if (tok.indexOf("group:") === 0) {
                    const g = groupsArr.find(x => x.id === tok.slice(6))
                    if (g) g.order = idx
                } else {
                    if (!window.settings.monitorFeaturesSettings[hwidKey][tok]) window.settings.monitorFeaturesSettings[hwidKey][tok] = {}
                    window.settings.monitorFeaturesSettings[hwidKey][tok].order = idx
                }
            })
            window.sendSettings({
                monitorFeaturesSettings: JSON.parse(JSON.stringify(window.settings.monitorFeaturesSettings || {})),
                monitorFeatureGroups: JSON.parse(JSON.stringify(window.settings.monitorFeatureGroups || {}))
            })
        }

        // Group CRUD helpers.
        const addGroup = () => {
            if (!window.settings.monitorFeatureGroups) window.settings.monitorFeatureGroups = {}
            if (!window.settings.monitorFeatureGroups[hwidKey]) window.settings.monitorFeatureGroups[hwidKey] = []
            window.settings.monitorFeatureGroups[hwidKey].push({
                id: "g" + Date.now().toString(36), name: "", icon: "E790", iconType: "windows", iconText: "",
                members: [], linked: false, enabled: true, order: 9000 + window.settings.monitorFeatureGroups[hwidKey].length
            })
            saveGroups()
        }
        // Merge updates into a group; optionally enable member codes so they get read.
        const commitGroup = (updated, syncMembers = false) => {
            const arr = window.settings.monitorFeatureGroups?.[hwidKey] || []
            const idx = arr.findIndex(x => x.id === updated.id)
            if (idx >= 0) arr[idx] = updated
            const extra = {}
            if (syncMembers) {
                if (!window.settings.monitorFeatures) window.settings.monitorFeatures = {}
                if (!window.settings.monitorFeatures[hwidKey]) window.settings.monitorFeatures[hwidKey] = {}
                ;(updated.members || []).forEach(m => { if (m && m.vcp) window.settings.monitorFeatures[hwidKey][m.vcp] = true })
                extra.monitorFeatures = JSON.parse(JSON.stringify(window.settings.monitorFeatures))
            }
            saveGroups(extra)
        }
        const deleteGroup = (g) => {
            const arr = window.settings.monitorFeatureGroups?.[hwidKey] || []
            const idx = arr.findIndex(x => x.id === g.id)
            if (idx >= 0) arr.splice(idx, 1)
            // Disable member codes no longer used by any remaining group.
            const stillGrouped = new Set()
            arr.forEach(x => (x.members || []).forEach(m => { if (m && m.vcp) stillGrouped.add(m.vcp) }))
            const extra = {}
            if (window.settings.monitorFeatures?.[hwidKey]) {
                (g.members || []).forEach(m => { if (m && m.vcp && !stillGrouped.has(m.vcp)) window.settings.monitorFeatures[hwidKey][m.vcp] = false })
                extra.monitorFeatures = JSON.parse(JSON.stringify(window.settings.monitorFeatures))
            }
            saveGroups(extra)
        }
        const toggleGroup = (g) => commitGroup(Object.assign({}, g, { enabled: !g.enabled }))

        // Built-in editable features (contrast/volume/input) and custom codes share one
        // drag-reorderable list with groups. Built-ins keep a sensible default order and
        // are non-deletable; everything else follows the saved order. Codes that belong
        // to a group are hidden from the standalone list.
        const defaultOrder = { "0x12": 0, "0x62": 1, "0x60": 2 }
        const orderOf = (v) => (featSettingsOf(v)?.order ?? defaultOrder[v] ?? 9999)
        const builtInPresent = builtInEditableCodes.filter(v => {
            if (v === "0x60") return Array.isArray(monitor.features?.["0x60"]) && monitor.features["0x60"][1]
            return monitor.features?.[v] ? true : false
        })
        const featureVcps = [
            ...builtInPresent.filter(v => !groupedVcps.has(v)),
            ...Object.keys(monitorFeatures || {}).filter(vcp => ignoreCodes.indexOf(vcp) === -1 && monitorFeatures[vcp] !== undefined && !groupedVcps.has(vcp))
        ]

        // One combined, drag-reorderable list of features and groups (native DnD so it
        // doesn't nest the react-beautiful-dnd context used by each value list).
        const renderItems = [
            ...featureVcps.map(vcp => ({ kind: "feature", token: vcp, order: orderOf(vcp) })),
            ...groups.map(g => ({ kind: "group", token: "group:" + g.id, order: (g.order ?? 9999), group: g }))
        ].sort((a, b) => a.order - b.order)

        const dropHandler = (i) => (e) => {
            e.preventDefault()
            const from = dragIndexRef.current
            if (from !== null && from !== i) {
                const tokens = renderItems.map(it => it.token)
                const [moved] = tokens.splice(from, 1)
                tokens.splice(i, 0, moved)
                reorderFeatures(tokens)
            }
            dragIndexRef.current = null
        }

        renderItems.forEach((item, i) => {
            if (item.kind === "group") {
                const g = item.group
                const gName = (g.name?.length ? g.name : T.t("SETTINGS_FEATURES_GROUP_DEFAULT_NAME"))
                const gIcon = (g.iconType === "windows" && g.icon ? g.icon : "E790")
                extraHTML.push(
                    <div className="monitor-feature-drag" key={g.id} onDragOver={e => e.preventDefault()} onDrop={dropHandler(i)}>
                        <SettingsOption className="monitor-feature-item" icon={gIcon} title={<>{gName} <span className="vcp-code-tag">{T.t("SETTINGS_FEATURES_GROUP_TAG")}</span></>} expandable={true} input={
                            <div className="input-row">
                                <div className="feature-drag-handle" draggable={true} onDragStart={() => { dragIndexRef.current = i }} onDragEnd={() => { dragIndexRef.current = null }} title={T.t("SETTINGS_FEATURES_REORDER")} dangerouslySetInnerHTML={{ __html: "&#xE76F;" }}></div>
                                <div style={{ cursor: "pointer" }} onClick={() => deleteGroup(g)}>{deleteIcon}</div>
                                <div className="inputToggle-generic"><input onChange={() => toggleGroup(g)} checked={(g.enabled ? true : false)} data-checked={(g.enabled ? true : false)} type="checkbox" /></div>
                            </div>
                        }>
                            <SettingsChild>
                                <GroupFeatureSettings key={g.id + "_settings"} group={g} monitor={monitor} monitorId={monitor.id} T={T} onUpdate={commitGroup} />
                            </SettingsChild>
                        </SettingsOption>
                    </div>
                )
                return
            }

            const vcp = item.token
            const settings = featSettingsOf(vcp)
            const enabled = monitorFeatures?.[vcp];
            const builtIn = builtInMeta[vcp] || null
            const defaultName = builtIn ? T.t(builtIn.labelKey) : ""
            const name = (settings?.name?.length ? settings.name
                : (builtIn ? defaultName
                    : (settings?.iconType === "text" && settings?.iconText?.length ? settings.iconText : "Custom Feature")))
            const icon = (settings?.iconType === "windows" && settings?.icon ? settings.icon
                : (builtIn ? builtIn.icon : "E9E9"))
            // For input, seed values from the live input list; otherwise from the
            // reported capabilities for this code.
            const vcpInfo = (vcp === "0x60" && Array.isArray(monitor.features?.["0x60"]?.[1]) && monitor.features["0x60"][1].length
                ? monitor.features["0x60"][1]
                : getDetectedValues(monitor.vcpCodes, vcp))
            extraHTML.push(
                <div className="monitor-feature-drag" key={vcp}
                    onDragOver={e => e.preventDefault()}
                    onDrop={dropHandler(i)}>
                    <SettingsOption className="monitor-feature-item" icon={icon} title={titleWithCode(name, vcp)} expandable={true} input={
                        <div className="input-row">
                            <div className="feature-drag-handle" draggable={true} onDragStart={() => { dragIndexRef.current = i }} onDragEnd={() => { dragIndexRef.current = null }} title={T.t("SETTINGS_FEATURES_REORDER")} dangerouslySetInnerHTML={{ __html: "&#xE76F;" }}></div>
                            {builtIn ? null : <div style={{ cursor: "pointer" }} onClick={() => deleteFeature(vcp)}>{deleteIcon}</div>}
                            <div className="inputToggle-generic"><input onChange={() => { props?.toggleFeature(monitor.hwid[1], vcp) }} checked={(enabled ? true : false)} data-checked={(enabled ? true : false)} type="checkbox" /></div>
                        </div>
                    }>
                        <SettingsChild>
                            <MonitorFeaturesSettings onChange={onChange} key={vcp + "_settings"} enabled={enabled} settings={settings} hwid={monitor?.hwid?.[1]} monitorId={monitor.id} T={T} vcp={vcp} vcpInfo={vcpInfo} builtIn={builtIn} defaultName={defaultName} />
                        </SettingsChild>
                    </SettingsOption>
                </div>
            )
        })

        // Power State (special, non-editable — system-integrated)
        if (monitor.features["0xD6"]) {
            const vcp = "0xD6"
            const enabled = monitorFeatures?.["0xD6"];
            extraHTML.push(
                <SettingsOption className="monitor-feature-item" key={vcp} icon="E7E8" title={<>{titleWithCode(T.t("PANEL_LABEL_OFF_ON"), "0xD6")} ⚠️</>} expandable={true} input={
                    <div className="inputToggle-generic"><input onChange={() => { props?.toggleFeature(monitor.hwid[1], vcp) }} checked={(enabled ? true : false)} data-checked={(enabled ? true : false)} type="checkbox" /></div>
                }>
                    <SettingsChild description={`⚠️ ${T.t("GENERIC_DDC_WARNING")}`} />
                </SettingsOption>
            )
        }

        // VCP code list
        if (monitor.vcpCodes && typeof monitor.vcpCodes === 'object' && Object.values(monitor.vcpCodes).length) {
            const list = []
            for (const code in monitor.vcpCodes) {
                const vcpKey = "0x" + (parseInt(code) || 0).toString(16).toUpperCase()
                const alreadyAdded = (monitorFeatures?.[vcpKey] !== undefined) || ignoreCodes.indexOf(vcpKey) !== -1
                list.push(
                    <div className="vcp-code" key={code}><b>{code}</b>: {findVCPCodeName(code) || "???"}
                        {
                            !alreadyAdded
                                ? <a className="button vcp-add-button" onClick={() => props?.toggleFeature(monitor.hwid[1], vcpKey)}> + {T.t("SETTINGS_FEATURES_ADD_FROM_LIST")}</a>
                                : null
                        }
                        {
                            monitor.vcpCodes[code].length
                                ? <div className="supported-values">{T.t("SETTINGS_FEATURES_VCP_EXPECTED")}: {monitor.vcpCodes[code].toString()}</div>
                                : ""
                        }
                    </div>
                )
            }
            if (list) {
                extraHTML.push(
                    <SettingsOption className="monitor-feature-item" key={"vcp-codes"} description={T.t("SETTINGS_FEATURES_VCP_LIST_TITLE")} expandable={true} forceExpandable={true}>
                        <SettingsChild>
                            <VcpScanner monitor={monitor} hwid={monitor.hwid[1]} T={T} />
                            <div className="detected-vcp-codes">
                                <div className="vcp-code">⚠️ {T.t("SETTINGS_FEATURES_VCP_LIST_DESC")}<br /><br /></div>
                                {list}
                            </div>
                        </SettingsChild>
                    </SettingsOption>
                )
            }
        }

        extraHTML.push(
            <div className="input-row" key="add">
                <p><a onClick={() => { props.onAddFeature() }} className="button">+ {T.t("SETTINGS_FEATURES_ADD")}</a></p>
                <p><a onClick={() => { addGroup() }} className="button">+ {T.t("SETTINGS_FEATURES_ADD_GROUP")}</a></p>
            </div>
        )

    } else {
        extraHTML.push(<p key="none">{T.t("SETTINGS_FEATURES_UNSUPPORTED")}</p>)
    }

    return (
        <div key={monitor.key}>
            {props.hideHeader ? null : <><br /><div className="sectionSubtitle"><div className="icon">&#xE7F4;</div><div>{monitor.name}</div></div></>}
            {extraHTML}
        </div>
    )
}

function MonitorFeaturesSettings(props) {
    const { enabled, settings, hwid, vcp, onChange, T, vcpInfo, monitorId, builtIn, defaultName } = props
    //if(!enabled) return (<></>);

    const detectedValues = Array.isArray(vcpInfo) ? vcpInfo : []
    // Locked codes (brightness/backlight/power) never reach this editor. Built-in
    // editables (contrast/volume/input) get the full editor like custom codes, but
    // their control type is not auto-persisted — the panel keeps the special
    // rendering until the user explicitly chooses a control type.
    const isLocked = lockedCodes.indexOf(vcp) !== -1
    const isBuiltInEditable = !!builtIn
    const meta = VCPMeta[parseInt(vcp)]
    // Pick a default control type: built-in default, then known MCCS metadata, then
    // capability-based.
    const defaultControlType = (
        isLocked ? "slider"
            : (builtIn?.control
                || (meta ? meta.control
                    : (detectedValues.length ? (detectedValues.length > 6 ? "dropdown" : "buttons") : "slider")))
    )

    const [settingsObj, updateSettings] = useObject(Object.assign({
        icon: "e897",
        iconType: "windows",
        iconText: "",
        iconPath: "",
        name: "",
        controlType: defaultControlType,
        values: makeValueList(vcp, detectedValues),
        min: 0,
        max: 100,
        maxVisual: 100,
        sliderMin: 0,
        sliderMax: 100,
        step: 1,
        defaultValue: "",
        linked: false
    }, settings))

    // Persist one or more settings at once, then let the parent save to disk.
    const persist = (updates) => {
        try {
            updateSettings(updates)
            if (!window.settings.monitorFeaturesSettings[hwid]) {
                window.settings.monitorFeaturesSettings[hwid] = {}
            }
            if (!window.settings.monitorFeaturesSettings[hwid][vcp]) {
                window.settings.monitorFeaturesSettings[hwid][vcp] = {}
            }
            Object.assign(window.settings.monitorFeaturesSettings[hwid][vcp], updates)
            if (onChange) onChange();
        } catch (e) {
            console.log(e)
        }
    }
    const onChangeHandler = (settingName, value) => persist({ [settingName]: value })

    // On first view of a discrete code with no saved control type, persist the
    // auto-detected default + values so the brightness panel renders the right
    // control instead of a slider.
    useEffect(() => {
        if (!isLocked && !isBuiltInEditable && !settings?.controlType) {
            const updates = { controlType: defaultControlType }
            if (discreteControlTypes.indexOf(defaultControlType) !== -1) {
                updates.values = makeValueList(vcp, detectedValues)
            } else if (defaultControlType === "slider") {
                // Persist explicit slider bounds so the panel never falls back to the
                // monitor's reported max (often a garbage 255 for vendor codes).
                updates.sliderMin = 0
                updates.sliderMax = 100
                updates.step = 1
            }
            persist(updates)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const controlType = settingsObj.controlType || "slider"
    const valueList = Array.isArray(settingsObj.values) ? settingsObj.values : []

    // Value list helpers (buttons / dropdown / actions)
    const setValueList = (list) => persist({ values: list })
    const updateValueAt = (i, key, value) => setValueList(valueList.map((row, idx) => idx === i ? Object.assign({}, row, { [key]: value }) : row))
    const addValueRow = () => setValueList([...valueList, { value: 0, label: "" }])
    const removeValueRow = (i) => setValueList(valueList.filter((_, idx) => idx !== i))
    const onValueDragEnd = (result) => {
        if (!result.destination) return
        const list = [...valueList]
        const [moved] = list.splice(result.source.index, 1)
        list.splice(result.destination.index, 0, moved)
        setValueList(list)
    }
    const detectValueList = () => setValueList(makeValueList(vcp, detectedValues))
    // Add a value/label pair, or update the label if the value already exists.
    const upsertValue = (value, label) => {
        const idx = valueList.findIndex(r => r.value === value)
        const list = idx >= 0
            ? valueList.map((r, i) => i === idx ? Object.assign({}, r, { label }) : r)
            : [...valueList, { value, label }]
        setValueList(list)
    }

    // Write a value to the monitor live (used by "reset to default").
    const writeLive = (value) => {
        if (monitorId === undefined || monitorId === null) return
        const v = parseInt(value)
        if (isNaN(v)) return
        window.dispatchEvent(new CustomEvent("setVCP", { detail: { monitor: monitorId, code: parseInt(vcp), value: v } }))
    }

    // Toggle helpers (always exactly two entries: [off, on])
    const toggleList = [valueList[0] || { value: detectedValues[0] ?? 0, label: "" }, valueList[1] || { value: detectedValues[1] ?? 1, label: "" }]
    const setToggleValue = (i, value) => {
        const list = [toggleList[0], toggleList[1]]
        list[i] = Object.assign({}, list[i], { value })
        setValueList(list)
    }

    const onControlTypeChange = (type) => {
        const updates = { controlType: type }
        if (discreteControlTypes.indexOf(type) !== -1 && valueList.length === 0) {
            updates.values = (detectedValues.length ? makeValueList(vcp, detectedValues) : [{ value: 0, label: "" }])
        }
        if (type === "toggle") {
            const base = updates.values || valueList
            updates.values = [base[0] || { value: detectedValues[0] ?? 0, label: "" }, base[1] || { value: detectedValues[1] ?? 1, label: "" }]
        }
        persist(updates)
    }

    const iconType = (
        <div className="field">
            <label>{T.t("GENERIC_SLIDER_INDICATOR_TYPE")}</label>
            <select value={settingsObj.iconType} onChange={e => onChangeHandler("iconType", e.target.value)} style={{ flex: "0.65" }}>
                <option value="windows">{T.t("GENERIC_ICON")}</option>
                <option value="text">{T.t("GENERIC_TEXT")}</option>
            </select>
        </div>
    )

    const icon = (
        <div className="field">
            <label>{T.t("GENERIC_SLIDER_ICON")}</label>
            <select style={{ fontFamily: `"Segoe Fluent Icons", "Segoe MDL2 Assets"` }} value={settingsObj.icon} onChange={e => onChangeHandler("icon", e.target.value)}>
                <WindowsIconsOptions />
            </select>
        </div>
    )

    const iconText = (
        <div className="field">
            <label>{T.t("GENERIC_SLIDER_TEXT")}</label>
            <input type="text" value={settingsObj.iconText} onChange={e => onChangeHandler("iconText", e.target.value)} placeholder={T.t("GENERIC_SLIDER_NAME")} />
        </div>
    )

    const iconSettings = (
        <div className="input-row">
            {iconType}
            {settingsObj.iconType === "windows" ? icon : null}
            {settingsObj.iconType === "text" ? iconText : null}
        </div>
    )

    const controlTypeField = (
        <div className="input-row">
            <div className="field">
                <label>{T.t("SETTINGS_FEATURES_CONTROL_TYPE")}</label>
                <select value={controlType} onChange={e => onControlTypeChange(e.target.value)}>
                    <option value="slider">{T.t("SETTINGS_FEATURES_TYPE_SLIDER")}</option>
                    <option value="buttons">{T.t("SETTINGS_FEATURES_TYPE_BUTTONS")}</option>
                    <option value="dropdown">{T.t("SETTINGS_FEATURES_TYPE_DROPDOWN")}</option>
                    <option value="toggle">{T.t("SETTINGS_FEATURES_TYPE_TOGGLE")}</option>
                    <option value="actions">{T.t("SETTINGS_FEATURES_TYPE_ACTIONS")}</option>
                    <option value="info">{T.t("SETTINGS_FEATURES_TYPE_INFO")}</option>
                </select>
            </div>
            <div className="field">
                <label>{T.t("SETTINGS_FEATURES_PLACEMENT")}</label>
                <select value={settingsObj.placement || "both"} onChange={e => onChangeHandler("placement", e.target.value)}>
                    <option value="both">{T.t("SETTINGS_FEATURES_PLACEMENT_BOTH")}</option>
                    <option value="panel">{T.t("SETTINGS_FEATURES_PLACEMENT_PANEL")}</option>
                    <option value="dashboard">{T.t("SETTINGS_FEATURES_PLACEMENT_DASHBOARD")}</option>
                </select>
            </div>
        </div>
    )

    const sliderSettings = (
        <>
            {!isLocked && !settingsObj.linked ?
                <div className="input-row">
                    <div className="field"><label>{T.t("GENERIC_MINIMUM")}</label><input type="number" value={settingsObj.sliderMin ?? 0} onChange={e => onChangeHandler("sliderMin", e.target.value === "" ? "" : parseInt(e.target.value))} /></div>
                    <div className="field"><label>{T.t("GENERIC_MAXIMUM")}</label><input type="number" value={settingsObj.sliderMax ?? 100} onChange={e => onChangeHandler("sliderMax", e.target.value === "" ? "" : parseInt(e.target.value))} /></div>
                    <div className="field"><label>{T.t("SETTINGS_FEATURES_STEP")}</label><input type="number" min={1} value={settingsObj.step ?? 1} onChange={e => onChangeHandler("step", Math.max(1, parseInt(e.target.value) || 1))} /></div>
                </div>
                : null}
            <div className="input-row">
                <div className="feature-toggle-row">
                    <input onChange={e => onChangeHandler("linked", e.target.checked)} checked={(settingsObj.linked ? true : false)} data-checked={(settingsObj.linked ? true : false)} type="checkbox" />
                    <div className="feature-toggle-label"><span>{T.t("SETTINGS_FEATURES_LINKED_TO_BRIGHTNESS")}</span></div>
                </div>
            </div>
            {settingsObj.linked ?
                <>
                    <div className="input-row">
                        <Slider min={0} max={100} name={T.t("GENERIC_MINIMUM")} onChange={value => onChangeHandler("min", value)} level={settingsObj.min} scrolling={false} height={"short"} icon={false} />
                        <Slider min={0} max={100} name={T.t("GENERIC_MAXIMUM")} onChange={value => onChangeHandler("max", value)} level={settingsObj.max} scrolling={false} height={"short"} icon={false} />
                    </div>
                    <div>
                        <br />
                        <Slider min={0} max={100} name={T.t("SETTINGS_FEATURES_STOP_ON_BRIGHTNESS")} onChange={value => onChangeHandler("maxVisual", value)} level={settingsObj.maxVisual ?? 100} scrolling={false} height={"short"} icon={false} />
                    </div>
                </>
                : null}
        </>
    )

    const valueEditor = (
        <div className="feature-value-editor">
            <p className="description">{T.t("SETTINGS_FEATURES_VALUES_DESC")}</p>
            <DragDropContext onDragEnd={onValueDragEnd}>
                <Droppable droppableId={"values-" + vcp}>
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {valueList.map((row, i) => (
                                <Draggable key={i} draggableId={"val-" + i} index={i}>
                                    {(dragProvided) => (
                                        <div className="input-row feature-value-row" ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                                            <div className="feature-value-handle" {...dragProvided.dragHandleProps} title={T.t("SETTINGS_FEATURES_REORDER")} dangerouslySetInnerHTML={{ __html: "&#xE76F;" }}></div>
                                            <div className="field" style={{ flex: "0 0 80px" }}>
                                                {i === 0 ? <label>{T.t("SETTINGS_FEATURES_VALUE")}</label> : null}
                                                <input type="number" value={row.value} onChange={e => updateValueAt(i, "value", e.target.value === "" ? "" : parseInt(e.target.value))} />
                                            </div>
                                            <div className="field" style={{ flex: 1 }}>
                                                {i === 0 ? <label>{T.t("SETTINGS_FEATURES_VALUE_LABEL")}</label> : null}
                                                <input type="text" value={row.label} placeholder={defaultValueLabel(vcp, row.value)} onChange={e => updateValueAt(i, "label", e.target.value)} />
                                            </div>
                                            <div className="feature-value-delete" style={{ cursor: "pointer" }} onClick={() => removeValueRow(i)}>{deleteIcon}</div>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="input-row">
                <a className="button" onClick={addValueRow}>+ {T.t("SETTINGS_FEATURES_ADD_VALUE")}</a>
                {detectedValues.length ? <a className="button" onClick={detectValueList}>{T.t("SETTINGS_FEATURES_DETECT_VALUES")}</a> : null}
            </div>
        </div>
    )

    const toggleEditor = (
        <div className="feature-value-editor">
            <p className="description">{T.t("SETTINGS_FEATURES_VALUES_DESC")}</p>
            <div className="input-row">
                <div className="field">
                    <label>{T.t("SETTINGS_FEATURES_TOGGLE_OFF")}</label>
                    <input type="number" value={toggleList[0].value} onChange={e => setToggleValue(0, e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
                <div className="field">
                    <label>{T.t("SETTINGS_FEATURES_TOGGLE_ON")}</label>
                    <input type="number" value={toggleList[1].value} onChange={e => setToggleValue(1, e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
            </div>
        </div>
    )

    const nameField = (
        <div className="input-row">
            <div className="field" style={{ flex: 1 }}>
                <label>{T.t("SETTINGS_FEATURES_NAME")}</label>
                <input type="text" value={settingsObj.name || ""} placeholder={defaultName || "Custom Feature"} onChange={e => onChangeHandler("name", e.target.value)} />
            </div>
        </div>
    )

    // Built-in editables keep the special panel rendering until a control type is
    // explicitly chosen; let the user know that's what's happening.
    const builtInHint = (isBuiltInEditable && !settings?.controlType) ? (
        <p className="description feature-info-note">{T.t("SETTINGS_FEATURES_BUILTIN_HINT")}</p>
    ) : null

    // Switching inputs can leave the display without signal — warn for input control.
    const inputWarning = (vcp === "0x60") ? (
        <p className="description feature-info-note">⚠️ {T.t("GENERIC_DDC_WARNING")}</p>
    ) : null

    const infoEditor = (
        <p className="description feature-info-note">{T.t("SETTINGS_FEATURES_INFO_DESC")}</p>
    )

    const defaultsRow = (
        <div className="input-row feature-default-row">
            <div className="field" style={{ flex: "0 0 130px" }}>
                <label>{T.t("SETTINGS_FEATURES_DEFAULT")}</label>
                <input type="number" value={settingsObj.defaultValue ?? ""} placeholder="—" onChange={e => onChangeHandler("defaultValue", e.target.value === "" ? "" : parseInt(e.target.value))} />
            </div>
            <a className="button" data-disabled={settingsObj.defaultValue === "" || settingsObj.defaultValue === undefined} onClick={() => writeLive(settingsObj.defaultValue)}>{T.t("SETTINGS_FEATURES_RESET_DEFAULT")}</a>
        </div>
    )

    return (
        <div className="feature-toggle-settings">
            {inputWarning}
            {!isLocked ? nameField : null}
            {!isLocked ? iconSettings : null}
            {!isLocked ? controlTypeField : null}
            {builtInHint}
            {controlType === "slider" ? sliderSettings : null}
            {(controlType === "buttons" || controlType === "dropdown" || controlType === "actions") ? valueEditor : null}
            {controlType === "toggle" ? toggleEditor : null}
            {controlType === "info" ? infoEditor : null}
            {!isLocked && controlType !== "info" && controlType !== "actions" ? defaultsRow : null}
            {!isLocked && controlType !== "info" ? <DiscoveryTool vcp={vcp} monitorId={monitorId} valueList={valueList} onSave={upsertValue} T={T} /> : null}
        </div>
    )
}

/**
 * Editor for a feature group (multiple VCP codes shown as one feature, e.g. RGB
 * gain). Supports naming, an icon, a "move all together" link, per-member value
 * bounds, and writing one value to every member at once.
 */
function GroupFeatureSettings(props) {
    const { group, monitorId, T, onUpdate } = props
    const [g, updateG] = useObject(Object.assign({
        id: group.id, name: "", icon: "E790", iconType: "windows", iconText: "",
        members: [], linked: false, enabled: true
    }, group))
    const [setAllValue, setSetAllValue] = useState(0)

    // Merge changes into local state and persist. syncMembers=true re-enables the
    // member codes so they get read from the monitor.
    const persist = (updates, syncMembers = false) => {
        const next = Object.assign({}, g, updates)
        updateG(updates)
        onUpdate(next, syncMembers)
    }

    const members = Array.isArray(g.members) ? g.members : []
    // sync=true re-enables the member codes (so they get read) and refreshes monitors.
    // Only do that when the set of codes actually changes (blur of a code, preset) —
    // not on every keystroke of a label or bound.
    const setMembers = (list, sync = false) => persist({ members: list }, sync)
    const updateMemberAt = (i, key, value, sync = false) => setMembers(members.map((m, idx) => idx === i ? Object.assign({}, m, { [key]: value }) : m), sync)
    const addMember = () => setMembers([...members, { vcp: "", label: "", min: 0, max: 100, step: 1 }], false)
    const removeMember = (i) => setMembers(members.filter((_, idx) => idx !== i), false)
    const loadRGBPreset = () => setMembers([
        { vcp: "0x16", label: T.t("SETTINGS_FEATURES_GROUP_RED"), min: 0, max: 100, step: 1 },
        { vcp: "0x18", label: T.t("SETTINGS_FEATURES_GROUP_GREEN"), min: 0, max: 100, step: 1 },
        { vcp: "0x1A", label: T.t("SETTINGS_FEATURES_GROUP_BLUE"), min: 0, max: 100, step: 1 }
    ], true)

    // Accept "16" or "0x16" and normalize to a canonical "0x.." key on blur.
    const normalizeVcp = (raw) => {
        const n = parseInt(raw, 16)
        if (isNaN(n) || n < 0 || n > 0xFF) return raw
        return "0x" + n.toString(16).toUpperCase()
    }

    const applyToAll = () => {
        const v = parseInt(setAllValue)
        if (isNaN(v) || monitorId === undefined || monitorId === null) return
        members.forEach(m => {
            const code = parseInt(m.vcp)
            if (!isNaN(code)) window.dispatchEvent(new CustomEvent("setVCP", { detail: { monitor: monitorId, code, value: v } }))
        })
    }

    return (
        <div className="feature-toggle-settings">
            <div className="input-row">
                <div className="field" style={{ flex: 1 }}>
                    <label>{T.t("SETTINGS_FEATURES_NAME")}</label>
                    <input type="text" value={g.name || ""} placeholder={T.t("SETTINGS_FEATURES_GROUP_DEFAULT_NAME")} onChange={e => persist({ name: e.target.value })} />
                </div>
            </div>
            <div className="input-row">
                <div className="field">
                    <label>{T.t("GENERIC_SLIDER_INDICATOR_TYPE")}</label>
                    <select value={g.iconType} onChange={e => persist({ iconType: e.target.value })} style={{ flex: "0.65" }}>
                        <option value="windows">{T.t("GENERIC_ICON")}</option>
                        <option value="text">{T.t("GENERIC_TEXT")}</option>
                    </select>
                </div>
                {g.iconType === "windows" ?
                    <div className="field">
                        <label>{T.t("GENERIC_ICON")}</label>
                        <select style={{ fontFamily: `"Segoe Fluent Icons", "Segoe MDL2 Assets"` }} value={g.icon} onChange={e => persist({ icon: e.target.value })}>
                            <WindowsIconsOptions />
                        </select>
                    </div>
                    : <div className="field">
                        <label>{T.t("GENERIC_TEXT")}</label>
                        <input type="text" value={g.iconText} onChange={e => persist({ iconText: e.target.value })} placeholder={T.t("GENERIC_SLIDER_NAME")} />
                    </div>}
            </div>
            <div className="input-row">
                <div className="feature-toggle-row">
                    <input type="checkbox" checked={(g.linked ? true : false)} data-checked={(g.linked ? true : false)} onChange={e => persist({ linked: e.target.checked })} />
                    <div className="feature-toggle-label"><span>{T.t("SETTINGS_FEATURES_GROUP_MOVE_TOGETHER")}</span></div>
                </div>
            </div>
            <div className="input-row">
                <div className="field">
                    <label>{T.t("SETTINGS_FEATURES_PLACEMENT")}</label>
                    <select value={g.placement || "both"} onChange={e => persist({ placement: e.target.value })}>
                        <option value="both">{T.t("SETTINGS_FEATURES_PLACEMENT_BOTH")}</option>
                        <option value="panel">{T.t("SETTINGS_FEATURES_PLACEMENT_PANEL")}</option>
                        <option value="dashboard">{T.t("SETTINGS_FEATURES_PLACEMENT_DASHBOARD")}</option>
                    </select>
                </div>
            </div>

            <div className="feature-value-editor">
                <p className="description">{T.t("SETTINGS_FEATURES_GROUP_MEMBERS_DESC")}</p>
                {members.map((m, i) => (
                    <div className="input-row feature-value-row" key={i}>
                        <div className="field" style={{ flex: "0 0 80px" }}>
                            {i === 0 ? <label>{T.t("SETTINGS_FEATURES_ADD_VCP")}</label> : null}
                            <input type="text" value={m.vcp} placeholder="0x16" onChange={e => updateMemberAt(i, "vcp", e.target.value)} onBlur={e => updateMemberAt(i, "vcp", normalizeVcp(e.target.value), true)} />
                        </div>
                        <div className="field" style={{ flex: 1 }}>
                            {i === 0 ? <label>{T.t("SETTINGS_FEATURES_VALUE_LABEL")}</label> : null}
                            <input type="text" value={m.label} placeholder={findVCPCodeName(parseInt(m.vcp)) || ""} onChange={e => updateMemberAt(i, "label", e.target.value)} />
                        </div>
                        <div className="field" style={{ flex: "0 0 60px" }}>
                            {i === 0 ? <label>{T.t("GENERIC_MINIMUM")}</label> : null}
                            <input type="number" value={m.min ?? 0} onChange={e => updateMemberAt(i, "min", e.target.value === "" ? "" : parseInt(e.target.value))} />
                        </div>
                        <div className="field" style={{ flex: "0 0 60px" }}>
                            {i === 0 ? <label>{T.t("GENERIC_MAXIMUM")}</label> : null}
                            <input type="number" value={m.max ?? 100} onChange={e => updateMemberAt(i, "max", e.target.value === "" ? "" : parseInt(e.target.value))} />
                        </div>
                        <div className="field" style={{ flex: "0 0 52px" }}>
                            {i === 0 ? <label>{T.t("SETTINGS_FEATURES_STEP")}</label> : null}
                            <input type="number" min={1} value={m.step ?? 1} onChange={e => updateMemberAt(i, "step", Math.max(1, parseInt(e.target.value) || 1))} />
                        </div>
                        <div className="feature-value-delete" style={{ cursor: "pointer" }} onClick={() => removeMember(i)}>{deleteIcon}</div>
                    </div>
                ))}
                <div className="input-row">
                    <a className="button" onClick={addMember}>+ {T.t("SETTINGS_FEATURES_GROUP_ADD_MEMBER")}</a>
                    <a className="button" onClick={loadRGBPreset}>{T.t("SETTINGS_FEATURES_GROUP_RGB_PRESET")}</a>
                </div>
            </div>

            <div className="input-row feature-default-row">
                <div className="field" style={{ flex: "0 0 130px" }}>
                    <label>{T.t("SETTINGS_FEATURES_GROUP_SET_ALL")}</label>
                    <input type="number" value={setAllValue} onChange={e => setSetAllValue(e.target.value === "" ? "" : parseInt(e.target.value))} />
                </div>
                <a className="button" data-disabled={members.length === 0} onClick={applyToAll}>{T.t("SETTINGS_FEATURES_GROUP_APPLY_ALL")}</a>
            </div>
        </div>
    )
}

/**
 * Discovery / training tool: step a raw VCP value (0-255) one at a time, writing
 * it to the monitor live, and name values as they're identified. Useful for
 * mapping undocumented vendor codes whose capability list is incomplete.
 */
function DiscoveryTool(props) {
    const { vcp, monitorId, valueList, onSave, T } = props
    const [open, setOpen] = useState(false)
    const [testValue, setTestValue] = useState(0)
    const [label, setLabel] = useState("")

    const apply = (v) => {
        let nv = parseInt(v)
        if (isNaN(nv)) nv = 0
        nv = Math.max(0, Math.min(255, nv))
        setTestValue(nv)
        if (monitorId !== undefined && monitorId !== null) {
            window.dispatchEvent(new CustomEvent("setVCP", { detail: { monitor: monitorId, code: parseInt(vcp), value: nv } }))
        }
    }

    const saveAndNext = () => {
        onSave(testValue, (label && label.length ? label : String(testValue)))
        setLabel("")
        apply(testValue + 1)
    }

    if (!open) {
        return (
            <div className="input-row">
                <a className="button" onClick={() => setOpen(true)}>🔬 {T.t("SETTINGS_FEATURES_DISCOVER")}</a>
            </div>
        )
    }

    const existing = valueList.find(r => r.value === testValue)

    return (
        <div className="feature-discovery">
            <p className="description">{T.t("SETTINGS_FEATURES_DISCOVER_DESC")}</p>
            <div className="input-row feature-discovery-stepper" onWheel={e => { e.preventDefault(); apply(testValue + (e.deltaY < 0 ? 1 : -1)) }}>
                <div className="button" onClick={() => apply(testValue - 1)}>−</div>
                <input type="number" min={0} max={255} value={testValue} onChange={e => apply(e.target.value)} style={{ maxWidth: "90px", textAlign: "center" }} />
                <div className="button" onClick={() => apply(testValue + 1)}>+</div>
                <span className="feature-discovery-status">{existing ? `${T.t("SETTINGS_FEATURES_DISCOVER_NAMED")}: ${existing.label || existing.value}` : ""}</span>
            </div>
            <div className="input-row">
                <input type="text" value={label} placeholder={T.t("SETTINGS_FEATURES_DISCOVER_LABEL")} onChange={e => setLabel(e.target.value)} onKeyUp={e => { if (e.which === 13) saveAndNext() }} style={{ flex: 1 }} />
                <a className="button" onClick={saveAndNext}>{T.t("SETTINGS_FEATURES_DISCOVER_SAVENEXT")}</a>
                <a className="button" onClick={() => apply(testValue + 1)}>{T.t("SETTINGS_FEATURES_DISCOVER_SKIP")}</a>
            </div>
            <p className="description">⚠️ {T.t("SETTINGS_FEATURES_DISCOVER_WARN")}</p>
        </div>
    )
}

/**
 * Component for setting a custom VCP code for brightness control.
 * 
 * This component allows the user to specify a custom VCP (Virtual Control Panel) code
 * for controlling monitor brightness. The expected format for VCP codes is a hexadecimal
 * string (e.g., "0x10", "0x6B"). The setting is persisted in the application's settings
 * under `userDDCBrightnessVCPs` and applied immediately via `window.sendSettings`.
 * 
 * @param {Object} props - Component props
 * @param {string} props.hwid - Hardware ID of the monitor
 * @param {string} props.currentBrightnessVCP - Current custom VCP code (hex string like "0x10")
 * @param {Object} props.T - Translation object
 */
function BrightnessFeatureSettings(props) {
    const { hwid, currentBrightnessVCP, T } = props

    const [vcpInput, setVcpInput] = useState(currentBrightnessVCP)

    // Sync input value when settings change externally
    useEffect(() => {
        setVcpInput(currentBrightnessVCP)
    }, [currentBrightnessVCP])

    const handleVCPChange = (e) => {
        const value = e.target.value.trim()
        setVcpInput(value)
        
        const newUserVCPs = Object.assign({}, window.settings?.userDDCBrightnessVCPs || {})
        if (value === "") {
            delete newUserVCPs[hwid]
        } else {
            // Validate the input is a valid hex VCP code (0x00-0xFF)
            const parsed = parseInt(value, 16)
            if (isNaN(parsed) || parsed < 0 || parsed > 0xFF) {
                // Invalid input - don't save, just update the input field
                return
            }
            newUserVCPs[hwid] = value
        }
        window.sendSettings({ userDDCBrightnessVCPs: newUserVCPs })
    }

    return (
        <div className="feature-toggle-settings">
            <p className="description" style={{ marginBottom: "12px", opacity: 0.8, fontSize: "12px" }}>
                {T.t("SETTINGS_FEATURES_BRIGHTNESS_VCP_INFO")}
            </p>
            <div className="input-row">
                <div className="field" style={{ flex: 1 }}>
                    <label>{T.t("SETTINGS_FEATURES_ADD_VCP")}</label>
                    <input type="text" value={vcpInput} onChange={handleVCPChange} placeholder="0x10" style={{ maxWidth: "120px" }} />
                </div>
            </div>
            <p className="description" style={{ marginTop: "8px", opacity: 0.7, fontSize: "12px" }}>
                {T.t("SETTINGS_FEATURES_BRIGHTNESS_VCP_DESC")}
            </p>
        </div>
    )
}

/**
 * Scan & compare tool: reads the current value of every VCP code the display
 * reports. Changing a setting in the monitor's own software and re-scanning
 * highlights which code/value changed — a fast way to identify what each code does.
 */
function VcpScanner(props) {
    const { monitor, hwid, T } = props
    const [values, setValues] = useState(null)
    const [changed, setChanged] = useState({})
    const [scanCount, setScanCount] = useState(0)
    const [scanning, setScanning] = useState(false)
    const [savedDefaults, setSavedDefaults] = useState(null)
    const valuesRef = useRef(null)

    // Capture the current scanned values as each enabled feature's "default value"
    // (e.g. run this right after a factory reset to record the monitor's defaults).
    const saveAsDefaults = () => {
        if (!values || !hwid) return
        const mfs = window.settings.monitorFeaturesSettings || (window.settings.monitorFeaturesSettings = {})
        if (!mfs[hwid]) mfs[hwid] = {}
        const features = window.settings.monitorFeatures?.[hwid] || {}
        let count = 0
        for (const k in values) {
            const hex = "0x" + parseInt(k).toString(16).toUpperCase()
            if (features[hex] !== undefined && values[k] !== -1) {
                if (!mfs[hwid][hex]) mfs[hwid][hex] = {}
                mfs[hwid][hex].defaultValue = values[k]
                count++
            }
        }
        if (window.sendSettings) window.sendSettings({ monitorFeaturesSettings: JSON.parse(JSON.stringify(mfs)) })
        setSavedDefaults(count)
    }

    useEffect(() => {
        const handler = (e) => {
            if (!e.detail || e.detail.monitor !== monitor.id) return
            const next = e.detail.values || {}
            const prev = valuesRef.current
            const diff = {}
            if (prev) {
                for (const k in next) {
                    if (prev[k] !== undefined && prev[k] !== next[k]) diff[k] = { from: prev[k], to: next[k] }
                }
            }
            valuesRef.current = next
            setValues(next)
            setChanged(diff)
            setScanCount(c => c + 1)
            setScanning(false)
        }
        window.addEventListener("vcp-scan-result", handler)
        return () => window.removeEventListener("vcp-scan-result", handler)
    }, [monitor.id])

    const scan = () => {
        if (!window.scanVCP || scanning) return
        const codes = Object.keys(monitor.vcpCodes || {}).map(c => parseInt(c)).filter(n => !isNaN(n))
        setScanning(true)
        window.scanVCP(monitor.id, codes)
    }

    const changedKeys = Object.keys(changed)
    const scanLabel = scanning
        ? T.t("SETTINGS_FEATURES_SCANNING")
        : (values ? T.t("SETTINGS_FEATURES_RESCAN") : T.t("SETTINGS_FEATURES_SCAN"))

    return (
        <div className="vcp-scanner">
            <p className="description">{T.t("SETTINGS_FEATURES_SCAN_DESC")}</p>
            <div className="input-row">
                <a className="button" onClick={scan}>{scanLabel}</a>
                {values ? <a className="button" onClick={saveAsDefaults}>{T.t("SETTINGS_FEATURES_SAVE_DEFAULTS")}</a> : null}
                {savedDefaults !== null ? <span className="vcp-scan-saved-note">{T.t("SETTINGS_FEATURES_SAVED_DEFAULTS")}: {savedDefaults}</span> : null}
            </div>
            {values ?
                <div className="vcp-scan-results">
                    {changedKeys.length ?
                        <div className="vcp-scan-changed">
                            <div className="vcp-scan-changed-title">{T.t("SETTINGS_FEATURES_SCAN_CHANGED")}</div>
                            {changedKeys.map(k => {
                                const hex = "0x" + parseInt(k).toString(16).toUpperCase()
                                return <div key={k} className="vcp-scan-row changed"><b>{hex}</b> {findVCPCodeName(parseInt(k)) || ""}: {changed[k].from} → <b>{changed[k].to}</b></div>
                            })}
                        </div>
                        : (scanCount > 1 ? <div className="description">{T.t("SETTINGS_FEATURES_SCAN_NOCHANGE")}</div> : null)
                    }
                    <div className="vcp-scan-all">
                        {Object.keys(values).map(k => {
                            const hex = "0x" + parseInt(k).toString(16).toUpperCase()
                            const isChanged = changed[k] !== undefined
                            return <div key={k} className={"vcp-scan-row" + (isChanged ? " changed" : "")}><b>{hex}</b> {findVCPCodeName(parseInt(k)) || "???"}: <b>{values[k]}</b></div>
                        })}
                    </div>
                </div>
                : null}
        </div>
    )
}

const windowsIcons = [
    "e897",
    "e706",
    "e70c",
    "e71d",
    "e727",
    "e733",
    "e734",
    "e73a",
    "e772",
    "e767",
    "e760",
    "e761",
    "e781",
    "e783",
    "e793",
    "e794",
    "e7a1",
    "e7b3",
    "e7e8",
    "e7f4",
    "e7f7",
    "e82f",
    "e836",
    "ea61",
    "ea80",
    "eb67",
    "ebaa",
    "edb1",
    "edb5",
    "f08c",
    "f093",
    "f094",
    "f095",
    "f096",
    "f0ce",
    "f1db",
    "f1e8",
    "f4a5",
    "f736",
    "f78b",
    "f785",
    "f78d",
    "f0b2",
    "e8be",
    "e88e",
    "e839",
    "e7fc",
    "e78b",
    "e713",
    "eb9f",
    "ed39",
    "ed3a",
    "e700",
    "e70f",
    "e71b",
    "e72c",
    "e73e",
    "e74e",
    "e765",
    "e768",
    "e769",
    "e786",
    "e7ec",
    "e7f0",
    "e890",
    "e8b8",
    "e8c8",
    "e946",
    "e9d9",
    "ea18",
    "eb51",
    "ec4a",
    "e9a9",
    "e950",
    "e7c1",
    "f5a9",
    "eca5"
]

function WindowsIconsOptions(props) {
    return windowsIcons.map(icon => {
        return (<option style={{ fontFamily: `"Segoe Fluent Icons", "Segoe MDL2 Assets"`, fontSize: "18px" }} key={icon} value={icon} dangerouslySetInnerHTML={{ __html: `&#x${icon};` }}></option>)
    })
}

function findVCPCodeName(code) {
    for (const name in VCP) {
        if (VCP[name] == code) {
            return name
        }
    }
    return false
}

// Control types that use a list of discrete values (rather than a slider).
const discreteControlTypes = ["buttons", "dropdown", "toggle", "actions"]

// Default value labels for well-known VCP codes, used as placeholders/initial labels.
const knownValueLabels = {
    "0x60": { 1: "VGA-1", 2: "VGA-2", 3: "DVI-1", 4: "DVI-2", 5: "Composite video 1", 6: "Composite video 2", 7: "S-Video-1", 8: "S-Video-2", 9: "Tuner-1", 10: "Tuner-2", 11: "Tuner-3", 12: "Component video 1", 13: "Component video 2", 14: "Component video 3", 15: "DisplayPort-1", 16: "DisplayPort-2", 17: "HDMI-1", 18: "HDMI-2" }
}

/**
 * Find the discrete "expected values" a display reported for a VCP code in its
 * capabilities string. Capability keys may be padded/cased differently than the
 * internal "0x.." keys, so a few variants are tried. Returns [] when the code is
 * continuous or unknown.
 */
function getDetectedValues(vcpCodes, vcp) {
    if (!vcpCodes || typeof vcpCodes !== "object") return []
    const num = parseInt(vcp)
    if (isNaN(num)) return []
    const hex = num.toString(16)
    const candidates = [
        vcp,
        `0x${hex.toUpperCase()}`,
        `0x${hex.toUpperCase().padStart(2, "0")}`,
        `0x${hex.toLowerCase()}`,
        `0x${hex.toLowerCase().padStart(2, "0")}`
    ]
    for (const key of candidates) {
        if (Array.isArray(vcpCodes[key]) && vcpCodes[key].length) return vcpCodes[key]
    }
    return []
}

function defaultValueLabel(vcp, value) {
    const key = `0x${(parseInt(vcp) || 0).toString(16).toUpperCase()}`
    if (knownValueLabels[key] && knownValueLabels[key][value] !== undefined) return knownValueLabels[key][value]
    return (value === "" || value === undefined || value === null ? "" : String(value))
}

function makeValueList(vcp, detected) {
    return (Array.isArray(detected) ? detected : []).map(v => ({ value: v, label: defaultValueLabel(vcp, v) }))
}
