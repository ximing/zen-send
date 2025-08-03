# Zen Send Web UI Redesign — Design Specification

## Concept & Vision

**Zen Send** is a cross-device content transfer tool. The redesign transforms the web interface from a generic admin-dashboard aesthetic to a **Minimal Luxury** experience with a distinctive monospace identity.

The design communicates: *professional tool, premium feel, zero distraction*. Every pixel serves a purpose. The interface should feel like a well-crafted developer tool — the kind of app engineers actually want to use.

**Aesthetic Direction:** Minimal Luxury · Monospace · Neutral Palette
**Design Father:** Terminal aesthetics meets Swiss minimalism

---

## Design Language

### Typography

**Primary Font:** `SF Mono` (macOS) → `Fira Code` (fallback) → `monospace` (system)

```css
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Type Scale:**
- Display/Logo: 16px, weight 600, letter-spacing 1px
- Section Labels: 11px, weight 400, letter-spacing 0.5px, uppercase
- Body: 13px, weight 400
- Small/Meta: 11px, weight 400

**All UI labels use ALL-CAPS with letter-spacing** — this is a core identity element.

### Color Palette

#### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#fafafa` | Page background |
| `--bg-surface` | `#ffffff` | Card/panel background |
| `--bg-elevated` | `#f5f5f5` | Input backgrounds, hover states |
| `--border-default` | `#e5e5e5` | Default borders |
| `--border-subtle` | `#f0f0f0` | Subtle dividers |
| `--text-primary` | `#1a1a1a` | Headlines, primary text |
| `--text-secondary` | `#666666` | Body text, labels |
| `--text-muted` | `#999999` | Meta text, timestamps |
| `--text-disabled` | `#cccccc` | Disabled states |

#### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0f0f0f` | Page background |
| `--bg-surface` | `#141414` | Card/panel background |
| `--bg-elevated` | `#1a1a1a` | Input backgrounds, hover states |
| `--border-default` | `#2a2a2a` | Default borders |
| `--border-subtle` | `#1f1f1f` | Subtle dividers |
| `--text-primary` | `#e5e5e5` | Headlines, primary text |
| `--text-secondary` | `#888888` | Body text, labels |
| `--text-muted` | `#555555` | Meta text, timestamps |
| `--text-disabled` | `#333333` | Disabled states |

**No colored accents** — the palette is strictly neutral. The only "color" comes from user content (emojis, file icons).

### Spatial System

- **Base unit:** 4px
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Border radius:** 6px (buttons/inputs), 10px (cards), 12px (panels)
- **Container max-width:** 640px (centered)
- **Header height:** 64px
- **Section padding:** 24px (mobile), 32px (desktop)

### Motion Philosophy

**Principle:** Motion should feel mechanical and precise — like a well-oiled machine.

- **Duration:** 150ms for micro-interactions, 250ms for state changes
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` — smooth deceleration
- **Hover states:** Subtle background/border color shifts only
- **No bouncy animations** — this is a professional tool
- **No entrance animations on page load** — content appears instantly
- **Focus rings:** 2px offset outline, `--border-focus` color

### Visual Assets

- **Icons:** System emoji only (📎 ✏️ 📋 📄 🖼️ 📭) — no icon library
- **No decorative imagery** — the content IS the visual
- **Avatars:** Generated initials on solid background (#1a1a1a light / #e5e5e5 dark)

---

## Layout & Structure

### Page Architecture

All pages follow a single-column, centered layout:

```
┌─────────────────────────────────────────┐
│              HEADER (64px)               │
│  ZEN_SEND              user@email  [U]  │
├─────────────────────────────────────────┤
│                                         │
│         MAX-WIDTH: 640px                │
│         PADDING: 24px                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         CONTENT CARD            │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Visual Pacing

- **Header:** Fixed, minimal — logo + user info only
- **Content:** Centered with generous vertical rhythm (40px between sections)
- **Cards:** Flat design with 1px borders, no drop shadows
- **Lists:** Tight 8px gaps, cards touch edges of their container

---

## Pages & Components

### 1. Login Page (`/login`)

**Layout:** Centered card on full-bleed background

```
┌─────────────────────────────────────────┐
│                                         │
│              ZEN_SEND                   │
│                                         │
│    ┌─────────────────────────────┐      │
│    │      SIGN_IN                 │      │
│    │                             │      │
│    │  EMAIL                      │      │
│    │  ┌─────────────────────┐    │      │
│    │  │                     │    │      │
│    │  └─────────────────────┘    │      │
│    │                             │      │
│    │  PASSWORD                   │      │
│    │  ┌─────────────────────┐    │      │
│    │  │                     │    │      │
│    │  └─────────────────────┘    │      │
│    │                             │      │
│    │  [    SIGN_IN_BUTTON    ]  │      │
│    │                             │      │
│    │  No account? SIGN_UP →     │      │
│    └─────────────────────────────┘      │
│                                         │
└─────────────────────────────────────────┘
```

**States:**
- Default: Gray border
- Focus: Darker border, 2px outline offset
- Error: Border becomes `--color-error`, message below in red
- Loading: Button shows "SIGNING_IN..." with reduced opacity

**Input fields:**
- Height: 48px
- Background: `--bg-surface`
- Border: 1px `--border-default`
- Border-radius: 6px
- Font: Monospace, 13px
- Label: Above input, 11px uppercase

### 2. Register Page (`/register`)

Same structure as Login with additional "CONFIRM_PASSWORD" field.

### 3. Setup Page (`/setup`)

Same structure as Login with "SERVER_ADDRESS" field and "CONNECT" button.

### 4. Home Page (`/`)

**Layout:**
```
┌─────────────────────────────────────────┐
│  HEADER: ZEN_SEND   user@email  [U]    │
├─────────────────────────────────────────┤
│  MAX-WIDTH: 640px, centered             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  SEND_TOOLBAR                   │    │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ │    │
│  │  │  📎   │ │  ✏️   │ │  📋   │ │    │
│  │  │SELECT │ │ ENTER │ │CLIP-  │ │    │
│  │  │_FILE  │ │ _TEXT │ │ BOARD │ │    │
│  │  └───────┘ └───────┘ └───────┘ │    │
│  │                                 │    │
│  │  SELECTED — 2 FILES             │    │
│  │  [📄 doc.pdf 2.4MB] [×]        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [ALL] [FILES] [TEXT] [CLIP]   │    │
│  ├─────────────────────────────────┤    │
│  │  ┌─────────────────────────┐   │    │
│  │  │ 📄 Q4_Report.pdf        │   │    │
│  │  │    4.2 MB · 2H_AGO      │   │    │
│  │  └─────────────────────────┘   │    │
│  │  ┌─────────────────────────┐   │    │
│  │  │ ✏️ Meeting Notes        │   │    │
│  │  │    Text · 5H_AGO        │   │    │
│  │  └─────────────────────────┘   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ONLINE_DEVICES                 │    │
│  │  No devices online             │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**Send Toolbar:**
- 3-column grid of action buttons
- Each button: Icon + label (uppercase, letter-spaced)
- Hover: Background shifts to `--bg-elevated`
- Selected files display below with remove button

**Transfer List:**
- Filter tabs: ALL / FILES / TEXT / CLIPBOARD
- Active tab: Solid background (inverted)
- Transfer cards: Icon + name + meta info + timestamp
- Hover: Border color darkens slightly
- Empty state: Centered text with 📭 emoji

### 5. Header Component

**Light mode:**
- Background: `--bg-surface`
- Border-bottom: 1px `--border-default`
- Logo: "ZEN_SEND" in primary text color
- User info: Email in muted color + avatar circle

**Dark mode:**
- Background: `--bg-surface` (#141414)
- Border-bottom: 1px `--border-default` (#2a2a2a)
- Avatar: Light background, dark text

**Theme Toggle:**
- Simple icon button (no label)
- ☀️ / 🌙 icon based on current mode

---

## Component States

### Button

| State | Style |
|-------|-------|
| Default | `--bg-elevated` bg, `--text-primary` text, 1px border |
| Hover | `--border-default` becomes darker |
| Active | `--bg-primary` bg |
| Disabled | 50% opacity, no pointer events |
| Primary | `--text-primary` bg (inverted), `--bg-primary` text |
| Loading | Text replaced with "LOADING...", 50% opacity |

### Input

| State | Style |
|-------|-------|
| Default | `--bg-surface` bg, 1px `--border-default` border |
| Focus | 2px outline offset in `--border-focus` |
| Error | 1px `--color-error` border |
| Disabled | 50% opacity, `--bg-elevated` bg |

### Card / Panel

| State | Style |
|-------|-------|
| Default | `--bg-surface` bg, 1px `--border-default` border |
| Hover | Border becomes slightly darker |

---

## Technical Approach

### Framework & Tooling
- **React 19** with TypeScript
- **Tailwind CSS v4** with CSS variables
- **@rabjs/react** for state management
- **Vite** for build tooling

### CSS Architecture

```css
/* index.css */
@import "tailwindcss";

:root {
  /* Light mode tokens (default) */
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;

  /* Colors */
  --bg-primary: #fafafa;
  --bg-surface: #ffffff;
  --bg-elevated: #f5f5f5;
  --border-default: #e5e5e5;
  /* ... */
}

.dark {
  /* Dark mode tokens */
  --bg-primary: #0f0f0f;
  --bg-surface: #141414;
  --bg-elevated: #1a1a1a;
  --border-default: #2a2a2a;
  /* ... */
}

/* Global styles */
body {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

### File Structure

```
apps/web/src/
├── index.css                    # Global styles + Tailwind
├── theme/
│   └── tokens.ts               # Theme token definitions
├── components/
│   ├── header/
│   │   ├── index.tsx
│   │   └── header.service.ts
│   ├── send-toolbar/
│   │   ├── index.tsx
│   │   └── send-toolbar.service.ts
│   ├── transfer-list/
│   │   ├── index.tsx
│   │   └── transfer-list.service.ts
│   └── toast/
│       ├── index.tsx
│       └── toast.service.ts
├── pages/
│   ├── home/
│   │   ├── index.tsx
│   │   └── home.service.ts
│   ├── login/
│   │   ├── index.tsx
│   │   └── login.service.ts
│   ├── register/
│   │   ├── index.tsx
│   │   └── register.service.ts
│   └── setup/
│       ├── index.tsx
│       └── setup.service.ts
└── services/
    ├── theme.service.ts
    ├── auth.service.ts
    ├── api.service.ts
    └── socket.service.ts
```

### Animation Implementation

All animations via CSS transitions — no JavaScript animation library needed:

```css
/* Micro-interactions */
button, input, .card {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Focus ring */
*:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Hover states */
.card:hover {
  border-color: var(--border-subtle);
}
```

---

## Implementation Priority

1. **CSS tokens & global styles** — Foundation of everything
2. **index.css rewrite** — Replace current `@import "tailwindcss"` with full token system
3. **tokens.ts update** — Add missing tokens (border-focus, error colors)
4. **Header component** — Logo + user info + theme toggle
5. **Login/Register pages** — Forms with new styling
6. **Home page** — Send toolbar + transfer list
7. **Setup page** — Server connection form
8. **Polish pass** — Hover states, focus rings, loading states
