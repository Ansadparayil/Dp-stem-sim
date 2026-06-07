"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  {
    href: "/simulation",
    icon: "⬡",
    label: "Simulation",
    sub: "2D map · ship physics · live render",
    color: "#00d4ff",
  },
  {
    href: "/control",
    icon: "◈",
    label: "Control Panel",
    sub: "Manual thrust · DP mode · ESP32 link",
    color: "#ffa500",
  },
  {
    href: "/settings",
    icon: "◎",
    label: "Settings",
    sub: "Wind · drag · thruster tuning",
    color: "#7fff7f",
  },
];

export default function Home() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour12: false });
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050d18",
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        color: "#c8dff5",
        padding: "0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Grid background */}
      <svg
        style={{ position: "fixed", inset: 0, opacity: 0.07, zIndex: 0 }}
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, padding: "3rem 2.5rem" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "3rem",
            borderBottom: "1px solid rgba(0,212,255,0.2)",
            paddingBottom: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.3em",
                color: "#00d4ff",
                marginBottom: "0.4rem",
                opacity: 0.8,
              }}
            >
              DP-STEM-SIM · v0.1 · INITIALISED
            </div>
            <h1
              style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                margin: 0,
                color: "#ffffff",
                textShadow: "0 0 30px rgba(0,212,255,0.4)",
              }}
            >
              Dynamic Positioning
              <br />
              <span style={{ color: "#00d4ff" }}>STEM Simulator</span>
            </h1>
          </div>

          {/* Clock */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                fontWeight: 700,
                color: "#ffa500",
                letterSpacing: "0.1em",
                textShadow: "0 0 20px rgba(255,165,0,0.5)",
              }}
            >
              {timeStr}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#7aadcc", letterSpacing: "0.15em" }}>
              {dateStr}
            </div>
          </div>
        </div>

        {/* Status strip */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2.5rem",
            fontSize: "0.65rem",
            letterSpacing: "0.2em",
            color: "#4a7fa0",
          }}
        >
          {["SYS: ONLINE", "PHYSICS: READY", "ESP32: STANDBY", "GPS: SIM"].map((s) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: s.includes("STANDBY") ? "#ffa500" : "#00ff88",
                  display: "inline-block",
                  boxShadow: `0 0 6px ${s.includes("STANDBY") ? "#ffa500" : "#00ff88"}`,
                }}
              />
              {s}
            </span>
          ))}
        </div>

        {/* Nav cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  border: `1px solid ${item.color}30`,
                  borderLeft: `3px solid ${item.color}`,
                  background: `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)`,
                  padding: "1.75rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    `linear-gradient(135deg, ${item.color}18 0%, ${item.color}05 100%)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = item.color;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    `linear-gradient(135deg, ${item.color}08 0%, transparent 100%)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${item.color}30`;
                  (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                }}
              >
                <div
                  style={{
                    fontSize: "1.8rem",
                    color: item.color,
                    marginBottom: "0.75rem",
                    textShadow: `0 0 20px ${item.color}80`,
                  }}
                >
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#ffffff",
                    marginBottom: "0.4rem",
                    letterSpacing: "0.05em",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#5a8aaa",
                    letterSpacing: "0.12em",
                  }}
                >
                  {item.sub}
                </div>

                {/* Corner accent */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 14,
                    fontSize: "0.6rem",
                    color: item.color,
                    opacity: 0.4,
                    letterSpacing: "0.2em",
                  }}
                >
                  ENTER ›
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "3rem",
            paddingTop: "1rem",
            borderTop: "1px solid rgba(0,212,255,0.1)",
            fontSize: "0.6rem",
            color: "#2a4a60",
            letterSpacing: "0.2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>DP-STEM-SIM · EDUCATIONAL USE ONLY</span>
          <span>VESSEL CLASS: SIMULATED</span>
        </div>
      </div>
    </main>
  );
}