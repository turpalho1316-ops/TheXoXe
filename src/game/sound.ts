type WebAudioCtx = AudioContext;

export class SoundEngine {
  private ctx: WebAudioCtx | null = null;
  private master: GainNode | null = null;

  private ensure() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    this.ensure();
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
  }

  playShot(volume = 1.0) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const buf = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * 0.1),
      ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / data.length) * 6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0.55 * volume;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + 0.12);

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.28 * volume, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playCrate() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.36);

    const buf = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * 0.22),
      ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / data.length) * 5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.value = 0.45;
    src.connect(filter).connect(ng).connect(this.master);
    src.start(t);
    src.stop(t + 0.24);
  }

  playPickup() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const tone = (freq: number, when: number, dur: number, vol = 0.4) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0, t + when);
      g.gain.linearRampToValueAtTime(vol, t + when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + when + dur);
      osc.connect(g).connect(this.master!);
      osc.start(t + when);
      osc.stop(t + when + dur + 0.02);
    };
    tone(660, 0, 0.12);
    tone(880, 0.07, 0.14);
    tone(1320, 0.14, 0.18);
  }

  playUlt() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.6);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, t);
    osc2.frequency.exponentialRampToValueAtTime(440, t + 0.4);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(g2).connect(this.master);
    osc2.start(t);
    osc2.stop(t + 0.5);
  }

  dispose() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
  }
}
