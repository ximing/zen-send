# 外链复制功能实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为文件消息添加"复制外链"功能，用户点击后可复制 S3 预签名下载地址（6小时有效期）

**Architecture:**
- 后端：新增公开 API 端点 `/api/transfers/:id/external-link`（无需认证），调用 S3Service 生成 6 小时有效期的预签名 URL
- Web：MessageBubble 添加复制链接按钮，调用新 API 并复制到剪贴板
- Mobile：TransferItem 添加复制链接按钮，实现逻辑与 Web 一致

**Tech Stack:** Express.js, S3 presigned URLs, React, React Native, expo-clipboard

---

## Chunk 1: 后端 - 新增外链 API

**Files:**
- Modify: `apps/server/src/controllers/transfer.controller.ts`
- Modify: `apps/server/src/services/transfer.service.ts`

- [ ] **Step 1: 在 TransferController 添加公开端点**

在 `@Authorized()` 的 controller 中，新增不需要认证的 `external-link` 端点：

```typescript
// 新建文件: apps/server/src/controllers/external-link.controller.ts
import { JsonController, Get, Param, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { TransferService } from '../services/transfer.service.js';
import { ResponseUtil } from '../utils/response.js';

@JsonController('/api/transfers')
@Service()
export class ExternalLinkController {
  constructor(private transferService: TransferService) {}

  @Get('/:id/external-link')
  async getExternalLink(@Param('id') id: string) {
    try {
      const { url, expiresAt } = await this.transferService.getExternalLink(id);
      return ResponseUtil.success({ url, expiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate external link';
      throw new HttpError(400, message);
    }
  }
}
```

**注意**：routing-controllers 会自动合并同 base path 的 controller，所以 `ExternalLinkController` 和 `TransferController` 都用 `/api/transfers` 是可以的，方法级别的路由不会冲突。

- [ ] **Step 2: 在 TransferService 添加 getExternalLink 方法**

```typescript
// apps/server/src/services/transfer.service.ts 添加方法
async getExternalLink(sessionId: string): Promise<{ url: string; expiresAt: number }> {
  const session = await this.db.query.transferSessions.findFirst({
    where: eq(transferSessions.id, sessionId),
  });

  if (!session) {
    throw new Error('Transfer not found');
  }

  if (session.status !== 'completed') {
    throw new Error('Transfer is not completed');
  }

  // 检查是否是 S3 存储类型（内联文本没有 S3 对象）
  const items = await this.db.query.transferItems.findMany({
    where: eq(transferItems.sessionId, sessionId),
  });

  if (items.length === 0 || items[0].storageType !== 's3') {
    throw new Error('External link is only available for S3-stored files');
  }

  // 6小时有效期（秒）
  const EXTERNAL_LINK_EXPIRY = 6 * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + EXTERNAL_LINK_EXPIRY;

  // 确定 S3 key：单 chunk 文件是 transfers/${sessionId}/chunk_0，多 chunk 是 transfers/${sessionId}
  const s3Key = session.chunkCount === 1
    ? `transfers/${sessionId}/chunk_0`
    : session.s3Key;

  const url = await this.s3Service.getPresignedDownloadUrl(
    s3Key,
    session.originalFileName || 'download',
    EXTERNAL_LINK_EXPIRY
  );

  return { url, expiresAt };
}
```

- [ ] **Step 3: 在 ioc.ts 中注册新 controller**

确保 glob 模式能加载新 controller（通常已经支持）

- [ ] **Step 4: 测试 API**

```bash
# 启动服务器后测试
curl http://localhost:3110/api/transfers/{sessionId}/external-link
# 预期返回: { success: true, data: { url: "https://...", expiresAt: ... } }
```

- [ ] **Step 5: 提交**

```bash
git add apps/server/src/controllers/external-link.controller.ts apps/server/src/services/transfer.service.ts
git commit -m "feat(server): add public external-link API endpoint"
```

---

## Chunk 2: Web 前端 - 添加复制链接按钮

**Files:**
- Modify: `apps/web/src/services/api.service.ts`
- Modify: `apps/web/src/components/transfer-chat/message-bubble.tsx`

- [ ] **Step 1: 在 ApiService 添加 getTransferExternalLink 方法**

```typescript
// apps/web/src/services/api.service.ts
async getTransferExternalLink(transferId: string): Promise<{ url: string; expiresAt: number }> {
  return this.get<{ url: string; expiresAt: number }>(`/api/transfers/${transferId}/external-link`);
}
```

- [ ] **Step 2: 在 MessageBubble 添加复制链接按钮**

导入 `Link` 图标和 `ToastService`：
```typescript
import { FileText, Pencil, CheckCircle, AlertCircle, Download, Eye, Copy, Link } from 'lucide-react';
import { ToastService } from '../toast/toast.service';
```

添加 `handleCopyLink` 回调：
```typescript
const handleCopyLink = useCallback(async () => {
  try {
    const { url } = await apiService.getTransferExternalLink(transfer.id);
    await navigator.clipboard.writeText(url);
    const toastService = useService(ToastService);
    toastService.show('链接已复制，可在 6 小时内访问', 'success');
  } catch (err) {
    console.error('Failed to copy link:', err);
  }
}, [apiService, transfer.id]);
```

在按钮组添加新按钮（预览、下载按钮旁边）：
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

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/services/api.service.ts apps/web/src/components/transfer-chat/message-bubble.tsx
git commit -m "feat(web): add copy link button to message bubble"
```

---

## Chunk 3: 移动端 - 添加复制链接按钮

**Files:**
- Modify: `apps/mobile/src/services/api.service.ts`
- Modify: `apps/mobile/src/components/transfer-item/index.tsx`

- [ ] **Step 1: 在移动端 ApiService 添加 getTransferExternalLink**

检查 `apps/mobile/src/services/api.service.ts` 是否存在，如不存在参考 Web 版添加方法。

- [ ] **Step 2: 在 TransferItem 添加复制链接按钮**

添加 `handleCopyLink` 方法：
```typescript
const handleCopyLink = async () => {
  if (firstItem?.storageType === 's3') {
    try {
      const { url } = await apiService.getTransferExternalLink(transfer.id);
      await Clipboard.setStringAsync(url);
      showToast('Link copied');
    } catch (err) {
      showToast('Failed to copy link');
    }
  }
};
```

在 actions 区域添加复制链接按钮：
```tsx
<TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink}>
  <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
</TouchableOpacity>
```

- [ ] **Step 3: 提交**

```bash
git add apps/mobile/src/services/api.service.ts apps/mobile/src/components/transfer-item/index.tsx
git commit -m "feat(mobile): add copy link button to transfer item"
```

---

## 验证清单

- [ ] 后端 API 返回有效的 S3 预签名 URL
- [ ] URL 有效期为 6 小时
- [ ] Web 端点击复制链接按钮后，URL 已复制到剪贴板
- [ ] Mobile 端点击复制链接按钮后，URL 已复制到剪贴板
- [ ] 未登录用户也可以访问外链 API
