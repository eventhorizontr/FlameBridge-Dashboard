# Design System — "Orbital Glass" (ADR-020; evolves "Orbital Instrument")

**North star:** the calm precision of a flight-control console meeting the beauty of a blue
microgravity flame. Dark, quiet, exact — with light and colour reserved for *data* and *fire*.
Not neon cyberpunk, not a template dashboard.

Tokens live in [`src/app/globals.css`](../src/app/globals.css). **Components use tokens only.**

## 1. Principles
1. **Data is the brightest thing on screen.** Chrome recedes (low-contrast surfaces, hairlines).
2. **Every pixel earns its place.** Fewer panels, more whitespace, progressive disclosure.
3. **Motion explains, never decorates.** Transitions show causality (filter → chart morph,
   timeline scrub → flame frame). Respect `prefers-reduced-motion`.
4. **Honesty is visible.** Uncertainty, nulls, QA flags and sources have first-class styling.
5. **Two modes, one language.** Expert = dense, numeric, keyboard-first. Explore & Learn =
   narrative, larger type, guided steps. Same tokens, different density.

## 2. Colour
| Token | Value | Use |
|---|---|---|
| `--bg` | `#04060b` | app background; layered radial glows + faint 64 px grid on `body` |
| `--bg-raise` | `#080c16` | solid raised chrome (nav pills, inner buttons) |
| `--surface-1` | `rgb(17 23 37 / 0.62)` | glass panels (with `backdrop-blur-xl`, inset top highlight) |
| `--surface-2` | `rgb(23 31 49 / 0.62)` | raised glass, chart surface — composites to ≈ `#101623`, within one step of the validated `#0f1520` |
| `--surface-3` | `rgb(33 43 66 / 0.66)` | hover, inputs, active pills |
| `--line` | `rgb(165 185 225 / 0.1)` | hairline borders, grid |
| `--line-strong` | `rgb(165 185 225 / 0.2)` | focused borders, axes |
| `--text-1` | `#edf1f8` | primary text |
| `--text-2` | `#a9b3c4` | secondary |
| `--text-3` | `#8590a3` | muted / captions — ≥ 4.5:1 on every surface (WCAG AA) |
| `--accent` | `#7cc4ff` | "microgravity blue" — interactive, focus, selection |
| `--accent-soft` | `rgb(124 196 255 / 0.14)` | selection fills |
| `--grad-flame` | `#ffcf6e → #ff8a3d → #ff4f7b` | primary CTAs and the headline accent only (`.text-flame`) |
| `.glass` | translucent + blur 18 px | floating hero / stat cards |
| `--flame-core` | `#9fd4ff` | flame visual only (blue μg flame core) |
| `--flame-edge` | `#ff8a3d` | flame visual only (soot / luminous edge) |
| `--ember` | `#ff6b2c` | rare emphasis: ignition / extinction events |

Status (reserved, always with icon + label): good `#0ca30c`, warning `#fab219`,
serious `#ec835a`, critical `#d03b3b`.

### Data-viz palettes (validated with the dataviz validator on `--surface-2`, dark)
- **Categorical (fixed order, never cycled):** `--series-1..6` =
  `#3987e5` `#d95926` `#199e70` `#c98500` `#d55181` `#0ca30c` — all checks pass (adjacent CVD ΔE ≥ 8.4).
  Default mapping: **PI** (Bhattacharjee, Miller, Olson, Fernandez-Pello, T'ien, Ferkul) for
  line/bar/legend contexts.
- **Scatter / all-pairs contexts: max 3 series** (`--series-1..3`, all-pairs ΔE ≥ 9.4).
  Encode **fuel family** (thin film/slab · rod · fabric/other) — never 6 PIs in one scatter;
  use small multiples or shape for PI.
- **Sequential:** single blue ramp (`--seq-100 … --seq-700`) for O₂ %, flow speed, intensity.
- **Diverging:** blue ↔ red with neutral `#383835` midpoint (e.g. Δ vs closest experiment).
- Text never wears series colour; colour marks sit beside neutral labels.

## 3. Typography
- **UI / display:** Geist (variable). Display sizes use `letter-spacing: -0.02em`.
- **Numbers, units, IDs, code:** Geist Mono with `font-variant-numeric: tabular-nums`.
- Scale (rem): 0.75 caption · 0.8125 label · 0.875 body-sm · 1 body · 1.25 h4 · 1.5 h3 ·
  2 h2 · 3 h1 · 4.5 hero. Line-height 1.5 body, 1.1 display.
- Labels for instruments: uppercase, 0.6875rem, `letter-spacing: 0.08em`, `--text-3`.
- Always typeset units: `21.0 % O₂`, `5 cm/s`, `0.2 mm`. Thin space before units in Expert mode.

## 4. Space, radius, elevation
- 4 px grid: `--space-1` 4 … `--space-12` 48, `--space-16` 64.
- Radius: `--radius-sm` 6, `--radius-md` 10, `--radius-lg` 16, `--radius-xl` 24.
- Elevation by **luminance + hairline**, not heavy shadows. Glass only for overlays
  (assistant, command palette): `backdrop-filter: blur(16px)` on `rgb(11 16 25 / 0.72)`.
- Layout: 12-col grid, max content 1600 px, gutters 24 px (16 px < 768 px).

## 5. Motion
- Durations: `--dur-1` 120 ms (hover), `--dur-2` 220 ms (UI), `--dur-3` 420 ms (layout/charts),
  `--dur-4` 800 ms (hero/storytelling).
- Easing: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`.
- Charts morph between states (shared scales); never re-mount with a flash.
- `prefers-reduced-motion: reduce` → opacity-only transitions, no parallax, no autoplay.

## 6. Signature components (to build)
| Component | Notes |
|---|---|
| **App shell** | slim left rail (icons + labels on hover), top context bar (dataset · mode switch · ⌘K), right docked AI assistant (collapsible) |
| **Mode switch** | Expert ⇄ Explore & Learn; animated pill; persisted in URL |
| **Experiment matrix** | dense, sortable, virtualized table; inline sparkline of flow set-points; QA badge |
| **Parameter-space map** | O₂ % × flow speed scatter, colour = fuel family, size = thickness/diameter; brushing filters everything |
| **Flame viewer** | NASA video + synchronized timeline, frame stepping (←/→), playback rate, scrubber with event markers (ignition, flow change, extinction), A/B compare split |
| **What-if Lab** | parameter sliders with *data-coverage* shading (where real experiments exist), closest-match cards with distance + differences, "outside measured envelope" warning |
| **Evidence chip** | inline source tag (PSI file / DOI) on every number; hover = provenance popover |
| **QA badge** | amber outline + flag count; popover lists flags verbatim |
| **Command palette (⌘K)** | jump to experiment, run AI action, switch mode |
| **AI assistant panel** | streaming answers with evidence chips; tool-call timeline ("Filtered to PMMA rods · Opened O13a"); every UI action it takes is visible and undoable |

## 7. Accessibility
WCAG 2.2 AA: text contrast ≥ 4.5:1 (`--text-2` on `--surface-1` passes), focus ring
2 px `--accent` + 2 px offset, every chart has a table view and `aria-describedby` summary,
keyboard for all interactions, target size ≥ 24 px.
