"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { state } from "@/lib/simulation/state";
import { stepPhysics, dpDebug, resetDpState } from "@/lib/simulation/physics";

const WAKE_LEN  = 80;
const CANVAS_W  = 800;
const CANVAS_H  = 680;

export default function SimulationPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wake       = useRef<{ x: number; y: number }[]>([]);
  const animRef    = useRef<number>(0);
  const frameRef   = useRef(0);
  const [telemetry, setTelemetry] = useState({
    speed: 0, rpm: 0, dpError: 0, heading: 0,
    phase: "---", thrustL: 0, thrustR: 0,
  });
  const [showDebug, setShowDebug] = useState(true);
  const [currentMode, setCurrentMode] = useState(state.mode);
  const [screenLayout, setScreenLayout] = useState(state.settings.screenLayout);

  // Pi 7" (800×480) — scale the 800×680 canvas to fit, leaving room for the top bar.
  // scale = 420 / 680 ≈ 0.617; round to 0.62 for a clean fit.
  const isCompact = screenLayout === "pi";
  const canvasScale = isCompact ? 0.62 : 1.0;
  const scaledW = Math.round(CANVAS_W * canvasScale);
  const scaledH = Math.round(CANVAS_H * canvasScale);

  // ── Click canvas → set DP target ──────────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    // getBoundingClientRect returns scaled (CSS) coords; divide by canvasScale
    // to convert back to canvas world coordinates.
    const x = (e.clientX - rect.left) / canvasScale;
    const y = (e.clientY - rect.top) / canvasScale;
    state.dp.x = x;
    state.dp.y = y;
    // Store the current heading as the hold heading
    state.dp.heading = state.ship.heading;
    resetDpState();
  }

  function toggleMode() {
    const next = state.mode === "manual" ? "dp" : "manual";
    state.mode = next;
    if (next === "manual") {
      state.control.left  = 0;
      state.control.right = 0;
    } else {
      // Place initial DP target at current position so boat holds in place
      state.dp.x       = state.ship.x;
      state.dp.y       = state.ship.y;
      state.dp.heading = state.ship.heading;
      resetDpState();
    }
    setCurrentMode(next);
  }

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;

    // ── Water ────────────────────────────────────────────────────────────────
    function drawWater(frame: number) {
      ctx.fillStyle = "#060f1e";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // grid
      ctx.strokeStyle = "rgba(0,80,130,0.22)";
      ctx.lineWidth   = 0.5;
      for (let x = 0; x <= CANVAS_W; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // wave shimmer
      const t = frame * 0.014;
      ctx.strokeStyle = "rgba(0,130,190,0.055)";
      ctx.lineWidth   = 1;
      for (let row = 0; row < CANVAS_H; row += 28) {
        ctx.beginPath();
        for (let col = 0; col <= CANVAS_W; col += 4) {
          const yy = row + Math.sin(col * 0.038 + t + row * 0.04) * 1.8;
          col === 0 ? ctx.moveTo(col, yy) : ctx.lineTo(col, yy);
        }
        ctx.stroke();
      }
    }

    // ── DP Target marker ─────────────────────────────────────────────────────
    function drawDpTarget(frame: number) {
      if (state.mode !== "dp") return;
      const { x, y } = state.dp;
      ctx.save();
      ctx.translate(x, y);

      const pulse = (Math.sin(frame * 0.07) + 1) * 0.5;

      // outer pulsing ring
      ctx.strokeStyle = `rgba(255,165,0,${0.25 + pulse * 0.45})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + pulse * 7, 0, Math.PI * 2);
      ctx.stroke();

      // inner solid ring
      ctx.strokeStyle = "#ffa500";
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();

      // crosshair
      ctx.strokeStyle = "rgba(255,165,0,0.6)";
      ctx.lineWidth   = 1;
      [[-16,0],[16,0],[0,-16],[0,16]].forEach(([mx,my], i) => {
        if (i % 2 === 0) ctx.beginPath();
        if (i % 2 === 0) ctx.moveTo(mx!, my!);
        else { ctx.lineTo(mx!, my!); ctx.stroke(); }
      });
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();

      // label
      ctx.fillStyle   = "rgba(255,165,0,0.7)";
      ctx.font        = "9px 'JetBrains Mono', monospace";
      ctx.textAlign   = "center";
      ctx.fillText("DP TARGET", 0, -24);

      // line from boat to target
      const bx = state.ship.x - x;
      const by = state.ship.y - y;
      ctx.strokeStyle = "rgba(255,165,0,0.12)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    // ── Wake trail ───────────────────────────────────────────────────────────
    function drawWake() {
      const w = wake.current;
      if (w.length < 2) return;
      for (let i = 1; i < w.length; i++) {
        const t = i / w.length;
        ctx.strokeStyle = `rgba(140,210,255,${t * 0.3})`;
        ctx.lineWidth   = Math.max(0.5, t * 3.5);
        ctx.beginPath();
        ctx.moveTo(w[i-1]!.x, w[i-1]!.y);
        ctx.lineTo(w[i]!.x,   w[i]!.y);
        ctx.stroke();
      }
    }

    // ── Ship hull ────────────────────────────────────────────────────────────
    function drawShip(x: number, y: number, heading: number) {
      const L = state.control.left;
      const R = state.control.right;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);

      // glow
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur  = 20;

      // hull
      ctx.fillStyle = "#112840";
      ctx.beginPath();
      ctx.moveTo(0, -18);     // bow tip
      ctx.lineTo(10,  4);
      ctx.lineTo(8,  16);
      ctx.lineTo(-8, 16);
      ctx.lineTo(-10,  4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // superstructure
      ctx.fillStyle = "#0a1f38";
      ctx.fillRect(-4, -5, 8, 14);

      // bow accent
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(3.5, -9);
      ctx.lineTo(-3.5,-9);
      ctx.closePath();
      ctx.fill();

      // port thruster (left = −x in boat frame, aft = +y)
      const lColor = L > 0 ? "#00ff88" : L < 0 ? "#ff4444" : "#0a1f38";
      ctx.fillStyle = lColor;
      if (L !== 0) { ctx.shadowColor = lColor; ctx.shadowBlur = 8; }
      ctx.fillRect(-13, 9, 5, 9);
      ctx.shadowBlur = 0;

      // starboard thruster
      const rColor = R > 0 ? "#00ff88" : R < 0 ? "#ff4444" : "#0a1f38";
      ctx.fillStyle = rColor;
      if (R !== 0) { ctx.shadowColor = rColor; ctx.shadowBlur = 8; }
      ctx.fillRect(8, 9, 5, 9);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "rgba(0,212,255,0.25)";
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(-13, 9, 5, 9);
      ctx.strokeRect(8,  9, 5, 9);

      ctx.restore();
    }

    // ── Debug overlay: heading vector + thrust arcs ───────────────────────────
    function drawDebugOverlay(x: number, y: number, heading: number) {
      const { phase, surgeCmd, yawCmd, targetHeading } = dpDebug;

      ctx.save();
      ctx.translate(x, y);

      // Target heading ray (where we want to face)
      if (state.mode === "dp" && phase !== "HOLD") {
        const relTarget = targetHeading - heading;
        ctx.strokeStyle = "rgba(255,165,0,0.4)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(relTarget) * 50, Math.sin(relTarget) * 50);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Current heading vector (blue)
      ctx.strokeStyle = "rgba(0,212,255,0.7)";
      ctx.lineWidth   = 2;
      const hLen = 30 + surgeCmd * 40;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(0) * hLen, Math.sin(0) * hLen); // always forward in local frame
      // Actually draw in world via rotate already applied — draw local forward = (0, -hLen)
      ctx.restore();

      // Redo in local frame (after rotate)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(heading);

      // Surge arrow (forward, blue)
      if (Math.abs(surgeCmd) > 0.02) {
        const len = surgeCmd * 50;
        ctx.strokeStyle = "rgba(0,212,255,0.65)";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -len);
        ctx.stroke();
        // arrowhead
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(-4, -len + 8 * Math.sign(surgeCmd));
        ctx.lineTo( 4, -len + 8 * Math.sign(surgeCmd));
        ctx.closePath();
        ctx.fillStyle = "rgba(0,212,255,0.65)";
        ctx.fill();
      }

      // Yaw indicator (orange arc)
      if (Math.abs(yawCmd) > 0.02) {
        const arc = yawCmd * Math.PI * 0.6;
        ctx.strokeStyle = "rgba(255,165,0,0.55)";
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + arc, yawCmd < 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ── Compass rose ──────────────────────────────────────────────────────────
    function drawCompass(cx: number, cy: number, r: number, heading: number) {
      ctx.save();
      ctx.translate(cx, cy);

      ctx.strokeStyle = "rgba(0,212,255,0.25)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font      = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ["N","E","S","W"].forEach((d, i) => {
        const a = i * Math.PI / 2;
        ctx.fillStyle = d === "N" ? "#00d4ff" : "#3a6a8a";
        ctx.fillText(d, Math.sin(a) * (r - 9), -Math.cos(a) * (r - 9));
      });

      // needle (rotates with heading)
      ctx.rotate(heading);
      const grad = ctx.createLinearGradient(0, -(r-4), 0, r-4);
      grad.addColorStop(0,   "#00d4ff");
      grad.addColorStop(0.5, "#00d4ff");
      grad.addColorStop(0.5, "#ff4444");
      grad.addColorStop(1,   "#ff4444");
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(0, -(r-4));
      ctx.lineTo(0,  (r-4));
      ctx.stroke();

      ctx.restore();
    }

    // ── HUD readout ───────────────────────────────────────────────────────────
    function drawHUD(debug: boolean) {
      const s   = state.ship;
      const hdg = ((s.heading * 180 / Math.PI) + 360 + 90) % 360;
      const phase = state.mode === "dp" ? dpDebug.phase : "---";

      // panel
      ctx.fillStyle   = "rgba(4,10,20,0.88)";
      ctx.fillRect(10, 10, 210, 150);
      ctx.strokeStyle = "rgba(0,212,255,0.18)";
      ctx.lineWidth   = 1;
      ctx.strokeRect(10, 10, 210, 150);

      // phase badge (top right of panel)
      if (state.mode === "dp") {
        const phaseCol = phase === "HOLD" ? "#00ff88" : phase === "APPROACH" ? "#00d4ff" : "#ffa500";
        ctx.fillStyle = phaseCol + "22";
        ctx.fillRect(130, 13, 87, 16);
        ctx.fillStyle   = phaseCol;
        ctx.font        = "bold 9px 'JetBrains Mono', monospace";
        ctx.textAlign   = "center";
        ctx.fillText(phase, 173, 23);
      }

      ctx.font      = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";

      const rows = [
        { label: "MODE",   val: state.mode.toUpperCase(), color: state.mode === "dp" ? "#ffa500" : "#00ff88" },
        { label: "POS X",  val: s.x.toFixed(1) + " px",  color: "#c8dff5" },
        { label: "POS Y",  val: s.y.toFixed(1) + " px",  color: "#c8dff5" },
        { label: "HDG",    val: hdg.toFixed(1) + "°",     color: "#c8dff5" },
        { label: "SPEED",  val: (state.telemetry.speed * 10).toFixed(2) + " kn", color: "#c8dff5" },
        { label: "DP ERR", val: state.mode === "dp" ? state.telemetry.dpError.toFixed(1) + " px" : "---", color: "#ffa500" },
      ];

      rows.forEach(({ label, val, color }, i) => {
        ctx.fillStyle = "#1e4a6a";
        ctx.fillText(label, 22, 38 + i * 18);
        ctx.fillStyle   = color;
        ctx.textAlign   = "right";
        ctx.fillText(val, 214, 38 + i * 18);
        ctx.textAlign   = "left";
      });

      // debug thrust readout
      if (debug && state.mode === "dp") {
        ctx.fillStyle   = "rgba(4,10,20,0.88)";
        ctx.fillRect(10, 168, 210, 52);
        ctx.strokeStyle = "rgba(255,165,0,0.18)";
        ctx.strokeRect(10, 168, 210, 52);

        ctx.fillStyle = "#3a5a7a";
        ctx.fillText("PORT",  22, 183);
        ctx.fillText("STBD",  22, 200);
        ctx.fillText("YAW",   22, 216);

        const barW = (v: number, maxW = 100) => Math.abs(v) * maxW;
        const barColor = (v: number) => v >= 0 ? "#00ff88" : "#ff4444";
        [[dpDebug.thrustL, 183],[dpDebug.thrustR, 200],[dpDebug.yawCmd, 216]].forEach(([v, y]) => {
          ctx.fillStyle = barColor(v as number) + "44";
          ctx.fillRect(70, (y as number) - 9, barW(v as number), 11);
          ctx.fillStyle = barColor(v as number);
          ctx.textAlign = "right";
          ctx.fillText(((v as number) * 100).toFixed(0) + "%", 214, y as number);
          ctx.textAlign = "left";
        });
      }

      // compass
      drawCompass(CANVAS_W - 54, CANVAS_H - 54, 42, s.heading);
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    function draw() {
      const frame = ++frameRef.current;
      stepPhysics(1 / 60);

      wake.current.push({ x: state.ship.x, y: state.ship.y });
      if (wake.current.length > WAKE_LEN) wake.current.shift();

      drawWater(frame);
      drawDpTarget(frame);
      drawWake();
      drawShip(state.ship.x, state.ship.y, state.ship.heading);

      if (showDebug && state.mode === "dp") {
        drawDebugOverlay(state.ship.x, state.ship.y, state.ship.heading);
      }

      drawHUD(showDebug);

      if (frame % 8 === 0) {
        const h = ((state.ship.heading * 180 / Math.PI) + 360 + 90) % 360;
        setTelemetry({
          speed:   state.telemetry.speed,
          rpm:     state.telemetry.rpm,
          dpError: state.telemetry.dpError,
          heading: h,
          phase:   dpDebug.phase,
          thrustL: dpDebug.thrustL,
          thrustR: dpDebug.thrustR,
        });
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDebug]);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: "100vh",
      background: "#050d18",
      fontFamily: "'JetBrains Mono','Courier New',monospace",
      color: "#c8dff5",
      padding: isCompact ? "0.4rem" : "1rem",
      overflow: isCompact ? "hidden" : undefined,
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: isCompact ? "0.35rem" : "0.75rem",
        paddingBottom: isCompact ? "0.3rem" : "0.6rem",
        borderBottom: "1px solid rgba(0,212,255,0.15)",
      }}>
        {!isCompact && (
          <div>
            <span style={{ fontSize:"0.6rem", letterSpacing:"0.3em", color:"#00d4ff" }}>DP-STEM-SIM · </span>
            <span style={{ fontSize:"0.9rem", fontWeight:700, color:"#fff" }}>Simulation</span>
          </div>
        )}
        <div style={{ display:"flex", gap:"1rem", alignItems:"center", fontSize:"0.7rem" }}>
          {/* Mode toggle */}
          <button onClick={toggleMode} style={{
            padding: "0.3rem 0.8rem",
            border: `1px solid ${currentMode === "dp" ? "#ffa500" : "#00ff88"}`,
            background: currentMode === "dp" ? "rgba(255,165,0,0.1)" : "rgba(0,255,136,0.08)",
            color: currentMode === "dp" ? "#ffa500" : "#00ff88",
            fontFamily: "inherit", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.15em", cursor: "pointer",
          }}>
            {currentMode === "dp" ? "● DP AUTO" : "○ MANUAL"}
          </button>
          {/* Debug toggle */}
          <button onClick={() => setShowDebug(d => !d)} style={{
            padding: "0.3rem 0.7rem",
            border: `1px solid ${showDebug ? "rgba(0,212,255,0.4)" : "rgba(0,212,255,0.15)"}`,
            background: showDebug ? "rgba(0,212,255,0.08)" : "transparent",
            color: showDebug ? "#00d4ff" : "#2a5a7a",
            fontFamily: "inherit", fontSize: "0.65rem", letterSpacing: "0.15em", cursor: "pointer",
          }}>
            DEBUG
          </button>
          {!isCompact && <Link href="/control"  style={{ color:"#ffa500", textDecoration:"none" }}>◈ Control</Link>}
          <Link href="/settings" style={{ color:"#7fff7f", textDecoration:"none" }}>◎ Settings</Link>
          {!isCompact && <Link href="/"         style={{ color:"#4a7fa0", textDecoration:"none" }}>← Home</Link>}
        </div>
      </div>

      <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
        {/* Canvas — wrapped in a div sized to the scaled visual footprint so
            surrounding layout doesn't see the unscaled 800×680 element */}
        <div style={{ position:"relative", flexShrink:0, width: scaledW, height: scaledH, overflow:"hidden" }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={handleCanvasClick}
            style={{
              border: "1px solid rgba(0,212,255,0.2)",
              cursor: currentMode === "dp" ? "crosshair" : "default",
              display: "block",
              transformOrigin: "top left",
              transform: `scale(${canvasScale})`,
            }}
          />
          {currentMode === "dp" && (
            <div style={{
              position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
              fontSize:"0.58rem", color:"#ffa500", letterSpacing:"0.2em",
              background:"rgba(4,10,20,0.75)", padding:"3px 12px", pointerEvents:"none",
            }}>
              CLICK MAP TO SET DP TARGET
            </div>
          )}
        </div>

        {/* Side panel — hidden in Pi/compact layout; all data visible in canvas HUD */}
        {!isCompact && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem", minWidth:160 }}>
          {/* Telemetry tiles */}
          {[
            { label:"SPEED",   val:(telemetry.speed*10).toFixed(2), unit:"kn",  color:"#00d4ff" },
            { label:"HEADING", val:telemetry.heading.toFixed(1),    unit:"°",   color:"#00d4ff" },
            { label:"DP ERR",  val:telemetry.dpError.toFixed(1),    unit:"px",  color:"#ffa500" },
            { label:"ENGINE",  val:telemetry.rpm.toFixed(0),        unit:"rpm", color:"#7fff7f" },
          ].map(({ label, val, unit, color }) => (
            <div key={label} style={{
              border:"1px solid rgba(0,212,255,0.13)", padding:"0.65rem",
              background:"rgba(0,18,36,0.6)",
            }}>
              <div style={{ fontSize:"0.53rem", letterSpacing:"0.25em", color:"#1e4a6a", marginBottom:3 }}>
                {label}
              </div>
              <div style={{ fontSize:"1.25rem", fontWeight:700, color, letterSpacing:"0.05em" }}>
                {val}
                <span style={{ fontSize:"0.65rem", color:"#3a6a8a", marginLeft:4 }}>{unit}</span>
              </div>
            </div>
          ))}

          {/* DP phase */}
          {currentMode === "dp" && (
            <div style={{
              border:"1px solid rgba(255,165,0,0.2)", padding:"0.65rem",
              background:"rgba(0,18,36,0.6)",
            }}>
              <div style={{ fontSize:"0.53rem", letterSpacing:"0.25em", color:"#1e4a6a", marginBottom:3 }}>
                DP PHASE
              </div>
              <div style={{
                fontSize:"0.9rem", fontWeight:700, letterSpacing:"0.1em",
                color: telemetry.phase==="HOLD" ? "#00ff88" : telemetry.phase==="APPROACH" ? "#00d4ff" : "#ffa500",
              }}>
                {telemetry.phase}
              </div>
            </div>
          )}

          {/* Thrust bars */}
          {currentMode === "dp" && (
            <div style={{
              border:"1px solid rgba(0,212,255,0.13)", padding:"0.65rem",
              background:"rgba(0,18,36,0.6)",
            }}>
              <div style={{ fontSize:"0.53rem", letterSpacing:"0.25em", color:"#1e4a6a", marginBottom:8 }}>
                THRUSTERS
              </div>
              {[["PORT", telemetry.thrustL], ["STBD", telemetry.thrustR]].map(([lbl, val]) => (
                <div key={lbl as string} style={{ marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.6rem", marginBottom:2 }}>
                    <span style={{ color:"#2a5a7a" }}>{lbl}</span>
                    <span style={{ color: (val as number) >= 0 ? "#00ff88" : "#ff4444" }}>
                      {((val as number)*100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height:5, background:"#050d18", border:"1px solid rgba(0,212,255,0.1)" }}>
                    <div style={{
                      height:"100%",
                      width:`${Math.abs((val as number)*100)}%`,
                      background: (val as number) >= 0 ? "#00ff88" : "#ff4444",
                      marginLeft: (val as number) < 0 ? `${100-Math.abs((val as number)*100)}%` : 0,
                    }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wind */}
          <div style={{
            border:"1px solid rgba(0,212,255,0.13)", padding:"0.65rem",
            background:"rgba(0,18,36,0.6)", fontSize:"0.6rem",
            color:"#1e4a6a", lineHeight:1.9,
          }}>
            <div style={{ color:"#3a6a8a", marginBottom:4, letterSpacing:"0.2em" }}>ENVIRONMENT</div>
            <div>WIND X: <span style={{color:"#c8dff5"}}>{state.settings.windX.toFixed(3)}</span></div>
            <div>WIND Y: <span style={{color:"#c8dff5"}}>{state.settings.windY.toFixed(3)}</span></div>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}