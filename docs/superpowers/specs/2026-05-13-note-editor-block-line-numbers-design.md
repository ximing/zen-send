# Note Editor block 行号与对齐重构设计

## 背景

当前笔记编辑器的 block 行号问题并不只是“某个锚点算错了”，而是现有渲染结构本身有几何模型冲突。

当前实现中：

- `block-state.ts` 按文档内容推导 block 的可见内容行
- `block-line-numbers.ts` 按这些内容行输出 gutter 行号
- `block-layer.ts` 负责绘制 block 背景层
- `block-decoration.ts` 通过 `LanguageLabelWidget` 插入一个真实占高的语言标题条，并隐藏 opening/closing fence

这会导致三套不同的几何语义混在一起：

1. 行号按“内容行”编号
2. 语言标题条按 widget 的真实 DOM 高度占位
3. 背景层再按文档位置和视图坐标推导 block top / bottom

因此，当文档里出现多个 block、语言头、隐藏 fence、空白行混排时，行号、内容与背景层即使局部修过，也仍然可能继续漂移。

## Heynote 调研结论

参考 Heynote 的 block editor 结构后，确定它稳定的关键点不是“补更多坐标逻辑”，而是 **避免让语言头本身成为会扰动内容几何的真实 header widget**。

Heynote 的思路是：

- 仍然使用单个 CodeMirror editor
- 行号只围绕真实 content range 计算
- block 起始区域只通过固定高度的 start widget / spacer 表示
- 背景围绕统一的 block geometry 计算，而不是围绕 header widget 的真实 DOM 高度补偿
- 语言头属于块的视觉 chrome，不属于内容流里的真实内容行

也就是说，它把“块头看起来存在”和“内容几何如何编号”彻底分开了：

- **行号** 跟 content geometry 走
- **背景与块头 chrome** 跟 block geometry 走

两者共享同一个 block 模型，但不再混用同一套含义不清的顶部锚点。

本次设计也采用同样的分层。 

背景的最终契约明确为：

- gutter 行号只认 `content` 边界
- block 背景和语言头 chrome 只认 `block` 边界
- 背景必须覆盖整个 block 区域，包括块头 chrome 区域，而不是只包住 content 区域
- 但 content lines 的编号和首行语义不因此改变

不存在“背景只按 content range 画”的实现目标；真正按 content range 走的只有编号语义。

也就是说，最终几何基准不是二选一，而是：

- **content geometry：服务于编号**
- **block geometry：服务于背景和块头视觉**

这两个几何都由同一个共享 block 模型显式提供。

这样可以避免当前实现里一个 `topAnchorPos` 同时承担两种职责。 

## 目标

本次重构要达到：

- 每个 markdown/code block 的可见内容行都从 `1` 开始连续编号
- block 内空白行也必须参与编号，不跳号
- code block 的 opening/closing fence 永不编号
- 行号与内容围绕 content geometry 对齐，背景与语言头围绕 block geometry 对齐；两者共享同一个 block 模型但不混用同一套边界语义
- 语言头仍然可见，但不再通过真实占高 header widget 扰动内容流几何
- 多个 block 混排时，不再出现累计错位

## 非目标

本次不处理：

- block 语法模型重写
- block 命令系统重写
- toolbar / active line / selection 样式重构
- note editor 其它无关交互调整
- 把编辑器拆成多个独立 editor 实例

## 选定方案

采用 **更接近 Heynote 的整体重构方案**：

1. 去掉现在这种真实占高的 `LanguageLabelWidget`
2. 改成固定高度的 block-start spacer widget，只负责制造块起始区域空间
3. 语言名不再占据内容流高度，而作为 block 顶部的视觉 chrome 渲染
4. block 行号只围绕真实 content lines 计算
5. block 背景层只围绕统一的 block geometry 计算

一句话概括：

**header 负责“看起来像块头”，但不再参与“内容行几何”。**

## 设计细节

### 1. 重新拆分 block 的两组边界语义

`apps/web/src/pages/notes/components/note-editor/block-state.ts`

当前 `VisibleBlock` 里混合了“内容边界”和“块视觉边界”，这会让同一个 `topAnchorPos` 同时承担两种职责：

- 行号 / 内容首行的几何起点
- 包含语言头 / spacer 的块顶部起点

本次需要把它拆开。

建议共享模型显式区分：

- **content 边界**：只服务于内容行与行号编号
- **block 边界**：服务于块头 chrome 与背景层

例如：

- `contentTopPos?: number`
- `contentBottomPos?: number`
- `blockTopPos: number`
- `blockBottomPos: number`

其中约定：

- 只有存在 numbered content lines 的 block 才提供 `contentTopPos/contentBottomPos`
- 空 code block 不提供 `contentTopPos/contentBottomPos`
- 所有 block 都必须提供 `blockTopPos/blockBottomPos`

语义如下：

- markdown block：`contentTopPos === blockTopPos`
- 非空 code block：
  - `contentTopPos` = 第一条代码内容行
  - `blockTopPos` = opening fence 所在行
- 空 code block：
  - 没有 numbered content lines
  - 但 `blockTopPos/blockBottomPos` 仍稳定覆盖 opening → closing fence

这样：

- gutter 编号只消费 content lines
- block 背景与块头 chrome 只消费 block geometry

两层彻底解耦。

### 2. 用 block-start spacer 取代真实语言标题条

`apps/web/src/pages/notes/components/note-editor/block-decoration.ts`

当前 `LanguageLabelWidget` 是真正插入文档流的可见 block widget，它的高度会直接影响内容布局。

本次要改成更接近 Heynote 的结构：

- 删除当前 `LanguageLabelWidget` 的占高职责
- 新增固定高度的 `BlockStartWidget` / spacer widget
- spacer 只负责提供统一块起始留白
- **所有 block 都使用固定的 block-start 区域高度，统一定为 `12px`**
- **这 12px 只由 spacer 产生**；`block-layer` 和语言头 chrome 只读取最终布局后的 block geometry，不再额外手动加一次 12px
- 第一块不再特殊设为 0 高；首块与后续块保持同一套 block geometry 语义

之所以不让第一块特殊为 0，是因为本次重构的目标就是让“语言头始终可见但不扰动内容几何”。如果第一块没有 block-start 区域，就必须依赖额外的 editor 顶部 padding 或特殊偏移，重新引入第二套几何来源。统一给第一块保留同样的 12px block-start 区域，几何最稳定，也最接近我们这次想要的单一模型。

这个 spacer 的职责非常单一：

- 它不是语言标签
- 它不参与行号语义
- 它不携带内容含义
- 它只制造稳定的块起始区域高度

### 3. 语言名改成块顶部视觉 chrome，而不是内容流节点

语言名仍然要显示，但不再作为真正的 header 条插入文档流。

本次固定采用单一方案：

- 语言名画在 block 顶部区域里，作为 **overlay/header chrome**
- 它与背景层共享同一套 `blockTopPos/blockBottomPos` geometry
- 它看起来像块头，但不再把内容往下顶
- **不引入单独的第二个 overlay 系统，也不让语言名重新成为占高 widget**

这样可以保证：

- 内容流几何只由内容行 + 固定 spacer 决定
- 语言名文本本身不会再制造新的高度扰动

这里采用单一约定：语言头由与背景层同源的 block chrome 渲染机制负责，不再额外引入第二套独立 overlay 系统；也不能再回到“语言名本身占高”这条路。

### 4. 行号逻辑只认内容行

`apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`

这里的职责收敛为：

- 根据 `VisibleBlock.lines` 输出 block 内局部编号
- 开头 fence / 结尾 fence 永远返回空字符串
- 空白内容行正常拿到连续编号
- 不感知语言头文字本身

也就是说：

- gutter 只认 content lines
- gutter 只需要知道 block-start spacer 产生了稳定块起始区域
- gutter 不再承担 header 布局补偿职责

### 5. 背景层只认 block geometry

`apps/web/src/pages/notes/components/note-editor/block-layer.ts`

当前背景层错位的根本原因之一，是它仍在混合使用文档 position、可见内容行和 widget 造成的布局变化。

本次要求：

- 背景层只消费 `blockTopPos/blockBottomPos`
- 不再自己推导 fence / content 语义
- 与块头 chrome 共享同一套 geometry

实现上本次固定采用单一约定：

- `block-layer.ts` 使用 `lineBlockAt()` 作为块区域几何的主要来源
- 不再把 `coordsAtPos()` 作为并列备选方案
- 如果个别位置仍需要 position 查询，也只能作为从 `blockTopPos/blockBottomPos` 过渡到 `lineBlockAt()` 输入的手段，而不能直接参与最终几何判定

背景层的职责也要收敛：

- 覆盖整个块区域
- 包括块头 chrome 区域
- 不负责重新解释内容行编号

block geometry 的最终渲染契约明确为：

- **非空 markdown block**：
  - `blockTopPos = contentTopPos`
  - `blockBottomPos = contentBottomPos`
  - spacer 负责在最终布局中提供统一的 12px block-start 区域
- **非空 code block**：
  - `contentTopPos = 第一条代码内容行`
  - `contentBottomPos = 最后一条代码内容行`
  - `blockTopPos = opening fence 所在行`
  - `blockBottomPos = closing fence 所在行`
  - 也就是说，非空 code block 的 block geometry 覆盖 opening fence → 内容 → closing fence 的整个语法区域，只是 fence 本身不显示编号
- **空 code block**：
  - 没有 numbered content lines
  - `blockTopPos = opening fence 所在行`
  - `blockBottomPos = closing fence 所在行`
  - 仍通过 spacer + block geometry 渲染稳定背景

这里的 12px block-start 区域完全由 spacer 提供；它不改变 numbered lines 的起止语义，只决定 block 顶部视觉 chrome 的留白与语言名摆放区域。`block-layer` 和语言头 chrome 不再额外手动扩展 12px，只消费最终布局得到的 block geometry。

### 6. fence 继续隐藏，但不再参与视觉布局修补

opening/closing fence 的处理仍然保留：

- `Decoration.replace({})` 隐藏 fence
- cursor / selection 保护 fence 的逻辑继续保留
- block commands 继续围绕 fence 工作

但它们不再承担“通过隐藏后剩余几何来帮语言头凑布局”的隐式职责。

换句话说：

- fence 是语法结构
- spacer / overlay 是视觉结构
- content lines 是编号结构

三者分层清晰，不再互相偷承担职责。

## 改动范围

预计主要涉及：

- `apps/web/src/pages/notes/components/note-editor/block-state.ts`
- `apps/web/src/pages/notes/components/note-editor/block-decoration.ts`
- `apps/web/src/pages/notes/components/note-editor/block-layer.ts`
- `apps/web/src/pages/notes/components/note-editor/block-line-numbers.ts`
- `apps/web/src/pages/notes/components/note-editor/block-state.test.ts`

可能新增：

- `apps/web/src/pages/notes/components/note-editor/block-layer.test.ts`

## 测试策略

遵循先测后改。

### 1. block-state 语义测试

需要补纯语义测试，锁定：

1. markdown block：content 边界与 block 边界一致
2. 非空 code block：
   - `content` 从第一条代码行开始
   - `blockTop` 从 opening fence 所在行开始
3. 空 code block：
   - 没有 numbered lines
   - 但 `blockTop/blockBottom` 仍稳定覆盖 opening → closing fence
4. block 内空白行继续连续编号
5. 多 block 混排时，每个 block 独立从 `1` 开始

### 2. block-layer 行为测试

建议新增独立测试锁定：

1. layer 更新条件覆盖：
   - `docChanged`
   - `viewportChanged`
   - `heightChanged`
   - `geometryChanged`
2. layer 消费的是 block geometry，而不是重新推导内容边界

### 3. 手动 UI 验证

浏览器里验证：

1. 第一个 block
2. 中间 block
3. 最后一个 block
4. markdown / code 混排
5. 带语言名的 code block
6. 空 code block
7. 多个 block 连续时，行号、内容、背景层保持稳定对齐

## 风险与应对

### 风险 1：overlay 仍然引入第二套几何

如果语言名虽然不再占高，但又使用了一套和背景层不同的定位方式，仍可能制造新的视觉错位。

应对：

- 语言名 overlay 必须共享 block layer 的 geometry 来源
- 不允许各自用不同锚点重新算 top / bottom

### 风险 2：一次性改动文件较多

这次是结构性修复，涉及 block-state / decoration / layer / line numbers 的协同调整。

应对：

- 严格按 TDD 分步骤推进
- 先锁共享语义，再锁 layer 行为，再做浏览器验证
- 不允许在未验证前把多个视觉补丁堆在一起

## 实施顺序

1. 为 block-state 补共享边界语义红测
2. 重构 `VisibleBlock` 的 content/block 双边界模型
3. 去掉当前 `LanguageLabelWidget` 的占高职责
4. 引入固定高度 block-start spacer
5. 将语言名迁移为 block 顶部视觉 chrome
6. 修改 block-layer 只消费 block geometry
7. 验证 block-line-numbers 仍只认内容行
8. 跑测试并做浏览器人工验收

## 验收标准

满足以下条件即可认为修复完成：

- 每个 markdown/code block 的首个可见内容行显示为 `1`
- 每个 block 内空白行也连续编号，不跳号
- opening/closing fence 永不显示编号
- 语言头仍然可见，但不再通过真实占高 widget 扰动内容流
- 第一个、中间、最后一个 block 都保持对齐
- 多个 block 连续混排时，不再出现累计错位
- 没有引入新的 block 编辑异常
