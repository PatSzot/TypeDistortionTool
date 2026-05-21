import { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'
import { EFFECTS } from './effects.js'
import { exportWebM, exportLottie } from './export.js'

const SERIF = "'Serrif VF', Georgia, serif"
const SANS  = "'Saans', Inter, sans-serif"

const DEFAULT_PHRASE   = 'Craft quality content that wins'
const DEFAULT_EFFECT   = 'wave'
const DEFAULT_FONT_SZ  = 96
const DEFAULT_LEADING  = 0.95   // tight stacking — lines overlap slightly
const DEFAULT_TRACKING = 0      // letter spacing in px
const DEFAULT_PARAMS   = Object.fromEntries(
  Object.entries(EFFECTS).map(([k, e]) => [
    k,
    Object.fromEntries(Object.entries(e.params).map(([p, cfg]) => [p, cfg.default]))
  ])
)

const AirOpsLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="72" viewBox="0 0 100 32" fill="none" aria-label="AirOps">
    <path d="M14.2683 8.35377V11.2588C12.9587 9.16447 10.9253 7.88086 8.40935 7.88086C3.03288 7.88086 0 11.833 0 17.1364C0 22.4735 3.06735 26.5608 8.47828 26.5608C10.9942 26.5608 12.9931 25.2772 14.2683 23.1829V26.0879H18.473V8.35377H14.2683ZM9.30543 23.0478C6.23809 23.0478 4.48039 20.2441 4.48039 17.1364C4.48039 14.0963 6.20362 11.4277 9.37436 11.4277C11.9937 11.4277 14.2339 13.2856 14.2339 17.0688C14.2339 20.7846 12.0971 23.0478 9.30543 23.0478Z" fill="currentColor"/>
    <path d="M22.0938 8.35547V26.0896H26.5741V8.35547H22.0938Z" fill="currentColor"/>
    <path d="M34.832 12.7461V8.3548H30.3516V26.0889H34.832V15.9551C34.832 13.3541 36.6586 12.307 38.3818 12.307C39.3813 12.307 40.4152 12.5772 40.9666 12.7799V8.05078C38.0372 8.05078 35.6246 9.77353 34.832 12.7461Z" fill="currentColor"/>
    <path d="M42.0625 13.7594C42.0625 19.2655 45.9225 23.1839 51.4713 23.1839C57.0546 23.1839 60.8804 19.2655 60.8804 13.7594C60.8804 8.35475 57.0546 4.50391 51.4713 4.50391C45.9225 4.50391 42.0625 8.35475 42.0625 13.7594ZM56.3998 13.7594C56.3998 17.2049 54.5042 19.6708 51.4713 19.6708C48.404 19.6708 46.5429 17.2049 46.5429 13.7594C46.5429 10.4491 48.404 8.05073 51.4713 8.05073C54.5042 8.05073 56.3998 10.4491 56.3998 13.7594Z" fill="currentColor"/>
    <path d="M73.3738 7.88086C70.7545 7.88086 68.6177 9.40093 67.4804 11.833V8.35377H63V31.9993H67.4804V22.9127C68.7556 25.1083 71.1336 26.5608 73.6496 26.5608C78.5435 26.5608 81.9555 22.8113 81.9555 17.4404C81.9555 11.7993 78.4057 7.88086 73.3738 7.88086ZM72.5811 23.2505C69.5827 23.2505 67.4804 20.7846 67.4804 17.2715C67.4804 13.6571 69.5827 11.1237 72.5811 11.1237C75.4417 11.1237 77.4751 13.7247 77.4751 17.4066C77.4751 20.8521 75.4417 23.2505 72.5811 23.2505Z" fill="currentColor"/>
    <path d="M83.3906 19.9401C83.3906 23.1491 86.2856 26.5608 92.0757 26.5608C97.9002 26.5608 100.003 23.2167 100.003 20.6157C100.003 16.6297 95.212 15.9203 92.0068 15.3123C89.8355 14.9407 88.4569 14.6367 88.4569 13.4207C88.4569 12.0357 90.0078 11.1575 91.6621 11.1575C93.9023 11.1575 94.7639 12.6775 94.8329 14.2989H99.3133C99.3133 11.6641 97.4177 7.88086 91.5587 7.88086C86.4924 7.88086 83.9765 10.6845 83.9765 13.6909C83.9765 17.9809 88.836 18.42 92.0412 19.028C93.9023 19.3658 95.5221 19.7712 95.5221 21.0886C95.5221 22.406 93.9368 23.2842 92.248 23.2842C90.6626 23.2842 87.871 22.406 87.871 19.9401H83.3906Z" fill="currentColor"/>
    <path d="M24.4093 6.19288C22.5697 6.19288 21.25 4.89943 21.25 3.13563C21.25 1.37184 22.5697 0 24.4093 0C26.1688 0 27.5685 1.37184 27.5685 3.13563C27.5685 4.89943 26.1688 6.19288 24.4093 6.19288Z" fill="currentColor"/>
  </svg>
)

// Inline slider row — used in both Typography and Parameters sections
function ParamSlider({ label, value, min, max, step, onChange }) {
  const decimals = step < 1 ? (step < 0.1 ? 2 : 2) : 0
  return (
    <div className="param-row">
      <div className="param-row-top">
        <span>{label}</span>
        <span>{Number(value).toFixed(decimals)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}

export default function App() {
  const canvasRef    = useRef(null)
  const rafRef       = useRef(null)
  const startRef     = useRef(null)
  const layoutRef    = useRef({})

  const [phrase,      setPhrase]      = useState(DEFAULT_PHRASE)
  const [effect,      setEffect]      = useState(DEFAULT_EFFECT)
  const [params,      setParams]      = useState(DEFAULT_PARAMS)
  const [fontSize,    setFontSize]    = useState(DEFAULT_FONT_SZ)
  const [leading,     setLeading]     = useState(DEFAULT_LEADING)
  const [tracking,    setTracking]    = useState(DEFAULT_TRACKING)
  const [textColor,   setTextColor]   = useState('#f8fffa')
  const [bgColor,     setBgColor]     = useState('#000d05')
  const [fontStack,   setFontStack]   = useState('serif')
  const [playing,     setPlaying]     = useState(true)
  const [recording,   setRecording]   = useState(false)
  const [pausedAt,    setPausedAt]    = useState(0)
  const [fontsReady,  setFontsReady]  = useState(false)

  useEffect(() => { document.fonts.ready.then(() => setFontsReady(true)) }, [])

  const fontFamily = fontStack === 'serif' ? SERIF : SANS
  const fontName   = fontStack === 'serif' ? 'Serrif VF' : 'Saans'

  // ── Word-wrap helper ───────────────────────────────────────────────────────
  // Returns string[] of lines, each fitting within maxPx given current ctx font + tracking
  function wrapWords(ctx, text, maxPx, trackPx) {
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (measureLine(ctx, test, trackPx) > maxPx && cur) {
        lines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
    return lines
  }

  // Measure a string manually (sum char widths + tracking * gaps)
  function measureLine(ctx, text, trackPx) {
    const chars = [...text]
    return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0)
         + trackPx * Math.max(chars.length - 1, 0)
  }

  // ── Draw frame ────────────────────────────────────────────────────────────
  const drawFrame = useCallback((time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cw  = canvas.width
    const ch  = canvas.height
    const dpr = window.devicePixelRatio || 1
    const cssW = cw / dpr
    const cssH = ch / dpr

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, cw, ch)

    if (!phrase.trim()) return

    const fSize  = fontSize * dpr
    const trkPx  = tracking * dpr   // tracking in canvas pixels
    const lineH  = fSize * leading  // canvas-px line advance

    ctx.letterSpacing = '0px'
    ctx.textBaseline  = 'alphabetic'
    ctx.textAlign     = 'left'
    ctx.font = fontsReady
      ? `400 ${fSize}px ${fontFamily}`
      : `400 ${fSize}px ${fontStack === 'serif' ? 'Georgia, serif' : 'Inter, system-ui, sans-serif'}`

    const pad    = 60 * dpr
    const maxW   = cw - pad * 2
    const lines  = wrapWords(ctx, phrase.trim(), maxW, trkPx)
    const totalH = (lines.length - 1) * lineH + fSize  // last line only needs cap height
    const blockY = (ch - totalH) / 2                   // top of block

    const efx = EFFECTS[effect]
    const p   = params[effect]
    const charPositions = []

    lines.forEach((line, lineIdx) => {
      const chars    = [...line]
      const lineW    = measureLine(ctx, line, trkPx)
      const lineX    = (cw - lineW) / 2          // left edge of line (canvas px)
      const baseY    = blockY + lineIdx * lineH + fSize * 0.78  // baseline

      // Pre-measure each char (raw width, no tracking yet)
      const widths = chars.map(c => ctx.measureText(c).width)

      let curX = lineX
      chars.forEach((char, ci) => {
        const cxPx  = curX + widths[ci] / 2   // char centre in canvas pixels
        const xNorm = cxPx / cw               // 0–1 across canvas width

        const { x, y, rotation, scaleX, scaleY, alpha } = efx.compute(
          ci, chars.length, time, p, xNorm
        )

        charPositions.push({ x: cxPx / dpr, y: baseY / dpr })

        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.translate(cxPx + x * dpr, baseY + y * dpr)
        ctx.rotate(rotation * Math.PI / 180)
        ctx.scale(scaleX, scaleY)
        ctx.fillStyle = textColor
        ctx.fillText(char, -widths[ci] / 2, 0)
        ctx.restore()

        curX += widths[ci] + trkPx
      })
    })

    layoutRef.current = { charPositions, fontName, fontSize, w: cssW, h: cssH }
  }, [phrase, effect, params, fontSize, leading, tracking, textColor, bgColor,
      fontFamily, fontName, fontStack, fontsReady])

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const loop = (ts) => {
      if (cancelled) return
      if (!startRef.current) startRef.current = ts - pausedAt * 1000
      drawFrame((ts - startRef.current) / 1000)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current) }
  }, [playing, drawFrame, pausedAt])

  useEffect(() => { if (!playing) drawFrame(pausedAt) }, [playing, pausedAt, drawFrame])

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width  = canvas.clientWidth  * dpr
      canvas.height = canvas.clientHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // ── Playback ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (playing) {
      const elapsed = startRef.current != null
        ? (performance.now() - startRef.current) / 1000 : 0
      setPausedAt(elapsed)
      startRef.current = null
    } else {
      startRef.current = null
    }
    setPlaying(p => !p)
  }

  const resetAnim = () => {
    startRef.current = null
    setPausedAt(0)
    if (!playing) drawFrame(0)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportWebM = async () => {
    if (recording) return
    const canvas = canvasRef.current
    setRecording(true)
    const wasPlaying = playing
    if (!wasPlaying) { startRef.current = null; setPlaying(true) }
    await exportWebM(canvas, 3000, 30)
    if (!wasPlaying) setPlaying(false)
    setRecording(false)
  }

  const handleExportLottie = () => {
    exportLottie(phrase, effect, params[effect], layoutRef.current, 3, 30)
  }

  const setParam = (key, value) =>
    setParams(prev => ({ ...prev, [effect]: { ...prev[effect], [key]: value } }))

  const efxParams = EFFECTS[effect].params

  return (
    <div className="app">
      <div className="canvas-area">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <AirOpsLogo />
          <span>Type</span>
        </div>

        {/* ── Phrase ── */}
        <div className="sidebar-section">
          <h3>Phrase</h3>
          <div className="field">
            <textarea
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder="Enter phrase…"
            />
          </div>
        </div>

        {/* ── Typography ── */}
        <div className="sidebar-section">
          <h3>Typography</h3>
          <div className="seg-toggle">
            <button className={`seg-btn${fontStack === 'serif' ? ' active' : ''}`}
              onClick={() => setFontStack('serif')}>Serif</button>
            <button className={`seg-btn${fontStack === 'sans'  ? ' active' : ''}`}
              onClick={() => setFontStack('sans')}>Sans</button>
          </div>
          <ParamSlider label="Size"    value={fontSize} min={18}   max={300}  step={2}    onChange={setFontSize} />
          <ParamSlider label="Leading" value={leading}  min={0.5}  max={2.0}  step={0.01} onChange={setLeading} />
          <ParamSlider label="Tracking" value={tracking} min={-20} max={40}   step={0.5}  onChange={setTracking} />
        </div>

        {/* ── Colors ── */}
        <div className="sidebar-section">
          <h3>Colors</h3>
          <div className="color-row">
            <div className="color-swatch">
              <label>Text</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
            </div>
            <div className="color-swatch">
              <label>BG</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Effect ── */}
        <div className="sidebar-section">
          <h3>Effect</h3>
          <div className="effect-pills">
            {Object.entries(EFFECTS).map(([key, e]) => (
              <button key={key}
                className={`effect-pill${effect === key ? ' active' : ''}`}
                onClick={() => setEffect(key)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Parameters ── */}
        <div className="sidebar-section">
          <h3>Parameters</h3>
          {Object.entries(efxParams).map(([key, cfg]) => (
            <ParamSlider key={key}
              label={cfg.label}
              value={params[effect][key] ?? cfg.default}
              min={cfg.min} max={cfg.max} step={cfg.step}
              onChange={v => setParam(key, v)}
            />
          ))}
        </div>

        {/* ── Playback ── */}
        <div className="sidebar-section">
          <h3>Playback</h3>
          <div className="playback-row">
            <button className={`icon-btn${playing ? ' active' : ''}`} onClick={togglePlay}>
              {playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <button className="icon-btn" onClick={resetAnim}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Export ── */}
        <div className="sidebar-section">
          <h3>Export</h3>
          <div className="export-btns">
            <button className="export-btn primary" onClick={handleExportWebM} disabled={recording}>
              {recording && <span className="rec-dot"/>}
              {recording ? 'Recording…' : 'Export WebM'}
              <small>3s loop · VP9</small>
            </button>
            <button className="export-btn" onClick={handleExportLottie}>
              Export Lottie JSON
              <small>30fps · per-char keyframes</small>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
