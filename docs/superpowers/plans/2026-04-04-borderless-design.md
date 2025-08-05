# Borderless Design Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all borders from UI components and replace with background color contrast, rounded corners, and hover feedback per the design spec.

**Architecture:** Update theme tokens and CSS variables first (foundation), then systematically update each component to use the new borderless styles. Components are updated independently following the shared design system.

**Tech Stack:** React 19, Tailwind CSS v4, CSS Custom Properties, @rabjs/react

---

## File Inventory

### Theme (Foundation)
- `apps/web/src/theme/tokens.ts` - Update dark mode colors, remove border tokens
- `apps/web/src/index.css` - Update CSS variables, add new dark mode values

### Components
- `apps/web/src/components/sidebar/index.tsx`
- `apps/web/src/components/send-toolbar/index.tsx`
- `apps/web/src/components/send-toolbar/send-toolbar.service.ts`
- `apps/web/src/components/transfer-list/index.tsx`
- `apps/web/src/components/search-bar/index.tsx`
- `apps/web/src/components/toast/index.tsx`
- `apps/web/src/components/preview-modal/index.tsx`

### Pages
- `apps/web/src/pages/home/index.tsx`
- `apps/web/src/pages/devices/index.tsx`
- `apps/web/src/pages/login/index.tsx`
- `apps/web/src/pages/register/index.tsx`
- `apps/web/src/pages/setup/index.tsx`

---

## Chunk 1: Theme Foundation

### Task 1: Update tokens.ts

**Files:**
- Modify: `apps/web/src/theme/tokens.ts`

**Steps:**

- [ ] **Step 1: Update dark mode background colors in tokens.ts**

Locate the `dark` object (line ~28). Change these values:

```typescript
// Before
bgPrimary: '#1C1C1E',
bgSurface: '#242426',
bgElevated: '#2C2C2E',

// After
bgPrimary: '#121214',
bgSurface: '#1C1C1E',
bgElevated: '#262628',
```

- [ ] **Step 2: Remove border-related tokens from dark mode**

In the `dark` object, remove:
```typescript
borderDefault: '#3A3A3C',
borderSubtle: '#2E2E30',
```

Note: `borderFocus: '#8B9A7D'` should remain (used for focus outline)

- [ ] **Step 3: Update Theme type definition**

In `apps/web/src/theme/tokens.ts`, locate the `Theme` type (lines ~58-85). Remove `borderDefault` and `borderSubtle` from the type definition:

```typescript
// Before (lines 78-80)
borderDefault: string;
borderSubtle: string;
borderFocus: string;

// After - remove borderDefault and borderSubtle, keep borderFocus
borderFocus: string;
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme/tokens.ts
git commit -m "feat(web): update dark mode colors for borderless design"
```

---

### Task 2: Update index.css

**Files:**
- Modify: `apps/web/src/index.css`

**Steps:**

- [ ] **Step 1: Update dark mode CSS variables**

In `.dark {}` block (line ~61), update:

```css
/* Before */
--bg-primary: #1C1C1E;
--bg-surface: #242426;
--bg-elevated: #2C2C2E;
--border-default: #3A3A3C;
--border-subtle: #2E2E30;

/* After */
--bg-primary: #121214;
--bg-surface: #1C1C1E;
--bg-elevated: #262628;
```

Remove `--border-default` and `--border-subtle` entirely from `.dark {}` block.

- [ ] **Step 2: Fix scrollbar thumb color for dark mode**

Line ~147 (`webkit-scrollbar-thumb`): Since `--border-default` is removed from dark mode, change the scrollbar thumb to use `--bg-elevated` instead:

```css
/* Before (line ~147) */
background: var(--border-default);

/* After */
background: var(--bg-elevated);
```

- [ ] **Step 3: Remove border transitions from component transitions**

Line ~131: Remove `border-color var(--transition-fast)` from the transition rule:

```css
/* Before */
transition: background-color var(--transition-fast),
            border-color var(--transition-fast),
            color var(--transition-fast),
            box-shadow var(--transition-fast);

/* After */
transition: background-color var(--transition-fast),
            color var(--transition-fast),
            box-shadow var(--transition-fast);
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(web): update CSS variables for borderless design"
```

---

## Chunk 2: Shared UI Components

### Task 3: Update search-bar

**Files:**
- Modify: `apps/web/src/components/search-bar/index.tsx`

**Steps:**

- [ ] **Step 1: Read the current search-bar component**

```bash
cat apps/web/src/components/search-bar/index.tsx
```

- [ ] **Step 2: Remove all `border` classes from search inputs**

Find lines 34, 51, 68 that contain `border border-[var(--border-default)]` and remove them.

The three inputs at lines ~34, ~51, ~68 should change from:
```tsx
className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] ..."
```

To:
```tsx
className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] rounded-xl ..."
```

Focus style change - remove `focus:border-[var(--accent)]` and keep focus ring via CSS outline.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/search-bar/index.tsx
git commit -m "feat(web): remove borders from search-bar"
```

---

### Task 4: Update toast

**Files:**
- Modify: `apps/web/src/components/toast/index.tsx`

**Steps:**

- [ ] **Step 1: Read the current toast component**

```bash
cat apps/web/src/components/toast/index.tsx
```

- [ ] **Step 2: Update toast borders**

Line ~17: The toast has `border` class. Since toasts need to stand out, keep a subtle approach:

```tsx
// Before (line ~17)
className={`px-4 py-3 rounded-lg border shadow-lg text-sm
  ${type === 'success' ? 'bg-[var(--bg-surface)] border-[var(--accent)] text-[var(--accent)]'
  ...
```

Change to - remove border but keep the color accent on text:
```tsx
className={`px-4 py-3 rounded-xl shadow-lg text-sm`}
```

And add accent-colored left border using a pseudo-element or a span with background.

Actually, a cleaner approach - keep it borderless but use a colored left bar:
```tsx
className={`px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3`}
```

Add a colored indicator div:
```tsx
<div className={`w-1 h-4 rounded-full bg-[var(--accent)]`} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/toast/index.tsx
git commit -m "feat(web): update toast to borderless style"
```

---

## Chunk 3: Layout Component

### Task 5: Update sidebar

**Files:**
- Modify: `apps/web/src/components/sidebar/index.tsx`

**Steps:**

- [ ] **Step 1: Read the current sidebar component**

```bash
cat apps/web/src/components/sidebar/index.tsx
```

- [ ] **Step 2: Identify and remove border classes**

Lines to check:
- Line ~44: `bg-[var(--bg-elevated)] border border-[var(--border-default)]`
- Line ~97: `border-r border-[var(--border-default)]` (right divider)
- Line ~101: `border-b border-[var(--border-default)]` (bottom divider)
- Line ~120: `border-t border-[var(--border-default)]` (top divider)

Changes:
1. Line ~44: Remove `border border-[var(--border-default)]`
2. Line ~97: Remove the entire `border-r` divider or replace with spacing
3. Line ~101 & ~120: Remove border dividers, use background color changes or spacing

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sidebar/index.tsx
git commit -m "feat(web): remove borders from sidebar"
```

---

## Chunk 4: Main Feature Components

### Task 6: Update send-toolbar

**Files:**
- Modify: `apps/web/src/components/send-toolbar/index.tsx`
- Modify: `apps/web/src/components/send-toolbar/send-toolbar.service.ts` (check if service has UI code)

**Steps:**

- [ ] **Step 1: Read send-toolbar component**

```bash
cat apps/web/src/components/send-toolbar/index.tsx
```

- [ ] **Step 2: Remove border classes from send-toolbar**

Lines to check (~36, ~44, ~45, ~56, ~65, ~74, ~111, ~115, ~131, ~137):

Remove all `border border-[var(--border-default)]` classes.

Button groups at lines ~44-56: The secondary buttons have borders - remove them and use background color differentiation.

The divider at line ~65 (`border-t border-[var(--border-default)]`) - remove and use spacing.

Input at line ~131: `border border-[var(--border-default)]` - remove.

- [ ] **Step 3: Check send-toolbar.service.ts**

```bash
cat apps/web/src/components/send-toolbar/send-toolbar.service.ts
```

If it contains any UI/border code, update accordingly.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/send-toolbar/index.tsx
git add apps/web/src/components/send-toolbar/send-toolbar.service.ts
git commit -m "feat(web): remove borders from send-toolbar"
```

---

### Task 7: Update transfer-list

**Files:**
- Modify: `apps/web/src/components/transfer-list/index.tsx`

**Steps:**

- [ ] **Step 1: Read transfer-list component**

```bash
cat apps/web/src/components/transfer-list/index.tsx
```

- [ ] **Step 2: Remove border classes**

Lines to check (~67, ~147, ~148, ~245):

- Line ~67: Transfer cards have `border border-[var(--border-default)]` - remove border, keep bg-elevated
- Lines ~147-148: Delete confirm state has `border-[var(--color-error)]` - replace with background color
- Line ~245: Button has `border border-[var(--border-default)]` - remove

- [ ] **Step 3: Update delete confirm styling**

Replace border-based error indication with background color:
```tsx
// Before
className={`... border-[var(--color-error)] bg-[var(--color-error)]/10`}

// After - use a red left bar or red text instead
className={`... bg-[var(--color-error)]/10`}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/transfer-list/index.tsx
git commit -m "feat(web): remove borders from transfer-list"
```

---

## Chunk 5: Modal Component

### Task 8: Update preview-modal

**Files:**
- Modify: `apps/web/src/components/preview-modal/index.tsx`

**Steps:**

- [ ] **Step 1: Read preview-modal component**

```bash
cat apps/web/src/components/preview-modal/index.tsx
```

- [ ] **Step 2: Remove border classes**

Lines to check (~169, ~229, ~269, ~277):

- Line ~169: `border-b border-[var(--border-default)]` - remove, use spacing
- Line ~277: `border-t border-[var(--border-default)]` - remove, use spacing
- Line ~229: spinner has `border-2` - that's fine (circular spinner doesn't count as UI border)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/preview-modal/index.tsx
git commit -m "feat(web): remove borders from preview-modal"
```

---

## Chunk 6: Pages

### Task 9: Update home page

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

**Steps:**

- [ ] **Step 1: Read home page**

```bash
cat apps/web/src/pages/home/index.tsx
```

- [ ] **Step 2: Remove border classes**

Lines to check (~140, ~147, ~239):

- Line ~140: `border border-[var(--border-default)]` - remove from device card
- Line ~147: progress bar has `border-[var(--border-subtle)]` - remove
- Line ~239: dashed border area `border-[1.5px] border-dashed border-[var(--border-default)]` - remove dashed border, use dashed background pattern or just rounded container

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/index.tsx
git commit -m "feat(web): remove borders from home page"
```

---

### Task 10: Update devices page

**Files:**
- Modify: `apps/web/src/pages/devices/index.tsx`

**Steps:**

- [ ] **Step 1: Read devices page**

```bash
cat apps/web/src/pages/devices/index.tsx
```

- [ ] **Step 2: Remove border classes**

Lines to check (~92, ~114, ~133, ~202):

- Line ~92: `border border-[var(--border-color)]` - remove
- Line ~114: `border-t border-[var(--border-color)]` - remove, use spacing
- Line ~133: `border border-[var(--border-color)]` - remove
- Line ~202: `border border-[var(--border-color)]` - remove

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/devices/index.tsx
git commit -m "feat(web): remove borders from devices page"
```

---

### Task 11: Update auth pages (login, register, setup)

**Files:**
- Modify: `apps/web/src/pages/login/index.tsx`
- Modify: `apps/web/src/pages/register/index.tsx`
- Modify: `apps/web/src/pages/setup/index.tsx`

**Steps:**

- [ ] **Step 1: Read login page**

```bash
cat apps/web/src/pages/login/index.tsx
```

- [ ] **Step 2: Remove border from login inputs**

Lines ~40, ~56: Remove `border border-[var(--border-default)]` from inputs.

- [ ] **Step 3: Read register page**

```bash
cat apps/web/src/pages/register/index.tsx
```

- [ ] **Step 4: Remove border from register inputs**

Lines ~40, ~56, ~72: Remove `border border-[var(--border-default)]` from inputs.

- [ ] **Step 5: Read setup page**

```bash
cat apps/web/src/pages/setup/index.tsx
```

- [ ] **Step 6: Remove border from setup inputs**

Line ~50: Remove `border border-[var(--border-default)]`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/login/index.tsx
git add apps/web/src/pages/register/index.tsx
git add apps/web/src/pages/setup/index.tsx
git commit -m "feat(web): remove borders from auth pages"
```

---

## Final Verification

- [ ] **Step 1: Run typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 2: Build to verify**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 3: Manual verification**

Test both light and dark themes visually:
1. Home page - device cards, send area
2. Devices page - device list, settings card
3. Login/Register/Setup - form inputs
4. Sidebar - navigation
5. Send toolbar - action buttons
6. Transfer list - transfer cards
7. Toast notifications

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat(web): complete borderless design implementation"
```
