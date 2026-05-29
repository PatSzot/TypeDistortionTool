import * as THREE from 'three'

// ── Shaders ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uFrequency;
  uniform float uMode;    // 0 = wave, 2 = polygon, 3 = lens

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

    if (uMode > 1.5 && uMode < 2.5) {
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

    if (uMode > 2.5) {
      // Lens: spherical dome — center bulges toward viewer
      float dist = length(uv - 0.5) * 2.0;  // 0 at center, 1 at edge
      float dome = max(0.0, 1.0 - dist * dist);
      pos.z += dome * uHeight * 1.5;
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
      // ── Wave warp ─────────────────────────────────────────────────────────
      float tiltedX = vUv.x + vUv.y * 0.1763;
      float phase = tiltedX * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float dispX = sin(phase);
      float dispY = cos(phase);
      vec2 distortedUV = clamp(vUv + vec2(
        dispX * uWarpAmount * 0.002,
        dispY * uWarpAmount * 0.0002
      ), 0.0, 1.0);
      gl_FragColor = texture2D(uTexture, distortedUV);
      return;
    }

    if (uMode > 1.5 && uMode < 2.5) {
      // ── Polygon: dual-axis triangle warp ──────────────────────────────────
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

    if (uMode > 2.5) {
      // ── Lens: differential rotation + barrel distortion ───────────────────
      // 1. Convert to polar around center
      vec2  dc    = vUv - 0.5;
      float r     = length(dc);
      float theta = atan(dc.y, dc.x);

      // 2. Differential rotation: inner rings spin faster than outer (1/r falloff)
      //    uSpeed = base angular speed at r=0.4; omega scales inversely with r.
      float omega        = uSpeed * 0.4 / max(r, 0.04);
      float rotatedTheta = theta + omega * uTime;

      // 3. Reconstruct rotated UV offset
      vec2 rotDC = r * vec2(cos(rotatedTheta), sin(rotatedTheta));

      // 4. Barrel distortion (magnifying glass): outer edges bow outward.
      //    uWarpAmount 0-100 maps to 0-0.8 distortion coefficient.
      float k       = uWarpAmount * 0.008;
      vec2  lensDC  = rotDC * (1.0 + k * r * r);

      vec2 finalUV = clamp(0.5 + lensDC, 0.0, 1.0);
      gl_FragColor = texture2D(uTexture, finalUV);
      return;
    }
  }
`

// ── Rings shaders (p5.js Text Distortion port) ──────────────────────────────

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
    float distortedAngle = aAngle + uAmpFactor * sin(uFreqFactor * aRadius + uTime * uSpeed);
    float x = -aRadius * cos(distortedAngle);
    float y =  aRadius * sin(distortedAngle);
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

const TEXT_W   = 2048
const TEXT_H   = 1024

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

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h)
    this.renderer.setClearColor(0x000000, 1)
    this.mount.appendChild(this.renderer.domElement)

    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(72, w / h, 0.05, 100)
    this.camera.position.z = 4.0

    this.textCanvas        = document.createElement('canvas')
    this.textCanvas.width  = TEXT_W
    this.textCanvas.height = TEXT_H
    this.texture                  = new THREE.CanvasTexture(this.textCanvas)
    this.texture.minFilter        = THREE.LinearFilter
    this.texture.magFilter        = THREE.LinearFilter
    this.texture.generateMipmaps  = false
    this.texture.anisotropy       = this.renderer.capabilities.getMaxAnisotropy()

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
    this.mesh.rotation.x = -0.22
    this.scene.add(this.mesh)

    this.ringsPoints = this._buildRings()
    this.ringsPoints.frustumCulled = false
    this.ringsPoints.visible = false
    this.scene.add(this.ringsPoints)

    this._baseRotX    = -0.22
    this._ptr         = { x: 0, y: 0 }
    this._rotStrength = 10
  }

  // ── Rings geometry builder ─────────────────────────────────────────────

  _buildRings() {
    const NUM_RINGS    = 50
    const PTS_PER_RING = 100
    const MIN_R        = 0.05
    const MAX_R        = 3.5
    const REPEAT_X     = 2
    const REPEAT_Y     = 3
    const TWO_PI       = Math.PI * 2
    const total        = NUM_RINGS * PTS_PER_RING

    const positions = new Float32Array(total * 3)
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
      uSpeed:      { value: 3.0 },
      uAmpFactor:  { value: 0.2 },
      uFreqFactor: { value: 2.5 },
      uColorA:     { value: new THREE.Color(1, 1, 0) },
      uColorB:     { value: new THREE.Color(1, 0, 0.784) },
    }

    const mat = new THREE.ShaderMaterial({
      uniforms:       this.ringsUniforms,
      vertexShader:   RINGS_VERTEX_SHADER,
      fragmentShader: RINGS_FRAGMENT_SHADER,
    })

    return new THREE.Points(geo, mat)
  }

  // ── Ring text canvas (lens mode) ───────────────────────────────────────
  // Draws the phrase as concentric circles of characters on a square canvas.
  // The shader handles all animation (differential rotation + lens distortion).

  _drawRingTextNow() {
    const W = TEXT_W

    // Ensure square canvas and matching plane geometry
    if (this.textCanvas.height !== W) {
      this.textCanvas.height = W
      this.texture.image = this.textCanvas
      this.mesh.geometry.dispose()
      this.mesh.geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_W, SEGS_X, SEGS_X)
    }

    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cx = W / 2, cy = W / 2

    ctx.clearRect(0, 0, W, W)
    if (this._bgColor) {
      ctx.fillStyle = this._bgColor
      ctx.fillRect(0, 0, W, W)
    }

    const phrase = this._ringPhrase || ''
    const chars  = [...phrase.trim()]
    if (!chars.length) { this.texture.needsUpdate = true; return }

    const fSize  = (this._ringFontSize  || 37) * 1.5
    const numRings  = 15
    const minR      = W * 0.08
    const maxR      = W * 0.48
    const charGap   = fSize * 0.65   // approximate character advance

    ctx.font         = `400 ${fSize}px ${this._ringFontFamily || 'serif'}`
    ctx.fillStyle    = this._ringTextColor || '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'center'

    ctx.save()
    ctx.translate(cx, cy)

    for (let ring = 0; ring < numRings; ring++) {
      const r             = minR + (maxR - minR) * (ring / (numRings - 1))
      const circumference = 2 * Math.PI * r
      const numChars      = Math.max(4, Math.floor(circumference / charGap))
      const angleStep     = (2 * Math.PI) / numChars
      // Stagger each ring's start angle so characters don't line up radially
      const startAngle    = (ring / numRings) * (Math.PI / 4)

      for (let i = 0; i < numChars; i++) {
        const char  = chars[i % chars.length]
        const angle = startAngle + i * angleStep
        const x     = r * Math.cos(angle - Math.PI / 2)   // top = 0°
        const y     = r * Math.sin(angle - Math.PI / 2)

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle)   // tangent direction
        ctx.fillText(char, 0, 0)
        ctx.restore()
      }
    }

    ctx.restore()
    this.texture.needsUpdate = true
  }

  // ── Target canvas height ───────────────────────────────────────────────

  _targetCanvasH() {
    const camZ    = this.camera.position.z
    const halfFOV = (72 / 2) * Math.PI / 180
    const visH    = 2 * Math.tan(halfFOV) * camZ
    const px      = visH * TEXT_W / PLANE_W
    return Math.max(TEXT_H, Math.ceil(px * 3))
  }

  // ── Canvas / plane resize ──────────────────────────────────────────────

  _fitCanvas(neededH) {
    const h = Math.max(TEXT_H, Math.ceil(neededH))
    if (this.textCanvas.height === h) return false
    this.textCanvas.height = h
    this.texture.image = this.textCanvas
    this.mesh.geometry.dispose()
    this.mesh.geometry = new THREE.PlaneGeometry(PLANE_W, PLANE_W * h / TEXT_W, SEGS_X, SEGS_Y)
    return true
  }

  // ── Text rendering ─────────────────────────────────────────────────────

  drawText({ phrase, fontFamily, fontSize, leading, tracking, textColor, textWidth = 90, textAlign = 'center' }) {
    // In lens mode: store settings and draw static ring layout; shader handles animation
    if (this._currentEffect === 'lens') {
      this._ringPhrase      = phrase
      this._ringFontFamily  = fontFamily
      this._ringFontSize    = fontSize
      this._ringTextColor   = textColor
      this._drawRingTextNow()
      return
    }

    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw     = TEXT_W

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

    if (!phrase.trim()) {
      this._fitCanvas(TEXT_H)
      ctx.clearRect(0, 0, cw, canvas.height)
      this.texture.needsUpdate = true
      return
    }

    applyCtxState()

    const maxW         = cw * (textWidth / 100)
    const singlePhrase = phrase.trim()
    const pad          = fSize * 1.5

    const singleLines = this._wrapWords(ctx, singlePhrase, maxW, trkPx)
    const target      = this._targetCanvasH()
    const linesNeeded = Math.ceil(target / lineH)
    const repeats     = Math.max(1, Math.ceil(linesNeeded / Math.max(1, singleLines.length)))
    const fullPhrase  = Array(repeats).fill(singlePhrase).join(' ')
    const lines       = repeats > 1 ? this._wrapWords(ctx, fullPhrase, maxW, trkPx) : singleLines
    const totalH      = (lines.length - 1) * lineH + fSize

    this._fitCanvas(totalH + pad * 2)

    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)
    if (this._bgColor) {
      ctx.fillStyle = this._bgColor
      ctx.fillRect(0, 0, cw, ch)
    }

    applyCtxState()

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
    const isRings = name === 'rings'
    this.mesh.visible        = !isRings
    this.ringsPoints.visible =  isRings
    this.uniforms.uMode.value = name === 'polygon' ? 2.0 : name === 'lens' ? 3.0 : 0.0
    this._baseRotX = (name === 'rings' || name === 'lens') ? 0 : -0.22
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

  // ── Lens params ────────────────────────────────────────────────────────
  // Reuses existing uniforms: uSpeed = spin speed, uWarpAmount = distortion,
  // uHeight = dome displacement height.

  setLensParams({ speed, distortion, dome }) {
    this.uniforms.uSpeed.value      = speed
    this.uniforms.uWarpAmount.value = distortion
    this.uniforms.uHeight.value     = (dome / 100) * 2.5
  }

  // ── Loop / resize / export ─────────────────────────────────────────────

  tick(t, ptrX = 0, ptrY = 0) {
    const LERP = 0.06
    this._ptr.x += (ptrX - this._ptr.x) * LERP
    this._ptr.y += (ptrY - this._ptr.y) * LERP

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
