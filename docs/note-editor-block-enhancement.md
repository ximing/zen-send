# Note 编辑器 Block 增强技术方案

## 背景

当前 Note 编辑器实现了 Heynote 风格的 block 模型，但存在以下问题：

1. Cmd+A/C/V 操作作用于整个文档，无法限定在当前 block 内
2. ``` 分隔符虽然被隐藏，但行仍占据垂直空间（空行残留）
3. 语言切换依赖 Cmd+L 触发浮动弹窗，不在工具栏中

## 目标

- Cmd+A 选中当前 block、Cmd+C 无选区时复制整个 block、粘贴自动分割 block
- ``` 标记完全隐藏（无空行残留）
- 工具栏显示当前 block 语言，支持下拉切换，支持 Markdown ↔ Code 互转

---

## 一、Block 级别 Cmd+A / C

### Cmd+A — 选中当前 block

在 `blockKeymap` 添加拦截（已有 `Prec.high` 优先级）：

```typescript
{ key: 'Mod-a', run: (view) => {
  const block = getActiveBlock(view.state);
  if (!block) return false;
  view.dispatch({
    selection: { anchor: block.content.from, head: block.content.to }
  });
  return true;
}}
```

### Cmd+C — 无选区时复制整个 block + 短暂高亮

```typescript
{ key: 'Mod-c', run: (view) => {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const block = getActiveBlock(view.state);
  if (!block) return false;
  const text = view.state.doc.sliceString(block.content.from, block.content.to);
  navigator.clipboard.writeText(text);
  // 触发高亮效果
  view.dispatch({ effects: blockCopiedEffect.of({ from: block.content.from, to: block.content.to }) });
  return true;
}}
```

### 高亮反馈实现

使用 CM6 Effect + StateField 模式：

```typescript
// 定义 Effect
const blockCopiedEffect = StateEffect.define<{ from: number; to: number }>();
const clearCopiedEffect = StateEffect.define();

// StateField 存储高亮区域
const copiedHighlightState = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) {
      if (e.is(blockCopiedEffect)) return e.value;
      if (e.is(clearCopiedEffect)) return null;
    }
    return val;
  },
});

// ViewPlugin 渲染高亮 decoration
const copiedHighlightPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = this.build(view); }
  update(update: ViewUpdate) { this.decorations = this.build(update.view); }
  build(view: EditorView): DecorationSet {
    const range = view.state.field(copiedHighlightState);
    if (!range) return Decoration.none;
    return Decoration.set([
      Decoration.mark({ class: 'cm-block-copied' }).range(range.from, range.to)
    ]);
  }
}, { decorations: v => v.decorations });
```

CSS 动画：

```css
.cm-block-copied {
  animation: cm-block-flash 200ms ease-out;
}
@keyframes cm-block-flash {
  0% { background: var(--accent-soft); }
  100% { background: transparent; }
}
```

Cmd+C handler 中 `setTimeout(200)` 后 dispatch `clearCopiedEffect` 清除高亮。

---

## 二、完全隐藏 ``` 标记

### 问题

当前代码只替换行文本，不替换行换行符，导致空行残留：

```typescript
// 当前：只替换行文本，空行残留
Decoration.replace({}).range(openingLine.from, openingLine.to)
```

`openingLine.to` 是行内容末尾，不含换行符，所以行仍占据垂直空间。

### 修复

替换范围扩展到包含换行符：

```typescript
// 开启 ``` 行：替换整行含换行符
Decoration.replace({}).range(openingLine.from, Math.min(openingLine.to + 1, doc.length))

// 关闭 ``` 行：同理
Decoration.replace({}).range(closingLine.from, Math.min(closingLine.to + 1, doc.length))
```

同步更新 `blockAtomicRanges` 和 `blockChangeFilter` 中的范围计算，确保一致性。

Language label widget（语言标签）保持不变，用 `side: -1` 放在 replace 范围之前。

### 边界情况

- 文档末尾无换行符时 `line.to + 1` 可能越界 → 用 `Math.min` 保护
- 空 code block（opening 和 closing ``` 之间无内容）→ 需确保 widget 正常渲染

---

## 三、智能粘贴（自动分割 block）

### 核心发现

CM6 markdown parser 在每次文档变更后自动重新解析，**默认粘贴行为就能自动创建新 block** — 粘贴含 ``` 的内容到 markdown block 中，解析器会自动识别 code fence 并更新 block 结构。

### 不需要自定义粘贴处理

但需要确保 `blockChangeFilter` 不阻止插入操作：

- 当前 filter 只保护已有 ``` delimiter 行不被修改
- 新插入的 ``` 不属于已有 delimiter，不会被拦截
- code block 内粘贴含 ``` 的内容，``` 只作为普通代码文本存在（code block 内 ``` 不触发新 block）

### 测试要点

如果测试中发现 `blockChangeFilter` 误拦截了新 ``` 的插入，需要调整 filter 逻辑，区分"修改已有 delimiter"和"插入新 ```"。

---

## 四、工具栏语言切换 + Markdown ↔ Code 互转

### 1. 同步当前 block 到 React state

在 `updateListener` 中追踪：

```typescript
const [activeBlock, setActiveBlock] = useState<{ type: string; language: string } | null>(null);

EditorView.updateListener.of((update) => {
  if (update.selectionSet || update.docChanged) {
    const block = getActiveBlock(update.state);
    if (block) setActiveBlock({ type: block.type, language: block.language });
  }
  // ... 现有 save 逻辑
})
```

需要做浅比较避免多余 re-render（`useRef` 存上次值，仅在变化时 setState）。

### 2. 工具栏布局

```
┌───────────────────────────────────────────────────┐
│ ← 笔记标题 · 3个块         [JAVASCRIPT ▾]  已保存  │
└───────────────────────────────────────────────────┘
```

- 右侧区域：快捷键提示 → 替换为语言下拉选择器
- 下拉列表包含所有 LANGUAGES + "MARKDOWN" 选项
- 选中当前语言高亮
- Markdown block 时显示 "MARKDOWN"，下拉中包含 code 语言（点击转换为 code block）
- Code block 时显示当前语言，下拉中包含 "MARKDOWN"（点击转换回 markdown）

### 3. Block 类型转换

在 `block-commands.ts` 中新增：

```typescript
function convertBlockToCode(view: EditorView, language: string): boolean {
  const block = getActiveBlock(view.state);
  if (!block || block.type !== 'markdown') return false;
  const content = view.state.doc.sliceString(block.content.from, block.content.to).trimEnd();
  const newContent = `\`\`\`${language}\n${content}\n\`\`\`\n`;
  view.dispatch({
    changes: { from: block.content.from, to: block.content.to, insert: newContent },
    selection: { anchor: block.content.from + language.length + 4 }, // cursor inside code
    annotations: heynoteEvent.of('convertBlock'),
  });
  return true;
}

function convertBlockToMarkdown(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block || block.type !== 'code' || !block.delimiter) return false;
  const content = view.state.doc.sliceString(block.content.from, block.content.to);
  const doc = view.state.doc;
  // 计算完整范围（含 opening 和 closing ``` 行）
  const closingLineNum = doc.lineAt(block.content.to).number + 1;
  const to = closingLineNum <= doc.lines ? doc.line(closingLineNum).to + 1 : block.content.to;
  view.dispatch({
    changes: { from: block.delimiter.from, to, insert: content },
    annotations: heynoteEvent.of('convertBlock'),
  });
  return true;
}
```

### 4. 删除浮动弹窗

- `language-selector.tsx` → 删除
- `index.tsx` 中移除 `langSelectorOpen`、`langSelectorPos` 状态和 `<LanguageSelector>` 组件
- `Cmd-L` 快捷键改为触发工具栏下拉

---

## 五、修改文件清单

| 文件 | 修改内容 |
|---|---|
| `block-commands.ts` | 添加 Cmd-A/C 命令、`convertBlockToCode`、`convertBlockToMarkdown`、导出 `blockCopiedEffect` |
| `block-decoration.ts` | 修复 ``` 行隐藏范围（含换行符）；添加 `copiedHighlightState` + `copiedHighlightPlugin` |
| `block-state.ts` | 无修改 |
| `note-editor/index.tsx` | 工具栏改为语言下拉；添加 `activeBlock` state；移除浮动弹窗；集成 highlight 扩展 |
| `language-selector.tsx` | **删除** |
| `editor-setup.ts` | 添加 `cm-block-copied` 动画样式 |

---

## 六、实现顺序

1. **修复 ``` 隐藏** — 最独立，风险低
2. **添加 Cmd-A / Cmd-C 拦截 + 高亮反馈** — 依赖 block 解析逻辑
3. **工具栏语言选择器 + Block 类型转换** — 涉及 UI 改动
4. **粘贴行为测试与调整** — 验证默认行为是否满足需求

每个步骤独立可验证，不会互相阻塞。

---

## 七、潜在风险

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| Cmd+A 拦截影响搜索功能 | `highlightSelectionMatches` 依赖默认选区行为 | 测试搜索场景，必要时区分上下文 |
| ``` 行隐藏的边界情况 | 文档末尾无换行符时 `line.to + 1` 越界 | `Math.min` 保护 |
| 工具栏语言选择器频繁 re-render | `updateListener` 每次按键触发 | 浅比较 + useRef 缓存上次值 |
| `blockChangeFilter` 误拦截新 ``` 插入 | 粘贴含 code fence 内容时被阻止 | 测试验证，必要时调整 filter 逻辑 |
| Block 类型转换时光标位置 | 转换后光标应在合理位置 | 精确计算 anchor 位置 |
