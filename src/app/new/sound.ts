// Tiny synthesized UI sounds — no audio files. Each interaction gets its own
// voice, all very quiet:
//   tick    — cursor latching between targets while scanning
//   tap     — page buttons and close buttons: a low thunk
//   triplet — opening a list item: bum bum BUM, warm and clean
//
// Browsers keep an AudioContext suspended until a real user gesture, so
// unlockAudio() is called from pointerdown; hover ticks become audible after
// the first interaction.

let context: AudioContext | null = null;
let lastTickAt = 0;

function ensureContext() {
  if (typeof window === "undefined") return null;
  if (!context && "AudioContext" in window) {
    context = new AudioContext();
  }
  return context;
}

export function unlockAudio() {
  const ctx = ensureContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function blip(
  frequency: number,
  peak: number,
  duration: number,
  at = 0,
  type: OscillatorType = "triangle",
) {
  const ctx = ensureContext();
  if (!ctx || ctx.state !== "running") return;

  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}

// Hover/scan tick — throttled so sweeping down a list stays crisp, not noisy.
export function tick() {
  const now = performance.now();
  if (now - lastTickAt < 40) return;
  lastTickAt = now;
  blip(2100, 0.045, 0.03);
}

// Page buttons and close buttons: just the low thunk.
export function tap() {
  blip(190, 0.12, 0.07, 0, "sine");
}

// Opening a list item: bum bum BUM — two soft round notes, then the accent,
// rising like a little arpeggio.
export function triplet() {
  blip(330, 0.05, 0.075, 0, "sine");
  blip(370, 0.05, 0.075, 0.09, "sine");
  blip(494, 0.095, 0.14, 0.18, "sine");
}

// The hover blob sliding onto a new row: the page-switch thunk's lower,
// longer cousin — a smooth, watery blooorp.
let lastBlorpAt = 0;

export function blorp() {
  const ctx = ensureContext();
  if (!ctx || ctx.state !== "running") return;
  const now = performance.now();
  if (now - lastBlorpAt < 110) return;
  lastBlorpAt = now;

  const start = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(150, start);
  oscillator.frequency.exponentialRampToValueAtTime(225, start + 0.07);
  oscillator.frequency.exponentialRampToValueAtTime(100, start + 0.28);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.32);
}
