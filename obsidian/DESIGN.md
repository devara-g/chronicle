---
name: Obsidian
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c7c6c6'
  on-secondary: '#2f3131'
  secondary-container: '#484949'
  on-secondary-container: '#b8b8b8'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 24px
  max-width-feed: 600px
  sidebar-width: 280px
---

## Brand & Style
The design system is centered on a "Premium Minimalist" aesthetic, optimized for high-density information architecture within a micro-blogging context. The personality is quiet, authoritative, and focused, stripping away non-essential UI ornamentation to prioritize the clarity of user-generated content. 

The style utilizes a sophisticated blend of **Minimalism** and **Glassmorphism**. It relies on high-contrast typography against a "True Black" canvas to reduce cognitive load during late-night scrolling. Tactile depth is achieved not through shadows, but through structural transparency and light-refractive borders that mimic high-end hardware interfaces.

## Colors
The palette is strictly monochromatic to ensure content is the only source of color.
- **Background:** True Black (`#000000`) is the foundation for all base surfaces.
- **Surface (Glass):** `rgba(255, 255, 255, 0.05)` with a `backdrop-filter: blur(12px)`.
- **Primary Text:** Pure White (`#FFFFFF`) for maximum legibility of body text and headers.
- **Secondary Text:** Neutral-400 (`#A3A3A3`) for metadata, timestamps, and inactive states.
- **Borders:** Subtle `rgba(255, 255, 255, 0.1)` for structural definition.

## Typography
The typographic system uses a tri-font approach to balance personality with utility. 
- **Headlines:** Use **Hanken Grotesk** for a sharp, contemporary feel with tight tracking on larger scales.
- **Body:** **Inter** provides high readability for feed content, ensuring that long-form threads remain legible.
- **Technical/Labels:** **Geist** is used for system information, timestamps, and interaction counts, lending a precise, developer-tool aesthetic to the metadata.

## Layout & Spacing
The layout follows a fixed-center model for the main feed to prevent line-lengths from becoming unreadable on ultra-wide displays.
- **The Feed:** Centered container at 600px, flanked by a 280px navigation sidebar and a contextual "discovery" sidebar.
- **Grid:** A 4px baseline grid governs all spacing. Vertical rhythm is strictly enforced with 12px or 16px increments between posts.
- **Responsive:** On mobile, margins reduce to 16px and the sidebars collapse into a bottom navigation bar and a hidden drawer.

## Elevation & Depth
This design system rejects traditional drop shadows in favor of **Tonal Layering** and **Refraction**.
- **Level 0 (Base):** True black `#000000`.
- **Level 1 (Feed Items):** Defined by a bottom border only (`1px solid rgba(255,255,255,0.1)`).
- **Level 2 (Modals/Floating Nav):** Glassmorphic surfaces using `rgba(255,255,255,0.05)` background and `backdrop-blur-md`.
- **Interactive Depth:** Hovering over a post or item triggers a subtle background fill change to `rgba(255,255,255,0.02)`. No elevation lift or shadow is applied.

## Shapes
The shape language is refined and consistent. 
- **Base Elements:** (Inputs, Small Buttons) use `rounded-lg` (0.5rem).
- **Primary Containers:** (Posts, Modals, Cards) use `rounded-xl` (1rem) or `rounded-2xl` (1.5rem) depending on size.
- **Media:** Images and video players within the feed must always use `rounded-xl` to maintain a soft contrast against the sharp typography.

## Components
- **Buttons:**
  - *Primary:* Solid White background, Black text. High impact.
  - *Secondary:* Transparent background, White 1px border.
  - *Ghost:* No border, White text, subtle `bg-white/5` on hover.
- **Posts (The "Micro-blog" Unit):** Features a 1px border-bottom of `white/10`. Content is indented to align with the user's display name, leaving the avatar in the left margin.
- **Input Fields:** Search and Compose bars use `bg-white/5` with a subtle `white/10` border. Text is `Neutral-400` for placeholders.
- **Chips:** Small, `rounded-full` (pill) containers with `bg-white/10` and `body-sm` text for topics or trending tags.
- **Navigation:** Vertical sidebar using `label-caps` for section headers and `headline-lg` weight for active navigation items.
- **Interaction Feedback:** All interactive elements must transition background-color over 150ms for a "silky" feel. Avoid jarring scale animations.