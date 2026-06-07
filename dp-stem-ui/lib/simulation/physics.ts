import { state } from "./state";

// Simple PID controller
function pid(error: number, kp: number, ki: number, kd: number, prev: number, dt: number) {
  return kp * error + kd * ((error - prev) / dt);
}

let prevDpErrX = 0;
let prevDpErrY = 0;
let prevDpErrH = 0;

export function stepPhysics(dt: number) {
  const s = state.ship;
  const cfg = state.settings;

  let thrustL = state.control.left / 100;   // -1 to 1
  let thrustR = state.control.right / 100;

  // --- DP AUTO MODE ---
  if (state.mode === "dp") {
    const dx = state.dp.x - s.x;
    const dy = state.dp.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // target heading toward setpoint (if far), else hold DP heading
    const targetHeading = dist > 8
      ? Math.atan2(dy, dx)
      : state.dp.heading;

    // heading error (wrapped to -π..π)
    let hErr = targetHeading - s.heading;
    while (hErr > Math.PI) hErr -= 2 * Math.PI;
    while (hErr < -Math.PI) hErr += 2 * Math.PI;

    // surge (forward force) from distance, projected onto current heading
    const surgeErr = dist > 4 ? Math.min(dist / 80, 1) : 0;
    const swayErr = 0; // simplified – no sway control for now

    // PID
    const surgeCmd = pid(surgeErr, 1.2, 0, 0.3, prevDpErrX, dt);
    const yawCmd   = pid(hErr,     1.5, 0, 0.5, prevDpErrH, dt);

    prevDpErrX = surgeErr;
    prevDpErrH = hErr;

    // mix: surge adds equally, yaw adds differentially
    thrustL = Math.max(-1, Math.min(1, surgeCmd - yawCmd * 0.5));
    thrustR = Math.max(-1, Math.min(1, surgeCmd + yawCmd * 0.5));

    state.telemetry.dpError = dist;
  }

  // --- FORCES ---
  const totalThrust = (thrustL + thrustR) * 0.5;
  const torque      = (thrustR - thrustL) * cfg.thrusterSpan * 0.5;

  // thrust in world coords (along heading)
  const fx = Math.cos(s.heading) * totalThrust * cfg.thrustScale;
  const fy = Math.sin(s.heading) * totalThrust * cfg.thrustScale;

  // wind
  const wx = cfg.windX;
  const wy = cfg.windY;

  // integrate linear
  s.vx = s.vx * cfg.linearDrag + fx + wx;
  s.vy = s.vy * cfg.linearDrag + fy + wy;
  s.x += s.vx;
  s.y += s.vy;

  // integrate angular
  s.omega = s.omega * cfg.angularDrag + torque * 0.001;
  s.heading += s.omega;

  // wrap heading
  while (s.heading > Math.PI)  s.heading -= 2 * Math.PI;
  while (s.heading < -Math.PI) s.heading += 2 * Math.PI;

  // telemetry
  state.telemetry.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
  state.telemetry.rpm   = Math.abs(totalThrust) * 1800;
}
