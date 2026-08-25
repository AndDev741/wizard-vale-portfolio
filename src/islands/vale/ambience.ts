/**
 * The sound of the vale, synthesised rather than downloaded. No files, no
 * licences, no bytes on the wire, and it can answer to where you are: wind and
 * night insects out in the open, a fire and a room tone indoors.
 *
 * Everything hangs off one AudioContext that is only created on a real click,
 * because browsers refuse to start audio any other way and asking politely is
 * the correct behaviour anyway.
 */

export type Scene = "vale" | "interior" | "hearth";

const STORE_KEY = "vale:sound";

/** Filtered noise, which is what wind and fire and rain all start as. */
function noiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Brown-ish noise: a running sum leans the spectrum low, which reads as
  // weather rather than as static.
  let last = 0;
  for (let i = 0; i < frames; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  return buffer;
}

interface Layer {
  gain: GainNode;
  stop: () => void;
}

/** A steady bed of moving air. */
function windLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 6);
  src.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "lowpass";
  band.frequency.value = 420;
  band.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  // Gusts: a slow wobble on the cutoff and the level, on two periods that do
  // not divide into each other so it never sounds like a loop.
  const lfoA = ctx.createOscillator();
  lfoA.frequency.value = 0.06;
  const lfoAGain = ctx.createGain();
  lfoAGain.gain.value = 160;
  lfoA.connect(lfoAGain).connect(band.frequency);

  const lfoB = ctx.createOscillator();
  lfoB.frequency.value = 0.023;
  const lfoBGain = ctx.createGain();
  lfoBGain.gain.value = 0.35;
  lfoB.connect(lfoBGain).connect(gain.gain);

  src.connect(band).connect(gain).connect(dest);
  src.start();
  lfoA.start();
  lfoB.start();

  return {
    gain,
    stop: () => {
      src.stop();
      lfoA.stop();
      lfoB.stop();
    },
  };
}

/** Crickets, roughly. Short bursts of a high band, at an uneven pulse. */
function insectLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  let stopped = false;
  const chirp = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 2300 + Math.random() * 900;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.5, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    const tone = ctx.createBiquadFilter();
    tone.type = "bandpass";
    tone.frequency.value = 2800;
    tone.Q.value = 6;

    osc.connect(tone).connect(env).connect(gain);
    osc.start(now);
    osc.stop(now + 0.12);

    // Two or three chirps in a cluster, then a pause of a second or two.
    window.setTimeout(chirp, Math.random() < 0.55 ? 130 + Math.random() * 90 : 900 + Math.random() * 1800);
  };
  window.setTimeout(chirp, 400);

  return {
    gain,
    stop: () => {
      stopped = true;
    },
  };
}

/** A hearth: low rumble plus the occasional pop of a log. */
function fireLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(dest);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5);
  src.loop = true;
  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 900;
  const bodyGain = ctx.createGain();
  bodyGain.gain.value = 0.55;
  src.connect(body).connect(bodyGain).connect(gain);
  src.start();

  let stopped = false;
  const crackle = () => {
    if (stopped) return;
    const now = ctx.currentTime;
    const pop = ctx.createBufferSource();
    pop.buffer = noiseBuffer(ctx, 0.1);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1200 + Math.random() * 1800;
    band.Q.value = 3;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.3, now + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    pop.connect(band).connect(env).connect(gain);
    pop.start(now);
    pop.stop(now + 0.1);
    window.setTimeout(crackle, 120 + Math.random() * 700);
  };
  window.setTimeout(crackle, 200);

  return {
    gain,
    stop: () => {
      stopped = true;
      src.stop();
    },
  };
}

/** Indoors: the dull pressure of being inside a stone room. */
function roomLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 5);
  src.loop = true;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 180;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(low).connect(gain).connect(dest);
  src.start();
  return { gain, stop: () => src.stop() };
}

/** How loud each layer is in each place. */
const MIX: Record<Scene, { wind: number; insects: number; fire: number; room: number }> = {
  vale: { wind: 0.5, insects: 0.16, fire: 0, room: 0 },
  interior: { wind: 0.07, insects: 0, fire: 0.1, room: 0.5 },
  hearth: { wind: 0.05, insects: 0, fire: 0.42, room: 0.38 },
};

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: Record<string, Layer> = {};
  private scene: Scene = "vale";
  /** Night raises the insects and lowers the wind. */
  private night = 1;

  /** Whether the visitor has asked for sound. Remembered between visits. */
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
  start(scene: Scene, night: number) {
    this.scene = scene;
    this.night = night;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
      this.layers.wind = windLayer(this.ctx, this.master);
      this.layers.insects = insectLayer(this.ctx, this.master);
      this.layers.fire = fireLayer(this.ctx, this.master);
      this.layers.room = roomLayer(this.ctx, this.master);
    }
    void this.ctx.resume();
    this.ramp(this.master!.gain, 0.5, 1.6);
    this.applyMix();
    this.remember(true);
  }

  stop() {
    this.remember(false);
    if (!this.ctx || !this.master) return;
    this.ramp(this.master.gain, 0, 0.5);
  }

  /** Walking indoors, or up to a fire, changes the mix rather than the track. */
  setScene(scene: Scene, night: number) {
    this.scene = scene;
    this.night = night;
    if (this.ctx) this.applyMix();
  }

  private applyMix() {
    const mix = MIX[this.scene];
    // Outdoors the wind eases off after dark and the insects come out.
    const nightLift = this.scene === "vale" ? this.night : 0;
    this.ramp(this.layers.wind?.gain.gain, mix.wind * (1 - nightLift * 0.35), 2.5);
    this.ramp(this.layers.insects?.gain.gain, mix.insects * (0.25 + nightLift), 2.5);
    this.ramp(this.layers.fire?.gain.gain, mix.fire, 2);
    this.ramp(this.layers.room?.gain.gain, mix.room, 2);
  }

  private ramp(param: AudioParam | undefined, to: number, seconds: number) {
    if (!param || !this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(to, now + seconds);
  }

  dispose() {
    Object.values(this.layers).forEach((l) => {
      try {
        l.stop();
      } catch {
        // Already stopped when the page went away.
      }
    });
    this.layers = {};
    void this.ctx?.close();
    this.ctx = null;
  }
}
