import { buildLottieKeyframes } from './effects.js'

// ── WebM export via MediaRecorder ──────────────────────────────────────────
export function exportWebM(canvas, durationMs = 3000, fps = 30) {
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(fps)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    const chunks = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'type-distortion.webm'
      a.click()
      URL.revokeObjectURL(url)
      resolve()
    }
    recorder.onerror = reject
    recorder.start()
    setTimeout(() => recorder.stop(), durationMs)
  })
}

// ── Lottie JSON export ─────────────────────────────────────────────────────
export function exportLottie(phrase, effectKey, params, layout, duration = 3, fps = 30) {
  const chars = [...phrase]
  const n = chars.length
  const kfData = buildLottieKeyframes(phrase, effectKey, params, duration, fps)
  const totalFrames = Math.round(duration * fps)

  const layers = chars.map((char, i) => {
    const kfs = kfData[i]
    const cx = layout.charPositions?.[i]?.x ?? 0
    const cy = layout.charPositions?.[i]?.y ?? 0

    const posKF  = kfs.map(k => ({ t: k.t, s: [cx + k.x, cy + k.y, 0], e: undefined }))
    const rotKF  = kfs.map(k => ({ t: k.t, s: [k.r],                   e: undefined }))
    const alphaKF= kfs.map(k => ({ t: k.t, s: [k.a * 100],             e: undefined }))

    // Remove trailing e (last keyframe has no easing)
    posKF.forEach((k, idx) => { if (idx < posKF.length - 1) k.e = posKF[idx + 1].s })
    rotKF.forEach((k, idx) => { if (idx < rotKF.length - 1) k.e = rotKF[idx + 1].s })
    alphaKF.forEach((k, idx) => { if (idx < alphaKF.length - 1) k.e = alphaKF[idx + 1].s })

    return {
      ddd: 0,
      ind: i,
      ty: 5,
      nm: char === ' ' ? 'space' : char,
      sr: 1,
      ks: {
        o: { a: 1, k: alphaKF },
        r: { a: 1, k: rotKF   },
        p: { a: 1, k: posKF   },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      t: {
        d: { k: [{ s: { t: char, f: layout.fontName ?? 'Arial', s: layout.fontSize ?? 120, fc: [1,1,1] } }] },
        p: {},
        m: { g: 1, a: { a: 0, k: [0, 0] } },
        a: [],
      },
      ip: 0,
      op: totalFrames,
    }
  })

  const lottie = {
    v: '5.7.14',
    fr: fps,
    ip: 0,
    op: totalFrames,
    w: layout.w ?? 1920,
    h: layout.h ?? 1080,
    nm: 'Type Distortion',
    ddd: 0,
    assets: [],
    layers,
  }

  const json = JSON.stringify(lottie, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'type-distortion.json'
  a.click()
  URL.revokeObjectURL(url)
}
