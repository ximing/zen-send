# Note Tab Feature Design

## Overview

Add a Note tab to the sidebar that expands inline to show a list of notes. Each note is a block-based scratchpad editor (inspired by Heynote) using standard Markdown format with fenced code blocks, powered by CodeMirror 6.

## Requirements

- Sidebar "笔记" nav item that expands/collapses a note list inline (no page navigation)
- Clicking a note switches the right panel to its editor; route changes to `/notes/:id`
- Two block types: Markdown text and Code (fenced code blocks with syntax highlighting)
- Source code editing mode (not WYSIWYG)
- Server-side storage, requires login
- Scale: <20 notes per user, single note may exceed 1000 lines
- Auto-save with debounce

## Architecture

### Editor: CodeMirror 6 + lang-markdown

Use `@codemirror/lang-markdown` as the single CM6 instance. No custom Lezer grammar needed.

**Document format** — standard Markdown with fenced code blocks:

````markdown
## API 端点设计

用户认证接口：
- POST /api/auth/login

```javascript
async function login(email, password) {
  const res = await fetch('/api/auth/login')
  return res.json()
}
```

```sql
SELECT u.id, u.email FROM users u
WHERE u.created_at > '2024-01-01';
```
````

`@codemirror/lang-markdown` natively parses fenced code blocks and `getCodeParser()` automatically loads per-language syntax highlighting.

### CM6 Extension Layers

1. **lang-markdown native parsing** — `@codemirror/lang-markdown` with `getCodeParser()` for nested language highlighting. Zero custom grammar code.

2. **Block state tracking (StateField)** — Traverse markdown syntax tree to extract `FencedCode` nodes. Block data structure:
   ```
   Block = {
     type: 'markdown' | 'code',
     language: string,        // 'javascript', 'sql', etc. or '' for markdown
     content: { from, to },   // character range of block content
     delimiter: { from, to }, // for code blocks: the ``` lines
   }
   ```
   Markdown blocks = text between code blocks (or from doc start to first code block / from last code block to doc end).

3. **Block UI (Decoration + Layer)**
   - `Decoration.widget` on code block opening ``` line: render language label (clickable to switch language)
   - `layer()` API: draw alternating background colors to visually separate blocks
   - `changeFilter`: protect ``` delimiters from accidental deletion
   - `atomicRanges`: cursor skips over ``` lines

4. **Block commands (Keymap)** — Insert/delete/move blocks by manipulating ``` text. All commands annotated with custom `Annotation.define()` so changeFilter can recognize internal operations.

5. **Line numbers** — Custom `lineNumbers()` with `formatNumber` that resets to 1 at each block boundary.

### Supported Languages

First version: markdown, javascript, typescript, python, sql, json, css, html, text (plain, no highlighting).

## UI Layout

### Sidebar

- "笔记" nav item added below "下载", separated from main nav items by a subtle divider
- Click expands/collapses note list inline (no route change)
- Note list items: indented, showing title
- "+" button at top of list to create new note
- Active note highlighted with accent color + left border

### Editor Panel (right side, when a note is selected)

- Top info bar: note title + block count + keyboard shortcut hints
- Full CM6 editor instance below
- Language label rendered at top of each code block
- Alternating block backgrounds for visual separation

### Mobile (Drawer mode)

- Drawer expands note list identically to sidebar
- Clicking a note closes drawer, shows full-screen editor
- Editor top bar includes back button + note title

## Keybindings

| Shortcut | Action | Implementation |
|----------|--------|---------------|
| `⌘ Enter` | Add new block after current | Insert `\n```text\n\n```\n` after current block |
| `⌘ ⇧ D` | Delete current block | Remove block's text range |
| `⌘ L` | Switch current block language | Replace ```lang with new language |
| `⌘ ↑ / ↓` | Navigate to previous/next block | Move cursor to target block's content.from |
| `⌘ ⇧ ↑ / ↓` | Move current block up/down | Swap adjacent blocks' text content |

## Data Model

### notes table

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(36) | UUID primary key |
| userId | varchar(36) | Owner user FK |
| title | varchar(100) | Note title |
| content | text | Markdown content (includes fenced code blocks) |
| sortOrder | int | Sort order |
| createdAt | datetime | Creation time |
| updatedAt | datetime | Last update time |

Title is auto-extracted from the first heading line in content, user can manually override.

## API

All endpoints require authentication. Base path: `/api/notes`.

| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | /api/notes | List all notes (no content) | — |
| POST | /api/notes | Create note | `{ title, content? }` |
| GET | /api/notes/:id | Get single note (with content) | — |
| PATCH | /api/notes/:id | Update note | `{ title?, content? }` |
| DELETE | /api/notes/:id | Delete note | — |
| PUT | /api/notes/reorder | Batch update sort order | `{ orders: [{ id, sortOrder }] }` |

List endpoint returns: id, title, sortOrder, updatedAt. Sorted by sortOrder ascending.

## Auto-Save Strategy

1. CM6 `ViewPlugin` monitors `update()`, starts 2s debounce timer on document change
2. On debounce trigger, calls `NoteService.saveNote(id, content)` → `PATCH /api/notes/:id`
3. Switching notes: cancel debounce, save immediately
4. Save status indicator in info bar: 编辑中 → 保存中... → 已保存
5. Save failure: toast notification, non-blocking, retry on next change

## Frontend Structure

```
apps/web/src/
├── pages/notes/
│   ├── index.tsx                    # Note editor page (route: /notes/:id?)
│   └── notes.service.ts            # NoteService: CRUD, auto-save, current note state
├── components/
│   ├── nav-content/index.tsx        # Modified: add expandable note list
│   ├── note-editor/
│   │   ├── index.tsx                # CM6 editor wrapper component
│   │   ├── editor-setup.ts          # CM6 extensions: theme, keymap, etc.
│   │   ├── block-state.ts           # StateField: block tracking
│   │   ├── block-decoration.ts      # Decoration: language labels, block backgrounds
│   │   ├── block-commands.ts        # Block manipulation commands
│   │   ├── block-layer.ts           # Layer: alternating block backgrounds
│   │   └── block-line-numbers.ts    # Custom line numbers per block
```

## Dependencies (new)

- `@codemirror/lang-markdown` — Markdown parsing + nested code highlighting
- `@codemirror/lang-javascript` — JS/TS syntax
- `@codemirror/lang-python` — Python syntax
- `@codemirror/lang-sql` — SQL syntax
- `@codemirror/lang-json` — JSON syntax
- `@codemirror/lang-css` — CSS syntax
- `@codemirror/lang-html` — HTML syntax
- `@codemirror/view` — EditorView, Decoration, layer
- `@codemirror/state` — EditorState, StateField, Annotation
- `@codemirror/commands` — Standard keymap
- `@codemirror/language` — LanguageSupport, getCodeParser
- `@codemirror/search` — Search/replace
- `@codemirror/autocomplete` — Autocomplete
