import { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'
import { EFFECTS } from './effects.js'
import { exportWebM, exportLottie } from './export.js'

const DEFAULT_PHRASE  = 'Hello World'
const DEFAULT_EFFECT  = 'wave'
const DEFAULT_FONT_SZ = 120
const DEFAULT_PARAMS  = Object.fromEntries(
  Object.entries(EFFECTS).map(([k, e]) => [
    k,
    Object.fromEntries(Object.entries(e.params).map(([p, cfg]) => [p, cfg.default]))
  ])
)

export default function App() {
  const canvasRef   = useRef(null)
  const rafRef      = useRef(null)
  const startRef    = useRef(null)
  const fontRef     = useRef(null)   // loaded FontFace
  const layoutRef   = useRef({})     // char positions for Lottie
  const recordingRef= useRef(false)

  const [phrase,    setPhrase]    = useState(DEFAULT_PHRASE)
  const [effect,    setEffect]    = useState(DEFAULT_EFFECT)
  const [params,    setParams]    = useState(DEFAULT_PARAMS)
  const [fontSize,  setFontSize]  = useState(DEFAULT_FONT_SZ)
  const [textColor, setTextColor] = useState('#ffffff')
  const [bgColor,   setBgColor]   = useState('#0a0a0a')
  const [fontName,  setFontName]  = useState('system-ui')
  const [fontLabel, setFontLabel] = useState(null)
  const [playing,   setPlaying]   = useState(true)
  const [recording, setRecording] = useState(false)
  const [pausedAt,  setPausedAt]  = useState(0)

  // ── Draw frame ──────────────────────────────────────────────────────────
  const drawFrame = useCallback((time) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cw  = canvas.width
    const ch  = canvas.height
    const dpr = window.devicePixelRatio || 1

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, cw, ch)

    const chars = [...phrase]
    if (!chars.length) return

    const fSize = fontSize * dpr
    ctx.font = `400 ${fSize}px ${fontName}, system-ui, sans-serif`
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'

    // Measure each char and compute total width
    const metrics = chars.map(c => ctx.measureText(c === ' ' ? '\u2002' : c))
    const widths  = metrics.map(m => m.width)
    const totalW  = widths.reduce((a, b) => a + b, 0)
    const lineH   = fSize * 1.15

    const startX = (cw - totalW) / 2
    const baseY  = ch / 2 + fSize * 0.35

    const efx    = EFFECTS[effect]
    const p      = params[effect]
    const n      = chars.length
    const charPositions = []

    let curX = startX
    for (let i = 0; i < n; i++) {
      const { x, y, rotation, scaleX, scaleY, alpha } = efx.compute(i, n, time, p)
      const cx = curX + widths[i] / 2
      const cy = baseY

      charPositions.push({ x: cx / dpr, y: cy / dpr })

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(cx + x * dpr, cy + y * dpr)
      ctx.rotate(rotation * Math.PI / 180)
      ctx.scale(scaleX, scaleY)
      ctx.fillStyle = textColor
      ctx.fillText(chars[i], -widths[i] / 2, 0)
      ctx.restore()

      curX += widths[i]
    }

    layoutRef.current = {
      charPositions,
      fontName,
      fontSize,
      w: cw / dpr,
      h: ch / dpr,
    }
  }, [phrase, effect, params, fontSize, textColor, bgColor, fontName])

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const loop = (ts) => {
      if (cancelled) return
      if (!startRef.current) startRef.current = ts - pausedAt * 1000
      const elapsed = (ts - startRef.current) / 1000
      drawFrame(elapsed)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [playing, drawFrame, pausedAt])

  // Draw once when paused
  useEffect(() => {
    if (!playing) drawFrame(pausedAt)
  }, [playing, pausedAt, drawFrame])

  // ── Canvas resize ────────────────────────────────────────────────────────
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

  // ── Pause / play ─────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (playing) {
      // Capture current elapsed time
      const now = performance.now()
      const elapsed = startRef.current != null ? (now - startRef.current) / 1000 : 0
      setPausedAt(elapsed)
      startRef.current = null
    } else {
      startRef.current = null  // reset so loop recalculates from pausedAt
    }
    setPlaying(p => !p)
  }

  const resetAnim = () => {
    startRef.current = null
    setPausedAt(0)
    if (!playing) drawFrame(0)
  }

  // ── Font upload ──────────────────────────────────────────────────────────
  const handleFontUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url  = URL.createObjectURL(file)
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '')
    try {
      const ff = new FontFace(name, `url(${url})`)
      await ff.load()
      document.fonts.add(ff)
      fontRef.current = ff
      setFontName(name)
      setFontLabel(file.name)
    } catch {
      alert('Failed to load font. Try a TTF or OTF file.')
    }
  }

  // ── Export WebM ──────────────────────────────────────────────────────────
  const handleExportWebM = async () => {
    if (recording) return
    const canvas = canvasRef.current
    setRecording(true)
    recordingRef.current = true
    // Make sure animation is running during capture
    const wasPlaying = playing
    if (!wasPlaying) {
      startRef.current = null
      setPlaying(true)
    }
    await exportWebM(canvas, 3000, 30)
    if (!wasPlaying) setPlaying(false)
    setRecording(false)
    recordingRef.current = false
  }

  // ── Export Lottie ────────────────────────────────────────────────────────
  const handleExportLottie = () => {
    exportLottie(phrase, effect, params[effect], layoutRef.current, 3, 30)
  }

  // ── Param change ─────────────────────────────────────────────────────────
  const setParam = (key, value) => {
    setParams(prev => ({ ...prev, [effect]: { ...prev[effect], [key]: value } }))
  }

  const efxParams = EFFECTS[effect].params

  return (
    <div className="app">
      {/* Canvas */}
      <div className="canvas-area">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">Type Distortion</div>

        {/* Phrase */}
        <div className="sidebar-section">
          <h3>Phrase</h3>
          <div className="field">
            <label>Text</label>
            <textarea
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder="Enter phrase..."
            />
          </div>
        </div>

        {/* Font */}
        <div className="sidebar-section">
          <h3>Font</h3>
          <label className={`upload-btn${fontLabel ? ' loaded' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {fontLabel ?? 'Upload font (TTF / OTF)'}
            <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} style={{ display: 'none' }} />
          </label>
          <div className="param-row">
            <div className="param-row-top">
              <span>Size</span>
              <span>{fontSize}px</span>
            </div>
            <input
              type="range"
              min={24} max={300} step={2}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Colors */}
        <div className="sidebar-section">
          <h3>Colors</h3>
          <div className="color-row">
            <div className="color-swatch">
              <label>Text</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
            </div>
            <div className="color-swatch">
              <label>Background</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Effect */}
        <div className="sidebar-section">
          <h3>Effect</h3>
          <div className="effect-pills">
            {Object.entries(EFFECTS).map(([key, e]) => (
              <button
                key={key}
                className={`effect-pill${effect === key ? ' active' : ''}`}
                onClick={() => setEffect(key)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Effect params */}
        <div className="sidebar-section">
          <h3>Parameters</h3>
          {Object.entries(efxParams).map(([key, cfg]) => (
            <div className="param-row" key={key}>
              <div className="param-row-top">
                <span>{cfg.label}</span>
                <span>{(params[effect][key] ?? cfg.default).toFixed(cfg.step < 1 ? 2 : 0)}</span>
              </div>
              <input
                type="range"
                min={cfg.min} max={cfg.max} step={cfg.step}
                value={params[effect][key] ?? cfg.default}
                onChange={e => setParam(key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>

        {/* Playback */}
        <div className="sidebar-section">
          <h3>Playback</h3>
          <div className="playback-row">
            <button className={`icon-btn${playing ? ' active' : ''}`} onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              )}
            </button>
            <button className="icon-btn" onClick={resetAnim} title="Reset">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Export */}
        <div className="sidebar-section">
          <h3>Export</h3>
          <div className="export-btns">
            <button className="export-btn" onClick={handleExportWebM} disabled={recording}>
              {recording && <span className="rec-dot"/>}
              {recording ? 'Recording 3s…' : 'Export WebM'}
              <small>3 second loop · VP9 video</small>
            </button>
            <button className="export-btn" onClick={handleExportLottie}>
              Export Lottie JSON
              <small>3 second · 30 fps · per-char keyframes</small>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
