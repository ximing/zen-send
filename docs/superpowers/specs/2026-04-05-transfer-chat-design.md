# Transfer Chat Design - 传输页面改版设计

## Overview

将传输记录页面从扁平列表重新设计为类似 Telegram 的对话式时间线，每个传输文件作为一条消息气泡，不同设备通过图标、名称和颜色标签区分。

## Design Direction

**参考风格**: Telegram 消息气泡
- 消息气泡左右分布（发送靠右，接收靠左）
- 设备作为发送者/接收者身份标识
- 视觉化优先，支持文件缩略图预览
- 进度条内嵌在气泡内

---

## 1. Layout Structure

### Main Content Area
```
┌─────────────────────────────────────────┐
│  Sidebar (unchanged)                    │
├─────────────────────────────────────────┤
│  Main Content                           │
│  ┌─────────────────────────────────┐    │
│  │  SendToolbar (drag & drop)     │    │
│  ├─────────────────────────────────┤    │
│  │  Uploading Section              │    │
│  │  (inline progress bubbles)      │    │
│  ├─────────────────────────────────┤    │
│  │  Date Separator: 今天           │    │
│  │  ┌─────────────────────┐        │    │
│  │  │ Message Bubble      │        │    │
│  │  │ (received - left)   │        │    │
│  │  └─────────────────────┘        │    │
│  │  ┌─────────────────────┐        │    │
│  │  │ Message Bubble       │        │    │
│  │  │ (sent - right)       │        │    │
│  │  └─────────────────────┘        │    │
│  │  Date Separator: 昨天           │    │
│  │  ...                            │    │
│  ├─────────────────────────────────┤    │
│  │  Load More                     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Responsive Behavior
- 保持现有侧边栏设计（可折叠）
- 消息气泡最大宽度 70%
- 缩略图自适应尺寸

---

## 2. Message Bubble Structure

### Sent Message (Self Device)
- **Alignment**: Right
- **Background**: `var(--primary)` at 15% opacity
- **Border Radius**: 左侧尖角（模拟气泡尾巴）
- **Device Tag**: 气泡内底部右侧

### Received Message (Other Devices)
- **Alignment**: Left
- **Background**: `var(--bg-elevated)`
- **Border Radius**: 右侧尖角
- **Device Tag**: 气泡内底部左侧

### Bubble Content Layout
```
┌─────────────────────────────────┐
│  [Thumbnail/Icon]  │  filename │
│                    │  2.4 MB    │
│                    │  ▓▓▓░░ 45%│
│                         📱 Mac  │
└─────────────────────────────────┘
```

- **Thumbnail** (左侧 40%): 图片/视频显示预览，其他文件显示类型图标
- **File Info** (右侧 60%): 文件名（超长截断）+ 文件大小 + 进度条

### Device Tag Format
```
📱 MacBook Pro · ●
  (icon)  (name) (color dot)
```

---

## 3. Device Identification

### Device Colors (by type)
| Device Type | Color | Hex |
|-------------|-------|-----|
| Web | 蓝色 | #3B82F6 |
| Android | 绿色 | #22C55E |
| iOS | 紫色 | #A855F7 |
| Desktop | 橙色 | #F97316 |

### Device Icon Mapping
| Device Type | Icon |
|-------------|------|
| Web | Globe |
| Android | Smartphone |
| iOS | Tablet |
| Desktop | Monitor |

### Device Tag Styling
- 设备图标: 12px, `var(--text-secondary)`
- 设备名称: 11px, `var(--text-muted)`
- 颜色圆点: 6px 直径，设备对应颜色

---

## 4. Transfer States

### Upload States
| Status | Visual Treatment |
|--------|------------------|
| Pending | 灰色背景，禁用状态 |
| Uploading | 进度条显示，百分比 + 速度 |
| Completed | 绿色勾号，缩略图可点击预览 |
| Failed | 红色警告，可重试按钮 |
| Expired | 灰色删除线，30天后自动清理 |

### Progress Bar (In-Bubble)
- 高度: 3px
- 背景: `var(--border-subtle)`
- 填充: `var(--accent)`
- 圆角: 2px
- 动画: smooth transition 200ms

---

## 5. Time Grouping

### Date Separator
- 居中显示
- 样式: 文字 + 两侧横线
- 分隔内容: "今天", "昨天", "3月28日", etc.

### Relative Time Display
- `< 1分钟`: JUST_NOW
- `< 60分钟`: 5M_AGO
- `< 24小时`: 2H_AGO
- `>= 24小时`: 3D_AGO

### Full Timestamp Tooltip
- 悬停气泡显示完整时间
- 格式: "2026年4月5日 14:32:15"

---

## 6. Component Changes

### TransferList → TransferChat (重命名)
- 移除现有 FilterTabs（文件/文本过滤）
- 新增 DateSeparator 组件
- 新增 MessageBubble 组件
- 保留 SearchBar 组件

### New Components
| Component | Purpose |
|-----------|---------|
| `message-bubble/` | 单条消息气泡，包含缩略图、文件信息、设备标签 |
| `date-separator/` | 日期分隔线 |
| `device-tag/` | 设备图标+名称+颜色标签 |
| `transfer-chat/` | 消息列表容器 |

### Removed Components
- `FilterTabsComponent` - 过滤功能移至搜索栏筛选

---

## 7. Service Layer Changes

### HomeService Updates
```typescript
// 新增方法
get groupedTransfers(): Map<string, TransferSession[]>
// 按日期分组

// 保留方法
filteredTransfers  // 搜索过滤
uploadingFiles     // 上传中文件
```

---

## 8. Technical Approach

### File Organization
```
components/
├── transfer-chat/
│   ├── index.ts
│   ├── transfer-chat.tsx
│   ├── transfer-chat.service.ts
│   ├── message-bubble.tsx
│   ├── date-separator.tsx
│   ├── device-tag.tsx
│   └── hooks/
│       └── use-transfer-bubble.ts
```

### Key Implementation Notes
1. 保持 @rabjs/react observer 模式
2. 复用现有 HomeService
3. 新增 `TransferChatService` 管理对话视图状态
4. 缩略图生成使用现有 PreviewModal 逻辑
5. 保持 Socket.io 实时更新支持

---

## 9. Migration Path

1. **Phase 1**: 创建新组件 `transfer-chat/`
2. **Phase 2**: 更新路由指向新组件
3. **Phase 3**: 移除旧 `transfer-list/` 代码
4. **Phase 4**: 添加搜索和过滤功能到 Chat 视图

---

## Status

- [ ] Design Approved
- [ ] Implementation Plan Created
- [ ] Components Implemented
- [ ] Testing Complete
