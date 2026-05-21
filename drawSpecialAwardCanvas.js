import { buildLogo } from './drawCanvas.js'

// ── Color constants (from Figma SpecialAward component)
const BG       = '#FFE2E2'  // light pink background
const TEXT_COL = '#000D05'  // near-black text
const UNI_COL  = '#FFCBCB'  // light pink "University" text
const SEAL_COL = '#B5C7D4'  // blue-gray inner seal circle

// Figma card dimensions (SpecialAward component)
const FIG_W = 803
const FIG_H = 452

export function drawSpecialAwardCanvas(canvas, settings, fontsReady) {
  const {
    dims,
    saRecipient = 'Ariana Opera',
    saTrack     = 'Content',
    saCertTitle = 'Engineering',
    saCertLevel = 'Certification 3',
    saDate      = 'June 2026',
  } = settings

  const cw  = dims.w
  const ch  = dims.h
  const dpr = settings.dpr ?? 1

  canvas.width  = cw * dpr
  canvas.height = ch * dpr
  const ctx = canvas.getContext('2d')
  if (dpr !== 1) ctx.scale(dpr, dpr)

  const s     = cw / FIG_W
  const serif = fontsReady ? "'Serrif VF', Georgia, serif"    : 'Georgia, serif'
  const sans  = fontsReady ? "'Saans', system-ui, sans-serif" : 'system-ui, sans-serif'
  const mono  = fontsReady ? "'Saans Mono', monospace"        : 'monospace'
  const scr   = fontsReady ? "'Saraband', cursive"            : 'cursive'

  // ── Background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, cw, ch)

  // ── Watermark (hexagonal text pattern, center)
  drawWatermark(ctx, cw, ch, s, saTrack, serif)

  // ── "CERTIFICATION OF" — Saans Mono 500, centered, y=20
  {
    const sz = Math.round(28.2 * s)
    ctx.font          = `500 ${sz}px ${mono}`
    ctx.letterSpacing = `${2 * s}px`
    ctx.fillStyle     = TEXT_COL
    ctx.textBaseline  = 'top'
    ctx.textAlign     = 'center'
    ctx.fillText('CERTIFICATION OF', cw / 2, Math.round(20 * s))
    ctx.letterSpacing = '0px'
  }

  // ── Top Left: course track name in Saraband (calligraphic)
  {
    const sz = Math.round(55 * s)
    ctx.font         = `400 ${sz}px ${scr}`
    ctx.fillStyle    = TEXT_COL
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'left'
    ctx.fillText(saTrack, Math.round(20 * s), Math.round(52 * s))
  }

  // ── Top Right: cert title (Serrif VF, large) + cert level (Saans Bold), right-aligned
  {
    const titleSz = Math.round(55 * s)
    ctx.font          = `400 ${titleSz}px ${serif}`
    ctx.letterSpacing = `${-1 * s}px`
    ctx.fillStyle     = TEXT_COL
    ctx.textBaseline  = 'top'
    ctx.textAlign     = 'right'
    ctx.fillText(saCertTitle, Math.round((FIG_W - 20) * s), Math.round(52 * s))
    ctx.letterSpacing = '0px'

    const levelSz = Math.round(28 * s)
    ctx.font = `700 ${levelSz}px ${sans}`
    ctx.fillText(saCertLevel, Math.round((FIG_W - 20) * s), Math.round(121 * s))
  }

  // ── Bottom Left: "Conferred to" + recipient name
  {
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'left'
    ctx.fillStyle    = TEXT_COL
    ctx.font = `400 ${Math.round(28.2 * s)}px ${serif}`
    ctx.fillText('Conferred to', Math.round(20 * s), Math.round(366 * s))
    ctx.font = `600 ${Math.round(28.6 * s)}px ${sans}`
    ctx.fillText(saRecipient, Math.round(20 * s), Math.round(398 * s))
  }

  // ── Bottom Right: "Dated" + date
  {
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'right'
    ctx.fillStyle    = TEXT_COL
    ctx.font = `400 ${Math.round(28.2 * s)}px ${serif}`
    ctx.fillText('Dated', Math.round((FIG_W - 20) * s), Math.round(366 * s))
    ctx.font = `400 ${Math.round(28.6 * s)}px ${sans}`
    ctx.fillText(saDate, Math.round((FIG_W - 20) * s), Math.round(398 * s))
  }

  // ── Seal (bottom center — partially clips at canvas edge per Figma)
  drawSeal(ctx, s, serif, sans)

  // Reset
  ctx.textAlign     = 'left'
  ctx.textBaseline  = 'top'
  ctx.letterSpacing = '0px'
}

// Hexagonal text watermark — track name repeated in radiating rings
function drawWatermark(ctx, cw, ch, s, trackName, serif) {
  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'center'
  ctx.fillStyle    = '#C06060'

  const cx = cw * 0.5
  const cy = ch * 0.47

  const rings = [
    { r: 0,       n: 1,  sz: Math.round(180 * s), alpha: 0.07 },
    { r: 190 * s, n: 5,  sz: Math.round(100 * s), alpha: 0.09 },
    { r: 330 * s, n: 7,  sz: Math.round(68 * s),  alpha: 0.11 },
    { r: 460 * s, n: 10, sz: Math.round(50 * s),  alpha: 0.13 },
  ]

  for (const { r, n, sz, alpha } of rings) {
    ctx.globalAlpha = alpha
    ctx.font = `400 ${sz}px ${serif}`
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i / n) - Math.PI / 2
      const tx = cx + r * Math.cos(angle)
      const ty = cy + r * Math.sin(angle)
      ctx.save()
      ctx.translate(tx, ty)
      ctx.rotate(angle + Math.PI / 2)
      ctx.fillText(trackName, 0, 0)
      ctx.restore()
    }
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

// Seal: star burst + inner circle + circular text + airops logo + "University"
// Figma: pos(313,313) size(179×179) within card — overflows bottom edge (clipped by canvas)
function drawSeal(ctx, s, serif, sans) {
  // Seal center at card-relative (402.5, 402.5) — horizontally centered on 1920px canvas
  const sealCX = Math.round(402.5 * s)
  const sealCY = Math.round(402.5 * s)
  const sealR  = Math.round(89.5 * s)   // outer star radius
  const innerR = Math.round(58.5 * s)   // Ellipse 8 radius (117px diameter in Figma)

  // Star burst (subtle radial gradient, pink tones)
  {
    const grad = ctx.createRadialGradient(sealCX, sealCY, innerR, sealCX, sealCY, sealR)
    grad.addColorStop(0, 'rgba(230,185,185,0.55)')
    grad.addColorStop(1, 'rgba(255,226,226,0)')
    ctx.fillStyle = grad
    drawStarPolygon(ctx, sealCX, sealCY, sealR, 20, 0.93)
  }

  // Inner filled circle (blue-gray from Figma: rgba(0.71,0.78,0.83,1))
  ctx.beginPath()
  ctx.arc(sealCX, sealCY, innerR, 0, Math.PI * 2)
  ctx.fillStyle = SEAL_COL
  ctx.fill()

  // Circular text along inner circle edge
  {
    const textSz = Math.round(11 * s)
    const textR  = innerR - Math.round(textSz * 0.7)
    ctx.font         = `400 ${textSz}px ${serif}`
    ctx.fillStyle    = TEXT_COL
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'center'
    drawCircularText(ctx, 'Craft quality content   •   Build Systems That WiN  •', sealCX, sealCY, textR)
  }

  // AirOps logo (vector paths via buildLogo)
  // Figma: pos(356,374) size(89×29) in card → centered on sealCX
  {
    const logoH = Math.round(29 * s)
    const logoW = Math.round(logoH * 784 / 252)
    const bmp   = buildLogo(TEXT_COL, logoH)
    const logoX = sealCX - Math.round(logoW / 2)
    const logoY = Math.round(374 * s)
    ctx.drawImage(bmp, logoX, logoY, logoW, logoH)
  }

  // "University" text — Serrif VF 400, pink, at card-relative y=402
  // Figma: pos(343,402) size(119×27) — centered on sealCX
  {
    const sz = Math.round(27 * s)
    ctx.font         = `400 ${sz}px ${serif}`
    ctx.fillStyle    = UNI_COL
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'center'
    ctx.fillText('University', sealCX, Math.round(402 * s))
    ctx.textAlign = 'left'
  }
}

function drawStarPolygon(ctx, cx, cy, r, points, innerRatio) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a   = (Math.PI * i / points) - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * innerRatio
    const x   = cx + rad * Math.cos(a)
    const y   = cy + rad * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawCircularText(ctx, text, cx, cy, r) {
  const chars  = [...text]
  const widths = chars.map(c => ctx.measureText(c).width)
  const total  = widths.reduce((a, b) => a + b, 0)
  let   angle  = -Math.PI / 2 - total / r / 2

  for (let i = 0; i < chars.length; i++) {
    const half = widths[i] / r / 2
    angle += half
    ctx.save()
    ctx.translate(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
    ctx.rotate(angle + Math.PI / 2)
    ctx.fillText(chars[i], 0, 0)
    ctx.restore()
    angle += half
  }
}
