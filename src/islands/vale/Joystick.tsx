import { useRef, type MutableRefObject } from "react";
import type { InputVec } from "./useInput";

const RADIUS = 44;

export function Joystick({ inputRef }: { inputRef: MutableRefObject<InputVec> }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  const setKnob = (dx: number, dy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob(dx, dy);
    inputRef.current.x = dx / RADIUS;
    inputRef.current.z = dy / RADIUS;
  };

  const release = () => {
    pointerId.current = null;
    setKnob(0, 0);
    inputRef.current.x = 0;
    inputRef.current.z = 0;
  };

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto absolute bottom-8 left-6 z-[6] flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/25 bg-black/30 backdrop-blur-sm"
      onPointerDown={(e) => {
        pointerId.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        ref={knobRef}
        className="h-12 w-12 rounded-full bg-[#d99a3d]/90 shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
      />
    </div>
  );
}
