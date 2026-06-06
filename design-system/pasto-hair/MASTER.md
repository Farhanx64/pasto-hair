# Design System Master File — Pasto Hair

> **LOGIC:** When building a specific page, first check `design-system/pasto-hair/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **ui-ux-pro-max:** Before building any UI, run the skill search script for the relevant domain.
> Style match: **Modern Dark (Cinema Mobile)** + **Funnel 3-Step Conversion** pattern.

---

**Project:** Pasto Hair
**Style:** Modern Dark — Cinema / Glassmorphism (ui-ux-pro-max: `style > Modern Dark Cinema Mobile`)
**Brand:** Premium NYC barbershop — dark, violet, glass panels, ambient glow, no light mode

---

## Color Palette

| Role | Hex | CSS Variable | Contrast on bg |
|------|-----|--------------|----------------|
| Background | `#0a0a0c` | `--color-background` | — |
| Background Deep | `#050506` | `--color-bg-deep` | — |
| Background Elevated | `#0f0f12` | `--color-bg-elevated` | — |
| Surface (glass fill) | `rgba(255,255,255,0.05)` | `--color-surface` | — |
| Foreground | `#ededed` | `--color-foreground` | 14.1:1 ✅ AAA |
| Foreground Muted | `#8a8f98` | `--color-foreground-muted` | 4.6:1 ✅ AA |
| Accent (violet CTA) | `#bb86fc` | `--color-accent` | 8.3:1 ✅ AAA |
| Accent Strong | `#6d5dfc` | `--color-accent-strong` | gradient use only |
| Accent Glow | `rgba(187,134,252,0.18)` | `--color-accent-glow` | ambient only |
| Champagne | `#e8dcc4` | `--color-champagne` | 9.4:1 ✅ AAA |
| Border | `rgba(255,255,255,0.08)` | `--color-border` | hairline |
| Border Accent | `rgba(187,134,252,0.25)` | `--color-border-accent` | focus/hover |
| Destructive | `#f87171` | `--color-destructive` | 5.2:1 ✅ AA |
| Ring (focus) | `rgba(187,134,252,0.5)` | `--color-ring` | focus ring |

**Dark mode only — no light mode. Never use pure `#000000` (OLED smear).**

---

## Typography

| Role | Font | Weight |
|------|------|--------|
| Headings H1–H3 | **Oswald** | 600–700, uppercase |
| Body / UI text | **Montserrat** | 400–600 |
| Prices / stats | Montserrat | 700, `font-variant-numeric: tabular-nums` |

**Next.js font loading (next/font/google — no external request):**
```tsx
import { Oswald, Montserrat } from 'next/font/google'
const oswald = Oswald({ variable: '--font-oswald', subsets: ['latin'], weight: ['400','500','600','700'] })
const montserrat = Montserrat({ variable: '--font-montserrat', subsets: ['latin'], weight: ['400','500','600','700'] })
```

**Type scale:** 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36 · 48 · 60 · 72px
**Line-height:** 1.5–1.75 (body) · 1.1–1.2 (headings)
**Heading letter-spacing:** 0.05em–0.1em (Oswald uppercase)
**Minimum body:** 16px on mobile (prevents iOS input zoom)

---

## Spacing (8dp system)

4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96px

---

## Shadows & Glow

| Token | Value |
|-------|-------|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` |
| `shadow-accent` | `0 0 20px rgba(187,134,252,0.25)` |
| `shadow-accent-lg` | `0 0 40px rgba(187,134,252,0.15), 0 0 80px rgba(109,93,252,0.1)` |

---

## Component Specs

### Primary Button (Book Now)
- Background: `linear-gradient(135deg, #bb86fc, #6d5dfc)`
- Color: `#0a0a0c` (dark text on violet)
- Font: Montserrat 700, uppercase, 0.05em tracking
- Shape: pill (`border-radius: 9999px`)
- Min-height: 48px (touch target)
- Box-shadow: `0 0 20px rgba(187,134,252,0.3)` (glow)
- Hover: `opacity: 0.9` + `translateY(-1px)` + stronger glow
- Active: `scale(0.97)`
- Focus-visible: `outline: 2px solid rgba(187,134,252,0.5)` offset 3px
- Transition: `all 200ms cubic-bezier(0.16, 1, 0.3, 1)`

### Secondary Button
- Background: transparent · Border: `1px solid rgba(255,255,255,0.15)`
- Color: `#ededed` · Hover: border → accent, text → `#bb86fc`
- Same pill shape + min-height

### Glass Card
- Background: `rgba(255,255,255,0.04)`
- Border: `1px solid rgba(255,255,255,0.08)`
- Border-radius: 16px · Backdrop-filter: `blur(12px)`
- Hover: border → `rgba(187,134,252,0.2)` + faint glow shadow

### Form Input
- Background: `rgba(255,255,255,0.05)`
- Border: `1px solid rgba(255,255,255,0.1)`
- Color: `#ededed` · Font: Montserrat · Font-size: 16px (no iOS zoom)
- Min-height: 48px · Padding: 14px 16px
- Focus: border → `rgba(187,134,252,0.5)` + ring shadow
- Error: border → `#f87171`
- Label: always visible above input (never placeholder-only)

---

## Motion System (motion library)

- **Enter easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out)
- **Exit easing:** `cubic-bezier(0.4, 0, 1, 1)` — ~60–70% of enter duration
- **Micro-interactions:** 150–250ms
- **Page/step reveals:** 400–600ms, stagger 30–50ms per item
- **Booking step transition:** spring `{ stiffness: 90, damping: 20 }`
- **Ambient blobs:** slow oscillation, opacity 0.06–0.10, native driver
- **MANDATORY:** Every `motion.div` must have `prefers-reduced-motion` fallback

---

## Page Pattern: Funnel (3-Step Conversion)

- **One primary CTA per page** visible above fold — always "Book Now"
- Every page (pricing, gallery) funnels to booking
- Homepage section order: Hero → Value props → Featured services → Gallery preview → Footer CTA
- Mobile: sticky bottom bar with "Book Now" + `safe-area-inset-bottom`

---

## Breakpoints

375 · 430 · 768 · 1024 · 1440px (mobile-first)

---

## Anti-Patterns — DO NOT USE

- ❌ Light mode
- ❌ Pure `#000000` background
- ❌ Emojis as icons — Lucide React SVG only
- ❌ Placeholder-only labels
- ❌ Instant state changes (always transition 150–300ms)
- ❌ Missing `cursor: pointer`
- ❌ Invisible focus rings
- ❌ Image-only CTAs (old site bug)
- ❌ Horizontal scroll on mobile
- ❌ Animating `width`/`height` — use `transform` + `opacity`
- ❌ UI blocking during animations
- ❌ Color-only error/success — always add icon + text

---

## Pre-Delivery Checklist

- [ ] Oswald headings + Montserrat body via `next/font/google`
- [ ] No emojis — Lucide React icons only
- [ ] All interactive: `cursor-pointer`, min 44×44px
- [ ] Hover + focus-visible + active states present
- [ ] Focus ring: `outline: 2px solid rgba(187,134,252,0.5)`
- [ ] `prefers-reduced-motion` wraps all `motion.div`
- [ ] Body font ≥ 16px everywhere
- [ ] Glass backdrop-filter with graceful fallback
- [ ] Responsive at 375 · 768 · 1024 · 1440px
- [ ] Sticky mobile CTA with `safe-area-inset-bottom`
- [ ] Content not behind fixed navbars
- [ ] Contrast verified: foreground 14:1 · muted 4.6:1 · accent 8.3:1
