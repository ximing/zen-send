# Web App - Claude Code 指南

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

### 5. API 类型定义

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

- **无边框** — 用背景色差和阴影代替边框
- **绿色主色** — 交互状态使用绿色
- **悬浮感** — 透明背景、模糊、hover 上浮

### 颜色（亮色模式）

| 用途 | 颜色 |
|------|------|
| 主色调 | `#22c55e` |
| 背景 | `#FFFFFF` / `#F9FAFB` |
| 文字 | `#18181b` / `#71717a` |
