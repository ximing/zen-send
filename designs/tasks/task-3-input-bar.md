# 任务 3:text-input-bar 替换 bottom-toolbar 和 selected-files

## 背景

zen-send monorepo,你只改 `apps/web`。文件传输首页重设计第三部分(最后一部分)。任务 1、2 已完成:列表项已内联上传进度,列表已按天分组最新在上。

视觉规范以 `/Users/ximing/project/mygithub/zen-send/designs/transfer-home.html` 为准(看「文字输入行 .text-bar」部分,CSS 值直接可用)。

## 需要改的

### 1. 新组件 `apps/web/src/components/text-input-bar/`

一行式输入条,样式:整行 `flex items-center gap-2 bg-[var(--bg-surface)] rounded-[14px]`,padding `6px 6px 6px 8px`:

- 左侧:Paperclip 图标按钮(36×36,rounded 10px,`var(--text-secondary)`,hover `bg-[var(--bg-elevated)]`),点击打开文件选择( hidden `<input type="file" multiple>` ),**选完立即上传**,不需要确认。
- 中间:单行 `<input>`,placeholder「写点文字,回车发送;文件直接拖进来」,回车发送,发送后清空。
- 右侧:发送按钮 —— sage 实底(`var(--accent)`)白字,ArrowUp 图标 14px + 「发送」,h-9 px-[15px] rounded-[10px] text-[13px];输入为空时 disabled(`bg-[var(--bg-elevated)] text-[var(--text-muted)]`)。
- 发送中防重复提交(沿用现有 isSending 思路)。
- 不再有独立的图片选择按钮和剪贴板按钮(图片走同一个文件选择器;粘贴文本用输入框原生粘贴即可)。

### 2. 替换旧组件

- `apps/web/src/pages/home/index.tsx`:移除 `<SelectedFiles />` 和 `<BottomToolbar />`,在 `<FilterTabs />` **上方**放 `<TextInputBar />`(页面顺序:TextInputBar → FilterTabs → TransferList)。整体布局从「列表撑满 + 底部工具栏」改为「顶部输入行 + 筛选 + 列表」,参考设计稿 .column 内顺序。输入行和筛选行与列表同在一个 max-width 680px 居中列里(如当前没有居中列,加一个 wrapper:`max-width: 680px; margin: 0 auto`,列表区域保持 flex-1 min-h-0 可滚动)。
- 删除 `apps/web/src/components/bottom-toolbar/` 和 `apps/web/src/components/selected-files/` 两个目录。
- 拖拽上传逻辑(home/index.tsx 里的 handleDrop)保持不变,但改为直接调新的立即发送方法(见下)。

### 3. home.service.ts 清理

- `selectedFiles` 暂存态删除:`addFiles` / `removeFile` / `clearFiles` / `selectedFiles` 字段全部移除。
- 新增 `sendFiles(files: { name; size; type?; data? }[])`:即现在 `uploadFiles()` 的内容(直接消费传入的 files,不再读 selectedFiles)。`uploadFiles()` 改名为 `sendFiles` 并改签名,或保留 `uploadFiles(files)` 名字直接改签名 —— 选一个,全仓搜索确认没有遗漏的调用方(注意 search/downloads 等页面也可能引用,都改干净)。
- 文件读取:旧 bottom-toolbar 用 FileReader + setTimeout 100ms 的 hack,改为 `Promise.all(files.map(f => f.arrayBuffer()))` 后再调 sendFiles。

### 4. 检查其他引用

`grep -r "selected-files\|bottom-toolbar\|BottomToolbar\|SelectedFiles\|addFiles\|selectedFiles" apps/web/src` 确认全部清理干净。

## 硬性规则(违反即返工)

- 组件必须 `observer()` 包裹;禁止解构 service observable;`resolve()` 用 getter。
- HomeService 是全局 Service(main.tsx register),text-input-bar 用 `useService(HomeService)`。
- 颜色一律 CSS 变量;图标 lucide-react;UI 文案中文;文件名小写连字符;目录结构遵循 `components/text-input-bar/index.ts`(barrel export)+ `text-input-bar.tsx`。
- Tailwind v4 任意值写法。

## 验收

```bash
cd /Users/ximing/project/mygithub/zen-send/apps/web && pnpm typecheck && pnpm lint
```

不要 git commit,不要启动 dev server,不要 build。
