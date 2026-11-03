---
name: Profile2Resume
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e2'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fc'
  surface-container: '#ededf6'
  surface-container-high: '#e7e7f0'
  surface-container-highest: '#e2e2ea'
  on-surface: '#191b21'
  on-surface-variant: '#444655'
  inverse-surface: '#2e3037'
  inverse-on-surface: '#f0f0f9'
  outline: '#757687'
  outline-variant: '#c5c5d8'
  surface-tint: '#364ce0'
  primary: '#283fd5'
  on-primary: '#ffffff'
  primary-container: '#465bee'
  on-primary-container: '#eeedff'
  inverse-primary: '#bcc2ff'
  secondary: '#5f578f'
  on-secondary: '#ffffff'
  secondary-container: '#c9bfff'
  on-secondary-container: '#534b83'
  tertiary: '#963217'
  on-tertiary: '#ffffff'
  tertiary-container: '#b64a2c'
  on-tertiary-container: '#ffeae6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bcc2ff'
  on-primary-fixed: '#000c61'
  on-primary-fixed-variant: '#132dc8'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c9bfff'
  on-secondary-fixed: '#1b1248'
  on-secondary-fixed-variant: '#473f76'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb5a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#83250a'
  background: '#faf8ff'
  on-background: '#191b21'
  surface-variant: '#e2e2ea'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.005em
  label-code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

This design system blends an editorial high-craft publishing aesthetic with developer-centric technical rigor. Built for engineers, engineering leaders, and technical recruiters, the system balances the authority of classic archival documentation with the sharp immediacy of modern IDE tooling.

The interface rejects synthetic neo-SaaS gradient clichés and decorative glassmorphism. Instead, it commits to a tangible tactile metaphor: crisp white paper resting atop warm architectural stone and parchment. Visual interest stems from meticulous type hierarchy, disciplined negative space, and laser-accurate hairline delineation. Micro-details—such as monospaced metadata, verifiable commit markers, and high-contrast validation states—instill trust and communicate uncompromised factual precision.

## Colors

The palette establishes an authentic physical contrast between structured surface materials and electric technical accents:

- **Canvas & Backgrounds:** The base foundation uses Warm Ivory (`#F7F6F2`). Floating containers, paper documents, and structural sheets use Pure White (`#FFFFFF`). Secondary interactive trays and code-block backgrounds use Pale Stone (`#EFECE6`).
- **Typography & Structure:** Primary text and high-priority glyphs utilize Deep Charcoal (`#17191F`). Secondary descriptive metadata, captions, and structural labels use Muted Graphite (`#777B85`). Structural dividers and borders strictly use Hairline Sand (`#E5E3DC`).
- **Accents:** 
  - Primary: Electric Cobalt (`#465BEE`), reserved for definitive interactive actions, primary commands, and verified link paths.
  - Secondary: Soft Lavender (`#C9BFFF`), deployed for passive supportive containers, subtle selected ranges, and secondary chip fills.
  - Tertiary: Tangerine (`#FF805E`), targeted for highlighted differential edits, active compilation steps, and high-impact key performance indicators.
- **Verification Semantics:** Evidence states leverage functional system tokens: Verified Emerald (`#10B981`) for attested achievements, Pending Amber (`#F59E0B`) for compiling verification steps, and Rejected Ruby (`#EF4444`) for disconnected or invalid claims.

## Typography

The typographic engine uses three distinct font families to articulate visual intent:

1. **Space Grotesk (Display & Headers):** Engineered for sharp editorial authority. Always set with tight tracking (`-0.01em` to `-0.03em`) to mimic mid-century architectural typography while retaining modern digital sharpness.
2. **Inter (Body & Narrative):** Delivers clean readability across dense career timelines, objective summaries, and narrative resumes. Ensures maximum optical legibility at multi-paragraph scale.
3. **JetBrains Mono (Metadata, Provenance & Code):** Assigned to developer technical tags, git hashes, pull request verifications, metric outputs, and timestamps. Renders technical data with disciplined character spacing.

## Layout & Spacing

The layout is built upon an 8pt architectural rhythm, structured within a 12-column adaptive fluid grid for desktop and tablet screens, folding to a single or dual-column layout on mobile viewports.

- **Desktop (1280px+):** 12-column fluid grid, 2.5rem outer canvas margins, 1.5rem column gutters. Standard workspace views implement an asymmetrical split: a fixed 480px left analytical canvas alongside a fluid paper compilation sheet.
- **Tablet (768px - 1279px):** 8-column layout, 1.5rem margins, 1rem gutters. Left-rail controls collapse into a modular slide-over tray.
- **Mobile (<768px):** 4-column flow, 1.25rem margins, 0.75rem gutters. Dual-pane editing becomes a sequential tabbed interface with fixed bottom micro-actions.
- **Spatial Alignment:** Generous negative space surrounding paper sheets preserves the feeling of physical documents resting on an archival desk. Section dividers should rely on spacing and hairline borders rather than heavy colored backgrounds.

## Elevation & Depth

Visual depth avoids generic heavy blurs, opting instead for precise, low-intensity layered shadows that suggest sheet paper stacked atop an architectural mat:

- **Level 0 (Desk / Canvas):** Flat Warm Ivory base (`#F7F6F2`). Zero shadow.
- **Level 1 (Panels & Sub-containers):** Pure White (`#FFFFFF`) with 1px hairline border (`#E5E3DC`). Shadow: `0 1px 2px rgba(23, 25, 31, 0.03)`.
- **Level 2 (Paper Document / Sheet):** Floating resume view. Pure White (`#FFFFFF`) bounded by a 1px solid `#E5E3DC` edge. Shadow: `0 1px 3px rgba(23, 25, 31, 0.04), 0 8px 24px -4px rgba(23, 25, 31, 0.06)`.
- **Level 3 (Interactive Overlays & Verification Flyouts):** Popovers, dropdown command palettes, and proof inspect panels. Shadow: `0 4px 6px -1px rgba(23, 25, 31, 0.05), 0 20px 32px -8px rgba(23, 25, 31, 0.08)`.
- **Hairline Integration:** All elevated surfaces retain a 1px border (`#E5E3DC`) to preserve silhouette clarity under varying display contrasts.

## Shapes

The design system enforces a soft architectural geometry (`roundedness: 1`). Radii remain intentional, compact, and precise to reflect technical documentation:

- **Base Components (Inputs, Buttons, Cards):** Standard corners use `0.25rem` (4px). Secondary containers, large cards, and paper sections use `0.5rem` (8px). 
- **Document Paper:** The resume sheet maintains clean `0.25rem` edges to echo physical, crisp-cut paper stock.
- **Micro-Badges & Status Elements:** Pill curvature (`9999px`) is applied to metadata badges, evidence counters, and verification status indicators to distinguish functional metadata from rectangular content blocks.

## Components

### Buttons
- **Primary:** Solid Electric Cobalt (`#465BEE`) background, white text (`#FFFFFF`), `0.25rem` border radius. Height 40px, font `Space Grotesk` medium (14px). Hover state: darken to `#3648D4` with subtle crisp shadow `0 2px 4px rgba(70, 91, 238, 0.2)`. Active: translate Y `1px`.
- **Secondary:** White background (`#FFFFFF`), 1px solid hairline (`#E5E3DC`), Deep Charcoal text (`#17191F`). Hover: background shifts to `#F7F6F2`, border to `#D4D1C7`.
- **Ghost / Minimal:** Transparent background, Deep Charcoal text. Hover: Soft Lavender background tint (`rgba(201, 191, 255, 0.25)`).

### Chips & Evidence Tags
- Compact height (24px), font `JetBrains Mono` (11px).
- **Default Tech Chip:** Surface `#FFFFFF`, border 1px solid `#E5E3DC`, text `#777B85`.
- **Status Pills:** Pill-shaped (`rounded-full`) with a 6px micro-dot prefix indicator. 
  - Verified: Soft emerald tint (`#ECFDF5`), emerald text (`#065F46`), dot `#10B981`.
  - Pending: Amber tint (`#FFFBEB`), amber text (`#92400E`), dot `#F59E0B`.
  - Rejected / Flagged: Red tint (`#FEF2F2`), ruby text (`#991B1B`), dot `#EF4444`.

### Input Fields & Controls
- **Inputs & Textareas:** Background `#FFFFFF`, 1px solid hairline (`#E5E3DC`), `0.25rem` radius, padding `0.5rem 0.75rem`. Typography: `Inter` 14px text with `#777B85` placeholder. Focus: border shifts to Electric Cobalt (`#465BEE`) with a clean `0 0 0 1px #465BEE` outline ring (no diffuse glow).
- **Checkboxes & Radios:** Sharp, compact 16px squares/circles, border 1.5px solid `#E5E3DC`. Checked: Electric Cobalt (`#465BEE`) fill with pure white glyph.

### Cards & Paper Surfaces
- **Resume Surface:** Pure White (`#FFFFFF`), bounded by 1px solid `#E5E3DC`, with Level 2 elevation shadow. Padding spans `2.5rem` to mirror physical A4/Letter margins.
- **Evidence Node Cards:** Border 1px solid `#E5E3DC`, background `#FFFFFF`. Features an inline mono breadcrumb header containing git commit hashes, pull requests, or third-party cryptographic verifications.

### Lists & Timelines
- Career timeline nodes are connected by a solid 1px hairline rule (`#E5E3DC`). Milestone markers are 8px circles with white interiors and 2px `#17191F` borders. When an item is actively selected or being edited, the marker fills with Tangerine (`#FF805E`).