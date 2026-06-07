import { state } from "./state";

// ─── PID state ────────────────────────────────────────────────────────────────
let prevYawErr    = 0;
let prevSurgeErr  = 0;
let holdIntegralX = 0;   
let holdIntegralY = 0;

/** Wrap an angle to the range (−π, π] */
function wrapAngle(a: number): number {
  while (a >  Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Clamp a value to [−1, 1] */
function clamp1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

function moveToward(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

let spooledThrustL = 0;
let spooledThrustR = 0;

export const dpDebug = {
  phase: "---" as string,        
  headingErr: 0,
  surgeCmd: 0,
  yawCmd: 0,
  thrustL: 0,
  thrustR: 0,
  targetHeading: 0,
};

export function resetDpState() {
  prevYawErr    = 0;
  prevSurgeErr  = 0;
  holdIntegralX = 0;
  holdIntegralY = 0;
}

// ─── Main physics step ────────────────────────────────────────────────────────
export function stepPhysics(dt: number) {
  const s   = state.ship;
  const cfg = state.settings;

  let cmdThrustL = state.control.left  / 100;  
  let cmdThrustR = state.control.right / 100;

  // ── DP AUTO MODE ────────────────────────────────────────────────────────────
  if (state.mode === "dp") {
    const dx   = state.dp.x - s.x;
    const dy   = state.dp.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const cosH = Math.cos(s.heading);
    const sinH = Math.sin(s.heading);
    
    // Calculate body-frame velocity using standard 2D rotation matrix
    const surgeVelBody = cosH * s.vx + sinH * s.vy;

    // Thresholds
    const HOLD_RADIUS    = 35;   
    const YAW_DEADBAND   = 0.02; 

    // ── PHASE 1 & 2: TURN then APPROACH ─────────────────────────────────────
    if (dist >= HOLD_RADIUS) {
      const bearingToTarget = Math.atan2(dy, dx);
      let yawErr = wrapAngle(bearingToTarget - s.heading);

      if (Math.abs(yawErr) < YAW_DEADBAND) yawErr = 0;

      const Kp_yaw = 2.0;
      const Kd_yaw = 1.5;
      const yawCmd = clamp1(Kp_yaw * yawErr - Kd_yaw * s.omega);
      prevYawErr = yawErr;

      const alignFactor = Math.max(0, Math.cos(yawErr));
      const desiredSurge = Math.min(dist / 120, 1) * alignFactor;
      const surgeErr = desiredSurge - surgeVelBody;
      const surgeCmd = clamp1(1.2 * surgeErr);
      prevSurgeErr = surgeErr;

      cmdThrustL = clamp1(surgeCmd - yawCmd * 0.5);
      cmdThrustR = clamp1(surgeCmd + yawCmd * 0.5);

      dpDebug.phase = alignFactor > 0.5 ? "APPROACH" : "TURN";
      dpDebug.targetHeading = bearingToTarget;

      holdIntegralX = 0;
      holdIntegralY = 0;

    // ── PHASE 3: POSITION HOLD ───────────────────────────────────────────────
    } else {
      const surgeErrBody =  cosH * dx + sinH * dy;  
      const swayErrBody  = -sinH * dx + cosH * dy;  

      const Ki_hold = 0.0005; 
      const MAX_INT = 0.3;
      holdIntegralX = Math.max(-MAX_INT, Math.min(MAX_INT, holdIntegralX + surgeErrBody * Ki_hold));
      holdIntegralY = Math.max(-MAX_INT, Math.min(MAX_INT, holdIntegralY + swayErrBody  * Ki_hold));

      const Kp_hold_surge = 0.04;
      const Kd_hold_surge = 1.4; 
      const surgeHold = clamp1(Kp_hold_surge * surgeErrBody + holdIntegralX - Kd_hold_surge * surgeVelBody);

      const swayYawNudge = clamp1(swayErrBody * 0.008 + holdIntegralY * 0.04);

      const bearingToTarget = Math.atan2(dy, dx);
      const distBlend = Math.max(0, Math.min(1, dist / HOLD_RADIUS));
      const headingDeltaToTarget = wrapAngle(bearingToTarget - state.dp.heading);
      const desiredHoldHeading = wrapAngle(state.dp.heading + headingDeltaToTarget * distBlend);

      let hErr = wrapAngle(desiredHoldHeading - s.heading);
      if (Math.abs(hErr) < YAW_DEADBAND) hErr = 0;

      const Kp_hold_yaw = 2.5;
      const Kd_hold_yaw = 1.8;
      const yawHold = clamp1(Kp_hold_yaw * hErr - Kd_hold_yaw * s.omega + swayYawNudge);

      cmdThrustL = clamp1(surgeHold - yawHold * 0.5);
      cmdThrustR = clamp1(surgeHold + yawHold * 0.5);

      dpDebug.phase         = "HOLD";
      dpDebug.targetHeading = state.dp.heading;
      dpDebug.headingErr    = hErr;
    }

    if (dist >= HOLD_RADIUS) dpDebug.headingErr = prevYawErr;
    dpDebug.surgeCmd   = (cmdThrustL + cmdThrustR) / 2;
    dpDebug.yawCmd     = (cmdThrustR - cmdThrustL) / 2;

    state.telemetry.dpError = dist;

    state.control.left  = Math.round(cmdThrustL * 100);
    state.control.right = Math.round(cmdThrustR * 100);
  }

  if (cfg.simpleMode) {
    // ── SIMPLE PHYSICS ────────────────────────────────────────────────────────
    // Instant thrust, strong per-tick drag — stable DP with no oscillation.
    const totalThrust = (cmdThrustL + cmdThrustR) * 0.5;
    const torque      = (cmdThrustR - cmdThrustL);

    const fx = Math.cos(s.heading) * totalThrust * 0.18;
    const fy = Math.sin(s.heading) * totalThrust * 0.18;

    // Strong drag (0.88) kills overshoot; wind added as constant bias
    s.vx = s.vx * 0.88 + fx + cfg.windX * 0.4;
    s.vy = s.vy * 0.88 + fy + cfg.windY * 0.4;
    s.x += s.vx;
    s.y += s.vy;

    s.omega   = s.omega * 0.80 + torque * 0.020;
    s.heading = wrapAngle(s.heading + s.omega);

    dpDebug.thrustL = cmdThrustL;
    dpDebug.thrustR = cmdThrustR;

    state.telemetry.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    state.telemetry.rpm   = Math.abs(totalThrust) * 1800;

  } else {
    // ── ADVANCED PHYSICS ──────────────────────────────────────────────────────
    // Time-delta thruster spooling
    const rampPerSecond = Math.max(1, cfg.thrusterRampRate) / 100;
    const maxRampStep = rampPerSecond * dt;
    spooledThrustL = moveToward(spooledThrustL, cmdThrustL, maxRampStep);
    spooledThrustR = moveToward(spooledThrustR, cmdThrustR, maxRampStep);

    dpDebug.thrustL = spooledThrustL;
    dpDebug.thrustR = spooledThrustR;

    const totalThrust = (spooledThrustL + spooledThrustR) * 0.5;
    const torque      = (spooledThrustR - spooledThrustL) * cfg.thrusterSpan * 0.5;

    const fxThrust = Math.cos(s.heading) * totalThrust * (cfg.thrustScale * 150000);
    const fyThrust = Math.sin(s.heading) * totalThrust * (cfg.thrustScale * 150000);
    const torqueThrusters = torque * 800;

    const totalFx = fxThrust + cfg.windX * 80000;
    const totalFy = fyThrust + cfg.windY * 80000;

    const ax = totalFx / cfg.mass;
    const ay = totalFy / cfg.mass;

    const yawInertia = (1 / 12) * cfg.mass * (cfg.thrusterSpan * cfg.thrusterSpan);
    const alpha = torqueThrusters / yawInertia;

    const linearDragCoeff  = (1 - cfg.linearDrag) * 15;
    const angularDragCoeff = (1 - cfg.angularDrag) * 15;

    s.vx    += (ax - s.vx * linearDragCoeff) * dt;
    s.vy    += (ay - s.vy * linearDragCoeff) * dt;
    s.omega += (alpha - s.omega * angularDragCoeff) * dt;

    s.x       += s.vx * dt * 60;
    s.y       += s.vy * dt * 60;
    s.heading  = wrapAngle(s.heading + s.omega * dt * 60);

    state.telemetry.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    state.telemetry.rpm   = Math.abs(totalThrust) * 1800;
  }
}