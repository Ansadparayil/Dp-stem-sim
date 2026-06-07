"use client";

import { useState } from "react";
import Link from "next/link";
import { state } from "@/lib/simulation/state";

type SliderDef = {
  key: keyof typeof state.settings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  color: string;
};

type VesselPreset = {
  mass: number;
  thrusterRampRate: number;
  thrustScale: number;
  thrusterSpan: number;
  linearDrag: number;
  angularDrag: number;
};

const VESSEL_PRESETS: Record<"RIB" | "Patrol Boat" | "PSV" | "Drillship", VesselPreset> = {
  RIB: {
    mass: 2500,
    thrusterRampRate: 85,
    thrustScale: 0.22,
    thrusterSpan: 12,
    linearDrag: 0.95,
    angularDrag: 0.8,
  },
  "Patrol Boat": {
    mass: 8000,
    thrusterRampRate: 50,
    thrustScale: 0.16,
    thrusterSpan: 18,
    linearDrag: 0.965,
    angularDrag: 0.84,
  },
  PSV: {
    mass: 22000,
    thrusterRampRate: 28,
    thrustScale: 0.12,
    thrusterSpan: 24,
    linearDrag: 0.975,
    angularDrag: 0.87,
  },
  Drillship: {
    mass: 50000,
    thrusterRampRate: 12,
    thrustScale: 0.09,
    thrusterSpan: 34,
    linearDrag: 0.985,
    angularDrag: 0.91,
  },
};

const SLIDERS: SliderDef[] = [
  {
    key: "windX",
    label: "WIND  X",
    min: -0.05,
    max: 0.05,
    step: 0.001,
    unit: "m/s²",
    description: "Horizontal environmental force (+ = east drift)",
    color: "#00d4ff",
  },
  {
    key: "windY",
    label: "WIND  Y",
    min: -0.05,
    max: 0.05,
    step: 0.001,
    unit: "m/s²",
    description: "Vertical environmental force (+ = south drift)",
    color: "#00d4ff",
  },
  {
    key: "linearDrag",
    label: "WATER DRAG",
    min: 0.9,
    max: 0.999,
    step: 0.001,
    unit: "coeff",
    description: "Water resistance on linear motion. Lower = more drag.",
    color: "#7fff7f",
  },
  {
    key: "angularDrag",
    label: "ROT. DRAG",
    min: 0.5,
    max: 0.99,
    step: 0.01,
    unit: "coeff",
    description: "Resistance to spinning. Lower = snappier rotation.",
    color: "#7fff7f",
  },
  {
    key: "mass",
    label: "VESSEL MASS",
    min: 100,
    max: 50000,
    step: 100,
    unit: "kg",
    description: "Vessel inertia. Higher mass means slower acceleration.",
    color: "#ffce6b",
  },
  {
    key: "thrusterRampRate",
    label: "THRUSTER RAMP SPEED",
    min: 5,
    max: 120,
    step: 1,
    unit: "%/s",
    description: "How fast thrust can change. Lower = gentler spool up/down.",
    color: "#ffce6b",
  },
  {
    key: "thrustScale",
    label: "THRUST SCALE",
    min: 0.01,
    max: 0.4,
    step: 0.01,
    unit: "N·m",
    description: "Thruster power multiplier. Scales all force output.",
    color: "#ffa500",
  },
  {
    key: "thrusterSpan",
    label: "THRUSTER SPAN",
    min: 5,
    max: 60,
    step: 1,
    unit: "m",
    description: "Distance between L/R thrusters — wider = more torque.",
    color: "#ffa500",
  },
];

// Simple mode only exposes these two sliders
const SIMPLE_KEYS: Array<keyof typeof state.settings> = ["windX", "windY"];

export default function SettingsPage() {
  const [vals, setVals] = useState({ ...state.settings });
  const [presetName, setPresetName] = useState<keyof typeof VESSEL_PRESETS | "Custom">("Custom");
  const [isSimple, setIsSimple] = useState(state.settings.simpleMode);
  const [layout, setLayout] = useState(state.settings.screenLayout);

  function handleChange(key: keyof typeof state.settings, v: number) {
    state.settings[key] = v as never;
    setVals({ ...state.settings });
    setPresetName("Custom");
  }

  function toggleSimpleMode() {
    const next = !state.settings.simpleMode;
    state.settings.simpleMode = next;
    setIsSimple(next);
    setVals({ ...state.settings });
  }

  function applyLayout(next: "desktop" | "pi") {
    state.settings.screenLayout = next;
    setLayout(next);
  }

  function applyPreset(name: keyof typeof VESSEL_PRESETS) {
    Object.assign(state.settings, VESSEL_PRESETS[name]);
    setVals({ ...state.settings });
    setPresetName(name);
  }

  function resetDefaults() {
    const defaults = {
      simpleMode: true,
      windX: 0.008,
      windY: 0.004,
      linearDrag: 0.97,
      angularDrag: 0.85,
      mass: 9000,
      thrustScale: 0.12,
      thrusterSpan: 20,
      thrusterRampRate: 45,
    };
    Object.assign(state.settings, defaults);
    setVals({ ...state.settings });
    setIsSimple(true);
    setLayout("desktop");
    setPresetName("Custom");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050d18",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        color: "#c8dff5",
        padding: "1rem",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid rgba(0,212,255,0.15)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#00d4ff" }}>
            DP-STEM-SIM ·{" "}
          </span>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
            Settings
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem" }}>
          <Link href="/simulation" style={{ color: "#00d4ff", textDecoration: "none" }}>
            ⬡ Simulation
          </Link>
          <Link href="/control" style={{ color: "#ffa500", textDecoration: "none" }}>
            ◈ Control
          </Link>
          <Link href="/" style={{ color: "#4a7fa0", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      </div>

      {/* Layout selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "#2a5a7a", marginRight: "0.25rem" }}>SCREEN</span>
        {(["desktop", "pi"] as const).map((opt) => {
          const active = layout === opt;
          const label = opt === "desktop" ? "DESKTOP" : "PI 7\"";
          return (
            <button
              key={opt}
              onClick={() => applyLayout(opt)}
              style={{
                padding: "0.3rem 0.9rem",
                border: `1px solid ${active ? "#7fff7f" : "rgba(0,212,255,0.2)"}`,
                background: active ? "rgba(127,255,127,0.1)" : "transparent",
                color: active ? "#7fff7f" : "#2a5a7a",
                fontFamily: "inherit",
                fontSize: "0.62rem",
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.18em",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
        <span style={{ fontSize: "0.58rem", color: "#1a3a5c", marginLeft: "0.5rem" }}>
          {layout === "pi" ? "Optimised for Pi 7\" 800\u00d7480" : "Full desktop layout"}
        </span>
      </div>

      {/* Simple / Advanced toggle */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
        }}
      >
        {(["SIMPLE", "ADVANCED"] as const).map((label) => {
          const active = label === "SIMPLE" ? isSimple : !isSimple;
          return (
            <button
              key={label}
              onClick={toggleSimpleMode}
              style={{
                padding: "0.4rem 1.2rem",
                border: `1px solid ${active ? "#00d4ff" : "rgba(0,212,255,0.2)"}`,
                background: active ? "rgba(0,212,255,0.12)" : "transparent",
                color: active ? "#00d4ff" : "#2a5a7a",
                fontFamily: "inherit",
                fontSize: "0.65rem",
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.2em",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
        <span style={{ fontSize: "0.58rem", color: "#1a3a5c", alignSelf: "center", marginLeft: "0.5rem" }}>
          {isSimple
            ? "Clean DP simulation — stable, no oscillation"
            : "Full physics with mass, inertia and thruster ramp"}
        </span>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Sliders */}
        <div style={{ flex: "1 1 360px", maxWidth: 520 }}>
          {/* Vessel preset — only relevant in advanced mode */}
          {!isSimple && (
            <div
              style={{
                border: "1px solid rgba(0,212,255,0.1)",
                borderLeft: "2px solid #ffce6b60",
                padding: "1rem 1.25rem",
                background: "rgba(0,20,40,0.4)",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "#4a7fa0" }}>
                  VESSEL PRESET
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ffce6b" }}>
                  {presetName}
                </span>
              </div>
              <select
              value={presetName}
              onChange={(e) => {
                const nextPreset = e.target.value as keyof typeof VESSEL_PRESETS | "Custom";
                if (nextPreset === "Custom") {
                  setPresetName("Custom");
                  return;
                }
                applyPreset(nextPreset);
              }}
              style={{
                width: "100%",
                background: "rgba(0,15,30,0.95)",
                color: "#c8dff5",
                border: "1px solid rgba(255,206,107,0.45)",
                padding: "0.5rem",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
              }}
            >
              <option value="Custom">Custom</option>
              <option value="RIB">RIB</option>
              <option value="Patrol Boat">Patrol Boat</option>
              <option value="PSV">PSV</option>
              <option value="Drillship">Drillship</option>
            </select>
            <div
              style={{
                marginTop: "0.4rem",
                fontSize: "0.58rem",
                color: "#1a3a5c",
                letterSpacing: "0.1em",
              }}
            >
              Presets update vessel dynamics for realistic size and response.
            </div>
          </div>
          )}

          {/* In simple mode show only the two wind sliders; advanced shows all */}
          {SLIDERS.filter(({ key }) => !isSimple || SIMPLE_KEYS.includes(key)).map(({ key, label, min, max, step, unit, description, color }) => (
            <div
              key={key}
              style={{
                border: "1px solid rgba(0,212,255,0.1)",
                borderLeft: `2px solid ${color}60`,
                padding: "1rem 1.25rem",
                background: "rgba(0,20,40,0.4)",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "#4a7fa0" }}>
                  {label}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>
                  {(vals[key] as number).toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}
                  <span style={{ fontSize: "0.6rem", color: "#2a5a7a", marginLeft: 4 }}>{unit}</span>
                </span>
              </div>

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={vals[key] as number}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                style={{ width: "100%", accentColor: color, cursor: "pointer" }}
              />

              <div
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.58rem",
                  color: "#1a3a5c",
                  letterSpacing: "0.1em",
                }}
              >
                {description}
              </div>
            </div>
          ))}

          <button
            onClick={resetDefaults}
            style={{
              width: "100%",
              padding: "0.6rem",
              border: "1px solid rgba(0,212,255,0.2)",
              background: "transparent",
              color: "#4a7fa0",
              fontFamily: "inherit",
              fontSize: "0.65rem",
              letterSpacing: "0.2em",
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          >
            ↺ RESET ALL DEFAULTS
          </button>
        </div>

        {/* Info panel */}
        <div style={{ flex: "1 1 220px", maxWidth: 300 }}>
          {/* Current values card */}
          <div
            style={{
              border: "1px solid rgba(0,212,255,0.15)",
              padding: "1.25rem",
              background: "rgba(0,20,40,0.5)",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.3em",
                color: "#2a5a7a",
                marginBottom: "1rem",
              }}
            >
              LIVE VALUES
            </div>
            {Object.entries(vals).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.65rem",
                  marginBottom: "0.4rem",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span style={{ color: "#2a5a7a", letterSpacing: "0.1em" }}>{k}</span>
                <span style={{ color: "#c8dff5" }}>
                  {typeof v === "number"
                    ? v < 1 && v !== 0
                      ? v.toFixed(3)
                      : v.toFixed(1)
                    : String(v)}
                </span>
              </div>
            ))}
          </div>

          {/* About DP card */}
          <div
            style={{
              border: "1px solid rgba(0,212,255,0.1)",
              padding: "1.25rem",
              background: "rgba(0,20,40,0.4)",
              fontSize: "0.62rem",
              color: "#2a5a7a",
              lineHeight: 1.9,
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ color: "#4a7fa0", letterSpacing: "0.2em", marginBottom: "0.75rem" }}>
              WHAT IS DP?
            </div>
            Dynamic Positioning uses sensors and
            computers to keep a ship in exactly the
            same spot — even in wind and current.
            <br /><br />
            Real DP systems use GPS, gyroscopes,
            and multiple thrusters. This simulator
            uses a simplified PID controller.
            <br /><br />
            <span style={{ color: "#00d4ff" }}>Try: </span>
            enable DP mode, click a spot on the
            map, then increase wind to see how the
            controller compensates.
          </div>
        </div>
      </div>
    </main>
  );
}