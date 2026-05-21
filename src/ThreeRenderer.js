import * as THREE from 'three'

// ── Shaders ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uFrequency;
  uniform float uMode;    // 0 = wave, 1 = kaleidoscope

  varying vec2 vUv;

  const float PI = 3.14159265359;

  void main() {
    vUv = uv;
    vec3 pos = position;

    if (uMode < 0.5) {
      float phase = uv.x * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
      float wave  = sin(phase);
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
  uniform float uKSpeed;
  uniform float uKZoom;
  uniform float uKRadius;
  varying vec2 vUv;

  const float PI = 3.14159265359;

  void main() {
    if (uMode < 0.5) {
      gl_FragColor = texture2D(uTexture, vUv);
      return;
    }

    // Screen-square coordinates: x × 2 to account for 2:1 plane aspect
    vec2 ps = (vUv - 0.5) * vec2(2.0, 1.0);

    // ── Hexagram clip ────────────────────────────────────────────────────
    // Union of two equilateral triangles (circumradius = uKRadius):
    //   T1 points up  — tip at (0, +R)
    //   T2 points down — tip at (0, −R)
    float R = uKRadius;
    bool inT1 = ps.y >= -R * 0.5 && sqrt(3.0) * abs(ps.x) + ps.y <= R;
    bool inT2 = ps.y <=  R * 0.5 && sqrt(3.0) * abs(ps.x) - ps.y <= R;
    if (!inT1 && !inT2) { gl_FragColor = vec4(0.0); return; }

    // ── Inner void ───────────────────────────────────────────────────────
    if (length(ps) < uKInnerR) { gl_FragColor = vec4(0.0); return; }

    // ── Polar fold — spinning rotation over time ─────────────────────────
    float r     = length(ps) / uKZoom;
    float theta = atan(ps.y, ps.x) + uTime * uKSpeed * PI * 2.0;

    // Fold into one 60-degree segment, then mirror → 6 symmetric slices
    float seg = PI / 3.0;
    theta = mod(theta, seg);
    if (theta > seg * 0.5) theta = seg - theta;

    // Reconstruct and convert back to UV space (fract tiles the texture)
    vec2 q  = vec2(cos(theta), sin(theta)) * r;
    vec2 uv = fract(q / vec2(2.0, 1.0) + 0.5);

    gl_FragColor = texture2D(uTexture, uv);
  }
`

// ── Constants ──────────────────────────────────────────────────────────────

// Text canvas: 2:1 aspect, 2× oversample for sharp text
const TEXT_W = 2048
const TEXT_H = 1024

// Plane: same 2:1 aspect in world units, subdivided heavily for smooth deformation
const PLANE_W = 4.0
const PLANE_H = 2.0
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
    this.renderer.setClearColor(0x000000, 1)  // always pure black
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

    // Plane mesh with wave shader
    const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, SEGS_X, SEGS_Y)

    this.uniforms = {
      uTexture:   { value: this.texture },
      uTime:      { value: 0 },
      uHeight:    { value: 0.3 },
      uSpeed:     { value: 0.2 },
      uFrequency: { value: 1.0 },
      uMode:      { value: 0.0 },
      uKSpeed:    { value: 0.05 },
      uKZoom:     { value: 0.4 },
      uKRadius:   { value: 0.42 },
      uKInnerR:   { value: 0.13 },
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
  }

  // ── Text rendering ─────────────────────────────────────────────────────

  drawText({ phrase, fontFamily, fontSize, leading, tracking, textColor, textWidth = 90, arcMode = false, arcRadius = 0.28 }) {
    if (arcMode) return this._drawTextTile({ phrase, fontFamily, fontSize, textColor })

    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw     = canvas.width
    const ch     = canvas.height

    // 2× oversample: all measurements in canvas pixels = value * 2
    const scale  = 2
    const fSize  = fontSize * scale
    const trkPx  = tracking * scale
    const lineH  = fSize * leading

    // Clear to transparent — no background box around the text
    ctx.clearRect(0, 0, cw, ch)

    if (!phrase.trim()) { this.texture.needsUpdate = true; return }

    ctx.font          = `400 ${fSize}px ${fontFamily}`
    ctx.letterSpacing = '0px'
    ctx.textBaseline  = 'alphabetic'
    ctx.textAlign     = 'left'

    const maxW   = cw * (textWidth / 100)
    const lines  = this._wrapWords(ctx, phrase.trim(), maxW, trkPx)
    const totalH = (lines.length - 1) * lineH + fSize
    const blockY = (ch - totalH) / 2

    ctx.fillStyle = textColor
    this.charPositions = []

    lines.forEach((line, li) => {
      const chars  = [...line]
      const lineW  = this._measureLine(ctx, line, trkPx)
      let   curX   = (cw - lineW) / 2
      const baseY  = blockY + li * lineH + fSize * 0.78
      const widths = chars.map(c => ctx.measureText(c).width)

      chars.forEach((char, ci) => {
        // Store centre-ish position (canvas px) for Lottie export
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

  // ── Tiled text (kaleidoscope mode) ────────────────────────────────────
  // Fills the whole canvas with brick-offset rows of the phrase.
  // The kaleidoscope's 6-fold polar fold then transforms these horizontal
  // rows into diagonal bands — one set per star sector — matching the
  // reference hexagram look.
  _drawTextTile({ phrase, fontFamily, fontSize, textColor }) {
    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw = canvas.width, ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)
    if (!phrase.trim()) { this.texture.needsUpdate = true; return }

    const fSize = fontSize * 2          // 2× oversample
    const lineH = fSize * 1.15          // tight rows → denser star fill

    ctx.font          = `400 ${fSize}px ${fontFamily}`
    ctx.fillStyle     = textColor
    ctx.textBaseline  = 'alphabetic'
    ctx.textAlign     = 'left'
    ctx.letterSpacing = '0px'

    // Single tile = phrase + word-spacing gap
    const tile  = phrase.trim() + '   '
    const tileW = ctx.measureText(tile).width

    for (let row = 0; row * lineH < ch + lineH; row++) {
      const y      = row * lineH + fSize * 0.8
      const xShift = (row % 2) * (tileW / 2)   // brick-pattern half-offset

      for (let x = -tileW + xShift; x < cw + tileW; x += tileW) {
        ctx.fillText(tile, x, y)
      }
    }

    this.charPositions = []
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
    this.uniforms.uMode.value = name === 'kaleidoscope' ? 1.0 : 0.0
    // Remove tilt in kaleidoscope mode so the hex is centred and undistorted
    this.mesh.rotation.x = name === 'kaleidoscope' ? 0.0 : -0.22
  }

  setKaleidoscopeParams({ speed, zoom, radius, innerR }) {
    this.uniforms.uKSpeed.value  = speed
    this.uniforms.uKZoom.value   = zoom
    this.uniforms.uKRadius.value = radius
    this.uniforms.uKInnerR.value = innerR
  }

  // ── Wave params ────────────────────────────────────────────────────────

  setWaveParams({ height, speed, frequency }) {
    // height 0–100% → world units
    // At 100%, Z displacement = 2.5 * 1.6 = 4.0 world units — nearly fills camera-to-near-clip distance
    // At 50% (default), crest is ~1.9× apparent size of trough
    this.uniforms.uHeight.value    = (height / 100) * 2.5
    this.uniforms.uSpeed.value     = speed
    this.uniforms.uFrequency.value = frequency
  }

  // ── Loop / resize / export ─────────────────────────────────────────────

  tick(t) {
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
