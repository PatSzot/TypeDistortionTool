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
      float tiltedX = vUv.x + vUv.y * 0.1763;  // tan(10°) — matches vertex tilt
      float phase = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float dispX = sin(phase);
      float dispY = cos(phase);
      vec2 distortedUV = clamp(vUv + vec2(
        dispX * uWarpAmount * 0.002,   // horizontal warp
        dispY * uWarpAmount * 0.0002   // subtle vertical
      ), 0.0, 1.0);
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
      vec2 distortedUV = clamp(vUv + vec2(
        waveX * uWarpAmount * 0.002,
        waveY * uWarpAmount * 0.002
      ), 0.0, 1.0);
      gl_FragColor = texture2D(uTexture, distortedUV);
      return;
    }

  }
`

// ── Rings shaders (p5.js Text Distortion port) ──────────────────────────────
// Concentric rings of squares with oscillating angular distortion.
// Dot size driven by a procedural 3-lobe pattern (approximates flower.png).
// Color lerps yellow → magenta based on horizontal position.

const RINGS_VERTEX_SHADER = /* glsl */`
  attribute float aAngle;
  attribute float aRadius;
  attribute float aSizeNorm;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmpFactor;
  uniform float uFreqFactor;

  varying float vAmt;

  const float MAX_R = 3.5;

  void main() {
    // Oscillation distortion — matches p5.js: angle + ampFactor*sin(freqFactor*r + frameCount*0.05)
    float distortedAngle = aAngle + uAmpFactor * sin(uFreqFactor * aRadius + uTime * uSpeed);
    float x = -aRadius * cos(distortedAngle);
    float y =  aRadius * sin(distortedAngle);

    // Colour mix amount: 0 = left (yellow), 1 = right (magenta)
    vAmt = clamp(x / (MAX_R * 2.0) + 0.5, 0.0, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
    gl_PointSize = max(aSizeNorm * 4.0, 0.5);
  }
`

const RINGS_FRAGMENT_SHADER = /* glsl */`
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAmt;

  void main() {
    gl_FragColor = vec4(mix(uColorA, uColorB, vAmt), 1.0);
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
    this.texture                  = new THREE.CanvasTexture(this.textCanvas)
    this.texture.minFilter        = THREE.LinearFilter
    this.texture.magFilter        = THREE.LinearFilter
    this.texture.generateMipmaps  = false
    this.texture.anisotropy       = this.renderer.capabilities.getMaxAnisotropy()

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

    // Rings effect — hidden until 'rings' mode is active
    this.ringsPoints = this._buildRings()
    this.ringsPoints.frustumCulled = false
    this.ringsPoints.visible = false
    this.scene.add(this.ringsPoints)

    // Pointer-driven 3D rotation state
    this._baseRotX   = -0.22
    this._ptr        = { x: 0, y: 0 }   // current lerped pointer (-1…1)
    this._rotStrength = 10               // degrees
  }

  // ── Rings geometry builder ─────────────────────────────────────────────
  // Ports the p5.js TextDistortion sketch to Three.js Points geometry.
  // 50 rings × 100 pts each. Size driven by a procedural 3-lobe pattern
  // that approximates sampling a flower image's red channel.

  _buildRings() {
    const NUM_RINGS    = 50
    const PTS_PER_RING = 100
    const MIN_R        = 0.05
    const MAX_R        = 3.5
    const REPEAT_X     = 2
    const REPEAT_Y     = 3
    const TWO_PI       = Math.PI * 2
    const total        = NUM_RINGS * PTS_PER_RING

    const positions = new Float32Array(total * 3)  // placeholder zeros; actual pos in vertex shader
    const angles    = new Float32Array(total)
    const radii     = new Float32Array(total)
    const sizeNorms = new Float32Array(total)

    let idx = 0
    for (let i = 0; i < NUM_RINGS; i++) {
      const r = MIN_R + ((MAX_R - MIN_R) / NUM_RINGS) * i
      for (let j = 0; j < PTS_PER_RING; j++) {
        const angle   = (TWO_PI / PTS_PER_RING) * j
        const sampleX = (angle * REPEAT_X) % TWO_PI
        const sampleY = (((r - MIN_R) / (MAX_R - MIN_R)) * REPEAT_Y) % 1.0
        // 3-lobe procedural pattern (approximates p5.js flower.png red channel)
        const flowerVal = Math.max(0, (Math.sin(sampleX * 3) * Math.cos(sampleY * TWO_PI) + 1) * 0.5)
        angles[idx]    = angle
        radii[idx]     = r
        sizeNorms[idx] = flowerVal
        idx++
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',  new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aAngle',    new THREE.BufferAttribute(angles, 1))
    geo.setAttribute('aRadius',   new THREE.BufferAttribute(radii, 1))
    geo.setAttribute('aSizeNorm', new THREE.BufferAttribute(sizeNorms, 1))

    this.ringsUniforms = {
      uTime:       { value: 0 },
      uSpeed:      { value: 3.0 },    // radians/sec — p5 frameCount*0.05 at 60fps = 3 rad/s
      uAmpFactor:  { value: 0.2 },    // angular distortion amplitude (radians)
      uFreqFactor: { value: 2.5 },    // spatial frequency — scaled from p5's 0.03 × (300/3.5)
      uColorA:     { value: new THREE.Color(1, 1, 0) },      // yellow  #ffff00
      uColorB:     { value: new THREE.Color(1, 0, 0.784) },  // magenta #ff00c8
    }

    const mat = new THREE.ShaderMaterial({
      uniforms:       this.ringsUniforms,
      vertexShader:   RINGS_VERTEX_SHADER,
      fragmentShader: RINGS_FRAGMENT_SHADER,
    })

    return new THREE.Points(geo, mat)
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
    // Fill with the effect background colour so bilinear filtering at text
    // edges blends text → bg rather than text → transparent-black, which
    // would produce a dark fringe around every glyph when warped.
    ctx.clearRect(0, 0, cw, ch)
    if (this._bgColor) {
      ctx.fillStyle = this._bgColor
      ctx.fillRect(0, 0, cw, ch)
    }

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
    this._currentEffect  = name
    const isRings        = name === 'rings'
    this.mesh.visible        = !isRings
    this.ringsPoints.visible =  isRings
    this.uniforms.uMode.value = name === 'polygon' ? 2.0 : 0.0
    this._baseRotX = isRings ? 0 : -0.22
    this.mesh.rotation.x = this._baseRotX
  }

  setBgColor(hex) {
    this._bgColor = hex
    this.renderer.setClearColor(new THREE.Color(hex), 1)
  }

  setZoom(zoom) {
    this.camera.position.z = 4.0 / Math.max(0.1, zoom)
  }

  setRotationStrength(deg) {
    this._rotStrength = deg
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

  // ── Rings params ───────────────────────────────────────────────────────

  setRingsParams({ ampFactor, freqFactor, speed }) {
    this.ringsUniforms.uAmpFactor.value  = ampFactor
    this.ringsUniforms.uFreqFactor.value = freqFactor
    this.ringsUniforms.uSpeed.value      = speed
  }

  // ── Loop / resize / export ─────────────────────────────────────────────

  tick(t, ptrX = 0, ptrY = 0) {
    // Smooth lerp pointer toward target (eases on and off)
    const LERP = 0.06
    this._ptr.x += (ptrX - this._ptr.x) * LERP
    this._ptr.y += (ptrY - this._ptr.y) * LERP

    // Apply pointer-driven tilt on top of the base rotation for this effect
    const maxRad = this._rotStrength * Math.PI / 180
    this.mesh.rotation.y        =  this._ptr.x * maxRad
    this.mesh.rotation.x        =  this._baseRotX - this._ptr.y * maxRad * 0.6
    this.ringsPoints.rotation.y =  this._ptr.x * maxRad
    this.ringsPoints.rotation.x =  this._ptr.y * maxRad * 0.6

    this.uniforms.uTime.value      = t
    this.ringsUniforms.uTime.value = t
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
    this.ringsPoints.geometry.dispose()
    this.ringsPoints.material.dispose()
    this.texture.dispose()
    this.renderer.dispose()
    if (this.mount.contains(this.renderer.domElement)) {
      this.mount.removeChild(this.renderer.domElement)
    }
  }
}
