# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/cs2-tournament/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** CS2 Tournament
**Generated:** 2026-10-23 (ui-ux-pro-max `--design-system`, then curated — see "Deviations")
**Category:** Esports / live sports results (content-first, data-dense)
**Design Dials:** Motion 3/10 (Subtle) | Density 7/10 (Standard)
**UI language:** Mongolian (Cyrillic incl. Ө ө Ү ү) — every font MUST cover these glyphs.

---

## Deviations from raw generator output (and why)

| Generator said | We use | Reason |
|---|---|---|
| Neon purple `#7C3AED` + rose | CS2 orange + CT blue / T gold on gunmetal | Brief explicitly bans generic purple AI gradients; orange/blue/gold are CS2's own visual language |
| 3D & Hyperrealism, WebGL, parallax | Dark Mode (OLED) + Data-Dense Dashboard, light "tactical HUD" accents | This is a results/scores site used on phones during a live event — speed and legibility beat spectacle |
| Feature-Rich Showcase (landing page) | Content-first: Live → Upcoming → Results | No product to sell; visitors come for scores |
| Russo One / Chakra Petch | **Exo 2 / Inter** | Verified: Russo One and Chakra Petch lack Mongolian Ө/Ү glyphs; Exo 2 and Inter have them |
| GSAP scroll reveal | CSS transitions only | Motion 3/10; no extra dependency needed |

---

## Global Rules

### Color Palette (dark only)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Background | `#0A0D12` | `--background` | Page |
| Foreground | `#E6EAF0` | `--foreground` | Body text (15.8:1 on bg) |
| Card | `#11161D` | `--card` | Match cards, tables |
| Card elevated | `#171D26` | `--popover` | Popovers, hover rows |
| Muted | `#1A212B` | `--muted` | Chips, table headers |
| Muted Foreground | `#8B97A8` | `--muted-foreground` | Secondary text (6.4:1 on bg) |
| Border | `#232B36` | `--border` | Hairlines |
| Primary | `#FF8A1F` | `--primary` | CS2 orange — CTAs, active nav, winner accent |
| On Primary | `#0A0D12` | `--primary-foreground` | Text on orange |
| CT Blue | `#5AA9F2` | `--ct` | Team 1 / CT side, info |
| T Gold | `#E8B341` | `--t` | Team 2 / T side, highlights |
| Live | `#FF3B3B` | `--live` | LIVE badge only |
| Win | `#3DDC84` | `--win` | Win markers, positive diffs |
| Loss / Destructive | `#F05252` | `--destructive` | Loss markers, delete |
| Ring | `#FF8A1F` | `--ring` | Focus ring |

**Tailwind names:** CT/T colors are exposed as `side-ct` / `side-t` (e.g. `text-side-t`). Never name a color token `t`, `b`, `l`, `r`, `x` or `y` — it collides with `border-t` and similar utilities.

**Rules:** never convey win/loss by color alone (add W/L letters, bold, or icons). Scores always use `tabular-nums`.

### Typography

- **Display / headings / scores:** Exo 2 (600–800), uppercase for section labels with `tracking-wide`
- **Body / tables / forms:** Inter (400–600), `font-feature-settings: "tnum"` on numbers
- Loaded via `next/font/google` with subsets `latin` + `cyrillic`
- Base 16px body, 14px table text minimum, 12px only for meta labels

### Spacing (Density 7/10 — Standard)

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 16px |
| `--space-lg` | 24px |
| `--space-xl` | 32px |
| `--space-2xl` | 48px |

Page gutter: 16px mobile, 24px tablet, 32px desktop. Max content width 1280px.

### Radius & depth

- Radius: 6px (`--radius: 0.375rem`) — slightly sharp, tactical
- Signature shape: cut corner on featured cards via `clip-path` (top-right 10px), used sparingly
- No drop shadows on dark; separate surfaces with border + 1 step of background lightness
- Subtle orange glow allowed only on the LIVE match card border

---

## Component Specs

### Match card (core component)
- Row per team: logo (28px, rounded-sm, fallback = tag on muted square) · name (truncate) · score (Exo 2, 20–24px, tabular)
- Winner row: foreground text + bold score + 2px left bar in `--primary`; loser row: `--muted-foreground`
- Header strip: stage/group · format (BO3) · time (or LIVE badge)
- Whole card is a link to match detail; min touch height 44px per row

### LIVE badge
- `--live` background, white text "ШУУД", pulsing dot (disabled under `prefers-reduced-motion`)
- Screen readers: `role="status"` only on the match-detail page, not on every list card

### Tables (standings)
- Sticky first column (rank + team) on mobile; horizontal scroll inside the table container only, never the page
- Qualified rows marked with a left bar + legend text (not color alone)

### Buttons
- Primary: `--primary` bg, dark text, 40px height (44px on touch-critical admin actions)
- Secondary: transparent, 1px `--border`, hover bg `--muted`
- Transitions 150–200ms on color/background only (no layout-shifting transforms)

### Inputs (admin)
- 44px height, visible label above, error text under the field, `--ring` focus outline (2px)
- Numeric score inputs: `inputMode="numeric"`, large (Exo 2 24px), +/- steppers for fast live entry

---

## Style Guidelines

**Style:** Dark Mode (OLED) × Data-Dense Dashboard, with restrained tactical HUD touches (thin grid lines, cut corners, uppercase micro-labels).

**Page pattern:** Content-first. Home order: Live now → Upcoming → Latest results → Groups snapshot.

**Navigation:** Top bar on desktop; bottom tab bar on mobile (≤5 items: Нүүр, Хуваарь, Групп, Плей-офф, Багууд).

---

## Motion

- 150–200ms color/opacity transitions; 250ms for score change flash (background tint fades out)
- LIVE dot pulse: 1.6s ease-in-out infinite
- All non-essential motion disabled under `prefers-reduced-motion: reduce`

---

## Anti-Patterns (Do NOT Use)

- ❌ Purple/violet gradients, glassmorphism blobs, 3D/WebGL heroes
- ❌ Emojis as icons — use Lucide only
- ❌ Fonts without Mongolian Cyrillic coverage
- ❌ Color-only win/loss signalling
- ❌ Page-level horizontal scroll (bracket and tables scroll inside their own container)
- ❌ Layout-shifting hovers, invisible focus states, instant state changes

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (Lucide SVG only)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Text contrast ≥ 4.5:1 on dark surfaces
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars / bottom tab bar (safe-area padding)
- [ ] No horizontal page scroll on mobile
- [ ] Mongolian text renders in Exo 2 / Inter (no fallback-font glyphs)
