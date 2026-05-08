---
paths:
  - 'apps/web/**'
  - 'apps/electron/**'
  - 'apps/mobile/**'
---

# @rabjs/react Critical Rules

These rules are **non-obvious and must be followed**:

1. **Components must use `observer()`** — Components wrapped with `observer()` from @rabjs/react 才能响应状态变化

2. **Never destructure observables** — `const { count } = service` breaks reactivity; use `service.count` directly

3. **resolve() must use getters** — Use `get apiService() { return this.resolve(ApiService); }` not property assignment

4. **Global vs page services**:
   - Web/Electron: Global via `register()` in main.tsx; Page-level via `bindServices()` at component export
   - Mobile: All services are global via `register()` in `_layout.tsx`; Do NOT use `bindServices()` in mobile

5. **API types** — ApiService unwraps `data` layer; type generics reflect actual structure, not wrapper
