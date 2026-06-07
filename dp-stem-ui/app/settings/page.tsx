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

export default function SettingsPage() {
  const [vals, setVals] = useState({ ...state.settings });

  function handleChange(key: keyof typeof state.settings, v: number) {
    state.settings[key] = v as never;
    setVals({ ...state.settings });
  }

  function resetDefaults() {
    const defaults = {
      windX: 0.008,
      windY: 0.004,
      linearDrag: 0.97,
      angularDrag: 0.85,
      thrustScale: 0.12,
      thrusterSpan: 20,
    };
    Object.assign(state.settings, defaults);
    setVals({ ...defaults });
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

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Sliders */}
        <div style={{ flex: "1 1 360px", maxWidth: 520 }}>
          {SLIDERS.map(({ key, label, min, max, step, unit, description, color }) => (
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
                  {vals[key].toFixed(step < 0.01 ? 3 : step < 1 ? 2 : 0)}
                  <span style={{ fontSize: "0.6rem", color: "#2a5a7a", marginLeft: 4 }}>{unit}</span>
                </span>
              </div>

              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={vals[key]}
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