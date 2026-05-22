import { useRef, useEffect, useState } from 'react'
import './App.css'
import { ThreeRenderer } from './ThreeRenderer.js'
import { exportMP4, exportGIF, exportLottie } from './export.js'

const SERIF = "'Serrif VF', Georgia, serif"
const SANS  = "'Saans', Inter, sans-serif"

const DEFAULT_WAVE = { height: 4, speed: 0.14, frequency: 1.9, warpAmount: 10 }

const EFFECT_LABELS    = { wave: 'Systems Builder', polygon: 'AEO Analyst' }
const EFFECT_BG        = { wave: '#0092FF', polygon: '#008C44' }
const EFFECT_DEFAULTS  = {
  wave: {
    phrase:    'Reading the field is one half of Content Engineering. Building on it is the other. This certification proves you can find the right problem, design a system that solves it, and explain why it matters to the business.',
    certTitle: 'Systems Builder',
  },
  polygon: {
    phrase:    'Reading the field is where every Content Engineer starts. This certification proves you can. You diagnose where your brand shows up in answer engine optimization (AEO), find what\'s missing, and build the case that gets budget, headcount, and executive attention.',
    certTitle: 'AEO Analyst',
  },
}

function ParamSlider({ label, value, min, max, step, unit = '', onChange }) {
  const decimals = step < 1 ? 2 : 0
  return (
    <div className="param-row">
      <div className="param-row-top">
        <span>{label}</span>
        <span>{Number(value).toFixed(decimals)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}

const CertSeal = () => (
  <img src="/AO-Seal.svg" width="436" height="436" alt="AirOps University Seal" />
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

export default function App() {
  const mountRef      = useRef(null)
  const rendRef       = useRef(null)
  const rafRef        = useRef(null)
  const startRef      = useRef(null)
  const pausedAtRef   = useRef(0)
  const mouseRef      = useRef({ x: 0, y: 0 })
  const certStageRef  = useRef(null)
  const certLerpRef   = useRef({ x: 0, y: 0 })

  const [phrase,    setPhrase]    = useState(EFFECT_DEFAULTS.wave.phrase)
  const [fontStack, setFontStack] = useState('serif')
  const [fontSize,  setFontSize]  = useState(37)
  const [leading,   setLeading]   = useState(111)   // stored as %, divided by 100 for renderer
  const [tracking,  setTracking]  = useState(-1.12)
  const [textWidth, setTextWidth] = useState(100)
  const [textColor, setTextColor] = useState('#ffffff')
  const [textAlign, setTextAlign] = useState('center')
  const [wave,      setWave]      = useState(DEFAULT_WAVE)
  const [effect,    setEffect]    = useState('wave')
  const [rotationStrength, setRotationStrength] = useState(26)
  const [playing,   setPlaying]   = useState(true)
  const [recording,    setRecording]    = useState(false)
  const [exportPhase,  setExportPhase]  = useState('')
  const [fontsReady, setFontsReady] = useState(false)

  const [certMode,  setCertMode]  = useState(true)
  const [certTitle, setCertTitle] = useState(EFFECT_DEFAULTS.wave.certTitle)
  const [certName,  setCertName]  = useState('Ariana Opera')
  const [certZoom,  setCertZoom]  = useState(2.60)
  const [certScale, setCertScale] = useState(1)
  const canvasWrapRef  = useRef(null)
  const certScaleRef   = useRef(1)
  certScaleRef.current = certScale

  // Always-current settings snapshot — read in renderer init to avoid stale closures
  const settingsRef = useRef({})
  settingsRef.current = { effect, wave, rotationStrength, phrase, fontFamily: fontStack === 'serif' ? SERIF : SANS, fontSize, leading, tracking, textColor, textWidth, textAlign, bgColor: EFFECT_BG[effect] ?? '#000000', certZoom }

  const fontFamily = fontStack === 'serif' ? SERIF : SANS

  // ── Wait for custom fonts ──────────────────────────────────────────────
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  // ── Init Three.js renderer ─────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const rend = new ThreeRenderer(mount)
    rendRef.current = rend

    // Re-apply all current settings after renderer reinit (e.g. on certMode toggle)
    const s = settingsRef.current
    rend.setEffect(s.effect)
    rend.setBgColor(s.bgColor)
    rend.setZoom(s.certZoom)
    rend.setWaveParams(s.wave)
    rend.setRotationStrength(s.rotationStrength)
    rend.drawText({
      phrase: s.phrase, fontFamily: s.fontFamily, fontSize: s.fontSize,
      leading: s.leading / 100, tracking: s.tracking, textColor: s.textColor,
      textWidth: s.textWidth, textAlign: s.textAlign,
    })

    const ro = new ResizeObserver(() => {
      rend.resize(mount.clientWidth, mount.clientHeight)
    })
    ro.observe(mount)

    return () => {
      ro.disconnect()
      rend.dispose()
      rendRef.current = null
    }
  }, [certMode])

  // ── Scale cert stage to fit viewport ──────────────────────────────────
  useEffect(() => {
    if (!certMode) return
    const wrap = canvasWrapRef.current
    if (!wrap) return
    const update = () => setCertScale(Math.min(wrap.clientWidth / 1920, wrap.clientHeight / 1080) * 0.88)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [certMode])

  // ── Redraw text whenever text settings change ──────────────────────────
  useEffect(() => {
    let cancelled = false
    // Explicitly load the active font before drawing — canvas ctx.font silently
    // ignores a font that the browser hasn't confirmed is ready for canvas use,
    // which causes the previous font to stick (e.g. Saans stays after switching to Serrif).
    const fontName = fontFamily.split(',')[0].trim()   // e.g. 'Serrif VF' or 'Saans'
    document.fonts.load(`400 1em ${fontName}`).then(() => {
      if (cancelled) return
      rendRef.current?.drawText({ phrase, fontFamily, fontSize, leading: leading / 100, tracking, textColor, textWidth, textAlign })
    })
    return () => { cancelled = true }
  }, [phrase, fontFamily, fontSize, leading, tracking, textColor, textWidth, textAlign, fontsReady, effect])

  // ── Update wave uniforms whenever params change ────────────────────────
  useEffect(() => {
    rendRef.current?.setWaveParams(wave)
  }, [wave])

  // ── Switch effect mode + background color ─────────────────────────────
  useEffect(() => {
    rendRef.current?.setEffect(effect)
    rendRef.current?.setBgColor(EFFECT_BG[effect] ?? '#000000')
  }, [effect])

  // ── Rotation strength ──────────────────────────────────────────────────
  useEffect(() => {
    rendRef.current?.setRotationStrength(rotationStrength)
  }, [rotationStrength])

  // ── Zoom ───────────────────────────────────────────────────────────────
  useEffect(() => {
    rendRef.current?.setZoom(certZoom)
  }, [certZoom])

  // ── Animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return
    let cancelled = false

    const loop = (ts) => {
      if (cancelled) return
      if (!startRef.current) startRef.current = ts - pausedAtRef.current * 1000

      // Lerp the cert-stage 3D tilt — same LERP as the Three.js mesh but at
      // 35 % of the effect rotation strength so the certificate tilts less dramatically.
      if (certStageRef.current) {
        const LERP = 0.06
        certLerpRef.current.x += (mouseRef.current.x - certLerpRef.current.x) * LERP
        certLerpRef.current.y += (mouseRef.current.y - certLerpRef.current.y) * LERP
        const deg = (settingsRef.current.rotationStrength ?? 26) * 0.35
        const rx  = -certLerpRef.current.y * deg
        const ry  = -certLerpRef.current.x * deg  // CSS rotateY is opposite to Three.js rotation.y
        certStageRef.current.style.transform =
          `scale(${certScaleRef.current}) rotateX(${rx}deg) rotateY(${ry}deg)`
      }

      rendRef.current?.tick((ts - startRef.current) / 1000, mouseRef.current.x, mouseRef.current.y)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [playing])

  // ── Playback controls ──────────────────────────────────────────────────
  const togglePlay = () => {
    if (playing) {
      pausedAtRef.current = startRef.current != null
        ? (performance.now() - startRef.current) / 1000 : 0
      startRef.current = null
    } else {
      startRef.current = null
    }
    setPlaying(p => !p)
  }

  const resetAnim = () => {
    startRef.current    = null
    pausedAtRef.current = 0
    if (!playing) rendRef.current?.tick(0)
  }

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExportMP4 = async () => {
    if (recording) return
    setRecording(true)
    await exportMP4(
      rendRef.current.domElement,
      t => rendRef.current?.tick(t),
      seamlessLoopDuration, 30,
      setExportPhase,
    )
    setRecording(false)
    setExportPhase('')
  }

  const handleExportGIF = async () => {
    if (recording) return
    setRecording(true)
    await exportGIF(
      rendRef.current.domElement,
      t => rendRef.current?.tick(t),
      seamlessLoopDuration,
      setExportPhase,
    )
    setRecording(false)
    setExportPhase('')
  }

  const handleExportLottie = () => {
    const positions = rendRef.current?.charPositions
    if (!positions?.length) return
    exportLottie(positions, wave, { fontSize, textColor, fontFamily }, seamlessLoopDuration, 30)
  }

  const switchEffect = (name) => {
    setEffect(name)
    setPhrase(EFFECT_DEFAULTS[name].phrase)
    setCertTitle(EFFECT_DEFAULTS[name].certTitle)
  }

  const setWaveParam  = (key, val) => setWave(w => ({ ...w, [key]: val }))

  // ── Seamless loop duration ─────────────────────────────────────────────
  // Shortest T ≥ 3s where the animation returns to its exact start state.
  // Wave/Polygon: period = 1/speed  →  T = ceil(3·speed)/speed
  const seamlessLoopDuration = (() => {
    const TARGET = 3
    const s = wave.speed
    if (s <= 0) return TARGET
    const k = Math.max(1, Math.round(TARGET * s))
    return k / s
  })()

  const onMouseMove = e => {
    const r = e.currentTarget.getBoundingClientRect()
    mouseRef.current = {
      x:  ((e.clientX - r.left) / r.width  - 0.5) * 2,
      y:  ((e.clientY - r.top)  / r.height - 0.5) * 2,
    }
  }
  const onMouseLeave = () => { mouseRef.current = { x: 0, y: 0 } }

  return (
    <div className="app">

      {certMode ? (
        <div className="cert-wrap" ref={canvasWrapRef}
          onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
          style={{ perspective: '2000px' }}>
          <div className="cert-stage" ref={certStageRef}>
            <div ref={mountRef} className="cert-effect-pane" />
            <div className="cert-panel">
              <div className="cert-content">
                <div className="cert-top">
                  <div className="cert-title">{certTitle}</div>
                  <div className="cert-name">{certName}</div>
                </div>
                <div className="cert-bottom">
                  <div className="cert-label">CONTENT<br/>ENGINEERING<br/>CERTIFICATION</div>
                  <CertSeal />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div ref={mountRef} className="canvas-area"
          onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
      )}

      <aside className="sidebar">
        <div className="sidebar-header">
          <AirOpsLogo />
          <span>Type</span>
        </div>

        {/* Certificate Type */}
        <div className="sidebar-section">
          <h3>Certificate Type</h3>
          <div className="seg-toggle">
            <button className={`seg-btn${effect === 'wave'    ? ' active' : ''}`} onClick={() => switchEffect('wave')}>{EFFECT_LABELS.wave}</button>
            <button className={`seg-btn${effect === 'polygon' ? ' active' : ''}`} onClick={() => switchEffect('polygon')}>{EFFECT_LABELS.polygon}</button>
          </div>
        </div>

        {/* Certificate */}
        <div className="sidebar-section">
          <h3>Certificate</h3>
          <div className="toggle-row">
            <span>Cert Mode</span>
            <button className={`toggle-btn${certMode ? ' active' : ''}`} onClick={() => setCertMode(c => !c)}>
              <span className="toggle-thumb"/>
            </button>
          </div>
          {certMode && <>
            <div className="field">
              <label>Title</label>
              <input type="text" value={certTitle} onChange={e => setCertTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Name</label>
              <input type="text" value={certName} onChange={e => setCertName(e.target.value)} />
            </div>
          </>}
        </div>

        {/* Phrase */}
        <div className="sidebar-section">
          <h3>Phrase</h3>
          <div className="field">
            <textarea value={phrase}
              onChange={e => {
                setPhrase(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onFocus={e => {
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              placeholder="Enter phrase…" />
          </div>
        </div>

        {/* Typography */}
        <div className="sidebar-section">
          <h3>Typography</h3>
          <div className="seg-toggle">
            <button className={`seg-btn${fontStack === 'serif' ? ' active' : ''}`}
              onClick={() => setFontStack('serif')}>Serrif</button>
            <button className={`seg-btn${fontStack === 'sans'  ? ' active' : ''}`}
              onClick={() => setFontStack('sans')}>Saans</button>
          </div>
          <div className="seg-toggle">
            <button className={`seg-btn${textAlign === 'left'   ? ' active' : ''}`} onClick={() => setTextAlign('left')}>Left</button>
            <button className={`seg-btn${textAlign === 'center' ? ' active' : ''}`} onClick={() => setTextAlign('center')}>Center</button>
          </div>
          <ParamSlider label="Size"     value={fontSize}  min={12}  max={200} step={1}   unit="%" onChange={setFontSize}  />
          <ParamSlider label="Leading"  value={leading}   min={50}  max={200} step={1}   unit="%" onChange={setLeading}   />
          <ParamSlider label="Tracking" value={tracking}  min={-20} max={40}  step={0.5} unit="%" onChange={setTracking}  />
          <ParamSlider label="Width"    value={textWidth} min={20}  max={100} step={1}   unit="%" onChange={setTextWidth} />
          <ParamSlider label="Zoom"     value={certZoom}  min={0.5} max={3}   step={0.05}         onChange={setCertZoom}  />
        </div>

        {/* Colors */}
        <div className="sidebar-section">
          <h3>Colors</h3>
          <div className="color-row">
            <div className="color-swatch">
              <label>Text</label>
              <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Effect params */}
        <div className="sidebar-section">
          <h3>Effect</h3>
          <ParamSlider label="Height"    value={wave.height}     min={0}   max={100} step={1}    unit="%" onChange={v => setWaveParam('height', v)}     />
          <ParamSlider label="Speed"     value={wave.speed}      min={0}   max={1}   step={0.01} unit="%" onChange={v => setWaveParam('speed', v)}      />
          <ParamSlider label="Frequency" value={wave.frequency}  min={0.5} max={2}   step={0.1}  unit="%" onChange={v => setWaveParam('frequency', v)}  />
          <ParamSlider label="Warp"      value={wave.warpAmount} min={0}   max={100} step={1}    unit="%" onChange={v => setWaveParam('warpAmount', v)} />
        </div>

        {/* Interaction */}
        <div className="sidebar-section">
          <h3>Interaction</h3>
          <ParamSlider label="Rotation" value={rotationStrength} min={0} max={30} step={1} unit="°" onChange={setRotationStrength} />
        </div>

        {/* Playback */}
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

        {/* Export */}
        <div className="sidebar-section">
          <h3>Export</h3>
          <div className="export-btns">
            <button className="export-btn primary" onClick={handleExportMP4} disabled={recording}>
              {recording && <span className="rec-dot"/>}
              {recording ? exportPhase : 'Export MP4'}
              <small>{seamlessLoopDuration.toFixed(1)}s seamless loop · H.264</small>
            </button>
            <button className="export-btn" onClick={handleExportGIF} disabled={recording}>
              Export GIF
              <small>{seamlessLoopDuration.toFixed(1)}s · looping · 15fps</small>
            </button>
            <button className="export-btn" onClick={handleExportLottie}>
              Export Lottie
              <small>3s · JSON · per-char wave</small>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
