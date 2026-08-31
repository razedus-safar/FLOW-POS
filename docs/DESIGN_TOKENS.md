# FlowPOS — Apple iOS 26 "Liquid Glass" Design Tokens Specification

This document defines the production design tokens, material physical properties, typography hierarchy, 8pt spacing grid, squircle radii, and motion curves implemented across FlowPOS.

---

## 1. Color Tokens & Opacity Architecture

### Base Surfaces
| Token Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg` | `#F2F2F7` | `#000000` | Canvas base background |
| `--bg-secondary` | `#FFFFFF` | `#1C1C1E` | Opaque content cards & tables |
| `--glass-bg` | `rgba(255, 255, 255, 0.55)` | `rgba(28, 28, 30, 0.45)` | Regular liquid glass chrome |
| `--glass-bg-clear` | `rgba(255, 255, 255, 0.25)` | `rgba(255, 255, 255, 0.08)` | Sub-pills and subtle fills |
| `--glass-border` | `rgba(255, 255, 255, 0.60)` | `rgba(255, 255, 255, 0.15)` | Optical refractive edge border |
| `--glass-highlight` | `rgba(255, 255, 255, 0.80)` | `rgba(255, 255, 255, 0.25)` | Inner specular top highlight |
| `--glass-shadow` | `rgba(0, 0, 0, 0.08)` | `rgba(0, 0, 0, 0.50)` | Ambient elevation shadow |

### Text & Ink Contrast
| Token Name | Light Mode | Dark Mode | Contrast Ratio |
|---|---|---|---|
| `--text` (Primary 100%) | `#000000` | `#FFFFFF` | > 14:1 (AAA) |
| `--text-muted` (Secondary 70%) | `rgba(60, 60, 67, 0.70)` | `rgba(235, 235, 245, 0.70)` | > 5.5:1 (AA) |
| `--line` (Dividers 40%/15%) | `rgba(60, 60, 67, 0.15)` | `rgba(255, 255, 255, 0.12)` | Structural separation |

### Apple System Accent Tints
- **Blue**: `#007AFF` (light) / `#0A84FF` (dark)
- **Green**: `#34C759` / `#30D158`
- **Indigo**: `#5856D6` / `#5E5CE6`
- **Orange**: `#FF9500` / `#FF9F0A`
- **Pink**: `#FF2D55` / `#FF375F`
- **Purple**: `#AF52DE` / `#BF5AF2`
- **Red**: `#FF3B30` / `#FF453A`
- **Teal**: `#32ADE6` / `#64D2FF`
- **Yellow**: `#FFCC00` / `#FFD60A`

---

## 2. Liquid Glass Material Recipe

```css
.liquid-glass {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-radius: var(--radius-glass);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 8px 32px var(--glass-shadow),
    inset 0 1px 1px var(--glass-highlight),
    inset 0 -1px 1px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
```

---

## 3. Squircle Corner Radii Scale

- `--radius-control`: `16px` (Buttons, inputs, filter chips, category capsules)
- `--radius-glass`: `24px` (Content cards, sidebar, topbar, cart panel)
- `--radius-modal`: `32px` to `40px` (Command palette, payment tender sheets, action modals)

---

## 4. Spacing Scale (8pt Grid)

- `4px` (`0.5`): Micro badges and dot spacing
- `8px` (`1`): Tight element spacing
- `12px` (`1.5`): Input internal padding and compact cell gap
- `16px` (`2`): Standard card padding and container gutters
- `24px` (`3`): Section spacing and panel padding
- `32px` (`4`): Major module margins
- `48px` (`6`): Screen stage padding on large viewports

---

## 5. Motion & Spring Physics

- **Spring Easing**: `cubic-bezier(0.22, 1, 0.36, 1)`
- **Press Morph Feedback**: `transform: scale(0.97)` with corner radius expansion on `:active`
- **Specular Sweep**: `linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 45%, transparent 60%)` transitioning `transform 0.8s ease`
- **Reduced Motion Fallback**: `transition-duration: 0.01ms` on `prefers-reduced-motion: reduce`
