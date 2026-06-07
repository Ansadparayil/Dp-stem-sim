# Boat and Waypoint Tuning Guide

This guide lists all places you can tune motion so the vessel feels more ship-like and reliably reaches DP waypoints.

## 1) Runtime Knobs in Settings UI

Tune these first in the app UI:
- File: app/settings/page.tsx
- Source of truth: state.settings values in lib/simulation/state.ts

Available sliders:
- windX, windY: environmental drift forcing.
- linearDrag: translational damping.
- angularDrag: rotational damping.
- mass: inertia scaling for acceleration and yaw inertia.
- thrusterRampRate: how fast thrust can change.
- thrustScale: overall propulsion authority.
- thrusterSpan: turning leverage from left/right thrust split.

Presets:
- RIB, Patrol Boat, PSV, Drillship in app/settings/page.tsx.
- These set a bundled behavior profile (mass + thrust + drag + ramp + span).

## 2) Core DP and Waypoint Capture Logic

Primary control logic lives in:
- lib/simulation/physics.ts

### DP phase thresholds
- HOLD_RADIUS: when controller switches from approach to hold.
- ARRIVE_RADIUS: distance threshold for final waypoint capture.
- ARRIVE_SPEED: speed threshold for final waypoint capture.
- YAW_DEADBAND: ignores tiny heading errors to prevent chatter.

If vessel gets stuck near target:
- Reduce HOLD_RADIUS or increase ARRIVE_RADIUS slightly.
- Increase ARRIVE_SPEED slightly if vessel micro-oscillates and never satisfies arrival speed.

### Approach behavior (turn then move)
Key gains/terms in approach block:
- Kp_yaw, Kd_yaw: heading-turn response and damping.
- alignFactor = cos(yawErr): forward thrust gating by heading alignment.
- desiredSurge scale (dist / 140): approach speed schedule by distance.
- surgeCmd gain (1.15): how aggressively surge follows desired value.
- Differential mix factor (0.48): yaw contribution to left/right split.

Symptoms:
- Too much circling/spin: lower Kp_yaw or mix factor, increase Kd_yaw.
- Too slow to close distance: increase desiredSurge scale or surgeCmd gain.

### Hold behavior (station keeping near target)
Key gains/terms in hold block:
- Ki_hold, MAX_INT: integral wind/current rejection.
- Kp_hold, Kd_hold: surge position + surge damping.
- swayYawNudge term: how sideways error becomes yaw correction.
- yawHold gains (2.3 and 1.5): heading hold stiffness vs damping.
- minCloseBias: guaranteed forward nudge until arrival.
- desiredHoldHeading blend: transitions from bearing-to-target to station heading.

Symptoms:
- Stops beside target and does not finish: increase minCloseBias slightly.
- Wobbles around point: lower Kp_hold, raise Kd_hold, reduce Ki_hold.
- Nose hunts too much: lower yawHold proportional gain or increase yaw damping.

### Final capture behavior
In the arrival condition, vessel is snapped to waypoint and velocity is zeroed when:
- dist <= ARRIVE_RADIUS
- speed <= ARRIVE_SPEED

This guarantees waypoint completion once vessel is very close and nearly stopped.

## 3) Thruster and Vessel Dynamics (Boat Feel)

Still in lib/simulation/physics.ts:

### Thruster spool
- rampPerSecond and moveToward control spool lag.
- spooledThrustL/R are the actual physical thrust outputs.

Symptoms:
- Feels too twitchy: lower thrusterRampRate.
- Feels unresponsive: raise thrusterRampRate.

### Linear dynamics
- fx/fy from heading and total thrust.
- simMass normalization influences acceleration magnitude.
- linearDrag controls velocity decay.

Symptoms:
- Too arcade-like: increase mass and linearDrag.
- Too sluggish: lower mass or increase thrustScale.

### Yaw dynamics
- torque from differential thrust and thrusterSpan.
- yawInertia uses mass and span to reduce unrealistic spin.
- angularDrag damps turning.

Symptoms:
- Spins too easily: increase angularDrag, increase mass, reduce thrusterSpan, or reduce torque scale.
- Cannot turn enough: decrease angularDrag or increase thrusterSpan.

## 4) Setpoint and Mode Behavior

Setpoint interaction is in:
- app/simulation/page.tsx

Important places:
- Canvas click sets state.dp.x and state.dp.y.
- Canvas click stores hold heading as current ship heading.
- resetDpState() is called when setting new target or enabling DP.
- toggleMode initializes DP target at current position on DP enable.

If DP acts unstable right after mode switch or new waypoint:
- Ensure resetDpState() remains called in both transitions.
- Keep target heading assignment behavior consistent with your intended vessel behavior.

## 5) Telemetry and Debug to Validate Tuning

Where to inspect in app/simulation/page.tsx:
- state.telemetry.speed
- state.telemetry.dpError
- dpDebug.phase
- dpDebug.thrustL, dpDebug.thrustR, dpDebug.yawCmd

Use these checks:
- dpError should trend downward over time in DP mode.
- Phase should move TURN -> APPROACH -> HOLD.
- thrust values should ramp, not jump, when thrusterRampRate is low.

## 6) Practical Tuning Workflow

1. Pick a preset in Settings.
2. Tune mass + thrusterRampRate first for overall vessel feel.
3. Tune thrustScale + linearDrag for approach speed envelope.
4. Tune Kp_yaw/Kd_yaw for smooth turn-in without spin.
5. Tune hold gains (Kp_hold/Kd_hold/Ki_hold) for station keeping.
6. Tune HOLD_RADIUS/ARRIVE_RADIUS/ARRIVE_SPEED for reliable waypoint completion.

Recommended first ranges:
- HOLD_RADIUS: 10-18
- ARRIVE_RADIUS: 3-6
- ARRIVE_SPEED: 0.06-0.14
- thrusterRampRate: 12-90
- mass: 2,500-50,000

---

If you want, the next improvement is adding DP gains into state.settings and exposing them as an advanced panel in app/settings/page.tsx so all tuning can be done without code edits.
