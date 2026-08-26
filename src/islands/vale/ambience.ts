import type { SectionKey } from "../../i18n/ui";

/**
 * The sound of the vale, synthesised rather than downloaded: no files, no
 * licences, not one byte on the wire. Every room gets its own character, and
 * the things you do make their own noise.
 *
 * Nothing starts without a click. Browsers refuse audio any other way, and a
 * portfolio that makes noise unasked earns the back button.
 */

export type Room = "vale" | SectionKey;

const STORE_KEY = "vale:sound";

/* ------------------------------------------------------------------------- */
/* Raw material                                                              */
/* ------------------------------------------------------------------------- */

/** Brown-ish noise: the running sum leans it low, so it reads as weather. */
function noiseBuffer(ctx: AudioContext, seconds: number, brown = true): AudioBuffer {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frames; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

/* ------------------------------------------------------------------------- */
/* Continuous beds                                                          */
/* ------------------------------------------------------------------------- */

interface Bed {
  gain: GainNode;
  stop: () => void;
}

/** Moving air, gusting on two periods that do not divide into each other. */
function wind(ctx: AudioContext, dest: AudioNode): Bed {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 6);
  src.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "lowpass";
  band.frequency.value = 380;
  band.Q.value = 0.6;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  const slow = ctx.createOscillator();
  slow.frequency.value = 0.055;
  const slowAmt = ctx.createGain();
  slowAmt.gain.value = 150;
  slow.connect(slowAmt).connect(band.frequency);

  const slower = ctx.createOscillator();
  slower.frequency.value = 0.021;
  const slowerAmt = ctx.createGain();
  slowerAmt.gain.value = 0.3;
  slower.connect(slowerAmt).connect(gain.gain);

  src.connect(band).connect(gain).connect(dest);
  src.start();
  slow.start();
  slower.start();
  return {
    gain,
    stop: () => {
      src.stop();
      slow.stop();
      slower.stop();
    },
  };
}

/**
 * Crickets: clusters of high chirps, then a pause. Never a steady pulse.
 *
 * `live` is asked before each chirp. Without it the timer kept minting
 * oscillators in the library, inaudible at zero gain and pure waste.
 */
function insects(ctx: AudioContext, dest: AudioNode, live: () => boolean): Bed {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let stopped = false;
  const chirp = () => {
    if (stopped) return;
    if (!live()) {
      window.setTimeout(chirp, 1500);
      return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 2200 + Math.random() * 1000;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2900;
    band.Q.value = 7;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.45, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(band).connect(env).connect(gain);
    osc.start(now);
    osc.stop(now + 0.11);
    window.setTimeout(
      chirp,
      Math.random() < 0.5 ? 120 + Math.random() * 80 : 1400 + Math.random() * 3600,
    );
  };
  window.setTimeout(chirp, 600);
  return { gain, stop: () => void (stopped = true) };
}

/** A hearth: low rumble with logs settling. */
function fire(ctx: AudioContext, dest: AudioNode, live: () => boolean): Bed {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5);
  src.loop = true;
  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 820;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.5;
  src.connect(body).connect(bodyGain).connect(gain);
  src.start();

  let stopped = false;
  const pop = () => {
    if (stopped) return;
    if (!live()) {
      window.setTimeout(pop, 900);
      return;
    }
    const now = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx, 0.08, false);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900 + Math.random() * 1900;
    band.Q.value = 3;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.3 + Math.random() * 0.25, now + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    s.connect(band).connect(env).connect(gain);
    s.start(now);
    s.stop(now + 0.08);
    window.setTimeout(pop, 130 + Math.random() * 800);
  };
  window.setTimeout(pop, 250);
  return {
    gain,
    stop: () => {
      stopped = true;
      src.stop();
    },
  };
}

/** The dull pressure of being inside. */
function roomTone(ctx: AudioContext, dest: AudioNode): Bed {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5);
  src.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 170;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(low).connect(gain).connect(dest);
  src.start();
  return { gain, stop: () => src.stop() };
}

/** The tower: a low arcane hum with a slow beat where two tones disagree. */
function arcane(ctx: AudioContext, dest: AudioNode): Bed {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);
  const oscs: OscillatorNode[] = [];
  // 55Hz and a hair above it, so they drift in and out of phase.
  for (const [freq, level] of [
    [55, 0.5],
    [55.6, 0.42],
    [110, 0.16],
    [164.8, 0.08],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start();
    oscs.push(osc);
  }
  return { gain, stop: () => oscs.forEach((o) => o.stop()) };
}

/* ------------------------------------------------------------------------- */
/* Voices: things that play notes                                            */
/* ------------------------------------------------------------------------- */

/** A plucked string, near enough a lute for a tavern. */
function pluck(ctx: AudioContext, dest: AudioNode, freq: number, at: number, level: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = freq;
  const partial = ctx.createOscillator();
  partial.type = "sine";
  partial.frequency.value = freq * 2.01;
  const partialGain = ctx.createGain();
  partialGain.gain.value = 0.25;

  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.setValueAtTime(2600, at);
  body.frequency.exponentialRampToValueAtTime(700, at + 0.5);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0008, at + 1.5);

  osc.connect(body);
  partial.connect(partialGain).connect(body);
  body.connect(env).connect(dest);
  osc.start(at);
  partial.start(at);
  osc.stop(at + 1.6);
  partial.stop(at + 1.6);
}

/** A soft key, for the cottage. Rounder and slower than the lute. */
function key(ctx: AudioContext, dest: AudioNode, freq: number, at: number, level: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const third = ctx.createOscillator();
  third.type = "sine";
  third.frequency.value = freq * 3.01;
  const thirdGain = ctx.createGain();
  thirdGain.gain.value = 0.06;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + 0.03);
  env.gain.exponentialRampToValueAtTime(0.0006, at + 3.2);

  osc.connect(env);
  third.connect(thirdGain).connect(env);
  env.connect(dest);
  osc.start(at);
  third.start(at);
  osc.stop(at + 3.4);
  third.stop(at + 3.4);
}

/** A single struck bell, for the tower's shimmer. */
function bell(ctx: AudioContext, dest: AudioNode, freq: number, at: number, level: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0005, at + 4);
  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + 4.2);
}

const NOTE: Record<string, number> = {
  D2: 73.42, A2: 110, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196,
  A3: 220, Bb3: 233.08, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33,
  F5: 698.46, A5: 880,
};

/**
 * A tune in D dorian, which is the mode that sounds medieval to modern ears
 * without trying. Four phrases over a held fifth, played on the pluck.
 */
const TAVERN_PHRASES: Array<Array<[string, number]>> = [
  [["D4", 1], ["F4", 1], ["A4", 1], ["G4", 1], ["F4", 2]],
  [["E4", 1], ["F4", 1], ["G4", 1], ["A4", 1], ["G4", 1], ["E4", 1]],
  [["A4", 1], ["C5", 1], ["Bb4", 1], ["A4", 1], ["G4", 2]],
  [["F4", 1], ["E4", 1], ["D4", 1], ["E4", 1], ["D4", 2]],
];

/** Four gentle chords for the cottage, rolled rather than struck. */
const HEARTH_CHORDS: string[][] = [
  ["F3", "C4", "F4", "A4"],
  ["C4", "E4", "G4", "C5"],
  ["D4", "F4", "A4", "D5"],
  ["Bb3", "D4", "F4", "Bb4"],
];

/* ------------------------------------------------------------------------- */
/* What each place sounds like                                               */
/* ------------------------------------------------------------------------- */

interface RoomMix {
  wind: number;
  insects: number;
  fire: number;
  room: number;
  arcane: number;
  /** Which sequence plays here, if any. */
  music: "tavern" | "hearth" | "tower" | null;
  /** Footsteps on grass or on boards. */
  floor: "soft" | "hard";
}

const ROOMS: Record<Room, RoomMix> = {
  // Out in the open: a breeze, and insects when it is dark.
  vale: { wind: 0.42, insects: 0.2, fire: 0, room: 0, arcane: 0, music: null, floor: "soft" },
  // The pub. A lute in the corner, and the room full enough to feel it.
  experience: { wind: 0.05, insects: 0, fire: 0.1, room: 0.4, arcane: 0, music: "tavern", floor: "hard" },
  // The library keeps its silence. Footsteps and turning pages, nothing else.
  writing: { wind: 0, insects: 0, fire: 0, room: 0.16, arcane: 0, music: null, floor: "hard" },
  // The tower hums. Something in here is always working.
  projects: { wind: 0.04, insects: 0, fire: 0, room: 0.2, arcane: 0.16, music: "tower", floor: "hard" },
  // Home: the fire, and a piano somebody left playing.
  about: { wind: 0.03, insects: 0, fire: 0.34, room: 0.3, arcane: 0, music: "hearth", floor: "soft" },
  // The Raven Post has no inside; kept so the map is total.
  contact: { wind: 0.42, insects: 0.2, fire: 0, room: 0, arcane: 0, music: null, floor: "soft" },
};

/* ------------------------------------------------------------------------- */

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private beds: Record<string, Bed> = {};
  private room: Room = "vale";
  private night = 1;
  private on = false;

  /** Sequencer state: notes are scheduled a little ahead of the clock. */
  private timer: number | null = null;
  private nextNoteAt = 0;
  private step = 0;

  static wanted(): boolean {
    try {
      return window.localStorage.getItem(STORE_KEY) === "on";
    } catch {
      return false;
    }
  }

  private remember(on: boolean) {
    try {
      window.localStorage.setItem(STORE_KEY, on ? "on" : "off");
    } catch {
      // A private window refusing storage is not a reason to fail.
    }
  }

  /** Must be called from a real user gesture the first time. */
  start(room: Room, night: number) {
    this.room = room;
    this.night = night;
    this.on = true;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      this.beds.wind = wind(this.ctx, this.master);
      this.beds.insects = insects(this.ctx, this.master, () => this.wants("insects"));
      this.beds.fire = fire(this.ctx, this.master, () => this.wants("fire"));
      this.beds.room = roomTone(this.ctx, this.master);
      this.beds.arcane = arcane(this.ctx, this.master);
    }
    void this.ctx.resume();
    this.ramp(this.master!.gain, 0.55, 1.6);
    this.applyRoom();
    this.remember(true);
  }

  stop() {
    this.on = false;
    this.remember(false);
    this.stopSequencer();
    if (this.master) this.ramp(this.master.gain, 0, 0.5);
  }

  /** Walking into a building changes the place, not the track. */
  setRoom(room: Room, night: number) {
    const changed = room !== this.room;
    this.room = room;
    this.night = night;
    if (!this.ctx || !this.on) return;
    this.applyRoom();
    if (changed) this.restartSequencer();
  }

  /** Whether the current room asks for a bed at all. */
  private wants(bed: "insects" | "fire"): boolean {
    if (!this.on) return false;
    const mix = ROOMS[this.room] ?? ROOMS.vale;
    if (bed === "fire") return mix.fire > 0.02;
    const outdoors = this.room === "vale" || this.room === "contact";
    return mix.insects * (0.15 + (outdoors ? this.night : 0)) > 0.02;
  }

  private applyRoom() {
    const mix = ROOMS[this.room] ?? ROOMS.vale;
    const outdoors = this.room === "vale" || this.room === "contact";
    const dark = outdoors ? this.night : 0;
    this.ramp(this.beds.wind?.gain.gain, mix.wind * (1 - dark * 0.4), 2.5);
    this.ramp(this.beds.insects?.gain.gain, mix.insects * (0.15 + dark), 2.5);
    this.ramp(this.beds.fire?.gain.gain, mix.fire, 2);
    this.ramp(this.beds.room?.gain.gain, mix.room, 2);
    this.ramp(this.beds.arcane?.gain.gain, mix.arcane, 3);
    this.ramp(this.musicBus?.gain, mix.music ? 0.5 : 0, 2.5);
    if (mix.music) this.startSequencer();
    else this.stopSequencer();
  }

  /* --- the things you do -------------------------------------------------- */

  /** One footstep. Called by the wizard, per stride, so it matches his pace. */
  footstep() {
    if (!this.ctx || !this.on || !this.master) return;
    const mix = ROOMS[this.room] ?? ROOMS.vale;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, 0.13, false);
    const band = this.ctx.createBiquadFilter();
    if (mix.floor === "hard") {
      // Boards and stone: a short knock with some body.
      band.type = "bandpass";
      band.frequency.value = 260 + Math.random() * 90;
      band.Q.value = 1.4;
    } else {
      // Grass and dirt: duller, no ring.
      band.type = "lowpass";
      band.frequency.value = 420 + Math.random() * 130;
    }
    const env = this.ctx.createGain();
    const level = mix.floor === "hard" ? 0.16 : 0.11;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(level * (0.8 + Math.random() * 0.4), now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0005, now + 0.11);
    src.connect(band).connect(env).connect(this.master);
    src.start(now);
    src.stop(now + 0.13);
  }

  /** A door, on the way in or out. */
  door() {
    if (!this.ctx || !this.on || !this.master) return;
    const now = this.ctx.currentTime;
    // The creak: a filtered sweep that wobbles.
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, 0.9);
    const band = this.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 8;
    band.frequency.setValueAtTime(320, now);
    band.frequency.linearRampToValueAtTime(520, now + 0.34);
    band.frequency.linearRampToValueAtTime(380, now + 0.5);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.12, now + 0.05);
    env.gain.linearRampToValueAtTime(0.08, now + 0.42);
    env.gain.exponentialRampToValueAtTime(0.0005, now + 0.56);
    src.connect(band).connect(env).connect(this.master);
    src.start(now);
    src.stop(now + 0.6);

    // And the latch closing behind it.
    const thudAt = now + 0.56;
    const thud = this.ctx.createBufferSource();
    thud.buffer = noiseBuffer(this.ctx, 0.2, false);
    const low = this.ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 220;
    const thudEnv = this.ctx.createGain();
    thudEnv.gain.setValueAtTime(0, thudAt);
    thudEnv.gain.linearRampToValueAtTime(0.2, thudAt + 0.006);
    thudEnv.gain.exponentialRampToValueAtTime(0.0005, thudAt + 0.18);
    thud.connect(low).connect(thudEnv).connect(this.master);
    thud.start(thudAt);
    thud.stop(thudAt + 0.2);
  }

  /** A leaf turning. The library's only other sound. */
  page() {
    if (!this.ctx || !this.on || !this.master) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuffer(this.ctx, 0.4, false);
    const band = this.ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.1;
    // Paper is a rising hiss that dies as the sheet lands.
    band.frequency.setValueAtTime(1400, now);
    band.frequency.linearRampToValueAtTime(3200, now + 0.12);
    band.frequency.linearRampToValueAtTime(1100, now + 0.3);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.1, now + 0.03);
    env.gain.linearRampToValueAtTime(0.07, now + 0.16);
    env.gain.exponentialRampToValueAtTime(0.0004, now + 0.32);
    src.connect(band).connect(env).connect(this.master);
    src.start(now);
    src.stop(now + 0.36);
  }

  /* --- the sequencer ----------------------------------------------------- */

  private startSequencer() {
    if (this.timer !== null || !this.ctx) return;
    this.nextNoteAt = this.ctx.currentTime + 0.2;
    this.timer = window.setInterval(() => this.pump(), 120);
  }

  private stopSequencer() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restartSequencer() {
    this.stopSequencer();
    this.step = 0;
    if (ROOMS[this.room]?.music) this.startSequencer();
  }

  /** Schedules whatever falls inside the next half second. */
  private pump() {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus || !this.on) return;
    const music = ROOMS[this.room]?.music;
    if (!music) return;

    while (this.nextNoteAt < ctx.currentTime + 0.6) {
      if (music === "tavern") {
        const beat = 0.44;
        const phrase = TAVERN_PHRASES[Math.floor(this.step / 8) % TAVERN_PHRASES.length];
        const idx = this.step % 8;
        const note = phrase[idx % phrase.length];
        if (idx < phrase.length) {
          pluck(ctx, bus, NOTE[note[0]] ?? 440, this.nextNoteAt, 0.12);
          // A held fifth underneath, once a phrase.
          if (idx === 0) {
            pluck(ctx, bus, NOTE.D3, this.nextNoteAt, 0.09);
            pluck(ctx, bus, NOTE.A2, this.nextNoteAt + 0.02, 0.07);
          }
          this.nextNoteAt += beat * note[1];
        } else {
          this.nextNoteAt += beat;
        }
      } else if (music === "hearth") {
        // A chord rolled slowly, then a long rest. Nothing hurries here.
        const chord = HEARTH_CHORDS[Math.floor(this.step / 2) % HEARTH_CHORDS.length];
        if (this.step % 2 === 0) {
          chord.forEach((n, i) => {
            key(ctx, bus, NOTE[n] ?? 440, this.nextNoteAt + i * 0.16, 0.075);
          });
          this.nextNoteAt += 2.6;
        } else {
          this.nextNoteAt += 2.2;
        }
      } else {
        // The tower: a bell every so often, over the hum.
        const scale = ["D4", "F4", "A4", "C5", "D5", "F5"];
        if (this.step % 3 === 0) {
          const n = scale[Math.floor(Math.random() * scale.length)];
          bell(ctx, bus, NOTE[n] ?? 440, this.nextNoteAt, 0.05);
        }
        this.nextNoteAt += 2.4 + Math.random() * 2.2;
      }
      this.step += 1;
    }
  }

  private ramp(param: AudioParam | undefined, to: number, seconds: number) {
    if (!param || !this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + seconds);
  }

  dispose() {
    this.stopSequencer();
    Object.values(this.beds).forEach((b) => {
      try {
        b.stop();
      } catch {
        // Already stopped when the page went away.
      }
    });
    this.beds = {};
    void this.ctx?.close();
    this.ctx = null;
  }
}
