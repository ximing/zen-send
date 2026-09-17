# 任务 1:transfer-item 状态化(上传中 / 失败内联到列表项)

## 背景

zen-send monorepo,你只改 `apps/web`。这是文件传输首页重设计的第一部分:把上传进度从独立的进度卡片区(selected-files 组件)移到列表 item 内部展示。

视觉规范以 `/Users/ximing/project/mygithub/zen-send/designs/transfer-home.html` 为准(先用浏览器或读源码理解它,里面的 CSS 值直接可用)。关键样式:

- 上传中行:缩略图(46px, rounded 10px)上叠半透黑罩 + 白色百分比;meta 行显示 `1.9 / 4.1 MB · 1.2 MB/s`(accent 色);行内底部 3px 进度条(track 用 `var(--bg-elevated)`,fill 用 `var(--accent)`);右侧常驻 × 取消按钮。上传中行不可点击预览、无 hover 阴影。
- 失败行:meta 行红色「上传失败 · 18.2 MB · 上午 8:47」(红色用 `var(--color-error)` 或 tokens 里的 error),hover 出两个操作:重试(ArrowUp 图标,accent 色)、删除(Trash2,hover 变红)。
- 文字条目改为「便签卡」:背景 `var(--accent-soft)`、rounded-[14px]、padding 14px 16px 11px;内容 14px/1.65,最多 3 行,超出显示「展开/收起」(沿用现有 pretext 溢出检测逻辑);底部一行:左侧绝对时间(11.5px secondary),右侧 hover 才出现的操作:复制(Copy)、二维码(QrCode)、删除(Trash2)。
- 文件行 meta 改为 `{size} · {绝对时间}`,时间格式:当天「上午/下午 H:MM」,非当天「M月D日」。替换掉现在的 `getRelativeTime`(JUST NOW / 2H AGO)。
- 文件行 hover 操作保持现状:下载、复制链接、二维码、删除。

## 数据层现状(已具备,直接用)

`apps/web/src/pages/home/home.service.ts` 的 `uploadFiles()` 已经会把临时 TransferSession 插入 `this.transfers`(id 为 uploadId),拿到真实 sessionId 后 `updateUploadStatus` 会把列表里的 id 替换掉。`uploadingFiles: UploadingFile[]` 与之平行维护,`UploadingFile` 有 `sessionId` 字段。

TransferItem 里通过 `homeService.uploadingFiles.find(f => f.id === transfer.id || f.sessionId === transfer.id)` 找到对应的上传状态。

## 需要改的

1. **`transfer-item` 组件**:按上述视觉规范实现 uploading / failed 两种状态;文字条目改为便签卡样式;时间改绝对时间。
2. **`home.service.ts`**:
   - `cancelUpload`:除了现有逻辑,把对应的临时 session 从 `this.transfers` 移除(取消即消失)。
   - 新增 `discardFailedUpload(uploadId: string)`:若 upload 有 sessionId 调 `apiService.deleteTransfer` 尝试清理(失败忽略),然后从 `uploadingFiles` 和 `transfers` 中移除。失败 item 的「删除」调它。
   - 新增 `formatTimeOfDay` 工具(可放 `apps/web/src/lib/` 下,文件名小写连字符)或在组件内实现。
   - 不要删 `selectedFiles` / `addFiles` / `uploadFiles` / `selected-files` 组件 —— 那是任务 3 的事。

## 硬性规则(违反即返工)

- 组件必须 `observer()` 包裹;禁止解构 service 的 observable(写 `homeService.xxx`,不要 `const { xxx } = homeService`);`resolve()` 必须用 getter(`get apiService() { return this.resolve(ApiService); }`)。
- 颜色一律用 CSS 变量(`var(--bg-surface)`、`var(--accent)` 等),不要硬编码 hex(tokens 已在 :root 定义,见 apps/web/src/index.css)。
- 图标用 lucide-react。
- UI 文案用中文。
- 文件名小写连字符。
- Tailwind CSS v4,任意值写法如 `bg-[var(--accent-soft)]`。

## 验收

完成后必须跑通:

```bash
cd /Users/ximing/project/mygithub/zen-send/apps/web && pnpm typecheck && pnpm lint
```

不要 git commit,不要启动 dev server,不要 build。
