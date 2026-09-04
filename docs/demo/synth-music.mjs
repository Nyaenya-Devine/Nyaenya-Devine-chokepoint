// Synthesize an original cyber/techno music bed (128 BPM) for the Chokepoint demo.
// 100% generated here -> royalty-free / no copyright issues. 28s, 44.1kHz stereo.
import { writeFileSync } from "node:fs";

const SR = 44100;
const BPM = 128;
const BEAT = 60 / BPM;         // seconds per beat
const DUR = 28;                 // seconds
const N = Math.floor(SR * DUR);

const L = new Float64Array(N);
const R = new Float64Array(N);

function add(i, v, pan) {
  if (i < 0 || i >= N) return;
  const l = pan < 0 ? 1 : 1 - Math.abs(pan) * 0.5;
  const r = pan > 0 ? 1 : 1 - Math.abs(pan) * 0.5;
  L[i] += v * l;
  R[i] += v * r;
}

// ---------- drum synthesis ----------
function kick(t) { // punchy 4/4 kick
  const f = 55 + 40 * Math.exp(-t * 35);         // pitch sweep
  const env = Math.exp(-t * 18);
  return Math.sin(2 * Math.PI * f * t) * env;
}
function clap(t) { // snare/clap
  const env = Math.exp(-t * 40);
  const noise = (Math.random() * 2 - 1);
  return noise * env * 0.5;
}
function hat(t) { // hi-hat, short bright tick
  const env = Math.exp(-t * 90);
  const noise = Math.random() * 2 - 1;
  return noise * env * 0.22;
}
function bass(t, f) { // sustained synth bass
  const env = Math.exp(-t * 4);
  return (Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6 + Math.sin(2 * Math.PI * f * 2 * t) * 0.4) * env;
}
function pad(f, t) { // warm evolving pad
  const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t);
  return (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.5 * t)) * env * 0.14;
}

const totalBeats = DUR / BEAT;
const bassNotes = [55, 55, 65.4, 49];  // A1 A1 C2 G1 progression (root movement)

// ---------- place drums on the grid ----------
for (let b = 0; b < totalBeats; b++) {
  const t0 = b * BEAT;
  // kick on every beat
  for (let s = 0; s < 0.6 * SR; s++) add(Math.floor((t0 + s / SR) * SR), kick(s / SR) * 1.0, 0);
  // clap on beats 2 and 4
  if (b % 2 === 1) {
    for (let s = 0; s < 0.25 * SR; s++) add(Math.floor((t0 + s / SR) * SR), clap(s / SR) * 0.55, 0.05);
  }
  // off-beat hats (the "and" of each beat)
  for (let s = 0; s < 0.08 * SR; s++) {
    add(Math.floor((t0 + BEAT / 2 + s / SR) * SR), hat(s / SR) * 0.5, 0.2);
    add(Math.floor((t0 + BEAT / 4 + s / SR) * SR), hat(s / SR) * 0.25, -0.2);
  }
  // bass line follows the progression
  const root = bassNotes[b % bassNotes.length];
  for (let s = 0; s < BEAT * 0.9 * SR; s++) add(Math.floor((t0 + s / SR) * SR), bass(s / SR, root) * 0.35, 0.06);
}

// ---------- pad bed throughout ----------
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const p = pad(110, t) * 0.5 + pad(164.8, t) * 0.3 + pad(220, t) * 0.25;
  add(i, p * 0.5, -0.15);
  add(i, p * 0.5, 0.15);
}

// ---------- normalize to gentle level ----------
function wav(a) {
  const n = a.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(a[i]));
  const g = peak > 0 ? 0.75 / peak : 1;
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-1, Math.min(1, a[i] * g)) * 32767, 44 + i * 2);
  return b;
}
writeFileSync("/home/user/music.wav", wav(L));
console.log("music.wav written:", (DUR).toFixed(1) + "s at " + SR + "Hz");
