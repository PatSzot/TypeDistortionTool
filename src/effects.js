// compute(i, charCount, time, params, xNorm)
//   i        — char index within current line
//   n        — chars in current line
//   t        — elapsed seconds
//   p        — effect params object
//   xNorm    — char's CSS x-center / canvas CSS width (0–1), used for spatial effects
// Returns { x, y, rotation, scaleX, scaleY, alpha }

export const EFFECTS = {
  // ── Wave ──────────────────────────────────────────────────────────────────
  // Fisheye / flag wave: a sinusoidal displacement field travels across the x axis.
  // Characters at the wave crest inflate (fisheye magnify); trough characters compress.
  // The wave is driven by the character's actual x position on the canvas (xNorm),
  // so all columns of text ripple together regardless of which line they're on.
  wave: {
    label: 'Wave',
    params: {
      height:    { label: 'Height',    min: 0,   max: 150,  step: 1,   default: 50  },
      speed:     { label: 'Speed',     min: 0.1, max: 3,    step: 0.05, default: 0.6 },
      frequency: { label: 'Frequency', min: 0.5, max: 8,    step: 0.5, default: 2   },
    },
    compute(i, n, t, p, xNorm = 0.5) {
      const phase = xNorm * p.frequency * Math.PI * 2 - t * p.speed * Math.PI * 2
      const y = Math.sin(phase) * p.height
      return { x: 0, y, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1 }
    },
  },

  // ── Float ─────────────────────────────────────────────────────────────────
  float: {
    label: 'Float',
    params: {
      amplitude: { label: 'Amplitude', min: 0, max: 80,  step: 1,   default: 30 },
      speed:     { label: 'Speed',     min: 0.1, max: 4,  step: 0.1, default: 1  },
      spread:    { label: 'Spread',    min: 0, max: 2,    step: 0.05, default: 0.6 },
    },
    compute(i, n, t, p) {
      const phase = (i / Math.max(n - 1, 1)) * Math.PI * 2 * p.spread
      const y = -Math.sin(t * p.speed * Math.PI * 2 + phase) * p.amplitude
      return { x: 0, y, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1 }
    },
  },

  // ── Ripple ────────────────────────────────────────────────────────────────
  ripple: {
    label: 'Ripple',
    params: {
      amplitude: { label: 'Amplitude', min: 0, max: 100, step: 1,    default: 50  },
      speed:     { label: 'Speed',     min: 0.1, max: 4,  step: 0.1,  default: 1   },
      decay:     { label: 'Decay',     min: 0, max: 1,    step: 0.05, default: 0.4 },
    },
    compute(i, n, t, p) {
      const dist     = Math.abs(i - (n - 1) / 2) / Math.max(n - 1, 1)
      const phase    = dist * Math.PI * 6
      const envelope = Math.exp(-dist * p.decay * 8)
      const y     = Math.sin(t * p.speed * Math.PI * 2 - phase) * p.amplitude * envelope
      const scale = 1 + Math.cos(t * p.speed * Math.PI * 2 - phase) * 0.08 * envelope
      return { x: 0, y, rotation: 0, scaleX: scale, scaleY: scale, alpha: 1 }
    },
  },

  // ── Scatter ───────────────────────────────────────────────────────────────
  scatter: {
    label: 'Scatter',
    params: {
      amount:   { label: 'Amount',   min: 0, max: 120, step: 1,   default: 40 },
      speed:    { label: 'Speed',    min: 0.1, max: 4,  step: 0.1, default: 0.8 },
      rotation: { label: 'Rotation', min: 0, max: 90,  step: 1,   default: 25 },
    },
    compute(i, n, t, p) {
      const s1 = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1
      const s2 = (Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1
      const p1 = s1 * Math.PI * 2
      const p2 = s2 * Math.PI * 2
      const x   = Math.sin(t * p.speed * Math.PI * 2 + p1) * p.amount * (s1 - 0.5) * 2
      const y   = Math.cos(t * p.speed * Math.PI * 2 + p2) * p.amount * (s2 - 0.5) * 2
      const rot = Math.sin(t * p.speed * Math.PI * 2 + p1) * p.rotation * (s1 - 0.5) * 2
      return { x, y, rotation: rot, scaleX: 1, scaleY: 1, alpha: 1 }
    },
  },

  // ── Glitch ────────────────────────────────────────────────────────────────
  glitch: {
    label: 'Glitch',
    params: {
      intensity: { label: 'Intensity', min: 0, max: 60,  step: 1,    default: 20   },
      speed:     { label: 'Speed',     min: 0.5, max: 10, step: 0.5,  default: 4    },
      dropout:   { label: 'Dropout',   min: 0, max: 0.8,  step: 0.05, default: 0.15 },
    },
    compute(i, n, t, p) {
      const frame = Math.floor(t * p.speed * 10)
      const s1 = (Math.sin(i * 43.7 + frame * 127.3) * 43758.5453) % 1
      const s2 = (Math.sin(i * 91.3 + frame * 83.7)  * 43758.5453) % 1
      const burst = Math.sin(frame * 0.7) > 0.6 ? 1 : 0
      const x     = burst * (s1 - 0.5) * 2 * p.intensity
      const y     = burst * (s2 - 0.5) * 2 * p.intensity * 0.5
      const alpha = s1 < p.dropout && burst ? 0 : 1
      return { x, y, rotation: burst * (s1 - 0.5) * 15, scaleX: 1, scaleY: 1, alpha }
    },
  },
}

// ── Lottie keyframe builder ───────────────────────────────────────────────────
export function buildLottieKeyframes(phrase, effectKey, params, duration = 3, fps = 30) {
  const effect = EFFECTS[effectKey]
  if (!effect) return []
  const chars = [...phrase]
  const n = chars.length
  const totalFrames = Math.round(duration * fps)
  return chars.map((_, i) => {
    const kfs = []
    for (let f = 0; f <= totalFrames; f++) {
      const t = f / fps
      const xNorm = i / Math.max(n - 1, 1)
      const { x, y, rotation, scaleX, scaleY, alpha } = effect.compute(i, n, t, params, xNorm)
      kfs.push({ t: f, x, y, r: rotation, sx: scaleX, sy: scaleY, a: alpha })
    }
    return kfs
  })
}
