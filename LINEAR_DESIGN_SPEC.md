# Linear-Inspired UI Design Specification

Reference: https://linear.app (public marketing pages inspected live, Oct 2026)
Status: ANALYSIS ONLY — no application code modified in this phase.
Constraint: Design principles and original tokens only. No Linear source code,
logos, wordmarks, or brand assets copied or reproduced.

Live-verified values (from browser inspection of linear.app homepage + /features):
- body background rgb(8,9,10), body text rgb(247,248,248)
- font stack: "Inter Variable", "SF Pro Display", -apple-system, system-ui, Segoe UI...
- H1: 64px, weight 510, letter-spacing -1.408px, color rgb(247,248,248)
- H2: 48px / 40px, weight 510
- Body/lead paragraph: 24px, lh 31.92px, color rgb(208,214,224)
- Nav links: 13-14px, color rgb(138,143,152), pill radius 9999px
- Cards measured: bg rgb(15,16,17), 1px solid rgba(255,255,255,0.08), radius ~9px
- Interactive transitions: color/background 0.1s cubic-bezier(0.25,0.46,0.45,0.94)
- Footer: ~42 links, grouped columns. Viewport meta uses viewport-fit=cover.
- Screenshots saved during inspection (browser workspace), not committed.

---

## 1. Overall design philosophy and visual hierarchy

1. Dark-mode-native, not dark-mode-adapted. The near-black canvas (#08090A)
   IS the whitespace. Content emerges through small luminance steps, not color.
2. Extreme restraint: one chromatic accent (indigo/violet), everything else
   achromatic gray. Emphasis comes from luminance + weight, not hue.
3. Precision-engineered density: compressed display type (tight line-height 1.0,
   aggressive negative tracking) surrounded by generous section padding (80px+).
4. Hierarchy ladder (brightest = most important):
   primary text #F7F8F8 > body #D0D6E0 > muted #8A8F98 > faint #62666D >
   borders rgba(255,255,255,0.05-0.08) > background #08090A.
5. Structure without noise: ultra-thin semi-transparent white borders draw
   wireframe-like divisions; no heavy dividers, no drop shadows for elevation.
6. Calm motion: 100ms color/background transitions, no bouncy marketing
   animation. Product screenshots do the storytelling, not animated chrome.
7. Marketing page structure observed: sticky nav > centered hero (H1 + lead +
   CTAs + product visual) > alternating feature sections (48px H2 + 24px lead +
   screenshot) > card grids > changelog/timeline > multi-column footer.

## 2. Color palette, backgrounds, borders, surface treatments

Original tokens derived from the reference (renamed, not Linear brand tokens):

Backgrounds (dark-first):
- --surface-canvas: #08090A  (page, verified live)
- --surface-base: #0F1011    (panels, sidebar; cards measured rgb(15,16,17))
- --surface-raised: #191A1B  (dropdowns, popovers, command palette)
- --surface-hover: #28282C   (hover wash on raised surfaces)
- --surface-ghost: rgba(255,255,255,0.02)  (ghost buttons, subtle cards)
- --surface-subtle: rgba(255,255,255,0.04-0.05) (toolbar buttons, badges)

Text:
- --text-primary: #F7F8F8    (verified live; never pure #FFF)
- --text-body: #D0D6E0       (verified live lead paragraph)
- --text-muted: #8A8F98      (nav, placeholders; verified nav rgb(138,143,152))
- --text-faint: #62666D      (timestamps, disabled, metadata)

Accent (use sparingly — CTAs, active states, links only):
- --accent: #5E6AD2          (primary CTA fill)
- --accent-bright: #7170FF   (links, active states)
- --accent-hover: #828FFF    (hover on accent)
- Success-only greens: #27A644 / #10B981 (status dots, completion pills)

Borders (all semi-transparent white on dark — verified 1px solid
rgba(255,255,255,0.08) on cards):
- --border-subtle: rgba(255,255,255,0.05)  (default hairline)
- --border-default: rgba(255,255,255,0.08) (cards, inputs, code blocks)
- Solid dark variants for strong separation: #23252A / #34343A / #3E3E44
- Hairline dividers: #141516 / #18191A

Surface treatment rules:
- Cards are translucent, never solid: rgba white 0.02-0.05 over canvas.
- Elevation = luminance step (0.02 > 0.04 > 0.05), NOT shadow darkness.
- Overlay backdrop: rgba(0,0,0,0.85) for modals (focus isolation).
- Light-mode mirror (only if you need it): bg #F7F8F8, surface #F3F4F5,
  border #D0D6E0/#E6E6E6, cards #FFFFFF.

## 3. Typography

Font: Inter Variable (CDN substitute for proprietary stack) + JetBrains Mono
for code. Global OpenType features "cv01","ss03" give the geometric character.

Google Fonts link:
  Inter:wght@300;400;500;600 + JetBrains Mono:wght@400;500
CSS: font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
Mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

Type scale (live-verified marked *):
- Display XL 72px / wt 510 / lh 1.0 / ls -1.58px — hero max
- Display 64px / 510 / 1.0 / -1.41px — *H1 verified*
- Display 48px / 510 / 1.0 / -1.06px — *H2 verified*
- H2-alt 40px / 510 — *verified on homepage feature header*
- H3 20px / 590 / 1.33 / -0.24px — card/feature titles
- Lead 24px / 400 / 1.33 — *verified lead paragraph (24px/31.92px)*
- Body 16px / 400 / 1.5; Body-emphasis 16px / 510; Strong 16px / 590
- Small 15px / 400-590 / 1.6 / -0.165px
- Caption 13-14px / 400-510; Label 12px; Micro 11px/510; Tiny 10px
- Nav 13-14px / 510, color muted — *verified*
- Mono: 14/13/12px for code blocks, labels, metadata

Weight system (three tiers + light):
- 400 reading, 510 emphasis/UI default (signature between-weight),
  590 strong emphasis, 300 only for deliberately de-emphasized text.
- Never 700 bold. Map 510 > font-medium (500) and 590 > font-semibold (600)
  in Tailwind/Inter CDN builds (variable 510/590 unavailable statically).

Rules:
- Negative tracking scales with size; normal tracking below 16px.
- Primary text #F7F8F8, body #D0D6E0, muted #8A8F98 — never pure white.
- Line-height: 1.0 display, 1.33 headings, 1.5-1.6 body.

## 4. Navigation, sidebars, topbars, content layouts

Marketing nav (verified): sticky dark header, logomark left, link cluster
(Product, Resources, Customers, Pricing, Now, Contact), right-side actions
(Log in ghost + Sign up / Open app solid light pill). Command-palette trigger
(/ or Cmd+K) for search. Mobile collapses to hamburger at ~768px.

App-shell patterns to adopt (inferred from product-led structure):
- Left sidebar (~240-260px) on --surface-base with icon+label items,
  active item = lighter luminance + accent indicator, sections grouped
  (Workspace / Favorites / Issues / Projects views).
- Slim topbar: breadcrumb or search trigger left, actions right, bottom
  hairline border-subtle.
- Content: max-width ~1200px centered, single-column reading flow for
  marketing; app views use list-detail (issue list + side peeks).
- Footer: 4-6 link columns (~42 links observed), muted 13px links.

## 5. Components

Buttons (verified transitions: 0.1s color/background):
- Ghost (default): rgba(255,255,255,0.02) bg, 1px solid #24282C-ish /
  rgba(255,255,255,0.08), text #E2E4E7, radius 6px (marketing pills use 9999px).
- Subtle/toolbar: rgba(255,255,255,0.04), text muted, padding 0 6px, radius 6px.
- Primary CTA: accent #5E6AD2 fill, white text, 8px 16px, radius 6px
  (marketing measured a light solid pill #E5E5E6 with dark text for "Open app"
  — theme-dependent CTA inversion is intentional).
- Icon button: circle 50%, rgba(255,255,255,0.03-0.05), 1px border-default.
- Pill/chip: transparent, 1px solid #23252A, radius 9999px, 12px/510 text,
  padding 0 10px 0 5px — filters, tags, status.

Cards (verified): bg #0F1011 or rgba white 0.02-0.05, 1px border-default,
radius 8-9px (featured 12px, large panels 22px), hover = slight bg opacity
lift only. No shadow elevation.

Inputs: bg rgba(255,255,255,0.02), text #D0D6E0, 1px border-default,
12px 14px padding, 6px radius; search input transparent with icon padding;
focus = multi-layer ring shadow, not border color change.

Badges: success dot/pill #10B981 + #F7F8F8 text 10px/510; neutral pill
transparent + border #23252A; subtle badge rgba(255,255,255,0.05) radius 2px.

Overlays: command palette / popover on --surface-raised, 12px radius,
1px border-default, multi-layer dark shadow stack; modal backdrop
rgba(0,0,0,0.85).

Image treatment: product screenshots keep border-default + top radius 12px,
subtle shadow rgba(0,0,0,0.4) 0 2px 4px; blend into canvas at any viewport.

## 6. Spacing, padding, margins, border radii

Base unit 8px; rhythm 8 / 16 / 24 / 32. Observed micro-steps (4, 7, 11, 19, 35)
are optical-alignment exceptions, not scale additions.
- Section vertical padding: 80px+ desktop, 48px mobile.
- Content max-width ~1200px; hero centered single column.
- Button padding: 8px 16px (primary), 0 6px / 0 12px (subtle/nav pills).
- Input padding: 12px 14px. Chip padding: 0 10px 0 5px.
- Radius scale: 2px micro badges/toolbar; 4px list items; 6px buttons/inputs;
  8-9px cards/dropdowns (verified 9px); 12px panels/palette; 22px large
  panels; 9999px pills/chips (verified on nav); 50% icon buttons/avatars.

## 7. Hover states, transitions, animations, micro-interactions

Verified: transition color/background 0.1s cubic-bezier(0.25,0.46,0.45,0.94)
on nav links and buttons. Philosophy: fast, subtle, luminance-based.
- Links/buttons: muted > primary text lightening; bg opacity 0.02 > 0.04-0.05.
- Accent: #5E6AD2 > #828FFF on hover.
- Cards: background lift only, no translate/scale.
- Focus: multi-layer ring shadow (a11y-visible on dark).
- Dropdowns/palette: fade + 2-4px rise, ~100-150ms, ease-out; no spring.
- No scroll-jacking, no parallax hero, no looping marketing animation.
- Status dots pulse sparingly (success green only).
- Micro-interaction inventory to build: nav hover, button hover/active,
  card hover, input focus ring, tooltip fade, palette open/close,
  toast slide, skeleton shimmer on --surface-raised.

## 8. Responsive behavior

Breakpoints: <600 mobile-small; 600-640 mobile; 640-768 tablet;
768-1024 desktop-small; 1024-1280 desktop; >1280 large.
- Hero: 72px > 48px > 32px display text, tracking tightens proportionally.
- Nav: full links + CTAs > hamburger at ~768px.
- Grids: 3-col > 2-col > 1-col stacked.
- Screenshots keep aspect ratio + border treatment at all sizes; hero
  visuals simplify on mobile (fewer floating elements).
- Section spacing 80px+ > 48px mobile. Footer multi-col > stacked.
- Touch targets: 6px-min radius buttons, generous pill/nav hit areas.
- viewport-fit=cover (verified) for notch devices.

## 9. Dark mode implementation and visual hierarchy

Dark is the only first-class theme. Implementation model:
- Semantic luminance tokens (canvas/base/raised/hover), not "dark versions"
  of light colors. Elevation = lighter background, never shadow.
- Text hierarchy via white-opacity steps, borders via white-alpha hairlines.
- Accent appears <5% of pixels: CTAs, active states, links only.
- If light mode is required: separate neutral ramp (bg #F7F8F8, borders
  #D0D6E0/#E6E6E6, cards #FFF), same type scale and radius, accent unchanged.
- With next-themes: class strategy, dark default, CSS variables for the
  surface/text/border ramps so a light theme swaps variable values only.
- Avoid pure #000/#FFF adjacent (eye strain); canvas #08090A + text #F7F8F8.

---

## Reusable design tokens (original, implementable)

CSS variables (drop into Tailwind v4 @theme or globals.css):

  --surface-canvas: #08090A;  --surface-base: #0F1011;
  --surface-raised: #191A1B;  --surface-hover: #28282C;
  --surface-ghost: rgba(255,255,255,0.02);
  --surface-subtle: rgba(255,255,255,0.05);
  --text-primary: #F7F8F8;    --text-body: #D0D6E0;
  --text-muted: #8A8F98;      --text-faint: #62666D;
  --accent: #5E6AD2;          --accent-bright: #7170FF;
  --accent-hover: #828FFF;    --success: #10B981;
  --border-subtle: rgba(255,255,255,0.05);
  --border-default: rgba(255,255,255,0.08);
  --ease-out: cubic-bezier(0.25,0.46,0.45,0.94);
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px;
  --radius-panel: 12px; --radius-pill: 9999px;
  Fonts: Inter (400/500~510/600~590) + JetBrains Mono; features "cv01","ss03".

Component patterns to port (present stack already fits: Radix + Tailwind v4
+ next-themes + framer-motion + lucide-react):
  Button (ghost/subtle/primary/icon/pill), Card, Input/Search, Badge/Pill,
  Dropdown/Popover, Command palette, Dialog (0.85 backdrop), Tabs, Tooltip,
  Toast, Avatar, Sidebar item, Topbar, Empty state, Skeleton, Status dot.

## Implementation plan (for apps/web — Next.js 16 + Tailwind v4 + Radix)

Phase 0 (done): this spec. No app files touched.
Phase 1 — Tokens: add CSS variables + Tailwind v4 @theme mapping
  (colors surface-*/text-*/accent/border, radii, ease), Inter + JetBrains
  Mono via next/font, global font-feature-settings, dark-default with
  next-themes class strategy.
Phase 2 — Primitives: Button, Input, Badge/Pill, Card, Separator, Tooltip,
  Dialog, Dropdown, Toast on Radix + cva variants matching Sections 5-7.
Phase 3 — Shell: sidebar + topbar + command palette + max-w-1200 content
  container, sticky marketing nav with 768px hamburger.
Phase 4 — Marketing sections: centered hero (64px/510 H1), feature rows
  (48px H2 + lead + bordered screenshot), card grid, footer columns.
Phase 5 — Motion/a11y pass: 100ms ease-out hovers, focus rings, skeletons,
  responsive type steps, viewport-fit=cover, contrast check
  (muted #8A8F98 on #08090A for small text needs verification).
Phase 6 — Verify: npm run lint, npm run build (turbo), visual review
  against this spec, never against Linear screenshots pixel-for-pixel.

Out of scope for redesign: copying Linear copy, logo, or artwork; changing
backend/API code; altering IA beyond visual system.
