import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

// ── MP4 export via WebCodecs VideoEncoder + mp4-muxer ──────────────────────
// No WASM, no CDN — uses the browser's built-in hardware H.264 encoder.
// tickFn(timeSeconds) must render the canvas at the given time.
// Requires Chrome/Edge 94+. Falls back to a clear error on other browsers.
export async function exportMP4(canvas, tickFn, loopDuration = 3, fps = 30, onPhase) {
  if (typeof VideoEncoder === 'undefined') {
    alert('MP4 export requires Chrome or Edge 94+. Try a Chromium-based browser.')
    return
  }

  onPhase?.('Encoding…')

  const w = canvas.width
  const h = canvas.height
  const totalFrames = Math.round(loopDuration * fps)

  const target = new ArrayBufferTarget()
  const muxer  = new Muxer({
    target,
    video: { codec: 'avc', width: w, height: h },
    fastStart: 'in-memory',
  })

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error:  e => console.error('VideoEncoder:', e),
  })

  encoder.configure({
    codec:                 'avc1.4d0034',  // H.264 Main Profile Level 5.2
    width:                 w,
    height:                h,
    bitrate:               12_000_000,
    framerate:             fps,
    hardwareAcceleration:  'prefer-hardware',
  })

  for (let f = 0; f < totalFrames; f++) {
    // t mapped so the final frame sits exactly one frame before the loop end,
    // guaranteeing the animation returns to t=0 state on the next cycle.
    const t = (f / totalFrames) * loopDuration
    tickFn(t)
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(t * 1_000_000),  // microseconds
    })
    encoder.encode(frame, { keyFrame: f % fps === 0 })
    frame.close()
    // Yield every 5 frames so the browser stays responsive
    if (f % 5 === 0) await new Promise(r => setTimeout(r, 0))
  }

  await encoder.flush()
  muxer.finalize()

  _download(new Blob([target.buffer], { type: 'video/mp4' }), 'type-distortion.mp4', 'video/mp4')
}

// ── GIF export via gifenc ──────────────────────────────────────────────────
// 15 fps, max 800 px wide, 256-colour palette per frame, repeat = 0 (loop).
export async function exportGIF(canvas, tickFn, loopDuration = 3, onPhase) {
  const FPS = 15
  const MAX_W = 800
  const scale = Math.min(1, MAX_W / canvas.width)
  const w = Math.round(canvas.width  * scale)
  const h = Math.round(canvas.height * scale)
  const totalFrames = Math.round(loopDuration * FPS)
  const delay = Math.round(100 / FPS)  // centiseconds per frame

  onPhase?.('Encoding…')

  // Offscreen 2D canvas for pixel readback + optional downscale
  const off = document.createElement('canvas')
  off.width  = w
  off.height = h
  const ctx = off.getContext('2d')

  const gif = GIFEncoder()

  for (let f = 0; f < totalFrames; f++) {
    const t = (f / totalFrames) * loopDuration
    tickFn(t)
    ctx.drawImage(canvas, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    const palette = quantize(data, 256)
    const index   = applyPalette(data, palette)
    gif.writeFrame(index, w, h, { palette, delay, repeat: 0 })
    if (f % 3 === 0) await new Promise(r => setTimeout(r, 0))
  }

  gif.finish()
  _download(new Blob([gif.bytesView()], { type: 'image/gif' }), 'type-distortion.gif', 'image/gif')
}

// ── Lottie JSON export ─────────────────────────────────────────────────────
// Translates the Three.js vertex-shader wave into per-character 2D keyframes.
// The shader does:
//   phase = uv.x * freq * 2π  −  time * speed * 2π
//   pos.z += sin(phase) * height * 1.6   ← perspective scale
//   pos.y += sin(phase) * height * 0.45  ← vertical undulation
//
// charPositions: array of {x, y} in ThreeRenderer canvas pixels (2048×1024).
// waveParams: { height (0-100), speed (0-1), frequency (0.5-2) }
// textSettings: { fontSize (CSS px), textColor (hex), fontFamily }
// duration: seconds, fps: frames per second
export function exportLottie(charPositions, waveParams, textSettings, loopDuration = 3, fps = 30) {
  // Composition dimensions match the text canvas (2048×1024 @ 2×)
  const COMP_W = 2048
  const COMP_H = 1024
  // Plane geometry: 4 × 2 world units. Camera z = 4.
  const PLANE_H_WORLD = 2.0
  const CAM_Z = 4.0

  const { height, speed, frequency } = waveParams
  const { fontSize, textColor, fontFamily } = textSettings

  // height 0-100 → uHeight world units (matches setWaveParams)
  const uHeight = (height / 100) * 2.5
  // World units → canvas pixels: plane is PLANE_H_WORLD tall, canvas is COMP_H px tall
  const worldToPx = COMP_H / PLANE_H_WORLD

  const fc = _hexToRgb(textColor)
  const totalFrames = Math.round(loopDuration * fps)
  const LINEAR = { i: { x: [1], y: [1] }, o: { x: [0], y: [0] } }

  const layers = charPositions.map(({ char, x, y }, i) => {
    const xNorm = x / COMP_W   // 0-1 across canvas width

    const posKF = [], rotKF = [], scaleKF = []

    for (let f = 0; f <= totalFrames; f++) {
      const t = (f / totalFrames) * loopDuration
      const phase = xNorm * frequency * Math.PI * 2 - t * speed * Math.PI * 2
      const sinP  = Math.sin(phase)
      const cosP  = Math.cos(phase)

      // Y displacement (canvas px) from shader Y component
      const yDisp = sinP * uHeight * 0.45 * worldToPx

      // Rotation from wave tangent (degrees)
      const slopePx = cosP * uHeight * 0.45 * worldToPx * frequency * Math.PI * 2 / COMP_W
      const rot = Math.atan(slopePx) * (180 / Math.PI)

      // Scale from perspective (Z displacement fakes 3D fisheye)
      const zDisp = sinP * uHeight * 1.6
      const perspScale = Math.max(0.05, CAM_Z / (CAM_Z - zDisp)) * 100

      posKF.push({ t: f, s: [x, y + yDisp, 0], ...LINEAR })
      rotKF.push({ t: f, s: [rot],              ...LINEAR })
      scaleKF.push({ t: f, s: [perspScale, perspScale, 100], ...LINEAR })
    }

    // Last keyframe: no easing needed
    delete posKF[posKF.length - 1].i
    delete posKF[posKF.length - 1].o
    delete rotKF[rotKF.length - 1].i
    delete rotKF[rotKF.length - 1].o
    delete scaleKF[scaleKF.length - 1].i
    delete scaleKF[scaleKF.length - 1].o

    const fName = fontFamily.split(',')[0].replace(/'/g, '').trim()

    return {
      ddd: 0, ind: i, ty: 5,
      nm: char === ' ' ? 'space' : char,
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: rotKF },
        p: { a: 1, k: posKF },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: scaleKF },
      },
      t: {
        d: { k: [{ s: { t: char, f: fName, s: fontSize * 2, fc } }] },
        p: {},
        m: { g: 1, a: { a: 0, k: [0, 0] } },
        a: [],
      },
      ip: 0, op: totalFrames,
    }
  })

  const lottie = {
    v: '5.7.14', fr: fps, ip: 0, op: totalFrames,
    w: COMP_W, h: COMP_H,
    nm: 'Type Distortion', ddd: 0, assets: [], layers,
  }

  _download(JSON.stringify(lottie), 'type-distortion.json', 'application/json')
}

function _hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

function _download(text, filename, mime) {
  const blob = new Blob([text], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
