---
name: Eldritch Sovereign
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#39393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1b1b1c'
  surface-container: '#1f1f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#303031'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#ffb5a0'
  on-secondary: '#601400'
  secondary-container: '#ff5625'
  on-secondary-container: '#541100'
  tertiary: '#e3c2ff'
  on-tertiary: '#4a0080'
  tertiary-container: '#d09eff'
  on-tertiary-container: '#602397'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb5a0'
  on-secondary-fixed: '#3b0900'
  on-secondary-fixed-variant: '#872000'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0050'
  on-tertiary-fixed-variant: '#622599'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  display-xl:
    fontFamily: Libre Caslon Text
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Libre Caslon Text
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  stat-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

This design system is a **High-Fantasy / Cinematic** interface designed to evoke the weight of an ancient tome and the majesty of a royal treasury. It targets gamers who appreciate immersion, depth, and a "premium" tactile feel in their RPG experiences.

The style is a hybrid of **Tactile/Skeuomorphism** and **Traditional Editorial**. It utilizes:
- **Rich Textures:** Backgrounds are not flat; they feature subtle grain, leather-like patterns, and parchment overlays.
- **Ornate Detailing:** Decorative borders and flourishes (serif terminals, corner brackets) provide a sense of craftsmanship.
- **Atmospheric Depth:** Deep shadows and ember-like glows create a sense of mystery and danger.
- **Epic Scale:** Large, authoritative serif typography for titles balanced by functional, high-legibility sans-serifs for complex data and statistics.

## Colors

The palette is rooted in the **"Ember & Shadow"** concept. 

- **Primary (Metallic Gold):** Used for interactive states, primary borders, and critical headings. It represents wealth, power, and divinity.
- **Secondary (Ember Orange):** Used for highlights, active selections, and warnings. It provides a warm, glowing contrast to the dark base.
- **Tertiary (Midnight Purple):** A deep, regal hue used for backgrounds of secondary panels and subtle gradients to add magical "arcane" depth.
- **Neutral (Charcoal/Ink):** The foundation. It is a near-black, slightly warm charcoal that avoids the "flatness" of pure black.

**Surface Tiers:**
- Level 0: Deep Charcoal (#0C0C0D) for the global background.
- Level 1: Inky Purple-Grey (#1A1A1B) for main containers.
- Level 2: Faded Parchment (#C4B499) used exclusively for foreground "paper" elements where readability of lore is paramount.

## Typography

Typography follows a strict hierarchy to ensure the game world feels "storied" while remaining functional.

- **Headlines (Libre Caslon Text):** A classical, authoritative serif. Use for quest titles, location names, and character names. It should feel etched or printed by a royal press.
- **Body (Work Sans):** A clean, versatile sans-serif. Used for long descriptions and dialogue. It provides high legibility against textured backgrounds.
- **Data/Stats (JetBrains Mono):** A technical, monospaced font used for numbers, weight values, and equipment stats. This provides a "functional/crunchy" feel to the RPG mechanics, differentiating "lore" from "rules."

## Layout & Spacing

The layout uses a **Fixed Grid** approach for menus to maintain a "contained" feel, like a book or a chest opening. 

- **The "Folio" Model:** Content is grouped into distinct "sheets" or panels. 
- **Gutter & Rhythm:** A strict 8px-based system, but with generous outer margins (48px) to allow for decorative corner flourishes and ornate border art.
- **Mobile Reflow:** On mobile, the multi-column "parchment" layout collapses into a single vertical scroll. The ornate borders should simplify into thin gold lines to maximize screen real estate.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Material Contrast** rather than modern shadows.

- **Stacking Logic:** Lower layers are the darkest (Deep Charcoal). As elements rise in hierarchy, they gain texture (Parchment) or light (Ember Glow).
- **Outer Glows:** Active elements do not use drop shadows; they use a "Primary Color" outer glow (blur: 15px, opacity: 0.3) to simulate magical radiance.
- **The "Cut-out" Effect:** Input fields and secondary slots should appear "pressed" into the surface using inner shadows and darker fills, suggesting they are carved into a stone or wooden interface.

## Shapes

The design system utilizes **Sharp (0)** roundedness to maintain a sense of precision and traditional craftsmanship. 

Instead of rounded corners, use **Clipped Corners** or **Ornamental Brackets**. Small UI elements like chips or stats should use a "diamond" or "octagon" clipping path to feel like cut gemstones or forged metal plates. Large containers should feature 90-degree corners reinforced by metal "corner caps" in the Primary Gold color.

## Components

### Buttons
Primary buttons are high-contrast with a gradient transition from Tertiary Purple to Primary Gold. They feature a 1px Gold border. The hover state adds an "Ember Glow."

### Cards (The Parchment)
Cards should use a repeating parchment texture background with "deckle edges" (rough, torn-looking edges). Use a dark ink color for text on these cards to ensure readability.

### Inputs & Selectors
Fields are dark, recessed boxes with a subtle inner glow. The "Active" state is indicated by a Primary Gold border that pulses slightly.

### Progress Bars (Health/Mana)
Horizontal bars with a "glass-vial" aesthetic. Use high-saturation fills (Deep Red for Health, Deep Blue for Mana) with a bright highlight streak across the top third to simulate liquid in a container.

### Lists & Inventory
Items are arranged in a strict grid. Each cell is a square "slot" with a 1px border. Rarity is indicated by the border color (Grey=Common, Green=Uncommon, Blue=Rare, Gold=Legendary).