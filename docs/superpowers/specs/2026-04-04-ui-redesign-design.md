# Zen Send UI Redesign Design

**Date**: 2026-04-04
**Status**: Approved
**Design Direction**: Editorial Minimal with Sage Accent

---

## 1. Design Philosophy

**关键词**: 克制、小众先锋、温暖编辑感、大量留白

- 大量留白，呼吸感优先
- 黑白灰承担 95% 视觉重量
- 点缀色仅在 5% 关键位置出现
- 暖调中性灰背景（非冷灰）
- 无渐变、无阴影（除非必要）
- 编辑感排版：大标题 + 日期 + 大量空白

---

## 2. Color System

### Light Mode

```css
/* Background */
--bg-primary: #F7F5F2;      /* 页面背景，暖灰 */
--bg-surface: #FFFFFF;      /* 卡片背景 */
--bg-elevated: #F5F5F5;      /* 次级背景 */

/* Text */
--text-primary: #2C2C2C;     /* 主文字 */
--text-secondary: #9A958F;   /* 次级文字 */
--text-muted: #B5AFA8;       /* 辅助文字 */

/* Border */
--border-default: #DDD8D0;   /* 默认边框 */
--border-subtle: #EDEBE7;    /* 卡片边框 */

/* Accent - Sage Green */
--accent: #8B9A7D;           /* 点缀色 */
--accent-soft: #8B9A7D20;    /* 点缀色 12% 透明度 */
```

### Dark Mode

```css
/* Background - 柔和暗色，降低对比度 */
--bg-primary: #1C1C1E;       /* 页面背景 */
--bg-surface: #242426;       /* 卡片背景 */
--bg-elevated: #2C2C2E;      /* 次级背景 */
--bg-header: #3A3A3C;        /* 头部背景 */

/* Text */
--text-primary: #E5E2DC;     /* 主文字 */
--text-secondary: #8A8880;    /* 次级文字 */
--text-muted: #6B6860;       /* 辅助文字 */
--text-faint: #4A4A4C;       /* 微弱文字 */

/* Border */
--border-default: #3A3A3C;   /* 默认边框 */
--border-subtle: #2E2E30;    /* 卡片边框 */

/* Accent - Sage Green */
--accent: #8B9A7D;           /* 点缀色 */
--accent-soft: #8B9A7D20;    /* 点缀色 12% 透明度 */
--accent-glow: rgba(139, 154, 125, 0.3);  /* 发光效果 */
```

### Accent Color Palette

**Selected**: Sage Green / 鼠尾草绿 `#8B9A7D`

| Color | Hex | Usage |
|-------|-----|-------|
| Sage | #8B9A7D | 点缀色 |
| Sage Light | #A5B29C | hover 状态 |
| Sage Dark | #6E7D62 | active 状态 |
| Sage Soft | #8B9A7D20 | 背景填充 |

**应用位置（克制原则）**:
1. Logo 内的字母 (ZS)
2. 进度条填充色
3. 在线/活跃状态点
4. 状态标签背景 + 文字
5. 关键操作的成功反馈

---

## 3. Typography

**Font Family**:
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```

**移除 monospace 字体**，改用系统字体，更有 APP 感。

### Type Scale

| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Page Title | 28px | 500 (Medium) | -0.5px |
| Section Label | 10px | 600 | 1px (uppercase) |
| Card Title | 14px | 500 | 0 |
| Card Subtitle | 12px | 400 | 0 |
| Body | 14px | 400 | 0 |
| Caption | 11px | 400 | 0 |

---

## 4. Layout & Spacing

### Page Layout

**Transfer Page (Home)**:
```
┌─────────────────────────────────────┐
│ Sidebar (fixed, 64px)               │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Header (Logo + Actions)     │    │
│  │                             │    │
│  │ Page Title "Transfer"      │    │
│  │ Date subtitle               │    │
│  │                             │    │
│  │ Upload Zone (dashed border) │    │
│  │                             │    │
│  │ Selected Files (if any)     │    │
│  │ Progress Bar (if uploading) │    │
│  │ Send Button                 │    │
│  │                             │    │
│  │ ─────────────────────────   │    │
│  │ RECENT (label)              │    │
│  │                             │    │
│  │ Transfer Card               │    │
│  │ Transfer Card               │    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### Spacing System

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Component Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Page content | 24px | - |
| Card | 16px | 10px between cards |
| Upload zone | 40px vertical, 24px horizontal | - |
| Section margin bottom | 32px | - |
| Header margin bottom | 40-48px | - |

---

## 5. Component Specifications

### 5.1 Logo

**Light Mode**:
```css
width: 36px;
height: 36px;
background: #2C2C2C;
border-radius: 8px;
```
ZS 字母: color: #E8DDD3

**Dark Mode**:
```css
background: #3A3A3C;
```
ZS 字母: color: #8B9A7D (accent)

### 5.2 Upload Zone

**Light Mode**:
```css
border: 1.5px dashed #DDD8D0;
border-radius: 14px;
padding: 40px 24px;
background: #FFFFFF;
```

**Dark Mode**:
```css
border: 1px dashed #3A3A3C;
border-radius: 14px;
padding: 40px 24px;
background: #242426;
```

**States**:
- Default: dashed border
- Hover/Dragover: border color darkens slightly
- Active: solid border

### 5.3 Send Button

**Light Mode**:
```css
height: 46px;
background: #2C2C2C;
color: #F7F5F2;
border-radius: 10px;
font-size: 13px;
font-weight: 500;
letter-spacing: 0.5px;
```

**Dark Mode**:
```css
background: #3A3A3C;
color: #E5E2DC;
```

**States**:
- Default: as above
- Hover: background lightens slightly
- Active/Pressed: background darkens slightly
- Disabled: opacity 0.5

### 5.4 Transfer Card

**Light Mode**:
```css
background: #FFFFFF;
border: 1px solid #EDEBE7;
border-radius: 12px;
padding: 14px 16px;
```

**Dark Mode**:
```css
background: #242426;
border: 1px solid #2E2E30;
```

**Content Layout**:
```
┌─────────────────────────────────────┐
│ [Icon]  Title               Status │
│         Subtitle              Time  │
└─────────────────────────────────────┘
```

- Icon: 38-42px square, rounded 8-10px
- Title: 13-14px, font-weight 500
- Subtitle: 11-12px, text-secondary
- Status dot: 6px circle, accent color (if active)
- Time: 11px, text-muted, right aligned

### 5.5 Filter Tabs

**Inactive**:
```css
padding: 8px 16px;
background: var(--bg-elevated);
border-radius: 8px;
font-size: 12px;
color: var(--text-secondary);
```

**Active**:
```css
background: var(--accent-soft);
color: var(--accent);
```

### 5.6 Progress Bar

**Container**:
```css
height: 3px;
background: var(--border-subtle);
border-radius: 2px;
overflow: hidden;
```

**Fill**:
```css
height: 100%;
background: var(--accent);
border-radius: 2px;
```

### 5.7 Status Indicator

**Online/Active**:
```css
width: 6-8px;
height: 6-8px;
background: var(--accent);
border-radius: 50%;
```

**Offline/Completed**:
```css
background: var(--text-faint);
```

### 5.8 Input Fields

**Light Mode**:
```css
background: #FFFFFF;
border: 1px solid #DDD8D0;
border-radius: 10px;
padding: 12px 14px;
```

**Dark Mode**:
```css
background: #242426;
border: 1px solid #2E2E30;
```

**Focus**:
```css
border-color: var(--accent);
```

---

## 6. Motion & Interaction

### Transitions

```css
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

### Interaction States

| Element | Hover | Active |
|---------|-------|--------|
| Button | background lightens 10% | background darkens 10% |
| Card | border-color slightly darker | scale: 0.98 |
| Tab | background lightens | - |
| Icon Button | background appears | scale: 0.95 |

### Progress Animation

- Progress bar fill: smooth transition 200ms
- Upload progress: ease-out for natural feel

---

## 7. Border Radius System

```css
--radius-sm: 6px;      /* 小按钮、标签 */
--radius-md: 8px;      /* 图标容器、小卡片 */
--radius-lg: 10px;     /* 按钮、输入框 */
--radius-xl: 12px;     /* 卡片 */
--radius-2xl: 14px;    /* 上传区域 */
--radius-logo: 8px;    /* Logo 固定 8px */
```

---

## 8. Shadow (Minimal Use)

只在必要时使用极轻阴影：

```css
/* Light mode cards on hover (optional) */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

/* Modals */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
```

**原则**: 优先用 border 区分层次，不用阴影。

---

## 9. Implementation Priorities

### Phase 1: Core Theme System
1. Update `tokens.ts` with new color system
2. Update `index.css` CSS variables
3. Update font-family to system sans

### Phase 2: Key Components
1. Upload zone redesign
2. Send button
3. Transfer card
4. Filter tabs
5. Progress bar

### Phase 3: Polish
1. Sidebar styling
2. Modal/overlay styling
3. Form inputs
4. Animation transitions

---

## 10. Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/theme/tokens.ts` | Update color tokens |
| `apps/web/src/index.css` | Update CSS variables |
| `apps/web/src/components/send-toolbar/` | Update button/upload styles |
| `apps/web/src/components/transfer-list/` | Update card styles |
| `apps/web/src/components/sidebar/` | Minor styling updates |
| `apps/web/src/pages/home/index.tsx` | Layout spacing |
| `apps/web/src/components/preview-modal/` | Modal styling |
