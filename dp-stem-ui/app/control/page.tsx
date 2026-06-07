"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { state } from "@/lib/simulation/state";

// ─── Thruster visual ───────────────────────────────────────────────────────────
function ThrusterBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.abs(value);
  const isReverse = value < 0;

  return (
    <div
      style={{
        border: "1px solid rgba(0,212,255,0.15)",
        padding: "1.25rem",
        background: "rgba(0,20,40,0.5)",
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.3em",
          color: "#2a5a7a",
          marginBottom: "0.75rem",
        }}
      >
        {label} THRUSTER
      </div>

      {/* Bar */}
      <div
        style={{
          position: "relative",
          height: 120,
          width: 28,
          background: "#050d18",
          border: "1px solid rgba(0,212,255,0.15)",
          margin: "0 auto 0.75rem",
        }}
      >
        {/* fill from bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${pct}%`,
            background: isReverse
              ? `rgba(255,68,68,0.8)`
              : `rgba(${color === "cyan" ? "0,212,255" : "0,255,136"},0.8)`,
            transition: "height 0.1s",
            boxShadow: `0 0 10px ${isReverse ? "#ff4444" : color === "cyan" ? "#00d4ff" : "#00ff88"}`,
          }}
        />
        {/* centre line */}
        <div
          style={{
            position: "absolute",
            bottom: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(0,212,255,0.3)",
          }}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: isReverse ? "#ff4444" : color === "cyan" ? "#00d4ff" : "#00ff88",
        }}
      >
        {value > 0 ? "+" : ""}
        {value}%
      </div>
    </div>
  );
}

// ─── Styled range slider via inline style injection ────────────────────────────
function Slider({
  label,
  value,
  min = -100,
  max = 100,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "0.4rem",
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
        }}
      >
        <span style={{ color: "#4a7fa0" }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: color,
          cursor: "pointer",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.55rem",
          color: "#1a3a5c",
          marginTop: 2,
        }}
      >
        <span>{min}</span>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ControlPage() {
  const [leftVal, setLeftVal] = useState(0);
  const [rightVal, setRightVal] = useState(0);
  const [mode, setMode] = useState<"manual" | "dp">(state.mode);
  const [esp32Url, setEsp32Url] = useState("ws://192.168.4.1:81");
  const [esp32Status, setEsp32Status] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected"
  );
  const [wsRef] = useState<{ current: WebSocket | null }>({ current: null });

  const updateLeft = useCallback((v: number) => {
    setLeftVal(v);
    state.control.left = v;
  }, []);

  const updateRight = useCallback((v: number) => {
    setRightVal(v);
    state.control.right = v;
  }, []);

  function switchMode(m: "manual" | "dp") {
    state.mode = m;
    setMode(m);
    if (m === "manual") {
      updateLeft(0);
      updateRight(0);
    }
  }

  function connectEsp32() {
    if (esp32Status === "connected") {
      wsRef.current?.close();
      setEsp32Status("disconnected");
      return;
    }
    setEsp32Status("connecting");
    try {
      const ws = new WebSocket(esp32Url);
      wsRef.current = ws;
      ws.onopen = () => setEsp32Status("connected");
      ws.onerror = () => setEsp32Status("disconnected");
      ws.onclose = () => setEsp32Status("disconnected");

      // Send thruster commands when connected
      // Format: "L:<-100..100>,R:<-100..100>\n"
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`L:${state.control.left},R:${state.control.right}\n`);
        } else {
          clearInterval(interval);
        }
      }, 100);
    } catch {
      setEsp32Status("disconnected");
    }
  }

  const espColor = {
    disconnected: "#ff4444",
    connecting: "#ffa500",
    connected: "#00ff88",
  }[esp32Status];

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
            Control Panel
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem" }}>
          <Link href="/simulation" style={{ color: "#00d4ff", textDecoration: "none" }}>
            ⬡ Simulation
          </Link>
          <Link href="/" style={{ color: "#4a7fa0", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Left column: mode + sliders */}
        <div style={{ flex: "1 1 320px", maxWidth: 420 }}>
          {/* Mode toggle */}
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
                marginBottom: "0.75rem",
              }}
            >
              OPERATING MODE
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {(["manual", "dp"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: "0.6rem",
                    border: `1px solid ${mode === m ? (m === "dp" ? "#ffa500" : "#00ff88") : "rgba(0,212,255,0.2)"}`,
                    background:
                      mode === m
                        ? m === "dp"
                          ? "rgba(255,165,0,0.12)"
                          : "rgba(0,255,136,0.1)"
                        : "transparent",
                    color: mode === m ? (m === "dp" ? "#ffa500" : "#00ff88") : "#4a7fa0",
                    fontFamily: "inherit",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {m === "manual" ? "MANUAL" : "DP AUTO"}
                </button>
              ))}
            </div>
            {mode === "dp" && (
              <div
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.6rem",
                  color: "#ffa500",
                  letterSpacing: "0.15em",
                }}
              >
                ⚠ Thrusters controlled by DP algorithm
                <br />
                Click the simulation map to set target
              </div>
            )}
          </div>

          {/* Thruster sliders */}
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
              THRUSTER COMMAND {mode === "dp" ? "(READ-ONLY IN DP)" : ""}
            </div>
            <div style={{ opacity: mode === "dp" ? 0.5 : 1, pointerEvents: mode === "dp" ? "none" : "auto" }}>
              <Slider
                label="PORT (LEFT)"
                value={leftVal}
                color="#00d4ff"
                onChange={updateLeft}
              />
              <Slider
                label="STARBOARD (RIGHT)"
                value={rightVal}
                color="#00ff88"
                onChange={updateRight}
              />
            </div>
            {mode === "manual" && (
              <button
                onClick={() => { updateLeft(0); updateRight(0); }}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid rgba(255,68,68,0.4)",
                  background: "rgba(255,68,68,0.08)",
                  color: "#ff6666",
                  fontFamily: "inherit",
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  cursor: "pointer",
                  marginTop: "0.5rem",
                }}
              >
                ■ ALL STOP
              </button>
            )}
          </div>
        </div>

        {/* Right column: thruster visuals + ESP32 */}
        <div style={{ flex: "1 1 220px" }}>
          {/* Thruster bars */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
            <ThrusterBar label="PORT" value={leftVal} color="cyan" />
            <ThrusterBar label="STBD" value={rightVal} color="green" />
          </div>

          {/* ESP32 panel */}
          <div
            style={{
              border: "1px solid rgba(0,212,255,0.15)",
              padding: "1.25rem",
              background: "rgba(0,20,40,0.5)",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                letterSpacing: "0.3em",
                color: "#2a5a7a",
                marginBottom: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>ESP32 LINK</span>
              <span style={{ color: espColor }}>● {esp32Status.toUpperCase()}</span>
            </div>

            <input
              type="text"
              value={esp32Url}
              onChange={(e) => setEsp32Url(e.target.value)}
              style={{
                width: "100%",
                background: "#050d18",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#c8dff5",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                padding: "0.4rem 0.6rem",
                marginBottom: "0.75rem",
                boxSizing: "border-box",
              }}
            />

            <button
              onClick={connectEsp32}
              style={{
                width: "100%",
                padding: "0.55rem",
                border: `1px solid ${espColor}40`,
                background: `${espColor}10`,
                color: espColor,
                fontFamily: "inherit",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                cursor: "pointer",
              }}
            >
              {esp32Status === "connected" ? "DISCONNECT" : "CONNECT"}
            </button>

            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.58rem",
                color: "#1a3a5c",
                lineHeight: 1.8,
                letterSpacing: "0.1em",
              }}
            >
              <div>Protocol: WebSocket</div>
              <div>Format: L:&#123;-100..100&#125;,R:&#123;-100..100&#125;</div>
              <div>Rate: 10 Hz</div>
              <div style={{ marginTop: "0.5rem", color: "#2a5a7a" }}>
                ESP32 default AP IP: 192.168.4.1
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}