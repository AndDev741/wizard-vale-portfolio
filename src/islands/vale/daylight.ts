/**
 * What time it is in the vale. It is whatever time it is where you are: visit
 * at midnight and the village is asleep under stars, visit after lunch and the
 * sun is high. Nothing animates, because a sky that cycles while you read is a
 * distraction rather than a detail.
 *
 * Five keyframes around the clock, blended between. Every value the scene's
 * lighting needs comes from here, so the sky, the sun, the fog, the lanterns
 * and the stars can never disagree about the hour.
 */

export interface Daylight {
  /** Direction the sun (or moon) comes from. */
  sun: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  /** The cool fill on the opposite side. */
  fillColor: string;
  fillIntensity: number;
  skyTop: string;
  skyGround: string;
  hemiIntensity: number;
  /** Background and fog share it, so the horizon dissolves into the sky. */
  air: string;
  fogNear: number;
  fogFar: number;
  /** Ground tint, so grass is not lit noon-green at midnight. */
  ground: string;
  /** How hard the lantern flames and firefly glow read. */
  lampBoost: number;
  /** 0 in daylight, 1 in the dark. */
  night: number;
  /** For the label on the mute/clock control. */
  key: "night" | "dawn" | "day" | "dusk";
}

type Stop = Daylight & { hour: number };

/**
 * Deep night, first light, midday, late afternoon, dusk. Written as the hours
 * they are truest at, and read by blending the two that surround the clock.
 */
const STOPS: Stop[] = [
  {
    hour: 1,
    key: "night",
    sun: [-26, 34, 18],
    sunColor: "#9db4e0",
    // Moonlight, lifted past what 3am really looks like: this is a portfolio
    // before it is a simulation, and the buildings have to stay readable.
    sunIntensity: 0.72,
    fillColor: "#54699c",
    fillIntensity: 0.45,
    skyTop: "#6a7dad",
    skyGround: "#28302a",
    hemiIntensity: 0.68,
    air: "#0d1320",
    fogNear: 52,
    fogFar: 165,
    ground: "#1d2f24",
    lampBoost: 1.35,
    night: 1,
  },
  {
    hour: 7,
    key: "dawn",
    sun: [-36, 14, 26],
    sunColor: "#ffbb8a",
    sunIntensity: 1.35,
    fillColor: "#7e9ad0",
    fillIntensity: 0.7,
    skyTop: "#9fb0d6",
    skyGround: "#3a4034",
    hemiIntensity: 0.85,
    air: "#25314a",
    fogNear: 58,
    fogFar: 180,
    ground: "#2a4331",
    lampBoost: 0.85,
    night: 0.45,
  },
  {
    hour: 13,
    key: "day",
    sun: [-18, 46, 12],
    sunColor: "#fff3dc",
    sunIntensity: 2.15,
    fillColor: "#a8c2e8",
    fillIntensity: 0.85,
    skyTop: "#a8c6ea",
    skyGround: "#4a5340",
    hemiIntensity: 1.15,
    air: "#5d7ba6",
    fogNear: 78,
    fogFar: 230,
    ground: "#38573c",
    lampBoost: 0.25,
    night: 0,
  },
  {
    hour: 18,
    key: "day",
    sun: [-30, 30, 16],
    sunColor: "#ffe0b4",
    sunIntensity: 1.9,
    fillColor: "#8fabd8",
    fillIntensity: 0.8,
    skyTop: "#9dbbe2",
    skyGround: "#454d3b",
    hemiIntensity: 1,
    air: "#4c6a96",
    fogNear: 72,
    fogFar: 215,
    ground: "#33513a",
    lampBoost: 0.4,
    night: 0.1,
  },
  {
    hour: 21,
    key: "dusk",
    sun: [-34, 28, 14],
    sunColor: "#ffd2a6",
    sunIntensity: 1.65,
    fillColor: "#6a8cc4",
    fillIntensity: 0.8,
    skyTop: "#8092c0",
    skyGround: "#33422f",
    hemiIntensity: 0.8,
    air: "#141c28",
    fogNear: 62,
    fogFar: 190,
    ground: "#2c4534",
    lampBoost: 1,
    night: 0.75,
  },
];

const hex = (value: string) => {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mixColor = (a: string, b: string, t: number) => {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[to(ar, br), to(ag, bg), to(ab, bb)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The vale's light at a given hour, 0 to 24, blended around the clock. */
export function daylightAt(hour: number): Daylight {
  const h = ((hour % 24) + 24) % 24;
  // Find the stop before and after, wrapping midnight through the last one.
  let i = STOPS.length - 1;
  for (let k = 0; k < STOPS.length; k++) {
    if (STOPS[k].hour <= h) i = k;
  }
  const from = STOPS[i];
  const to = STOPS[(i + 1) % STOPS.length];
  const span = (to.hour - from.hour + 24) % 24 || 24;
  const t = (((h - from.hour) % 24) + 24) % 24 / span;
  // Smoothstep, so the change eases in and out of each keyframe.
  const e = t * t * (3 - 2 * t);

  return {
    sun: [
      mix(from.sun[0], to.sun[0], e),
      mix(from.sun[1], to.sun[1], e),
      mix(from.sun[2], to.sun[2], e),
    ],
    sunColor: mixColor(from.sunColor, to.sunColor, e),
    sunIntensity: mix(from.sunIntensity, to.sunIntensity, e),
    fillColor: mixColor(from.fillColor, to.fillColor, e),
    fillIntensity: mix(from.fillIntensity, to.fillIntensity, e),
    skyTop: mixColor(from.skyTop, to.skyTop, e),
    skyGround: mixColor(from.skyGround, to.skyGround, e),
    hemiIntensity: mix(from.hemiIntensity, to.hemiIntensity, e),
    air: mixColor(from.air, to.air, e),
    fogNear: mix(from.fogNear, to.fogNear, e),
    fogFar: mix(from.fogFar, to.fogFar, e),
    ground: mixColor(from.ground, to.ground, e),
    lampBoost: mix(from.lampBoost, to.lampBoost, e),
    night: mix(from.night, to.night, e),
    key: e < 0.5 ? from.key : to.key,
  };
}

/**
 * The visitor's own clock, read once when the island mounts. `?hour=` overrides
 * it, which is how any hour can be looked at without waiting for it: the vale
 * at 3am is a different place and worth being able to see on purpose.
 */
export function localDaylight(): Daylight {
  if (typeof window !== "undefined") {
    const asked = new URLSearchParams(window.location.search).get("hour");
    if (asked !== null) {
      const h = Number(asked);
      if (Number.isFinite(h)) return daylightAt(h);
    }
  }
  const now = new Date();
  return daylightAt(now.getHours() + now.getMinutes() / 60);
}
