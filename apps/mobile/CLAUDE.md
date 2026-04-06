# Mobile App - Claude Code 指南

## 核心规则（不可违背）

### 1. Service 注册规则

**所有 Service 都是全局单例**，在应用入口统一注册：

| 类型 | 注册方式 | 位置 |
|------|---------|------|
| 所有 Service | `register()` | `app/_layout.tsx` |

```typescript
// ✅ 正确：在 _layout.tsx 全局注册
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(HomeService);

// ✅ 页面组件直接使用 observer，不需要 bindServices
export default observer(HomeContentInner);

// ❌ 错误：不要在页面级别使用 bindServices
// 这会创建新的容器，导致 Service 实例不一致
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

### 5. Service 之间访问依赖

所有 Service 都是全局单例，通过 `resolve()` 获取其他 Service：

```typescript
export class HomeService extends Service {
  // ✅ 正确：getter 延迟解析
  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  async loadData() {
    // 直接使用 resolve 的 Service
    const data = await this.apiService.get('/api/data');
  }
}
```

**核心原则**：所有页面共享同一个全局 Service 实例，状态在任何地方修改都会同步更新。

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
app/
├── _layout.tsx            # 应用入口（register 所有 Service）
├── (auth)/                # 认证相关页面
└── (main)/                # 主页面
src/
├── services/              # 全局 Service（在 _layout.tsx 注册）
├── components/            # 通用组件（使用 useService + observer）
└── theme/                 # 主题配置
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
