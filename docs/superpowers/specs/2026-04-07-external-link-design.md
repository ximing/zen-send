# 外链复制功能设计

## 概述

为文件消息添加"复制外链"功能，用户点击后可复制 S3 预签名下载地址（6小时有效期），方便分享给其他人直接下载。

## 功能流程

1. 用户 hover 文件消息气泡，显示预览、下载、复制链接三个按钮
2. 点击「复制链接」按钮
3. 调用后端 API 生成 S3 预签名链接（6小时有效期）
4. 复制到剪贴板，Toast 提示"链接已复制"

## 后端改动

### S3Service (`apps/server/src/services/s3.service.ts`)

现有 `getPresignedDownloadUrl` 方法已支持自定义过期时间：

```typescript
async getPresignedDownloadUrl(
  key: string,
  originalFileName: string,
  expiresIn = 86400  // 默认 24 小时
): Promise<string>
```

**无需改动**，因为 expiresIn 默认值是 24 小时，但我们需要在调用时传入 6 小时（21600 秒）。

### TransferController (`apps/server/src/controllers/transfer.controller.ts`)

需要新增一个 API 端点专门用于生成外链：

```
GET /api/transfers/:id/external-link
```

响应：
```typescript
{
  url: string;        // S3 预签名 URL（6小时有效）
  expiresAt: number;  // 过期时间戳（秒）
}
```

**注意**：这个端点**需要认证**（用户必须登录才能生成外链），并且会验证 transfer 是否属于当前登录用户。

## 前端改动 (Web)

### MessageBubble (`apps/web/src/components/transfer-chat/message-bubble.tsx`)

添加复制链接按钮：

1. 导入 `Link` 图标（lucide-react）
2. 添加 `handleCopyLink` 回调函数：
   - 调用 `apiService.getTransferExternalLink(transfer.id)` 获取 URL
   - 复制到剪贴板
   - 显示 Toast 提示
3. 在文件消息的按钮组中添加「复制链接」按钮

### ApiService (`apps/web/src/services/api.service.ts`)

新增方法：

```typescript
async getTransferExternalLink(transferId: string): Promise<{ url: string; expiresAt: number }> {
  return this.get(`/api/transfers/${transferId}/external-link`);
}
```

## 移动端改动 (React Native)

### TransferItem (`apps/mobile/src/components/transfer-item/index.tsx`)

同样添加复制链接按钮，实现逻辑与 Web 端一致。

### API Service (移动端)

需要在移动端的 API service 中添加 `getTransferExternalLink` 方法。

## Toast 提示

复制成功后显示轻提示："链接已复制，可在 6 小时内访问"

## 按钮样式

使用 `Link` 图标（lucide），与现有 Preview/Download 按钮风格一致：

```tsx
<button
  onClick={handleCopyLink}
  className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
  title="Copy Link"
>
  <Link
    size={16}
    className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
  />
</button>
```

## 文件结构

```
apps/
├── server/
│   └── src/
│       ├── controllers/
│       │   └── transfer.controller.ts      # 新增 external-link 端点
│       └── services/
│           └── s3.service.ts              # 无需改动（已支持自定义 expiry）
├── web/
│   └── src/
│       ├── components/transfer-chat/
│       │   └── message-bubble.tsx         # 添加复制链接按钮
│       └── services/
│           └── api.service.ts             # 新增 getTransferExternalLink
└── mobile/
    └── src/
        ├── components/transfer-item/
        │   └── index.tsx                  # 添加复制链接按钮
        └── services/
            └── api.service.ts             # 新增 getTransferExternalLink
```

## 测试要点

1. 复制链接后，在浏览器新标签页打开，确认可以下载
2. 等待链接过期后（约6小时后），确认无法访问
3. 确认未登录用户无法生成外链（返回 401）
4. 确认只能访问自己创建的 transfer 的外链
