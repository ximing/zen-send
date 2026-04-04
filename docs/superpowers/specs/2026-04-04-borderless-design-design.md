# Zen Send 无边框设计规范

## 概述

当前 Zen Send Web 界面大量使用边框来区分元素，导致视觉上产生约束感。本设计规范提出一套无边框的设计语言，通过背景色对比、圆角和交互反馈来替代边框的表达。

## 设计原则

1. **移除边框**: 所有 `border` 属性从组件中移除
2. **背景对比**: 用背景色的明暗对比替代边框来区分层级
3. **大圆角**: 使用 12-16px 圆角提供柔和的边界感
4. **交互反馈**: hover 状态用轻微下沉和阴影加深来表达

## 配色方案

### 浅色模式

| 元素 | 色值 | 用途 |
|------|------|------|
| 页面背景 | `#F7F5F2` | 主背景，暖灰色调 |
| 卡片背景 | `#FFFFFF` | 最高层级容器 |
| 列表项 | `#F5F5F5` | 次级容器，分组背景 |
| 主按钮 | `#2C2C2C` | 深色填充，白色文字 |
| 次按钮 | `#FFFFFF` | 浅色填充，深色文字 |
| 输入框 | `#FFFFFF` | 与卡片同色 |

### 深色模式

| 元素 | 色值 | 用途 |
|------|------|------|
| 页面背景 | `#121214` | 主背景，最深色 |
| 卡片背景 | `#1C1C1E` | 次级容器 |
| 列表项 | `#262628` | 分组背景 |
| 主按钮 | `#8B9A7D` | accent 色填充，深色文字 |
| 次按钮 | `#262628` | 浅色文字 |
| 输入框 | `#1C1C1E` | 与卡片同色 |
| Focus 色 | `#8B9A7D` | outline 焦点环，accent 同色 |

## 组件规范

### 卡片组件

```css
/* 浅色模式 */
background: #FFFFFF;
border-radius: 16px;
padding: 16px;

/* 深色模式 */
background: #1C1C1E;
border-radius: 16px;
padding: 16px;
```

**移除**: `border`, `box-shadow`

### 按钮组件

```css
/* 主按钮 - 浅色模式 */
background: #2C2C2C;
color: white;
border-radius: 12px;
padding: 12px 16px;
border: none;

/* 主按钮 - 深色模式 */
background: #8B9A7D;
color: #1C1C1E;
border-radius: 12px;
padding: 12px 16px;
border: none;

/* 次按钮 */
background: #FFFFFF; /* 浅色模式 */
background: #262628; /* 深色模式 */
color: #2C2C2C; /* 浅色模式 */
color: #C5C2BD; /* 深色模式 */
border-radius: 12px;
border: none;
```

**hover 状态**: 轻微下沉效果 (`transform: translateY(1px)`)，不使用阴影

> **说明**: 设计原则是无边框无阴影，交互反馈主要通过：背景色变化、下沉效果、颜色高亮来表达

### 列表项

```css
/* 浅色模式 */
background: #F5F5F5;
border-radius: 10px;
padding: 10px 12px;

/* 深色模式 */
background: #262628;
border-radius: 10px;
padding: 10px 12px;
```

**移除**: 分隔线 (`border-bottom`)

### 输入框

```css
/* 浅色模式 */
background: #FFFFFF;
border-radius: 12px;
padding: 12px 16px;
border: none;

/* 深色模式 */
background: #1C1C1E;
border-radius: 12px;
padding: 12px 16px;
border: none;
```

**focus 状态**: 使用 `outline: 2px solid var(--border-focus)` 而不是边框

### 分隔线

移除所有 `border-t`, `border-b` 分隔线，改用：
- 分组间用不同的背景色区分
- 或者增加间距 (`gap`) 来表达分组

## 需要修改的文件

### 主题配置

- `apps/web/src/theme/tokens.ts` - 更新或移除 border 相关 token
- `apps/web/src/index.css` - 更新 CSS 变量，移除 border 变量定义

### 组件文件

- `apps/web/src/components/sidebar/index.tsx`
- `apps/web/src/components/send-toolbar/index.tsx`
- `apps/web/src/components/send-toolbar/send-toolbar.service.ts`
- `apps/web/src/components/transfer-list/index.tsx`
- `apps/web/src/components/search-bar/index.tsx`
- `apps/web/src/components/toast/index.tsx`
- `apps/web/src/components/preview-modal/index.tsx`

### 页面文件

- `apps/web/src/pages/home/index.tsx`
- `apps/web/src/pages/devices/index.tsx`
- `apps/web/src/pages/login/index.tsx`
- `apps/web/src/pages/register/index.tsx`
- `apps/web/src/pages/setup/index.tsx`

## 实现顺序

1. 更新 `tokens.ts` 和 `index.css` 中的颜色变量
2. 更新通用组件 (sidebar, send-toolbar)
3. 更新页面组件
4. 测试两种主题下的视觉效果
