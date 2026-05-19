# Note Editor Block Geometry Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 note editor 的 block 几何语义，让内容编号与块视觉边界解耦，修复多 block 混排时的行号、语言头和背景层错位问题。

**Architecture:** 共享 block 模型显式拆分 content geometry 与 block geometry。gutter 只消费 numbered content lines；block background 和语言头 chrome 只消费 block geometry；opening/closing fence 继续隐藏，但不再通过真实占高 header widget 干扰内容流。实现上先锁定 `block-state` 的双边界语义，再把 `block-line-numbers` 收敛为纯 content-line 消费者，最后在同一个实现 chunk 中同时完成 spacer 替换、语言头 chrome 迁移和 block layer 几何重构，避免中间态破坏 spec。

**Tech Stack:** React 19, TypeScript, CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/language`, `@codemirror/lang-markdown`), Node test runner, `tsx`, pnpm, Vite

---

## File Structure

- Modify: `apps/web/src/pages/notes/components/note-editor/block-state.ts`
  - 将 `VisibleBlock` 从单一锚点模型改为 content/block 双边界模型，并补上 `language` 供 layer chrome 复用。
- Modify: `apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
  - 为 markdown block、非空 code block、空 code block、多 block 混排补双边界红测，锁定 numbered lines 与 block geometry 契约。
- Modify: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`
  - 提炼纯 helper，让 gutter 只基于 `VisibleBlock.lines` 计算局部编号。
- Create: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
  - 用伪造的 `VisibleBlock[]` 直接锁定 gutter helper 只读取 `lines`，不读取 block geometry。
- Modify: `apps/web/src/pages/notes/components/note-editor/block-decoration.ts`
  - 去掉真实占高 `LanguageLabelWidget`；引入固定高度 `BlockStartWidget` / spacer；保留 fence hide、atomic、changeFilter 逻辑。
- Create: `apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
  - 测试 decoration helper 只输出 spacer 与 fence hide 规格，不再输出真实语言标题 widget。
- Modify: `apps/web/src/pages/notes/components/note-editor/block-layer.ts`
  - 只消费共享 `blockTopPos/blockBottomPos` 渲染块背景与语言头 chrome；导出可测试 helper；主几何来源固定为 `lineBlockAt()`。
- Create: `apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`
  - 直接测试 layer 刷新条件、`lineBlockAt()` 几何消费和语言头 chrome 规格，不再只依赖 typecheck 或 UI 目测。
- Modify: `apps/web/src/pages/notes/components/note-editor/editor-setup.ts`
  - 收敛 `.cm-block-*`、`.cm-blocks-layer`、spacer、语言头 chrome 样式，让固定 `12px` block-start 区域与层渲染契约一致。
- Review: `apps/web/src/pages/notes/components/note-editor/index.tsx`
  - 确认现有扩展组合顺序仍成立，无需额外 wiring；若 decoration / layer 导出变化，只做最小接线调整。
- Review: `apps/web/src/app.tsx`
  - 确认真实验收路径仍是 `HashRouter` 下的 `/#/notes` 与 `/#/notes/:id`。
- Read for workflow context: `apps/web/src/pages/notes/components/note-editor/block-commands.ts`
  - 确认 `findClosingFence()`、block 结构命令仍与新的共享几何模型兼容。

## Implementation Notes

- 设计稿要求的是结构性修复，不是继续给单一 `topAnchorPos` 打补丁。
- `VisibleBlock` 需要显式表达两组边界，并保留 `language`：
  - `language: string`
  - `contentTopPos?: number`
  - `contentBottomPos?: number`
  - `blockTopPos: number`
  - `blockBottomPos: number`
- 语义约定：
  - markdown block：`contentTopPos === blockTopPos`，`contentBottomPos === blockBottomPos`
  - 非空 code block：`contentTopPos` / `contentBottomPos` 指向第一/最后一条代码内容行；`blockTopPos` / `blockBottomPos` 覆盖 opening fence 到 closing fence
  - 空 code block：没有 numbered lines 和 content geometry，但仍必须提供稳定的 `blockTopPos/blockBottomPos`
- `VisibleBlock.lines` 仍是 gutter 唯一数据源；opening/closing fence 永不编号；block 内空白内容行必须连续编号。
- `block-line-numbers.ts` 不承担布局补偿职责，只返回局部编号字符串。
- `block-decoration.ts` 的目标不是“显示一个更漂亮的 header widget”，而是“制造稳定的块起始区域，同时不影响内容流编号几何”。
- block-start 区域固定为 `12px`，由 spacer 单独制造；`block-layer` 与语言头 chrome 只读取最终布局几何，不要再额外手动补 `12px`。
- `block-layer.ts` 只消费共享 block geometry，不重新推导 fence/content 语义；主几何来源固定为 `lineBlockAt()`，不要再把 `coordsAtPos()` 当作最终语义来源。
- fence 继续通过 `Decoration.replace({})` 隐藏，`changeFilter` / `atomicRanges` 继续保护 fence；但不要再依赖它们“碰巧”形成正确视觉高度。
- `index.tsx` 当前通过 `blockState`、`blockLineNumbers`、`blockDecorations`、`blockLayer` 组合扩展，计划不引入新的编辑器实例或额外 overlay 系统。
- 测试命令基于 `apps/web/package.json`：`pnpm --filter @zen-send/web test <path>` 实际执行 `node --import tsx --test`。
- 手动 UI 验证路由为 `/#/notes` 与 `/#/notes/:id`，不是 BrowserRouter 路由。

## Chunk 1: 锁定共享 block 模型的双边界语义

### Task 1: 重写 `VisibleBlock` 契约并先补红测

**Files:**
- Modify: `apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- Modify: `apps/web/src/pages/notes/components/note-editor/block-state.ts`
- Read for reference: `apps/web/src/pages/notes/components/note-editor/block-commands.ts`

- [ ] **Step 1: 阅读 `block-state.ts` 与现有测试，确认当前单锚点模型的真实结构**

Run:
- `python - <<'PY'
from pathlib import Path
print(Path('apps/web/src/pages/notes/components/note-editor/block-state.ts').read_text())
PY`
- `python - <<'PY'
from pathlib import Path
print(Path('apps/web/src/pages/notes/components/note-editor/block-state.test.ts').read_text())
PY`

Expected: 看到当前 `VisibleBlock` 只有 `topAnchorPos/bottomAnchorPos`，并且测试尚未锁定 content/block 双边界语义。

- [ ] **Step 2: 为 markdown block 补失败测试，锁定 content 边界与 block 边界一致**

在 `block-state.test.ts` 追加：

```ts
test('uses identical content and block geometry for markdown blocks', () => {
  const state = createState('alpha\nbeta');
  const visibleBlocks = getVisibleBlocks(state);
  const block = visibleBlocks[0];

  assert.equal(block.language, 'markdown');
  assert.equal(block.hasNumberedLines, true);
  assert.equal(block.contentTopPos, state.doc.line(1).from);
  assert.equal(block.contentBottomPos, state.doc.line(2).to);
  assert.equal(block.blockTopPos, state.doc.line(1).from);
  assert.equal(block.blockBottomPos, state.doc.line(2).to);
  assert.deepEqual(block.lines.map((line) => line.localLineNumber), [1, 2]);
});
```

- [ ] **Step 3: 为非空 code block 补失败测试，锁定 numbered content 与 block geometry 解耦**

```ts
test('separates content geometry from block geometry for non-empty code blocks', () => {
  const state = createState('```ts\nconst a = 1\n\nconst b = 2\n```');
  const visibleBlocks = getVisibleBlocks(state);
  const block = visibleBlocks[0];

  assert.equal(block.language, 'ts');
  assert.equal(block.hasNumberedLines, true);
  assert.equal(block.visibleStartLine, 2);
  assert.equal(block.visibleEndLine, 4);
  assert.equal(block.contentTopPos, state.doc.line(2).from);
  assert.equal(block.contentBottomPos, state.doc.line(4).to);
  assert.equal(block.blockTopPos, state.doc.line(1).from);
  assert.equal(block.blockBottomPos, state.doc.line(5).to);
  assert.deepEqual(
    block.lines.map((line) => ({ lineNumber: line.lineNumber, localLineNumber: line.localLineNumber })),
    [
      { lineNumber: 2, localLineNumber: 1 },
      { lineNumber: 3, localLineNumber: 2 },
      { lineNumber: 4, localLineNumber: 3 },
    ],
  );
});
```

- [ ] **Step 4: 为空 code block 补失败测试，锁定没有 content geometry 但仍有 block geometry**

```ts
test('keeps empty code blocks unnumbered while preserving block geometry', () => {
  const state = createState('```\n```');
  const visibleBlocks = getVisibleBlocks(state);
  const block = visibleBlocks[0];

  assert.equal(block.language, 'text');
  assert.equal(block.hasNumberedLines, false);
  assert.deepEqual(block.lines, []);
  assert.equal(block.contentTopPos, undefined);
  assert.equal(block.contentBottomPos, undefined);
  assert.equal(block.blockTopPos, state.doc.line(1).from);
  assert.equal(block.blockBottomPos, state.doc.line(2).to);
});
```

- [ ] **Step 5: 为多 block 混排补失败测试，锁定每个 block 独立从 1 开始且 geometry 不串用**

```ts
test('keeps numbering local to each block while exposing independent geometries', () => {
  const state = createState('alpha\n\n```ts\nconst a = 1\n```\n\nomega');
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks.map((block) => block.lines.map((line) => line.localLineNumber)),
    [[1, 2], [1], [1]],
  );
  assert.equal(visibleBlocks[1].contentTopPos, state.doc.line(4).from);
  assert.equal(visibleBlocks[1].blockTopPos, state.doc.line(3).from);
  assert.equal(visibleBlocks[1].blockBottomPos, state.doc.line(5).to);
});
```

- [ ] **Step 6: 运行红测，确认失败点落在缺失的新几何字段或旧语义不匹配**

Run: `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
Expected: FAIL，且失败原因是 `language/contentTopPos/blockTopPos` 等新契约尚未实现，而不是测试环境错误。

- [ ] **Step 7: 在 `block-state.ts` 做最小实现，把 `VisibleBlock` 改为双边界模型**

实现要点：
- 扩展 `VisibleBlock` 类型，新增 `language`、`contentTopPos?`、`contentBottomPos?`、`blockTopPos`、`blockBottomPos`
- `getVisibleBlocks()`：
  - markdown block：content/block 几何相同
  - 非空 code block：`content*` 指向 `lines` 的第一/最后一条内容行；`blockTopPos` 指向 opening fence 行首；`blockBottomPos` 指向 closing fence 行尾
  - 空 code block：不填 `content*`，但 `blockTopPos/blockBottomPos` 仍覆盖 opening → closing fence
- 如有必要，保留旧字段到所有调用点迁移完成前，但不要让新计划依赖旧字段长期存在

- [ ] **Step 8: 重新运行 `block-state` 测试并转绿**

Run: `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
Expected: PASS

- [ ] **Step 9: 提交这一小步**

```bash
git add apps/web/src/pages/notes/components/note-editor/block-state.ts apps/web/src/pages/notes/components/note-editor/block-state.test.ts
git commit -m "refactor(web): split note block content and geometry"
```

## Chunk 2: 让 gutter 只消费内容编号语义

### Task 2: 提炼 `block-line-numbers.ts` 的纯 helper 并先锁红测

**Files:**
- Modify: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`
- Create: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- Read for reference: `apps/web/src/pages/notes/components/note-editor/block-state.ts`

- [ ] **Step 1: 新建失败测试文件，锁定 gutter helper 只读取 `VisibleBlock.lines`**

创建 `block-line-numbers.test.ts`：

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlockLineNumberFromBlocks } from './block-line-numbers';
import type { VisibleBlock } from './block-state';

const blocks: VisibleBlock[] = [
  {
    blockIndex: 0,
    type: 'code',
    language: 'ts',
    visibleStartLine: 2,
    visibleEndLine: 4,
    contentTopPos: 200,
    contentBottomPos: 400,
    blockTopPos: 1,
    blockBottomPos: 999,
    hasNumberedLines: true,
    lines: [
      { lineNumber: 2, localLineNumber: 1 },
      { lineNumber: 3, localLineNumber: 2 },
      { lineNumber: 4, localLineNumber: 3 },
    ],
  },
];

test('maps gutter labels from numbered lines rather than block geometry', () => {
  assert.equal(getBlockLineNumberFromBlocks(blocks, 1), '');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 2), '1');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 3), '2');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 4), '3');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 999), '');
});
```

这个测试必须通过“伪造误导性的 `blockTopPos/blockBottomPos`”来证明 helper 不依赖几何字段；它不是对 `getVisibleBlocks()` 的间接回归。

- [ ] **Step 2: 运行红测，确认因为 helper 尚未导出而失败**

Run: `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
Expected: FAIL，失败点是 `getBlockLineNumberFromBlocks` 尚未存在，而不是断言本身。

- [ ] **Step 3: 在 `block-line-numbers.ts` 提炼纯 helper，并让现有入口复用它**

实现要求：
- 导出 `getBlockLineNumberFromBlocks(visibleBlocks, lineNo)` 或同等职责的纯函数
- `getBlockLineNumber(state, lineNo)` 只负责调用 `getVisibleBlocks(state)` 后委托给该 helper
- helper 只循环 `visibleBlocks[*].lines`
- helper 不读取 `contentTopPos/contentBottomPos/blockTopPos/blockBottomPos`
- 不增加 header/spacer 布局补偿逻辑

- [ ] **Step 4: 跑 helper 测试与现有 `block-state` 测试，确认转绿**

Run:
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`

Expected: 全部 PASS

- [ ] **Step 5: 提交这一小步**

```bash
git add apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts
git commit -m "refactor(web): keep note gutter numbering content-only"
```

## Chunk 3: 同步完成 spacer 替换、语言头迁移与 layer 几何重构

### Task 3: 先用测试锁定 decoration 与 layer 的最终契约

**Files:**
- Create: `apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- Create: `apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`
- Modify: `apps/web/src/pages/notes/components/note-editor/block-decoration.ts`
- Modify: `apps/web/src/pages/notes/components/note-editor/block-layer.ts`
- Modify: `apps/web/src/pages/notes/components/note-editor/editor-setup.ts`
- Modify: `apps/web/src/pages/notes/components/note-editor/index.tsx`

- [ ] **Step 1: 新建 decoration 红测，锁定它只产出 spacer 与 fence hide 规格**

创建 `block-decoration.test.ts`，先要求 `block-decoration.ts` 导出纯 helper `getBlockDecorationSpecs()`：

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlockDecorationSpecs } from './block-decoration';

test('builds spacer and fence-hide specs without a visible language header widget', () => {
  const specs = getBlockDecorationSpecs('```ts\nconst a = 1\n```');

  assert.deepEqual(
    specs.map((spec) => spec.type),
    ['spacer', 'hideFence', 'hideFence'],
  );
  assert.equal(specs[0].height, 12);
  assert.equal(specs.some((spec) => spec.type === 'languageLabel'), false);
});
```

这个测试要锁定：
- opening/closing fence 继续被隐藏
- code block 起始区域会生成统一 `12px` spacer
- decoration 层不再负责渲染真实语言标题 widget

- [ ] **Step 2: 新建 layer 红测，锁定语言头仍然可见且几何来源是 `lineBlockAt()`**

创建 `block-layer.test.ts`：

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlockChromeSpecs, shouldRefreshBlockLayer } from './block-layer';
import type { VisibleBlock } from './block-state';

test('refreshes block layer for document, viewport, height, and geometry changes', () => {
  assert.equal(shouldRefreshBlockLayer({ docChanged: true, viewportChanged: false, heightChanged: false, geometryChanged: false }), true);
  assert.equal(shouldRefreshBlockLayer({ docChanged: false, viewportChanged: true, heightChanged: false, geometryChanged: false }), true);
  assert.equal(shouldRefreshBlockLayer({ docChanged: false, viewportChanged: false, heightChanged: true, geometryChanged: false }), true);
  assert.equal(shouldRefreshBlockLayer({ docChanged: false, viewportChanged: false, heightChanged: false, geometryChanged: true }), true);
  assert.equal(shouldRefreshBlockLayer({ docChanged: false, viewportChanged: false, heightChanged: false, geometryChanged: false }), false);
});

test('builds block chrome from block geometry via lineBlockAt and keeps language visible', () => {
  const blocks: VisibleBlock[] = [
    {
      blockIndex: 0,
      type: 'code',
      language: 'ts',
      visibleStartLine: 2,
      visibleEndLine: 4,
      contentTopPos: 20,
      contentBottomPos: 40,
      blockTopPos: 10,
      blockBottomPos: 50,
      hasNumberedLines: true,
      lines: [
        { lineNumber: 2, localLineNumber: 1 },
        { lineNumber: 3, localLineNumber: 2 },
        { lineNumber: 4, localLineNumber: 3 },
      ],
    },
  ];

  const specs = getBlockChromeSpecs(blocks, {
    lineBlockAt(pos: number) {
      return { top: pos * 10, bottom: pos * 10 + 8 };
    },
    editorTop: 0,
  });

  assert.deepEqual(specs[0], {
    className: 'cm-block-even',
    top: 100,
    height: 408,
    language: 'TS',
  });
});
```

这个测试必须锁定两件事：
- `lineBlockAt()` 是几何适配器输入，而不是 `coordsAtPos()`
- code block 的语言头文本仍然通过 layer chrome 可见

- [ ] **Step 3: 运行两份红测，确认旧实现先失败**

Run:
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`

Expected: 全部 FAIL，因为 helper 尚未导出，且当前实现仍使用真实 header widget / 旧 layer 几何语义。

- [ ] **Step 4: 在 `block-decoration.ts` 提炼纯 helper，并把真实占高 header widget 改成固定 spacer**

实现要求：
- 导出 `getBlockDecorationSpecs()` 或同等职责的纯 helper
- 删除或停用当前 `LanguageLabelWidget`
- 新增固定高度 `BlockStartWidget` / spacer widget
- 所有 block 块起始区域统一 `12px`
- spacer 只制造空间，不承担编号语义
- opening/closing fence 的 `Decoration.replace({})`、`blockChangeFilter`、`blockAtomicRanges` 继续保留

- [ ] **Step 5: 在 `block-layer.ts` 提炼纯 helper，并把语言头 chrome 与背景一起迁移到 layer**

实现要求：
- 导出 `shouldRefreshBlockLayer()`
- 导出 `getBlockChromeSpecs()` 或同等职责的纯 helper
- `buildMarkers(view)` 只通过 `blockTopPos/blockBottomPos` + `view.lineBlockAt()` 计算块范围
- 不再把 `coordsAtPos()` 当最终几何语义来源
- code block 的语言头文本在 layer chrome 中渲染，markdown block 不需要语言头文本
- 背景层与语言头 chrome 共享同一个几何来源

- [ ] **Step 6: 在 `editor-setup.ts` 更新 spacer / layer / chrome 样式，并在 `index.tsx` 做最小接线检查**

要求：
- `.cm-blocks-layer` 继续 `pointerEvents: none`
- 新增 `.cm-block-start-spacer` 样式，固定 `12px`
- 新增语言头 chrome 的 class 样式
- 删除只服务旧 `.cm-block-lang-label` 的样式
- 检查 `index.tsx` 中 `blockDecorations`、`blockLayer` 的扩展顺序仍合理；只有导出签名变化时才改 wiring

- [ ] **Step 7: 运行 decoration/layer 测试、block-state 测试与 typecheck**

Run:
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- `pnpm --filter @zen-send/web typecheck`

Expected: 全部 PASS

- [ ] **Step 8: 提交这一小步**

```bash
git add apps/web/src/pages/notes/components/note-editor/block-decoration.ts apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts apps/web/src/pages/notes/components/note-editor/block-layer.ts apps/web/src/pages/notes/components/note-editor/block-layer.test.ts apps/web/src/pages/notes/components/note-editor/editor-setup.ts apps/web/src/pages/notes/components/note-editor/index.tsx
git commit -m "refactor(web): move note block chrome out of content flow"
```

## Chunk 4: 真实页面验收并只做最小跟进修复

### Task 4: 在实际 notes 页面验证多 block 混排效果

**Files:**
- Review: `apps/web/src/app.tsx`
- Review: `apps/web/src/pages/notes/components/note-editor/index.tsx`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-state.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-decoration.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-layer.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/editor-setup.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- Optional Modify: `apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`

- [ ] **Step 1: 先复查路由与扩展接线，确认手动验收入口正确**

Run:
- `python - <<'PY'
from pathlib import Path
print(Path('apps/web/src/app.tsx').read_text())
PY`
- `python - <<'PY'
from pathlib import Path
print(Path('apps/web/src/pages/notes/components/note-editor/index.tsx').read_text())
PY`

Expected: 确认 `HashRouter` 下有 `/notes`、`/notes/:id`，并确认 `blockState`、`blockLineNumbers`、`blockDecorations`、`blockLayer` 仍在 editor 扩展里启用。

- [ ] **Step 2: 启动 server 与 web 开发环境**

Run in separate terminals:
- `pnpm dev:server`
- `pnpm --filter @zen-send/web dev`

Expected: 后端运行在 `3110`；Vite 正常启动。

如果当前会话不能长期挂前台进程，明确让用户执行：
- `! pnpm dev:server`
- `! pnpm --filter @zen-send/web dev`

- [ ] **Step 3: 打开真实 notes 路由并进入编辑器**

验证路径：
1. 打开 `/#/notes`
2. 如尚未选中笔记，点击列表中的某条笔记，或通过 UI 新建后进入 `/#/notes/<id>`
3. 确认 `NoteEditor` 渲染且可编辑

如果当前 harness 没有浏览器自动化能力，这一步必须转为用户协助，不要假装已经验证。

- [ ] **Step 4: 粘贴以下验证样例**

````md
alpha

```ts
const a = 1

const b = 2
```

beta
gamma

```python
print('x')
```

```
```
````

- [ ] **Step 5: 按 spec 逐项观察**

确认：
- 每个 markdown/code block 的首个可见内容行都从 `1` 开始
- block 内空白内容行也参与编号，不跳号
- opening/closing fence 永不显示编号
- 语言头仍可见，但内容没有再被真实 header widget 整体向下推
- 背景覆盖整个 block 区域，包括块头 chrome 区域
- 第一个、中间、最后一个 block 的 gutter / 内容 / 背景层保持垂直对齐
- 多个 block 连续混排时，没有累计漂移
- 空 code block 没有编号，但背景与块头区域仍稳定

- [ ] **Step 6: 如果 UI 仍有问题，先补失败测试，再做最小修复**

根因映射：
- geometry 语义错：补 `block-state.test.ts`
- gutter 错读 geometry：补 `block-line-numbers.test.ts`
- spacer/fence hide 契约错：补 `block-decoration.test.ts`
- layer 更新或 chrome 几何错：补 `block-layer.test.ts`

然后才允许修改：
- `block-state.ts`
- `block-line-numbers.ts`
- `block-decoration.ts`
- `block-layer.ts`
- `editor-setup.ts`
- `index.tsx`（仅当 extension wiring 真有问题）

禁止：
- 先改 UI 样式再补测试
- 在未确定根因前同时碰多个文件试运气

- [ ] **Step 7: 跑最终验证命令**

Run:
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`
- `pnpm --filter @zen-send/web typecheck`
- `git status --short`

Expected: 测试与 typecheck 全部 PASS；工作树只剩本次相关变更。

- [ ] **Step 8: 仅在 Step 6 产生额外代码改动时提交**

```bash
git add apps/web/src/pages/notes/components/note-editor/block-state.ts apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts apps/web/src/pages/notes/components/note-editor/block-decoration.ts apps/web/src/pages/notes/components/note-editor/block-layer.ts apps/web/src/pages/notes/components/note-editor/editor-setup.ts apps/web/src/pages/notes/components/note-editor/index.tsx apps/web/src/pages/notes/components/note-editor/block-state.test.ts apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts apps/web/src/pages/notes/components/note-editor/block-layer.test.ts
git commit -m "fix(web): finalize note block geometry alignment"
```

如果 Step 6 没有额外改动，则跳过这一步，并在交接里写明“真实 UI 验证通过，无额外补丁”。

## Chunk 5: 最终核对与交接

### Task 5: 交付前核对

**Files:**
- Review only: `apps/web/src/pages/notes/components/note-editor/block-state.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-decoration.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-layer.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/editor-setup.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/index.tsx`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- Review only: `apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`

- [ ] **Step 1: 对照设计稿验收所有目标**

核对以下内容全部满足：
- gutter 行号只认 content geometry
- block 背景与语言头只认 block geometry
- `VisibleBlock` 不再用单一 `topAnchorPos` 承担两套职责
- 语言头仍可见，但不再作为真实占高 header widget 进入内容流
- 多 block 混排时不再累计漂移

- [ ] **Step 2: 记录最终验证结果**

Run:
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-state.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-line-numbers.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-decoration.test.ts`
- `pnpm --filter @zen-send/web test apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`
- `pnpm --filter @zen-send/web typecheck`

Expected: 全部 PASS

- [ ] **Step 3: 如果最终核对有任何一项不满足，回到 Chunk 4 Step 6，先补红测再做最小修复**

要求：
- 不要在最终交付阶段直接口头说明“还有一点偏差”然后跳过
- 任何未满足 spec 的项都必须回到对应测试入口补失败测试

- [ ] **Step 4: 准备交接说明**

交接内容必须包含：
- 改动了哪些文件
- 新增了哪些测试文件
- 最终跑过哪些验证命令
- 哪些 UI 结论是浏览器亲自验证的，哪些需要用户协助复核（如果当前 harness 无浏览器自动化）
