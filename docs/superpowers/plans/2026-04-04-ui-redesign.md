# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement new UI design system with editorial minimal aesthetic and sage green accent

**Architecture:** Update theme tokens → Update CSS variables → Update components. Each component is self-contained with consistent styling patterns.

**Tech Stack:** Tailwind CSS v4, CSS Variables, React 19

---

## Overview

### Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/theme/tokens.ts` | Update color tokens for light/dark mode |
| `apps/web/src/index.css` | Update CSS variables, font family, transitions |
| `apps/web/src/components/send-toolbar/index.tsx` | Update upload zone, button styles |
| `apps/web/src/components/transfer-list/index.tsx` | Update card styles, filter tabs |
| `apps/web/src/components/sidebar/index.tsx` | Update sidebar styling |
| `apps/web/src/pages/home/index.tsx` | Update layout spacing, progress bar |
| `apps/web/src/components/preview-modal/index.tsx` | Update modal styling |
| `apps/web/src/components/toast/index.tsx` | Update toast styling |
| `apps/web/src/components/search-bar/index.tsx` | Update input styles |

### Implementation Order

1. Theme tokens and CSS variables (foundation)
2. Global styles (font, transitions, radius)
3. Core components (button, card, input)
4. Page-specific components
5. Polish (animations, hover states)

---

## Chunk 1: Theme Foundation

### Task 1.1: Update tokens.ts

**Files:**
- Modify: `apps/web/src/theme/tokens.ts`

- [ ] **Step 1: Read current tokens.ts**

```typescript
// Read the current file to understand structure
```

- [ ] **Step 2: Replace light mode colors**

```typescript
export const lightTokens = {
  bgPrimary: '#F7F5F2',      // 暖灰页面背景
  bgSurface: '#FFFFFF',       // 卡片背景
  bgElevated: '#F5F5F5',      // 次级背景
  textPrimary: '#2C2C2C',     // 主文字
  textSecondary: '#9A958F',   // 次级文字
  textMuted: '#B5AFA8',       // 辅助文字
  borderDefault: '#DDD8D0',   // 默认边框
  borderSubtle: '#EDEBE7',    // 卡片边框
  accent: '#8B9A7D',          // 鼠尾草绿点缀
  accentSoft: '#8B9A7D20',    // 点缀色12%透明
  // ... 其他必要token
};
```

- [ ] **Step 3: Replace dark mode colors**

```typescript
export const darkTokens = {
  bgPrimary: '#1C1C1E',       // 柔和暗色背景
  bgSurface: '#242426',       // 卡片背景
  bgElevated: '#2C2C2E',      // 次级背景
  bgHeader: '#3A3A3C',       // 头部背景
  textPrimary: '#E5E2DC',     // 主文字
  textSecondary: '#8A8880',   // 次级文字
  textMuted: '#6B6860',       // 辅助文字
  textFaint: '#4A4A4C',       // 微弱文字
  borderDefault: '#3A3A3C',   // 默认边框
  borderSubtle: '#2E2E30',    // 卡片边框
  accent: '#8B9A7D',          // 鼠尾草绿点缀
  accentSoft: '#8B9A7D20',    // 点缀色12%透明
  // ... 其他必要token
};
```

- [ ] **Step 4: Add new tokens (radius, spacing)**

```typescript
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
};

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  xxl: '14px',
  logo: '8px',
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/theme/tokens.ts
git commit -m "feat(web): update theme tokens with new color system

- Light mode: warm gray palette (#F7F5F2 base)
- Dark mode: soft contrast (#1C1C1E base)
- Accent: sage green #8B9A7D
- Add spacing and radius tokens

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1.2: Update index.css

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Read current index.css**

```css
/* Read current file */
```

- [ ] **Step 2: Replace font-family**

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
}
```

- [ ] **Step 3: Replace CSS variables with new colors**

```css
:root {
  /* Background */
  --bg-primary: #F7F5F2;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F5F5F5;

  /* Text */
  --text-primary: #2C2C2C;
  --text-secondary: #9A958F;
  --text-muted: #B5AFA8;

  /* Border */
  --border-default: #DDD8D0;
  --border-subtle: #EDEBE7;

  /* Accent */
  --accent: #8B9A7D;
  --accent-soft: rgba(139, 154, 125, 0.12);
}

.dark {
  /* Background */
  --bg-primary: #1C1C1E;
  --bg-surface: #242426;
  --bg-elevated: #2C2C2E;

  /* Text */
  --text-primary: #E5E2DC;
  --text-secondary: #8A8880;
  --text-muted: #6B6860;

  /* Border */
  --border-default: #3A3A3C;
  --border-subtle: #2E2E30;

  /* Accent - same as light */
  --accent: #8B9A7D;
  --accent-soft: rgba(139, 154, 125, 0.12);
}
```

- [ ] **Step 4: Add transitions and radius**

```css
:root {
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-2xl: 14px;
}

/* Apply border-radius to all cards */
body {
  font-family: var(--font-sans);
  /* ... existing styles */
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(web): update global CSS with new design tokens

- System font family instead of monospace
- New color system for light/dark mode
- Transition and radius tokens
- Accent color with soft variant

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Core Components

### Task 2.1: Update Button Component Styles

**Files:**
- Read: `apps/web/src/components/send-toolbar/index.tsx` (for button styles)
- Read: `apps/web/src/components/sidebar/index.tsx` (for icon button styles)

- [ ] **Step 1: Update Send Button in send-toolbar**

```tsx
// Find the send button and update styles
<button
  className="w-full h-[46px] bg-[var(--bg-elevated)] text-[var(--text-primary)]
             rounded-[var(--radius-lg)] font-medium tracking-wide
             hover:bg-[var(--border-default)] transition-colors
             disabled:opacity-50"
>
  SEND
</button>
```

- [ ] **Step 2: Update sidebar icon buttons**

```tsx
<button
  className={`w-10 h-10 flex items-center justify-center rounded-[var(--radius-md)]
              transition-colors ${isActive
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
>
  <Icon size={20} />
</button>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/send-toolbar/index.tsx apps/web/src/components/sidebar/index.tsx
git commit -m "feat(web): update button component styles

- Send button: use CSS variables, new radius
- Sidebar: accent color for active state
- Consistent hover transitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2.2: Update Card Component Styles

**Files:**
- Read: `apps/web/src/components/transfer-list/index.tsx`

- [ ] **Step 1: Update transfer card styles**

```tsx
<div
  className="bg-[var(--bg-surface)] border border-[var(--border-subtle)]
             rounded-[var(--radius-xl)] p-4
             hover:border-[var(--border-default)] transition-colors"
>
  <div className="flex items-center gap-3">
    <div className="w-[42px] h-[42px] bg-[var(--bg-elevated)] rounded-[var(--radius-md)]" />
    <div className="flex-1">
      <div className="text-sm font-medium text-[var(--text-primary)]">Title</div>
      <div className="text-xs text-[var(--text-secondary)]">Subtitle</div>
    </div>
    {/* Status dot with accent */}
    <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" />
  </div>
</div>
```

- [ ] **Step 2: Update filter tabs**

```tsx
<button
  className={`px-4 py-2 rounded-[var(--radius-sm)] text-xs transition-colors
    ${active
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
    }`}
>
  {label}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/transfer-list/index.tsx
git commit -m "feat(web): update transfer card and filter styles

- Cards: new border-subtle color, rounded-xl radius
- Status dot: accent color for active items
- Filter tabs: accent-soft background for active

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2.3: Update Input Styles

**Files:**
- Read: `apps/web/src/components/search-bar/index.tsx`
- Read: `apps/web/src/components/send-toolbar/index.tsx` (textarea)

- [ ] **Step 1: Update text input**

```tsx
<input
  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)]
             border border-[var(--border-default)] rounded-[var(--radius-lg)]
             text-[var(--text-primary)] placeholder-[var(--text-muted)]
             focus:outline-none focus:border-[var(--accent)]
             transition-colors"
/>
```

- [ ] **Step 2: Update textarea**

```tsx
<textarea
  className="w-full h-40 px-4 py-3 bg-[var(--bg-surface)]
             border border-[var(--border-default)] rounded-[var(--radius-lg)]
             text-[var(--text-primary)] placeholder-[var(--text-muted)]
             focus:outline-none focus:border-[var(--accent)]
             resize-none transition-colors"
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/search-bar/index.tsx apps/web/src/components/send-toolbar/index.tsx
git commit -m "feat(web): update input and textarea styles

- Focus border: accent color
- Border radius: lg (10px)
- Consistent transitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Page Components

### Task 3.1: Update Home/Transfer Page

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`
- Read: `apps/web/src/pages/home/home.service.ts`

- [ ] **Step 1: Update page layout styles**

```tsx
<main className="flex-1 ml-16 px-6 py-8">
  {/* Header with logo and actions */}
  <div className="flex justify-between items-center mb-10">
    {/* Logo */}
    <div className="w-9 h-9 bg-[var(--bg-header)] rounded-[var(--radius-logo)]
                    flex items-center justify-center">
      <span className="text-xs font-semibold text-[var(--accent)]">ZS</span>
    </div>
  </div>

  {/* Page title */}
  <div className="mb-8">
    <h1 className="text-[28px] font-medium text-[var(--text-primary)]
                   tracking-[-0.5px] mb-1">
      Transfer
    </h1>
    <p className="text-[13px] text-[var(--text-secondary)]">April 4, 2026</p>
  </div>
</main>
```

- [ ] **Step 2: Update upload zone**

```tsx
<div className="border border-dashed border-[var(--border-default)]
                rounded-[var(--radius-2xl)] p-10 text-center
                bg-[var(--bg-surface)] mb-6
                hover:border-[var(--text-muted)] transition-colors">
  <div className="w-11 h-11 border border-[var(--border-default)]
                  rounded-[var(--radius-lg)] mx-auto mb-3
                  flex items-center justify-center">
    <div className="w-5 h-5 border border-[var(--text-muted)] rounded" />
  </div>
  <p className="text-[14px] text-[var(--text-secondary)]">
    Drop files or <span className="text-[var(--text-primary)] underline">choose</span>
  </p>
</div>
```

- [ ] **Step 3: Update progress bar**

```tsx
<div className="h-[3px] bg-[var(--border-subtle)] rounded-full overflow-hidden mb-5">
  <div
    className="h-full bg-[var(--accent)] rounded-full transition-all duration-200"
    style={{ width: `${progress}%` }}
  />
</div>
```

- [ ] **Step 4: Update Send button**

```tsx
<div className="h-12 bg-[var(--bg-elevated)] rounded-[var(--radius-lg)]
                flex items-center justify-center text-[var(--text-primary)]
                font-medium tracking-wide mb-12">
  SEND
</div>
```

- [ ] **Step 5: Update Recent label**

```tsx
<div className="mb-4">
  <span className="text-[10px] font-semibold text-[var(--text-muted)]
                   tracking-[1px] uppercase">
    Recent
  </span>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/home/index.tsx
git commit -m "feat(web): update home page layout and styling

- Page title with date subtitle
- Upload zone with dashed border
- Progress bar with accent color
- Recent section label with uppercase styling
- Editorial spacing and typography

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.2: Update Preview Modal

**Files:**
- Modify: `apps/web/src/components/preview-modal/index.tsx`

- [ ] **Step 1: Update modal overlay**

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center
                bg-black/60 backdrop-blur-sm">
```

- [ ] **Step 2: Update modal content**

```tsx
<div className="relative w-full max-w-4xl max-h-[90vh] mx-4
                bg-[var(--bg-surface)] rounded-[var(--radius-xl)]
                shadow-2xl overflow-hidden">
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/preview-modal/index.tsx
git commit -m "feat(web): update preview modal styling

- Rounded-xl for modern look
- Shadow-2xl for depth

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3.3: Update Toast Notifications

**Files:**
- Modify: `apps/web/src/components/toast/index.tsx`

- [ ] **Step 1: Update toast styles**

```tsx
<div className={`px-4 py-3 rounded-[var(--radius-md)] border shadow-lg text-sm
  ${type === 'success'
    ? 'bg-[var(--bg-surface)] border-[var(--accent)] text-[var(--accent)]'
    : type === 'error'
    ? 'bg-[var(--bg-surface)] border-[var(--color-error)] text-[var(--color-error)]'
    : 'bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-secondary)]'
  }`}>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/toast/index.tsx
git commit -m "feat(web): update toast notification styles

- Success toast uses accent color
- Rounded-md with border

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Polish

### Task 4.1: Add Hover/Active States

- [ ] **Step 1: Verify all interactive elements have hover states**

Check each component:
- Buttons: hover brightness change
- Cards: hover border change
- Tabs: hover background change
- Inputs: focus border accent

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): add hover/active states to interactive elements

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4.2: TypeScript Check and Build

- [ ] **Step 1: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 2: Run build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Fix any errors**

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(web): resolve typecheck/build errors

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4.3: Final Review

- [ ] **Step 1: Review all changed files**

Ensure consistency:
- Color variables used correctly
- Border radius consistent
- Spacing follows design spec
- Font family is system sans

- [ ] **Step 2: Test in browser**

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "feat(web): complete UI redesign implementation

- Editorial minimal aesthetic with sage green accent
- Warm neutral backgrounds
- Generous whitespace and typography
- Soft dark mode

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Chunk | Tasks | Files |
|-------|-------|-------|
| 1 | Theme Foundation | tokens.ts, index.css |
| 2 | Core Components | buttons, cards, inputs |
| 3 | Page Components | home page, modal, toast |
| 4 | Polish | hover states, build |

Total: ~12 commits, incremental implementation

---

## Testing Checklist

- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Theme toggle works
- [ ] All colors match design spec
- [ ] Hover states work on all interactive elements
- [ ] Focus states visible on inputs
- [ ] Progress bar uses accent color
- [ ] Status dots use accent color
- [ ] Font is system sans (not monospace)
- [ ] Spacing is consistent with spec
- [ ] Border radius is consistent
- [ ] Build passes without errors
- [ ] Typecheck passes without errors
