"use client";

/**
 * PayTable Web Audio Sound & Ambient Studio Engine
 * Implements tactile micro-transition cues (< 300ms contract) plus a warm
 * toggleable 92 BPM D-Dorian generative ambient score using pure Web Audio API.
 */

class PayTableSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private musicTimer: number | null = null;
  private stepIdx = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(next: boolean): void {
    this.sfxEnabled = next;
    if (next) this.playClick("light");
  }

  public setMusicEnabled(next: boolean): void {
    this.musicEnabled = next;
    if (next) {
      this.startAmbientLoop();
    } else {
      this.stopAmbientLoop();
    }
  }

  /** Tactile switch click (Amicro triangle glide contract: 1650Hz -> 820Hz over 26ms) */
  public playClick(intensity: "light" | "medium" = "light"): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";

    const startHz = intensity === "light" ? 1680 : 1320;
    const endHz = intensity === "light" ? 840 : 620;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + 0.026);

    gain.gain.setValueAtTime(intensity === "light" ? 0.045 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.036);
  }

  /** Soft rising pop when staging a @paytable intent or revealing a step */
  public playStage(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [392.0, 523.25, 659.25];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /** Warm harmonic chime when human owner signs a Linked Wallet purchase */
  public playApproveChime(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [587.33, 739.99, 880.0, 1174.66]; // D5 major add9 lift
    chord.forEach((freq, idx) => {
      const t = now + idx * 0.035;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.0006, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** Guardrail alert tone when Rust policy blocks overspend or replay */
  public playGuardrailBlock(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [260, 196].forEach((freq, idx) => {
      const t = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(680, t);

      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  private startAmbientLoop(): void {
    this.stopAmbientLoop();
    const ctx = this.ensureContext();
    if (!ctx) return;

    // 92 BPM eighth-note pulse (~326ms): D Dorian curious documentary motif
    const motifHz = [
      293.66, 440.0, 523.25, 659.25, 587.33, 440.0, 349.23, 523.25,
      329.63, 493.88, 587.33, 698.46, 659.25, 523.25, 440.0, 392.0,
    ];
    const bassHz = [146.83, 146.83, 130.81, 130.81, 174.61, 174.61, 164.81, 196.0];

    const tick = () => {
      if (!this.musicEnabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const step = this.stepIdx++;
      const note = motifHz[step % motifHz.length];

      // Plucked kalimba/marimba voice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(920, now);

      gain.gain.setValueAtTime(0.022, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.29);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);

      // Warm sub-pad every 2 steps
      if (step % 2 === 0) {
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = "triangle";
        sub.frequency.setValueAtTime(bassHz[(step / 2) % bassHz.length], now);
        subGain.gain.setValueAtTime(0.018, now);
        subGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.62);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.65);
      }
    };

    tick();
    this.musicTimer = window.setInterval(tick, 326);
  }

  private stopAmbientLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new PayTableSoundEngine();
