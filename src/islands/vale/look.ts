/**
 * What colour you are to everybody else.
 *
 * The model is one mesh with one baked texture, so there is no separate robe to
 * paint: the tint multiplies the whole character, which at the distance you see
 * another visitor reads as the colour of their clothes. Kept in this browser so
 * you are the same wizard when you come back.
 */

import { Color } from "three";
import type { Look } from "./presence";

const KEY = "vale:look";

/**
 * Hues far enough apart to tell two strangers apart at a glance. Twelve slots
 * around the wheel rather than a free 0-359, because two random hues eleven
 * degrees apart are the same colour to a person.
 */
const SLOTS = 12;

export function readLook(): Look {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Look>;
      const hue = Number(parsed.hue);
      if (Number.isFinite(hue) && hue >= 0 && hue < 360) {
        return { hue: Math.round(hue), dark: parsed.dark === true };
      }
    }
  } catch {
    // A private window, or something older. Roll a new one.
  }
  const look: Look = {
    hue: Math.floor(Math.random() * SLOTS) * (360 / SLOTS),
    dark: Math.random() < 0.5,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // Then it is a new wizard every visit, which is a small loss.
  }
  return look;
}

/**
 * The tint. It multiplies a texture that has already had its own hue removed,
 * so this is the colour that actually shows: full saturation, and two
 * lightnesses so twelve hues make twenty-four recognisable wizards.
 */
export function lookColor(look: Look): Color {
  const c = new Color();
  c.setHSL(look.hue / 360, 0.72, look.dark ? 0.42 : 0.66);
  return c;
}

/** The same colour, flat and full, for a label or the ring under their feet. */
export function lookAccent(look: Look): string {
  const c = new Color();
  c.setHSL(look.hue / 360, 0.7, look.dark ? 0.44 : 0.58);
  return `#${c.getHexString()}`;
}

const COMPANY_KEY = "vale:company";

/**
 * Whether to show other visitors. On unless this browser has said otherwise:
 * an empty vale is a worse first impression than a shared one.
 */
export function readCompany(): boolean {
  try {
    return window.localStorage.getItem(COMPANY_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeCompany(on: boolean) {
  try {
    window.localStorage.setItem(COMPANY_KEY, on ? "on" : "off");
  } catch {
    // Then it lasts as long as the tab.
  }
}
