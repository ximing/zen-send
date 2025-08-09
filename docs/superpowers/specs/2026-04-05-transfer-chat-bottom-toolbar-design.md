# Transfer Chat Bottom Toolbar Design - 底部输入工具栏

## Overview

将传输页面从"顶部搜索栏 + 消息列表"改为微信风格的"消息列表 + 底部输入工具栏"布局。文件拖拽上传到整个消息区域，文本输入通过发送按钮或回车发送。

## Layout Structure

```
┌─────────────────────────────────────────┐
│  Sidebar (unchanged)                    │
├─────────────────────────────────────────┤
│  Main Content                           │
│  ┌─────────────────────────────────┐    │
│  │  消息列表 (可滚动)               │    │
│  │  - 日期分隔                      │    │
│  │  - 消息气泡 (可点击)              │    │
│  │  - 拖拽上传区域 (全区域)          │    │
│  │                                  │    │
│  ├─────────────────────────────────┤    │
│  │  BottomToolbar (固定底部)         │    │
│  │  ┌─────────────────────────┐    │    │
│  │  │ 📎 文件    🔍 搜索      │    │    │
│  │  │ ┌──────────────┐  ➤    │    │    │
│  │  │ │ 输入文字...   │ 发送  │    │    │
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 1. BottomToolbar Component

### Structure
```
┌─────────────────────────────────────┐
│  📎 文件选择        🔍 搜索         │  ← 图标行 (40px)
│  ┌─────────────────────────┐  ➤   │  ← 输入行 (48px)
│  │ 输入文字...              │ 发送 │  │
│  └─────────────────────────┘      │  │
└─────────────────────────────────────┘
```

### Styling
- 背景: `var(--bg-elevated)` 或 `var(--bg-surface)`
- 边框: 顶部 1px `var(--border-subtle)`
- 内边距: 12px 水平, 8px 垂直
- 固定底部: `position: sticky; bottom: 0`

### Icons Row
- **文件选择图标 (📎)**:
  - 点击打开系统文件选择器
  - 选中后自动上传（无需发送按钮）
  - 使用 `Paperclip` or `PlusCircle` icon from lucide

- **搜索图标 (🔍)**:
  - 点击打开 SearchModal
  - 使用 `Search` icon from lucide

### Input Row
- **输入框**:
  - 占位符: "输入文字..."
  - 支持回车发送
  - 多行支持 (textarea 自动扩展)

- **发送按钮 (➤)**:
  - 只在输入框有内容时显示/可用
  - 点击或回车发送文本
  - 使用 `Send` or `ArrowUp` icon from lucide

---

## 2. Drag & Drop Upload

### Behavior
- 拖拽文件到整个消息列表区域 → 自动上传
- 拖拽时显示半透明遮罩 + 上传提示
- 上传进度显示在对应气泡内

### Drop Zone
- 整个 `TransferChatContent` 区域
- `onDragOver` → 显示遮罩
- `onDrop` → 触发上传

### Visual Feedback
```
┌─────────────────────────────────────┐
│        ┌─────────────────┐          │
│        │  📤 释放文件     │          │  ← 拖拽遮罩 (居中)
│        │   上传中...     │          │
│        └─────────────────┘          │
│  消息列表...                         │
└─────────────────────────────────────┘
```

---

## 3. SearchModal Component

### Trigger
- 点击 BottomToolbar 的搜索图标

### Content
- 搜索输入框 (聚焦自动弹出键盘)
- 时间筛选: 全部 / 今天 / 本周 / 本月
- 搜索结果列表 (按文件名/文本内容匹配)
- 点击结果 → 滚动到对应消息

### Implementation
- 使用现有 `TransferChatService.filterTransfers()` 逻辑
- Modal 使用 `dialog` element with `modal` attribute

---

## 4. PreviewModal Component

### Trigger
- 点击消息气泡

### Content
- **图片/视频**: 直接预览
- **文本**: 显示文本内容
- **其他文件**: 显示 metadata (文件名, 大小, 类型)

### Actions
- **预览**: 查看文件内容 (图片直接看，文本显示内容)
- **下载**: 下载文件到本地

### Implementation
- 复用现有的 `HomeService.setPreviewTransfer()` 逻辑
- Modal 底部添加"预览"和"下载"两个按钮

---

## 5. Component Changes Summary

### Modified Components
| Component | Change |
|-----------|--------|
| `transfer-chat/transfer-chat.tsx` | 添加拖拽上传支持 |
| `transfer-chat/message-bubble.tsx` | 点击触发 PreviewModal |
| `search-bar/index.tsx` | 移除 (功能移到 BottomToolbar 和 SearchModal) |

### New Components
| Component | Purpose |
|-----------|---------|
| `bottom-toolbar/` | 底部输入工具栏 |
| `bottom-toolbar/index.ts` | Barrel export |
| `bottom-toolbar/bottom-toolbar.tsx` | 文件选择、搜索图标、输入框、发送按钮 |
| `search-modal/` | 搜索弹窗 |
| `search-modal/index.ts` | Barrel export |
| `search-modal/search-modal.tsx` | 搜索输入 + 结果列表 |
| `preview-modal/` | 预览弹窗 (已有 PreviewModal 组件) |

### Removed Components
- `SearchBarComponent` - 功能移到 BottomToolbar 和 SearchModal

---

## 6. File Organization

```
components/
├── transfer-chat/
│   ├── index.ts
│   ├── transfer-chat.tsx      # 添加拖拽上传
│   ├── transfer-chat.service.ts
│   ├── message-bubble.tsx     # 点击触发 PreviewModal
│   ├── date-separator.tsx
│   ├── device-tag.tsx
│   ├── hooks/
│   │   └── use-transfer-bubble.ts
│   ├── bottom-toolbar/
│   │   ├── index.ts
│   │   └── bottom-toolbar.tsx
│   └── search-modal/
│       ├── index.ts
│       └── search-modal.tsx
```

---

## 7. Service Layer

### HomeService Changes
- `setPreviewTransfer(transfer)` - 设置当前预览的 transfer
- `previewTransfer` - 当前预览的 transfer (observable)

### TransferChatService Changes
- `searchQuery` - 保留，但由 BottomToolbar 更新
- `filterTransfers()` - 搜索 Modal 复用此逻辑

---

## 8. State Management

### BottomToolbar State
- `inputText: string` - 输入框文字
- `setInputText(text)` - 更新输入
- `sendText()` - 发送文本 (调用 HomeService)

### SearchModal State
- 打开/关闭状态
- 搜索结果由 `TransferChatService.filterTransfers()` 计算

### PreviewModal State
- `previewTransfer: TransferSession | null` - 来自 HomeService

---

## 9. Implementation Order

1. **创建 BottomToolbar** - 底部输入工具栏
2. **集成 BottomToolbar 到 TransferChat** - 替换 SearchBarComponent
3. **添加拖拽上传** - TransferChatContent 支持拖拽
4. **创建 SearchModal** - 搜索弹窗
5. **更新 PreviewModal** - 添加预览/下载按钮
6. **移除旧 SearchBarComponent** - 清理代码

---

## Status

- [ ] Design Approved
- [ ] Implementation Plan Created
- [ ] Components Implemented
- [ ] Testing Complete
