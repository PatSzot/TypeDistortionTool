import * as THREE from 'three'

// ── Shaders ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uFrequency;
  uniform float uMode;    // 0 = wave, 1 = trend, 2 = polygon

  varying vec2 vUv;

  const float PI = 3.14159265359;

  void main() {
    vUv = uv;
    vec3 pos = position;

    if (uMode < 0.5) {
      // Wave: smooth sine driven left-right
      float tiltedX = uv.x + uv.y * 0.1763;  // tan(10°) tilt
      float phase   = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float wave    = sin(phase);
      pos.z += wave * uHeight * 1.6;
      pos.y += wave * uHeight * 0.45;
    }

    if (uMode > 1.5) {
      // Polygon: two triangle waves (vertical + horizontal) multiplied → fractal grid
      float tiltedY = uv.y + uv.x * 0.1763;
      float tiltedX = uv.x + uv.y * 0.1763;
      float phaseY  = tiltedY * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float phaseX  = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0 * 0.71;
      float waveY   = abs(mod(phaseY / PI, 2.0) - 1.0) * 2.0 - 1.0;
      float waveX   = abs(mod(phaseX / PI, 2.0) - 1.0) * 2.0 - 1.0;
      float wave    = waveY * waveX;
      pos.z += wave * uHeight * 1.6;
      pos.y += wave * uHeight * 0.45;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */`
  uniform sampler2D uTexture;
  uniform float uMode;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uFrequency;
  uniform float uWarpAmount;
  varying vec2 vUv;

  const float PI = 3.14159265359;

  void main() {
    if (uMode < 0.5) {
      // ── Warp ─────────────────────────────────────────────────────────────
      // UV distortion driven by the same phase as the vertex wave so warp and
      // wave are always in sync. Displacement depends only on X (not Y), so
      // all lines at the same horizontal position shift together rather than
      // each row warping independently.
      float tiltedX = vUv.x + vUv.y * 0.1763;  // tan(10°) — matches vertex tilt
      float phase = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float dispX = sin(phase);
      float dispY = cos(phase);
      vec2 distortedUV = vUv + vec2(
        dispX * uWarpAmount * 0.002,   // horizontal warp
        dispY * uWarpAmount * 0.0002   // subtle vertical
      );
      gl_FragColor = texture2D(uTexture, distortedUV);
      return;
    }

    // ── Polygon: dual-axis triangle warp → fractal grid ──────────────────
    if (uMode > 1.5) {
      float tiltedY = vUv.y + vUv.x * 0.1763;
      float tiltedX = vUv.x + vUv.y * 0.1763;
      float phaseY  = tiltedY * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float phaseX  = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0 * 0.71;
      float waveY   = abs(mod(phaseY / PI, 2.0) - 1.0) * 2.0 - 1.0;
      float waveX   = abs(mod(phaseX / PI, 2.0) - 1.0) * 2.0 - 1.0;
      vec2 distortedUV = vUv + vec2(
        waveX * uWarpAmount * 0.002,
        waveY * uWarpAmount * 0.002
      );
      gl_FragColor = texture2D(uTexture, distortedUV);
      return;
    }

    // ── Trend: flat passthrough ───────────────────────────────────────────
    if (uMode >= 0.5) {
      gl_FragColor = texture2D(uTexture, vUv);
      return;
    }

  }
`

// ── Constants ──────────────────────────────────────────────────────────────

// Text canvas: fixed width, height grows with content
const TEXT_W   = 2048
const TEXT_H   = 1024  // minimum height

// Plane: width fixed in world units, height scales with canvas aspect
const PLANE_W = 4.0
const SEGS_X  = 300
const SEGS_Y  = 150

// ── ThreeRenderer ──────────────────────────────────────────────────────────

export class ThreeRenderer {
  constructor(mount) {
    this.mount = mount
    this._setup()
  }

  _setup() {
    const w = this.mount.clientWidth
    const h = this.mount.clientHeight

    // WebGL renderer — preserveDrawingBuffer so we can capture frames for export
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.setClearColor(0x000000, 1)
    this.mount.appendChild(this.renderer.domElement)

    this.scene  = new THREE.Scene()
    // Wide FOV amplifies perspective distortion — crests appear much larger
    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.05, 100)
    this.camera.position.z = 4.0

    // Offscreen text canvas → texture
    this.textCanvas        = document.createElement('canvas')
    this.textCanvas.width  = TEXT_W
    this.textCanvas.height = TEXT_H
    this.texture           = new THREE.CanvasTexture(this.textCanvas)
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter

    // Plane mesh with wave shader — initial 2:1 aspect, resized dynamically
    const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_W * TEXT_H / TEXT_W, SEGS_X, SEGS_Y)

    this.uniforms = {
      uTexture:    { value: this.texture },
      uTime:       { value: 0 },
      uHeight:     { value: 0.3 },
      uSpeed:      { value: 0.2 },
      uFrequency:  { value: 1.0 },
      uWarpAmount: { value: 10.0 },
      uMode:       { value: 0.0 },
    }

    const mat = new THREE.ShaderMaterial({
      uniforms:       this.uniforms,
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side:           THREE.DoubleSide,
      transparent:    true,
    })

    this.mesh = new THREE.Mesh(geo, mat)
    // Tilt the plane so we're looking at it from slightly above —
    // gives the 3D depth angle visible in the reference images
    this.mesh.rotation.x = -0.22
    this.scene.add(this.mesh)

    // Pointer-driven 3D rotation state
    this._baseRotX   = -0.22
    this._ptr        = { x: 0, y: 0 }   // current lerped pointer (-1…1)
    this._rotStrength = 10               // degrees
  }

  // ── Target canvas height based on current camera zoom ─────────────────
  // Returns the canvas pixel height needed to fill the visible viewport,
  // so repeated phrases always cover the full effect pane.

  _targetCanvasH() {
    const camZ    = this.camera.position.z
    const halfFOV = (72 / 2) * Math.PI / 180
    const visH    = 2 * Math.tan(halfFOV) * camZ       // visible world height
    const px      = visH * TEXT_W / PLANE_W             // world → canvas px
    return Math.max(TEXT_H, Math.ceil(px * 3))          // 3× visible height for full coverage
  }

  // ── Canvas / plane resize ──────────────────────────────────────────────
  // Returns true if the canvas was actually resized.

  _fitCanvas(neededH) {
    const h = Math.max(TEXT_H, Math.ceil(neededH))
    if (this.textCanvas.height === h) return false
    this.textCanvas.height = h
    // Re-assign texture.image so Three.js re-reads the canvas dimensions on
    // next upload — setting needsUpdate alone does not trigger a dimension update.
    this.texture.image = this.textCanvas
    // Rebuild plane geometry to match new canvas aspect — prevents texture stretch
    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_W * h / TEXT_W, SEGS_X, SEGS_Y)
    return true
  }

  // ── Text rendering ─────────────────────────────────────────────────────

  drawText({ phrase, fontFamily, fontSize, leading, tracking, textColor, textWidth = 90, textAlign = 'center' }) {
    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw     = TEXT_W

    // 2× oversample: CSS px values become canvas px
    const fSize = fontSize * 2
    const trkPx = tracking * 2
    const lineH = fSize * leading

    // Helper: apply all context state in one place so a canvas resize never
    // leaves us with stale defaults.
    const applyCtxState = () => {
      ctx.font          = `400 ${fSize}px ${fontFamily}`
      ctx.letterSpacing = '0px'
      ctx.textBaseline  = 'alphabetic'
      ctx.textAlign     = 'left'
      ctx.fillStyle     = textColor
    }

    if (!phrase.trim()) {
      this._fitCanvas(TEXT_H)
      ctx.clearRect(0, 0, cw, canvas.height)
      this.texture.needsUpdate = true
      return
    }

    applyCtxState()

    const maxW        = cw * (textWidth / 100)
    const singlePhrase = phrase.trim()
    const pad          = fSize * 1.5

    // Repeat phrase (space-separated) until it fills the visible canvas height
    const singleLines = this._wrapWords(ctx, singlePhrase, maxW, trkPx)
    const target      = this._targetCanvasH()
    const linesNeeded = Math.ceil(target / lineH)
    const repeats     = Math.max(1, Math.ceil(linesNeeded / Math.max(1, singleLines.length)))
    const fullPhrase  = Array(repeats).fill(singlePhrase).join(' ')
    const lines       = repeats > 1 ? this._wrapWords(ctx, fullPhrase, maxW, trkPx) : singleLines
    const totalH      = (lines.length - 1) * lineH + fSize

    // Resize canvas (and plane geometry) if needed
    this._fitCanvas(totalH + pad * 2)

    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    // Always re-apply after clear — ensures font/color are current regardless
    // of whether _fitCanvas resized (which resets context state) or not.
    applyCtxState()

    // Start text at the top edge — no vertical centering so there is no gap
    // between the top of the viewport and the first line of text.
    const blockY = 0
    const blockX = (cw - maxW) / 2

    this.charPositions = []

    lines.forEach((line, li) => {
      const chars  = [...line]
      const lineW  = this._measureLine(ctx, line, trkPx)
      let   curX   = textAlign === 'left' ? blockX : (cw - lineW) / 2
      const baseY  = blockY + li * lineH + fSize * 0.78
      const widths = chars.map(c => ctx.measureText(c).width)

      chars.forEach((char, ci) => {
        this.charPositions.push({
          char,
          x: curX + widths[ci] / 2,
          y: baseY - fSize * 0.35,
        })
        ctx.fillText(char, curX, baseY)
        curX += widths[ci] + trkPx
      })
    })

    this.texture.needsUpdate = true
  }

  // ── Trend ───────────────────────────────────────────────────────────────
  // Two passes offset by phaseLen so one is always entering while the other
  // exits. Entering strips expand from the LEFT edge; exiting strips collapse
  // toward the RIGHT edge — they occupy complementary halves of each strip,
  // guaranteeing no blank frame anywhere in the loop.
  _drawTextTrend({ speed = 0.5, divisions = 12 }, t = 0) {
    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw     = canvas.width
    const ch     = canvas.height

    ctx.clearRect(0, 0, cw, ch)
    if (!this._trendOffscreen) { this.texture.needsUpdate = true; return }

    // The main canvas is 3× the camera-visible height (for wave/polygon seamless
    // tiling). For the trend effect we must restrict strips to the visible region
    // only — otherwise most strips fall outside the camera viewport.
    const camZ     = this.camera.position.z
    const halfFOV  = (72 / 2) * Math.PI / 180
    const visH     = Math.round(2 * Math.tan(halfFOV) * camZ * TEXT_W / PLANE_W)
    const startY   = Math.round((ch - visH) / 2)  // center of canvas

    const NUM      = Math.max(2, Math.round(divisions))
    const sH       = visH / NUM
    const STAG     = 0.015 / speed
    const DUR      = 0.8   / speed
    const phaseLen = DUR + (NUM - 1) * STAG
    const cycle    = 2 * phaseLen

    const ease = x => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2

    // Draw entering pass first (behind), exiting pass second (in front)
    for (let pass = 0; pass < 2; pass++) {
      const tMod     = (t + pass * phaseLen) % cycle
      const entering = tMod < phaseLen

      for (let i = 0; i < NUM; i++) {
        let sx, pivX

        if (entering) {
          const delay = pass === 0 ? i * STAG : (NUM - 1 - i) * STAG
          sx   = ease(Math.max(0, Math.min(1, (tMod - delay) / DUR)))
          pivX = 0
        } else {
          const delay = pass === 0 ? (NUM - 1 - i) * STAG : i * STAG
          sx   = 1 - ease(Math.max(0, Math.min(1, (tMod - phaseLen - delay) / DUR)))
          pivX = cw
        }

        if (sx <= 0.001) continue

        ctx.save()
        ctx.beginPath()
        // +1px height to eliminate sub-pixel gaps between strips
        ctx.rect(0, startY + i * sH, cw, sH + 1)
        ctx.clip()
        ctx.translate(pivX, 0)
        ctx.scale(sx, 1)
        ctx.translate(-pivX, 0)
        // Offset the offscreen so its y=0 aligns with the visible region
        ctx.drawImage(this._trendOffscreen, 0, startY)
        ctx.restore()
      }
    }

    this.texture.needsUpdate = true
  }

  _wrapWords(ctx, text, maxPx, trkPx) {
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (this._measureLine(ctx, test, trkPx) > maxPx && cur) {
        lines.push(cur)
        cur = w
      } else {
        cur = test
      }
    }
    if (cur) lines.push(cur)
    return lines
  }

  _measureLine(ctx, text, trkPx) {
    const chars = [...text]
    return chars.reduce((s, c) => s + ctx.measureText(c).width, 0)
         + trkPx * Math.max(chars.length - 1, 0)
  }

  // ── Effect switching ───────────────────────────────────────────────────

  setEffect(name) {
    this._currentEffect = name
    this.uniforms.uMode.value = name === 'trend'   ? 1.0
                              : name === 'polygon' ? 2.0
                              : 0.0
    this._baseRotX = name === 'trend' ? 0.0 : -0.22
    this.mesh.rotation.x = this._baseRotX
  }

  setBgColor(hex) {
    this.renderer.setClearColor(new THREE.Color(hex), 1)
  }

  setZoom(zoom) {
    this.camera.position.z = 4.0 / Math.max(0.1, zoom)
  }

  setRotationStrength(deg) {
    this._rotStrength = deg
  }

  setTrendParams(params) {
    this._trendParams = params
    // Pre-render the full wrapped paragraph to an offscreen canvas using the
    // same layout logic as _renderText — redrawn only when settings change.
    if (!this._trendOffscreen) {
      this._trendOffscreen        = document.createElement('canvas')
      this._trendOffscreen.width  = 2048
      this._trendOffscreen.height = 1024
    }
    const off = this._trendOffscreen
    const ctx = off.getContext('2d')
    const cw  = off.width

    const { phrase, fontFamily, fontSize, leading = 1, tracking = 0,
            textColor, textWidth = 90, textAlign = 'center' } = params
    if (!phrase?.trim()) return

    const fSize = fontSize * 2
    const trkPx = tracking * 2
    const lineH = fSize * leading

    const applyCtxState = () => {
      ctx.font          = `400 ${fSize}px ${fontFamily}`
      ctx.letterSpacing = '0px'
      ctx.textBaseline  = 'alphabetic'
      ctx.textAlign     = 'left'
      ctx.fillStyle     = textColor
    }

    applyCtxState()

    const maxW         = cw * (textWidth / 100)
    const singlePhrase = phrase.trim()
    const pad          = fSize * 1.5

    // Repeat phrase to fill the visible canvas height
    const singleLines = this._wrapWords(ctx, singlePhrase, maxW, trkPx)
    const target      = this._targetCanvasH()
    const linesNeeded = Math.ceil(target / lineH)
    const repeats     = Math.max(1, Math.ceil(linesNeeded / Math.max(1, singleLines.length)))
    const fullPhrase  = Array(repeats).fill(singlePhrase).join(' ')
    const lines       = repeats > 1 ? this._wrapWords(ctx, fullPhrase, maxW, trkPx) : singleLines
    const totalH      = (lines.length - 1) * lineH + fSize
    const ch          = Math.max(TEXT_H, Math.ceil(totalH + pad * 2))

    // Keep offscreen canvas in sync with main canvas dimensions
    if (off.height !== ch) off.height = ch
    this._fitCanvas(ch)

    ctx.clearRect(0, 0, cw, ch)
    applyCtxState()

    const blockY = 0
    const blockX = (cw - maxW) / 2

    lines.forEach((line, li) => {
      const chars  = [...line]
      const lineW  = this._measureLine(ctx, line, trkPx)
      let   curX   = textAlign === 'left' ? blockX : (cw - lineW) / 2
      const baseY  = blockY + li * lineH + fSize * 0.78
      const widths = chars.map(c => ctx.measureText(c).width)
      chars.forEach((char, ci) => {
        ctx.fillText(char, curX, baseY)
        curX += widths[ci] + trkPx
      })
    })

    // Trigger immediate texture update (don't wait for next tick)
    this.texture.needsUpdate = true
  }

  // ── Wave params ────────────────────────────────────────────────────────

  setWaveParams({ height, speed, frequency, warpAmount = 0 }) {
    // height 0–100% → world units
    // At 100%, Z displacement = 2.5 * 1.6 = 4.0 world units — nearly fills camera-to-near-clip distance
    // At 50% (default), crest is ~1.9× apparent size of trough
    this.uniforms.uHeight.value     = (height / 100) * 2.5
    this.uniforms.uSpeed.value      = speed
    this.uniforms.uFrequency.value  = frequency
    this.uniforms.uWarpAmount.value = warpAmount
  }

  // ── Loop / resize / export ─────────────────────────────────────────────

  tick(t, ptrX = 0, ptrY = 0) {
    // Smooth lerp pointer toward target (eases on and off)
    const LERP = 0.06
    this._ptr.x += (ptrX - this._ptr.x) * LERP
    this._ptr.y += (ptrY - this._ptr.y) * LERP

    // Apply pointer-driven tilt on top of the base rotation for this effect
    const maxRad = this._rotStrength * Math.PI / 180
    this.mesh.rotation.y  =  this._ptr.x * maxRad
    this.mesh.rotation.x  =  this._baseRotX - this._ptr.y * maxRad * 0.6

    if (this._currentEffect === 'trend' && this._trendParams) {
      this._drawTextTrend(this._trendParams, t)
    }
    this.uniforms.uTime.value = t
    this.renderer.render(this.scene, this.camera)
  }

  resize(w, h) {
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  get domElement() { return this.renderer.domElement }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.texture.dispose()
    this.renderer.dispose()
    if (this.mount.contains(this.renderer.domElement)) {
      this.mount.removeChild(this.renderer.domElement)
    }
  }
}
