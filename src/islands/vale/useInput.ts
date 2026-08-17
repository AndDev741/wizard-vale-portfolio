import { useEffect, type MutableRefObject } from "react";

export interface InputVec {
  x: number;
  z: number;
}

const KEYS: Record<string, [keyof InputVec, number]> = {
  w: ["z", -1],
  arrowup: ["z", -1],
  s: ["z", 1],
  arrowdown: ["z", 1],
  a: ["x", -1],
  arrowleft: ["x", -1],
  d: ["x", 1],
  arrowright: ["x", 1],
};

export function useKeyboardInput(
  ref: MutableRefObject<InputVec>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) {
      ref.current.x = 0;
      ref.current.z = 0;
      return;
    }
    const pressed = new Set<string>();
    const apply = () => {
      let x = 0;
      let z = 0;
      for (const key of pressed) {
        const mapping = KEYS[key];
        if (!mapping) continue;
        if (mapping[0] === "x") x += mapping[1];
        else z += mapping[1];
      }
      const len = Math.hypot(x, z);
      ref.current.x = len > 1 ? x / len : x;
      ref.current.z = len > 1 ? z / len : z;
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEYS[key]) {
        pressed.add(key);
        apply();
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (KEYS[key]) {
        pressed.delete(key);
        apply();
      }
    };
    const blur = () => {
      pressed.clear();
      apply();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      ref.current.x = 0;
      ref.current.z = 0;
    };
  }, [ref, active]);
}
