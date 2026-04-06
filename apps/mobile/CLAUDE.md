# Mobile App - Claude Code 指南

## 核心规则（不可违背）

### 1. Service 注册规则

| 类型 | 注册方式 | 位置 |
|------|---------|------|
| 全局 Service | `register()` | `main.tsx` |
| 页面/组件 Service | `bindServices()` | 组件导出处 |

```typescript
// ✅ 全局 Service - main.tsx
register(ApiService);
register(ToastService);

// ✅ 页面 Service - 组件导出
export default bindServices(HomeContent, [HomeService]);
```

### 2. 响应式规则

组件必须用 `observer` 包裹才能响应状态变化：

```typescript
// ✅ 正确
const Component = observer(() => {
  return <div>{service.count}</div>;
});

// ❌ 错误：忘记 observer，不会响应变化
const Component = () => {
  return <div>{service.count}</div>;
};
```

### 3. 不可解构 Observable

```typescript
// ❌ 错误：解构破坏响应式
const { count } = service;

// ✅ 正确：直接访问
service.count;
```

### 4. resolve() 必须用 Getter

```typescript
// ❌ 错误：直接赋值
private apiService = this.resolve(ApiService);

// ✅ 正确：getter 延迟解析
get apiService() {
  return this.resolve(ApiService);
}
```

### 5. 跨级访问：子组件访问父组件容器中的 Service

容器层次：HomePage → TransferChat → BottomToolbar

子组件可直接访问**父组件容器**中注册的 Service：

```typescript
// TransferChatService（在 TransferChat 中注册）可访问 HomeService
export class TransferChatService extends Service {
  get homeService() {
    return this.resolve(HomeService); // 父组件容器的 Service
  }
}

// BottomToolbar（子组件）可直接 useService(TransferChatService)
const BottomToolbar = observer(() => {
  const chatService = useService(TransferChatService); // 父容器的 Service
  // 无需事件传递，直接调用
  await chatService.sendText(text);
});
```

**核心原则**：子组件通过 `useService` 访问**直接父容器**的 Service；Service 通过 `resolve` 访问**父组件容器**的 Service。

### 6. API 类型定义

`ApiService` 已自动提取 `data` 包装层，类型写真实结构：

```typescript
// ✅ 正确：类型是真实数据结构
const { transfers } = await this.apiService.get<{ transfers: TransferSession[] }>('/api/transfers');

// ❌ 错误：类型包含 data 包装（已由 ApiService 处理）
const { transfers } = await this.apiService.get<{ data: { transfers: [...] } }>(...);
```

## 目录结构

```
src/
├── services/              # 全局 Service（register()）
├── pages/                 # 页面 + 页面级 Service
└── components/            # 组件 + 组件级 Service（bindServices()）
```

## Design System

**设计方向**: Editorial Minimal with Sage Accent — 克制、小众先锋、温暖编辑感、大量留白

- **大量留白** — 呼吸感优先
- **黑白灰** — 承担 95% 视觉重量
- **点缀色** — 仅在 5% 关键位置出现（Sage Green）
- **无边框** — 用背景色差代替边框
- **无渐变** — 除非必要

### 图标规范

使用 `@expo/vector-icons` 的 `Ionicons`，**禁止使用 emoji 作为图标**：

```typescript
import { Ionicons } from '@expo/vector-icons';

// ✅ 正确
<Ionicons name="attach" size={22} color={colors.textPrimary} />
<Ionicons name="send" size={18} color={colors.accent} />
<Ionicons name={themeService.isDark ? 'sunny' : 'moon-outline'} size={20} color={colors.textPrimary} />

// ❌ 错误：使用 emoji 作为图标
<Text style={styles.icon}>📎</Text>
<Text>🔍</Text>
```

### 颜色

**Accent - Sage Green**: `#8B9A7D`

| 用途 | 颜色 |
|------|------|
| 背景 | `#F7F5F2` (暖灰) / `#FFFFFF` |
| 文字主色 | `#2C2C2C` |
| 文字次色 | `#9A958F` |
| 文字弱色 | `#B5AFA8` |
| 边框默认 | `#DDD8D0` |
| 边框弱色 | `#EDEBE7` |
| 点缀色 | `#8B9A7D` |
| 点缀色软 | `#8B9A7D20` (12% 透明度) |
