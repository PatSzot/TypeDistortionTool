import * as THREE from 'three'

// ── Shaders ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uFrequency;

  varying vec2 vUv;

  const float PI = 3.14159265359;

  void main() {
    vUv = uv;
    vec3 pos = position;

    float phase = uv.x * uFrequency * PI * 2.0 - uTime * uSpeed * PI * 2.0;
    float wave  = sin(phase);

    // Z is the PRIMARY displacement — pushes the surface aggressively toward
    // and away from the camera. The perspective camera then does all the work:
    // vertices close to the camera appear much larger (fisheye crest),
    // vertices far away appear much smaller (trough). No fake scale needed.
    pos.z += wave * uHeight * 1.6;

    // Y is SECONDARY — gives the visible up/down undulation of the flag ribbon
    pos.y += wave * uHeight * 0.45;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */`
  uniform sampler2D uTexture;
  varying vec2 vUv;

  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
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
    }

    const mat = new THREE.ShaderMaterial({
      uniforms:       this.uniforms,
      vertexShader:   VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side:           THREE.DoubleSide,
    })

    this.mesh = new THREE.Mesh(geo, mat)
    // Tilt the plane so we're looking at it from slightly above —
    // gives the 3D depth angle visible in the reference images
    this.mesh.rotation.x = -0.22
    this.scene.add(this.mesh)
  }

  // ── Text rendering ─────────────────────────────────────────────────────

  drawText({ phrase, fontFamily, fontSize, leading, tracking, textColor, bgColor }) {
    const canvas = this.textCanvas
    const ctx    = canvas.getContext('2d')
    const cw     = canvas.width
    const ch     = canvas.height

    // 2× oversample: all measurements in canvas pixels = value * 2
    const scale  = 2
    const fSize  = fontSize * scale
    const trkPx  = tracking * scale
    const lineH  = fSize * leading

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, cw, ch)

    if (!phrase.trim()) { this.texture.needsUpdate = true; return }

    ctx.font          = `400 ${fSize}px ${fontFamily}`
    ctx.letterSpacing = '0px'
    ctx.textBaseline  = 'alphabetic'
    ctx.textAlign     = 'left'

    const pad    = 80 * scale
    const maxW   = cw - pad * 2
    const lines  = this._wrapWords(ctx, phrase.trim(), maxW, trkPx)
    const totalH = (lines.length - 1) * lineH + fSize
    const blockY = (ch - totalH) / 2

    ctx.fillStyle = textColor

    lines.forEach((line, li) => {
      const chars  = [...line]
      const lineW  = this._measureLine(ctx, line, trkPx)
      let   curX   = (cw - lineW) / 2
      const baseY  = blockY + li * lineH + fSize * 0.78
      const widths = chars.map(c => ctx.measureText(c).width)

      chars.forEach((char, ci) => {
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
