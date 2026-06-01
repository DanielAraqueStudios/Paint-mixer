---
name: Industrial Chromatics
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44464f'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757680'
  outline-variant: '#c5c6d0'
  surface-tint: '#4b5d8f'
  primary: '#001542'
  on-primary: '#ffffff'
  primary-container: '#162a5a'
  on-primary-container: '#8092c9'
  inverse-primary: '#b3c5ff'
  secondary: '#ba0035'
  on-secondary: '#ffffff'
  secondary-container: '#de294b'
  on-secondary-container: '#fffbff'
  tertiary: '#231500'
  on-tertiary: '#ffffff'
  tertiary-container: '#3e2800'
  on-tertiary-container: '#b08e5b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#011848'
  on-primary-fixed-variant: '#334576'
  secondary-fixed: '#ffdada'
  secondary-fixed-dim: '#ffb3b6'
  on-secondary-fixed: '#40000c'
  on-secondary-fixed-variant: '#920027'
  tertiary-fixed: '#ffdeae'
  tertiary-fixed-dim: '#e6c188'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#5c4216'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  console-bg: '#0b1c30'
  status-active: '#10b981'
  status-warning: '#f59e0b'
  outline-subtle: '#c5c6d0'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  base: 16px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar_width: 280px
  header_height: 64px
---

## Brand & Style

Industrial Chromatics is a high-precision, utilitarian design system built for technical environments and industrial control centers. The aesthetic blends **Modern Corporate** reliability with **Functional Brutalism**, prioritizing information density, real-time feedback, and clear hierarchy.

The visual language is characterized by a "dark console" secondary experience paired with a "clean laboratory" primary workspace. It evokes a sense of technical mastery, stability, and operational efficiency. The target audience includes engineers, technicians, and system operators who require high-legibility interfaces that remain comfortable during long shifts. The UI feels calibrated, intentional, and robust.

## Colors

The palette is anchored in **Deep Navy (#162a5a)** for authority and **Industrial Blue-Greys** for structural surfaces. 

- **Primary:** Used for branding, critical navigation, and primary action buttons.
- **Secondary:** Reserved for high-impact system dispatches and destructive or irreversible actions.
- **Neutral:** A range of cool-tinted greys used for borders, secondary text, and background subtle textures.
- **The Laboratory Contrast:** Light modes use high-brightness surfaces (`#f8f9ff`) to maintain a clean environment, while the **Technical Console** footer uses a fixed dark theme (`#0b1c30`) to represent background system processes and logs.
- **Semantic Accents:** Vibrant greens and ambers are used exclusively for real-time status indicators (e.g., AWS IoT status, Pump status).

## Typography

The typography system is split into two functional roles:

1.  **Inter (UI & Data):** Used for all navigation, titles, and descriptive content. It provides a neutral, highly readable foundation. Bold weights (600-700) are used for "Headline" roles to create immediate hierarchy.
2.  **JetBrains Mono (Technical & Values):** Reserved for raw data points, RGB values, system logs, and measurement volumes. This monospaced font signals to the user that the information is machine-generated or requires precise reading.

**Scaling:** On mobile, `headline-lg` should scale down to 28px. All `label-caps` must maintain their letter spacing to ensure readability at small sizes.

## Layout & Spacing

The system uses a **Fixed Sidebar / Fluid Content** layout model. 

- **Global Shell:** A 64px header spans the top. Two 280px sidebars (Left: Navigation/Filters; Right: Active Configuration) flank a flexible main content area.
- **Grid:** The main content uses a responsive fluid grid. Elements should snap to a 4-column (Desktop), 3-column (Tablet), or 2-column (Mobile) arrangement.
- **Rhythm:** An 8px base unit drives all spacing. Containers typically use `lg` (24px) or `md` (16px) padding for comfortable internal density.
- **Technical Density:** In sidebars and the console footer, vertical spacing is tightened to `sm` (8px) to maximize the "at-a-glance" data availability.

## Elevation & Depth

Hierarchy is achieved primarily through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows.

- **Background:** The base layer uses `surface-bright`.
- **Containers:** Interaction areas like the sidebars use `surface-container-low` to recede slightly or `surface-container` to come forward.
- **Outlines:** All cards and interactive regions are defined by a 1px border (`outline-variant`). In dark mode/console areas, borders use reduced opacity (`border-outline/20`).
- **Shadows:** Use only for high-priority interactive floating elements. A `shadow-sm` is applied to headers and sidebars to define depth, and a `shadow-lg` is reserved for the primary "Dispatch" action to make it feel physically raised.
- **Depth Metaphor:** The "Vessel Visualizer" uses a `shadow-inner` to simulate physical containment.

## Shapes

The shape language is **Soft (0.25rem - 0.75rem)**.

- **Base Components:** Standard buttons and input fields use a 0.5rem (`rounded-lg`) corner radius.
- **Cards:** Product and component cards use 0.75rem (`rounded-xl`) to feel distinct from the structural shell.
- **Status Pills:** Badges and active status indicators use `rounded-full` to differentiate them from interactive buttons.
- **Industrial Accents:** The Vessel Visualizer uses a custom `rounded-b-2xl` to mimic the physical curve of a mixing tank, reinforcing the tactile nature of the app.

## Components

### Buttons
- **Primary:** Solid `primary` background with `on-primary` text. Squared corners with 0.5rem radius. High-density padding.
- **Secondary/Dispatch:** High-visibility `secondary` background. Larger text (`headline-sm`) and increased vertical padding (16px) for physical presence.
- **Icon Buttons:** Circular, `hover:bg-surface-container-high`, subtle transition (200ms).

### Cards
- **Product Cards:** Bordered (`outline-variant`), white background, vertical stack. Featured "color swatch" area at the top. On hover, apply `shadow-md` and reveal secondary actions.

### Lists & Tables
- **Technical Tables:** Minimalist, horizontal dividers only. `label-caps` for headers. Monospaced values aligned right for numerical comparison.

### Side Navigation
- **Active State:** Uses `secondary-container` background with `on-secondary-container` text to provide a high-contrast indicator of the current filter or view.
- **Hover State:** Subtle grey background shift.

### Progress & Visualizers
- **Fluid Indicators:** Use `vessel-fill` transitions (1s cubic-bezier) for liquid levels. Layer colors using z-index to represent mixing composition.