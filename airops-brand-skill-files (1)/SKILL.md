---
name: airops-brand
description: Apply AirOps brand guidelines to any output -- HTML/CSS components, copy, data visualizations, presentations, or documents. Use whenever the task requires on-brand visual design, writing in AirOps voice, or producing content that represents the AirOps brand.
---

# AirOps Brand System

## Overview

This skill encodes AirOps' complete brand system: colors, typography, voice, component patterns, and data viz rules. Apply it whenever producing anything that represents AirOps externally or internally.

**Keywords**: AirOps brand, on-brand, style guide, brand colors, typography, brand voice, AEO, Content Engineering, data viz, components, copy

---

## 1. Colors

### Primary Palette

| Token | Hex | Use |
|---|---|---|
| `--white` | `#ffffff` | Page backgrounds, card fills |
| `--off-white` | `#F8FFFA` | Subtle section backgrounds |
| `--near-black` | `#000d05` | Primary text on light |
| `--green-50` | `#f8fffb` | Lightest tint |
| `--green-100` | `#dfeae3` | Borders, dividers |
| `--green-200` | `#CCFFE0` | Highlight backgrounds |
| `--green-500` | `#008c44` | Primary brand green, CTAs |
| `--green-600` | `#002910` | Dark green, hero backgrounds |
| `--interaction` | `#00ff64` | Neon green -- hover states, interactive accents |
| `--accent-label` | `#EEFF8C` | Pill/tag labels, DM Mono text only |

### Text Colors

| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#09090b` | Body copy |
| `--text-secondary` | `#676c79` | Captions, metadata |
| `--text-tertiary` | `#a5aab6` | Disabled, placeholder |

### Strokes

| Token | Hex | Use |
|---|---|---|
| `--stroke-primary` | `#ecedef` | General borders |
| `--stroke-green` | `#d4e8da` | On-green-tinted surfaces |

### Dark Mode / Hero Surfaces

- Background: `#0b0e16` (near black with blue undertone)
- Text on dark: `#ffffff`
- Accent on dark: `#00ff64` (interaction green) or `#EEFF8C` (label yellow)

---

## 2. Fonts

Font files are stored alongside this skill. Reference them with `@font-face` in any HTML/CSS output:

```css
@font-face {
  font-family: 'Serrif VF';
  src: url('SerrifVF.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
}

@font-face {
  font-family: 'Saans';
  src: url('Saans-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Saans';
  src: url('Saans-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
}

@font-face {
  font-family: 'Saans';
  src: url('Saans-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
}

@font-face {
  font-family: 'Saans Mono';
  src: url('SaansMono-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
}
```

> **Note:** When using these fonts in HTML artifacts or local files, adjust the `url()` path to match the relative location of the font files. If fonts are unavailable, fall back to `Georgia, serif` (headlines), `Helvetica Neue, sans-serif` (body), and `DM Mono, monospace` (labels).

---

## 3. Typography

### Typefaces

| Variable | Font | Fallback | Use |
|---|---|---|---|
| `--font-sans` | Saans | Helvetica Neue, sans-serif | UI, body copy, all running text |
| `--font-serif` | Serrif VF | Georgia, serif | Large editorial headlines only |
| `--font-mono` | Saans Mono | DM Mono, monospace | Labels, pills, tags, code, axis values |

> **Important:** Serrif VF is the licensed full font (not Trial). Always reference as `'Serrif VF'`.

### Type Scale

| Style | Font | Size | Weight | Tracking | Line Height |
|---|---|---|---|---|---|
| Display / H1 | Serrif VF | 96px | 400 | -0.02em | 1.0 |
| H2 | Serrif VF | 56px | 400 | -0.02em | 1.1 |
| H3 | Serrif VF | 40px | 400 | -0.02em | 1.04 |
| H4 / Section Title | Saans | 28px | 600 | -0.01em | 1.2 |
| H5 | Saans | 20px | 600 | 0 | 1.3 |
| Body Large | Saans | 18px | 400 | 0 | 1.6 |
| Body | Saans | 16px | 400 | 0 | 1.5 |
| Small / Caption | Saans | 14px | 400 | 0 | 1.4 |
| Label / Pill | Saans Mono / DM Mono | 11-12px | 500 | 0.08em | 1 |

### CSS Quick Reference

```css
/* Large Headlines -- Serrif VF */
.headline { font-family: 'Serrif VF', Georgia, serif; font-weight: 400; letter-spacing: -0.02em; }

/* UI / Body -- Saans */
.body { font-family: 'Saans', 'Helvetica Neue', sans-serif; }

/* Labels / Pills -- Saans Mono */
.label { font-family: 'Saans Mono', 'DM Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
```

---

## 3. Voice & Copy

### Brand Personality

- **Direct** -- Say what you mean. No fluff, no filler. Lead with the value.
- **Sharp** -- Short sentences. Strong verbs. Active voice always.
- **Expert** -- We know AEO. Use the right terminology confidently.
- **Human** -- Warm but never corporate. We're people talking to people.

### Do / Don't

| Do | Don't |
|---|---|
| "See exactly where your content gets cited by AI." | "Leveraging next-generation AI-powered solutions..." |
| "AirOps tracks AI citations so you can optimize what actually matters." | "Our comprehensive, robust platform enables teams to synergize..." |
| "You're losing AI visibility. Here's why, and how to fix it." | "We are excited to announce our groundbreaking new feature..." |

### Punctuation & Formatting Rules

- **En dash** (--) for ranges and pauses: "10--20 citations". Never use em dash (--)
- **Sentence case** for headlines: "AEO is the new SEO" not "AEO Is The New SEO"
- **Oxford comma**: "ChatGPT, Gemini, and Perplexity"
- **Product names always capitalized**: AirOps, Page360, Citations360, Brand Kit, AEO, Offsite
- **CTA copy**: short imperatives -- "Get a demo" / "Start free" / "See it live" / "Book a call"
- **Never**: "Click here to learn more about our platform"
- **Banned words**: synergize, robust, comprehensive, seamless, leverage (as a verb), supercharge, groundbreaking, revolutionary

### Positioning Language

AirOps owns the **Content Engineering** and **Answer Engine Optimization (AEO)** categories. Always:
- Use "Content Engineer" to describe the role of AirOps customers
- Refer to AI search visibility as "AEO" not "AI SEO" or "LLM SEO"
- Lead with outcomes: citations, visibility, traffic -- not features

---

## 4. Components

### Pill / Label Tag

Sharp corners (no border-radius). `#EEFF8C` fill. DM Mono or Saans Mono, all-caps, 11px, weight 500. `#000d05` text.

```css
.pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: #EEFF8C;
  border: 1px solid #d4e8da;
  border-radius: 0;
  font-family: 'Saans Mono', 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #000d05;
}
```

### Cards

White background. 1px `#d4e8da` border. No border-radius (sharp corners). Subtle shadow optional: `0 1px 4px rgba(0,0,0,0.06)`.

```css
.card {
  background: #ffffff;
  border: 1px solid #d4e8da;
  border-radius: 0;
  padding: 24px;
}
```

### Buttons

- **Primary**: `#000d05` bg, `#ffffff` text, no radius
- **Secondary**: `#ffffff` bg, `#000d05` border + text, no radius
- **Accent**: `#00ff64` bg, `#000d05` text, no radius

```css
.btn-primary { background: #000d05; color: #fff; border: none; padding: 12px 24px; border-radius: 0; font-family: var(--font-sans); font-weight: 600; cursor: pointer; }
.btn-accent   { background: #00ff64; color: #000d05; border: none; padding: 12px 24px; border-radius: 0; font-weight: 600; cursor: pointer; }
```

---

## 5. Data Visualization

AirOps data viz has a strict rule set. **Never deviate.**

### Rules

1. **Sharp corners only** -- no rounded bars, no rounded chart containers
2. **Green spectrum palette** -- `#eef8f0` through `#0a2e14` for fills
3. **Accent highlight** -- `#00e676` for the primary data series or the most important value
4. **Label accent** -- `#EEFF8C` with `#000d05` text for pill callouts
5. **Georgia or Serrif VF** for chart headlines (40--56px, tracking -0.02em)
6. **DM Mono all-caps** for all axis labels, value callouts, tick marks, and pill tags
7. **White background** (`#ffffff`) for chart area
8. **1px `#d4e8da` border** on chart containers
9. **No gradients** in bars or lines -- flat fills only

### Color Ramp (light to dark)

```
#eef8f0  --  lightest tint (backgrounds)
#CCFFE0  --  light green
#00e676  --  accent / highlight series
#008c44  --  mid green
#005c2e  --  dark green
#002910  --  deepest green
#0a2e14  --  near black green
```

### CSS Template

```css
.chart-container {
  background: #ffffff;
  border: 1px solid #d4e8da;
  border-radius: 0;
  padding: 32px;
  font-family: 'DM Mono', monospace;
}
.chart-headline {
  font-family: 'Serrif VF', Georgia, serif;
  font-size: 40px;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: #000d05;
}
.chart-axis-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #676c79;
}
.chart-value-pill {
  background: #EEFF8C;
  color: #000d05;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 0;
}
```

---

## 6. Logo Usage

- **On white**: Full color AirOps wordmark -- use `fill="#001408"` (as below)
- **On dark**: White reversed wordmark -- swap fill to `fill="#ffffff"`
- **Minimum clear space**: equal to the height of the "A" in AirOps on all sides
- **Never**: stretch, rotate, recolor, add effects, or place on busy backgrounds

### SVG (dark -- for light backgrounds)

```svg
<svg width="784" height="252" viewBox="0 0 784 252" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M111.828 65.6415V88.4663C101.564 72.0112 85.627 61.9258 65.9084 61.9258C23.7703 61.9258 0 92.9782 0 134.647C0 176.581 24.0404 208.695 66.4487 208.695C86.1672 208.695 101.834 198.609 111.828 182.154V204.979H144.782V65.6415H111.828ZM72.9315 181.093C48.8911 181.093 35.1152 159.064 35.1152 134.647C35.1152 110.76 48.621 89.7933 73.4717 89.7933C94.0006 89.7933 111.558 104.391 111.558 134.116C111.558 163.31 94.8109 181.093 72.9315 181.093Z" fill="#001408"/>
<path d="M173.137 65.6494V204.987H208.252V65.6494H173.137Z" fill="#001408"/>
<path d="M272.998 100.141V65.6386H237.883V204.976H272.998V125.355C272.998 104.919 287.314 96.691 300.82 96.691C308.653 96.691 316.757 98.8143 321.079 100.407V63.25C298.119 63.25 279.211 76.7856 272.998 100.141Z" fill="#001408"/>
<path d="M329.629 108.115C329.629 151.377 359.882 182.163 403.371 182.163C447.13 182.163 477.115 151.377 477.115 108.115C477.115 65.6507 447.13 35.3945 403.371 35.3945C359.882 35.3945 329.629 65.6507 329.629 108.115ZM441.997 108.115C441.997 135.187 427.141 154.561 403.371 154.561C379.33 154.561 364.744 135.187 364.744 108.115C364.744 82.1058 379.33 63.2621 403.371 63.2621C427.141 63.2621 441.997 82.1058 441.997 108.115Z" fill="#001408"/>
<path d="M575.086 61.9258C554.557 61.9258 537.81 73.869 528.896 92.9782V65.6415H493.781V251.425H528.896V180.031C538.891 197.282 557.529 208.695 577.247 208.695C615.604 208.695 642.345 179.235 642.345 137.035C642.345 92.7128 614.523 61.9258 575.086 61.9258ZM568.874 182.685C545.374 182.685 528.896 163.31 528.896 135.708C528.896 107.31 545.374 87.4047 568.874 87.4047C591.293 87.4047 607.23 107.841 607.23 136.77C607.23 163.841 591.293 182.685 568.874 182.685Z" fill="#001408"/>
<path d="M653.555 156.675C653.555 181.889 676.244 208.695 721.624 208.695C767.274 208.695 783.751 182.42 783.751 161.983C783.751 130.666 746.205 125.092 721.084 120.315C704.066 117.395 693.262 115.007 693.262 105.452C693.262 94.5706 705.417 87.6701 718.383 87.6701C735.94 87.6701 742.693 99.6133 743.233 112.353H778.349C778.349 91.6511 763.492 61.9258 717.572 61.9258C677.865 61.9258 658.147 83.9544 658.147 107.575C658.147 141.282 696.233 144.732 721.354 149.509C735.94 152.163 748.636 155.348 748.636 165.699C748.636 176.05 736.21 182.95 722.975 182.95C710.549 182.95 688.67 176.05 688.67 156.675H653.555Z" fill="#001408"/>
<path d="M191.339 48.6576C176.921 48.6576 166.578 38.4949 166.578 24.6368C166.578 10.7786 176.921 0 191.339 0C205.13 0 216.1 10.7786 216.1 24.6368C216.1 38.4949 205.13 48.6576 191.339 48.6576Z" fill="#001408"/>
</svg>
```

### SVG (white -- for dark/green backgrounds)

To reverse for dark surfaces, replace all `fill="#001408"` with `fill="#ffffff"`.

---

## 7. Spacing Scale

Base unit: 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
--space-32: 128px;
```

---

## How to Apply This Skill

**For HTML/CSS components**: Reference the color tokens, typography rules, and component patterns above. Always: sharp corners, green palette, Serrif VF for headlines, Saans for body, DM Mono for labels.

**For copy**: Write direct, sharp, expert, human. Active voice. Sentence case. No em dashes. No banned words. Use AEO and Content Engineering category language.

**For data viz**: Strict green palette. Sharp corners. Georgia/Serrif VF headlines. DM Mono labels all-caps. #EEFF8C pill accents. White background. 1px green border.

**For presentations/documents**: Apply green palette and typography hierarchy. Use Serrif VF for cover/section headlines. Saans for body. Pill labels with #EEFF8C. No rounded corners on shapes.
