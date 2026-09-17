# 任务 2:时间流重排 —— 最新在上 + 按天分组 + 筛选/空状态/拖拽文案

## 背景

zen-send monorepo,你只改 `apps/web`。文件传输首页重设计第二部分。任务 1 已完成:transfer-item 已支持上传中/失败内联状态,文字条目已是便签卡样式,时间已改绝对时间(「上午 10:32」/「M月D日」)。

视觉规范以 `/Users/ximing/project/mygithub/zen-send/designs/transfer-home.html` 为准(先读它,CSS 值直接可用)。

## 现状(要改的)

`apps/web/src/components/transfer-list/transfer-list.tsx` 目前像聊天软件:数组升序,新条目追加在**底部**,用 virtua 的 `VList`(带 `shift`),滚动到顶部加载更早记录,不在底部时显示「N 条新传输」pill 和回到底部按钮。

`home.service.ts` 里 `this.transfers` 是升序(旧 → 新),`loadOlderTransfers` 取 `transfers[0]`(最旧)往前翻页并 prepend。

## 需要改的

### 1. 列表反转为最新在上(desc)

- 渲染顺序反转:最新条目在最上面。可以渲染时用反转后的数组(service 内部存储保持升序不动,避免动翻页逻辑)。
- 滚动行为适配:VList 去掉 `shift`;滚动到**底部**时触发 `loadOlderTransfers()`(原来在顶部);新条目从顶部进入。
- 「N 条新传输」pill 改为:新条目到达且用户不在顶部时,pill 显示在**顶部居中**,文案「有 N 条新记录」,点击 `scrollToIndex(0, {smooth:true})` 并清零。右下角回到底部按钮删除,不需要了。
- 注意 VList 反转后首屏应停在最顶部(最新),验证初始滚动位置正确。

### 2. 按天分组

- 按 `createdAt` 分组(注意时间戳是秒级还是毫秒级,现有 `getRelativeTime` 里有判断逻辑可参考),组标题:今天 / 昨天 / 「M月D日」(跨年加年份「YYYY年M月D日」)。
- 组标题样式:12px、`var(--text-muted)`,`margin: 22px 2px 8px`,第一组 `margin-top: 0`。
- 实现方式:把 desc 后的 transfers 拍平成 `[{type:'header',label,key}, {type:'item',transfer}, ...]` 数组喂给 VList,header 和 item 都是虚拟列表的子节点。
- 任务 1 之后条目时间已经是时分,分组提供天的粒度,两者正好配合。

### 3. filter-tabs 改分段控件

`apps/web/src/components/filter-tabs/`:容器 `inline-flex bg-[var(--bg-elevated)] rounded-[10px] p-[3px]`;按钮 `px-[15px] py-[5px] rounded-lg text-[13px]`;激活 `bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium`;非激活 `text-[var(--text-secondary)]`。标签改为中文:全部 / 文件 / 文字(去掉 ALL/FILES/TEXT 全大写)。整行布局:左侧分段控件,右侧 `{n} 条记录`(12px,`var(--text-muted)`),n 为当前过滤后的条数(含分组前),整行 `margin: 24px 2px 14px` 左右留白对齐列表。

### 4. 空状态

`filteredTransfers` 为空时(非加载中):居中圆形(`76px`,`var(--bg-elevated)`,内嵌 Paperclip 图标 32px,`var(--text-muted)`)+ 标题「还没有传输记录」(15px medium)+ 副文案「把文件拖进窗口,或在上方写一段文字 / 记录会按天整理在这里」(13px secondary,两行,1.7 行高)。若是因为筛选(非 all)为空,标题改「该分类下暂无记录」,副文案不变。替换现在 MailOpen + 「No transfers yet」的空态。

### 5. 拖拽遮罩文案

`apps/web/src/pages/home/index.tsx` 的拖拽 overlay:标题「Release to upload」→「松开即发送」,加一行副文案「支持多文件和文件夹」(13px,`var(--text-secondary)`)。

## 硬性规则(违反即返工)

- 组件必须 `observer()` 包裹;禁止解构 service observable;`resolve()` 用 getter。
- 颜色一律用 CSS 变量;图标用 lucide-react;UI 文案中文;文件名小写连字符;Tailwind v4 任意值写法。
- `home.service.ts` 的翻页/去重逻辑(addTransfer / loadOlderTransfers / markTransferComplete / updateUploadStatus 里的 id 替换)不要动,只动渲染层。任务 1 加的 cancelUpload/discardFailedUpload 逻辑保持不动。

## 验收

```bash
cd /Users/ximing/project/mygithub/zen-send/apps/web && pnpm typecheck && pnpm lint
```

不要 git commit,不要启动 dev server,不要 build。
