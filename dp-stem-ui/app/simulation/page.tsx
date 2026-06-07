"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { state } from "@/lib/simulation/state";
import { stepPhysics } from "@/lib/simulation/physics";

const WAKE_LEN = 60;
const CANVAS_W = 800;
const CANVAS_H = 700;

export default function SimulationPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wake = useRef<{ x: number; y: number }[]>([]);
  const animRef = useRef<number>(0);
  const [telemetry, setTelemetry] = useState({ speed: 0, rpm: 0, dpError: 0, heading: 0 });

  // Click canvas → set DP target
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    state.dp.x = x;
    state.dp.y = y;
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let frameCount = 0;

    function drawWater() {
      // base ocean color
      ctx.fillStyle = "#060f1e";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // grid
      ctx.strokeStyle = "rgba(0,80,130,0.25)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // animated wave shimmer
      const t = frameCount * 0.015;
      ctx.strokeStyle = "rgba(0,140,200,0.06)";
      ctx.lineWidth = 1;
      for (let row = 0; row < CANVAS_H; row += 30) {
        ctx.beginPath();
        for (let col = 0; col < CANVAS_W; col += 4) {
          const yOff = Math.sin(col * 0.04 + t + row * 0.05) * 2;
          if (col === 0) ctx.moveTo(col, row + yOff);
          else ctx.lineTo(col, row + yOff);
        }
        ctx.stroke();
      }
    }

    function drawDpTarget() {
      if (state.mode !== "dp") return;
      const { x, y } = state.dp;
      ctx.save();
      ctx.translate(x, y);

      // pulsing ring
      const pulse = (Math.sin(frameCount * 0.08) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255,165,0,${0.3 + pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#ffa500";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();

      // crosshair
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();

      ctx.restore();
    }

    function drawWake() {
      const w = wake.current;
      if (w.length < 2) return;
      for (let i = 1; i < w.length; i++) {
        const alpha = (i / w.length) * 0.35;
        ctx.strokeStyle = `rgba(140,210,255,${alpha})`;
        ctx.lineWidth = Math.max(0.5, (i / w.length) * 3);
        ctx.beginPath();
        ctx.moveTo(w[i - 1].x, w[i - 1].y);
        ctx.lineTo(w[i].x, w[i].y);
        ctx.stroke();
      }
    }

    function drawShip(x: number, y: number, heading: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);

      // hull shadow
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 18;

      // hull body
      ctx.fillStyle = "#1a3a5c";
      ctx.beginPath();
      ctx.moveTo(0, -16);   // bow
      ctx.lineTo(9, 6);
      ctx.lineTo(7, 14);
      ctx.lineTo(-7, 14);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();

      // hull outline
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // deck detail
      ctx.fillStyle = "#0a2540";
      ctx.fillRect(-4, -4, 8, 12);

      // bow highlight
      ctx.fillStyle = "#00d4ff";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(3, -8);
      ctx.lineTo(-3, -8);
      ctx.closePath();
      ctx.fill();

      // thruster indicators
      ctx.fillStyle = state.control.left > 0 ? "#00ff88" : state.control.left < 0 ? "#ff4444" : "#1a3a5c";
      ctx.fillRect(-11, 8, 5, 8);
      ctx.fillStyle = state.control.right > 0 ? "#00ff88" : state.control.right < 0 ? "#ff4444" : "#1a3a5c";
      ctx.fillRect(6, 8, 5, 8);

      ctx.restore();
    }

    function drawCompass(cx: number, cy: number, r: number, heading: number) {
      ctx.save();
      ctx.translate(cx, cy);

      // ring
      ctx.strokeStyle = "rgba(0,212,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // cardinal labels
      const dirs = ["N","E","S","W"];
      const angles = [0, Math.PI/2, Math.PI, -Math.PI/2];
      ctx.fillStyle = "#4a7fa0";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      dirs.forEach((d, i) => {
        const a = angles[i];
        const lx = Math.sin(a) * (r - 8);
        const ly = -Math.cos(a) * (r - 8);
        ctx.fillStyle = d === "N" ? "#00d4ff" : "#4a7fa0";
        ctx.fillText(d, lx, ly);
      });

      // heading needle
      ctx.rotate(heading + Math.PI / 2);
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r - 4, 0);
      ctx.stroke();

      ctx.restore();
    }

    function drawHUD() {
      const s = state.ship;
      const headingDeg = ((s.heading * 180) / Math.PI + 360 + 90) % 360;

      // HUD background panel
      ctx.fillStyle = "rgba(5,13,24,0.85)";
      ctx.fillRect(10, 10, 200, 130);
      ctx.strokeStyle = "rgba(0,212,255,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 200, 130);

      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";

      const rows = [
        { label: "MODE", val: state.mode.toUpperCase(), color: state.mode === "dp" ? "#ffa500" : "#00ff88" },
        { label: "POS  X", val: s.x.toFixed(1) + " m", color: "#c8dff5" },
        { label: "POS  Y", val: s.y.toFixed(1) + " m", color: "#c8dff5" },
        { label: "HDG", val: headingDeg.toFixed(1) + "°", color: "#c8dff5" },
        { label: "SPD", val: (state.telemetry.speed * 10).toFixed(2) + " kn", color: "#c8dff5" },
        { label: "DP ERR", val: state.mode === "dp" ? state.telemetry.dpError.toFixed(1) + " m" : "---", color: "#ffa500" },
      ];

      rows.forEach(({ label, val, color }, i) => {
        ctx.fillStyle = "#2a5a7a";
        ctx.fillText(label, 22, 30 + i * 18);
        ctx.fillStyle = color;
        ctx.textAlign = "right";
        ctx.fillText(val, 200, 30 + i * 18);
        ctx.textAlign = "left";
      });

      // Compass (bottom right)
      drawCompass(CANVAS_W - 54, CANVAS_H - 54, 42, s.heading);
    }

    function draw() {
      frameCount++;

      stepPhysics(1 / 60);

      // update wake
      wake.current.push({ x: state.ship.x, y: state.ship.y });
      if (wake.current.length > WAKE_LEN) wake.current.shift();

      drawWater();
      drawDpTarget();
      drawWake();
      drawShip(state.ship.x, state.ship.y, state.ship.heading);
      drawHUD();

      // update React state every 10 frames for telemetry panel
      if (frameCount % 10 === 0) {
        const h = ((state.ship.heading * 180) / Math.PI + 360 + 90) % 360;
        setTelemetry({
          speed: state.telemetry.speed,
          rpm: state.telemetry.rpm,
          dpError: state.telemetry.dpError,
          heading: h,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

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
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid rgba(0,212,255,0.15)",
        }}
      >
        <div>
          <span style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "#00d4ff" }}>
            DP-STEM-SIM ·{" "}
          </span>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
            Simulation View
          </span>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.7rem" }}>
          <Link href="/control" style={{ color: "#ffa500", textDecoration: "none" }}>
            ◈ Control
          </Link>
          <Link href="/settings" style={{ color: "#7fff7f", textDecoration: "none" }}>
            ◎ Settings
          </Link>
          <Link href="/" style={{ color: "#4a7fa0", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Canvas */}
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={handleCanvasClick}
            style={{
              border: "1px solid rgba(0,212,255,0.2)",
              cursor: "crosshair",
              display: "block",
            }}
          />
          {state.mode === "dp" && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "0.6rem",
                color: "#ffa500",
                letterSpacing: "0.2em",
                background: "rgba(5,13,24,0.7)",
                padding: "3px 10px",
              }}
            >
              CLICK MAP TO SET DP TARGET
            </div>
          )}
        </div>

        {/* Side telemetry */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 160 }}>
          {[
            { label: "SPEED", val: (telemetry.speed * 10).toFixed(2), unit: "kn", color: "#00d4ff" },
            { label: "HEADING", val: telemetry.heading.toFixed(1), unit: "°", color: "#00d4ff" },
            { label: "DP ERROR", val: telemetry.dpError.toFixed(1), unit: "m", color: "#ffa500" },
            { label: "ENGINE", val: telemetry.rpm.toFixed(0), unit: "rpm", color: "#7fff7f" },
          ].map(({ label, val, unit, color }) => (
            <div
              key={label}
              style={{
                border: "1px solid rgba(0,212,255,0.15)",
                padding: "0.75rem",
                background: "rgba(0,20,40,0.5)",
              }}
            >
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.25em", color: "#2a5a7a", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color, letterSpacing: "0.05em" }}>
                {val}
                <span style={{ fontSize: "0.7rem", color: "#4a7fa0", marginLeft: 4 }}>{unit}</span>
              </div>
            </div>
          ))}

          <div
            style={{
              border: "1px solid rgba(0,212,255,0.15)",
              padding: "0.75rem",
              background: "rgba(0,20,40,0.5)",
              fontSize: "0.6rem",
              color: "#2a5a7a",
              lineHeight: 1.8,
            }}
          >
            <div style={{ color: "#4a7fa0", marginBottom: 4, letterSpacing: "0.2em" }}>WIND</div>
            <div>X: {state.settings.windX.toFixed(3)}</div>
            <div>Y: {state.settings.windY.toFixed(3)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}