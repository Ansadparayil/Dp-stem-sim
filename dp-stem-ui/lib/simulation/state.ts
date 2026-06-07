export type ShipState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;   // radians
  omega: number;     // angular velocity rad/s
};

export type SimMode = "manual" | "dp";

export type SimSettings = {
  windX: number;
  windY: number;
  linearDrag: number;   // 0–1, multiplied each tick (e.g. 0.98)
  angularDrag: number;  // 0–1
  thrustScale: number;  // multiplier on thruster force
  thrusterSpan: number; // meters between L/R thrusters (affects torque)
};

export type DPSetpoint = {
  x: number;
  y: number;
  heading: number; // radians
};

export const state = {
  ship: {
    x: 400,
    y: 400,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2, // pointing up
    omega: 0,
  } as ShipState,

  mode: "manual" as SimMode,

  control: {
    left: 0,   // -100 to 100
    right: 0,  // -100 to 100
  },

  dp: {
    x: 400,
    y: 400,
    heading: -Math.PI / 2,
  } as DPSetpoint,

  settings: {
    windX: 0.008,
    windY: 0.004,
    linearDrag: 0.97,
    angularDrag: 0.85,
    thrustScale: 0.12,
    thrusterSpan: 20,
  } as SimSettings,

  // runtime telemetry (read-only from UI)
  telemetry: {
    speed: 0,
    rpm: 0,
    dpError: 0,
  },
};