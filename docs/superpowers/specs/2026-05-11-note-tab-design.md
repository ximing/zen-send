# Note Tab Feature Design

## Overview

Add a Note tab to the sidebar/drawer that expands inline to show a list of notes. Each note is a block-based scratchpad editor (inspired by Heynote) using standard Markdown format with fenced code blocks, powered by CodeMirror 6.

## Requirements

- "笔记" nav item in NavContent that expands/collapses note list inline (no route change for expanding)
- Clicking a note switches the right panel to its editor; route changes to `/notes/:id`
- `/notes` without id: show empty state prompting user to select or create a note
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
   - `changeFilter`: block direct user editing of ``` delimiter lines. Block commands (carrying custom Annotation) bypass the filter.
   - `atomicRanges`: cursor skips over ``` lines as atomic units

4. **Block commands (Keymap)** — Insert/delete/move blocks by manipulating ``` text. All commands annotated with `Annotation.define()` so changeFilter recognizes internal operations and allows them through.

5. **Line numbers** — Custom `lineNumbers()` with `formatNumber` that resets to 1 at each block boundary.

6. **Cross-block editing behavior** — If user selects across block boundaries and types, the changeFilter rejects the edit (preventing accidental block structure corruption). Users should use block commands to delete/restructure blocks.

### Supported Languages

First version: markdown, javascript, typescript, python, sql, json, css, html, plaintext (no language tag on fenced block, no highlighting).

New block default: insert ` ```\n\n``` ` (no language tag = plain text block). If user selects a language via ⌘L, the language tag is added.

## UI Layout

### NavContent (shared by Sidebar + Drawer)

- "笔记" nav item added below "下载", separated from main nav items by a subtle divider
- Click toggles expand/collapse of note list inline within NavContent (no route change)
- Expanded state: indented note list showing titles, "+" button at top to create new note
- Active note highlighted with accent color + left border
- Clicking a note: navigates to `/notes/:id`, closes drawer on mobile

### Editor Panel (right side, when a note is selected)

- Top info bar: note title + block count + keyboard shortcut hints
- Full CM6 editor instance below
- Language label rendered at top of each code block
- Alternating block backgrounds for visual separation

### Empty State (route `/notes` without id)

- Show centered placeholder: "选择或创建一个笔记开始编辑"
- No editor instance rendered until a note is selected

### Mobile (Drawer mode)

- Drawer expands note list identically to sidebar
- Clicking a note closes drawer, shows full-screen editor
- Editor top bar includes back button + note title

## Keybindings

| Shortcut | Action | Implementation |
|----------|--------|---------------|
| `⌘ Enter` | Add new block after current | Insert `\n```\n\n```\n` after current block |
| `⌘ ⇧ D` | Delete current block | Remove block's text range (bypasses changeFilter via Annotation) |
| `⌘ L` | Switch current block language | Replace ```lang with new language |
| `⌘ ↑ / ↓` | Navigate to previous/next block | Move cursor to target block's content.from |
| `⌘ ⇧ ↑ / ↓` | Move current block up/down | Swap adjacent blocks' text content |

## Data Model

### notes table

| Field | Type | Description |
|-------|------|-------------|
| id | varchar(24) | Prefixed nanoid primary key (prefix `n`) |
| userId | varchar(24) | Owner user FK |
| title | varchar(100) | Note title |
| content | text | Markdown content (includes fenced code blocks) |
| sortOrder | int | Sort order |
| createdAt | int | Creation time (Unix seconds) |
| updatedAt | int | Last update time (Unix seconds) |

ID generation: add `generateNoteId()` to `apps/server/src/utils/id.ts` with prefix `n`.

### Title behavior

- Auto-extracted from the first `# H1` or `## H2` heading in content
- If no heading: title = "未命名笔记"
- Title is stored separately in the `title` column, not derived on the fly
- On content save, if user has not manually edited the title, re-extract from content
- Once user manually edits the title in the info bar, stop auto-extraction for that note

## DTO Definitions

Add to `packages/dto/src/index.ts`:

```typescript
export interface CreateNoteRequest {
  title?: string;
  content?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}

export interface ReorderNotesRequest {
  orders: Array<{ id: string; sortOrder: number }>;
}
```

Add validators in `apps/server/src/validators/note.validator.ts`:

```typescript
@Validator()
export class CreateNoteValidator implements CreateNoteRequest {
  @IsOptional() @IsString() @MaxLength(100) title: string;
  @IsOptional() @IsString() content: string;
}

@Validator()
export class UpdateNoteValidator implements UpdateNoteRequest {
  @IsOptional() @IsString() @MaxLength(100) title: string;
  @IsOptional() @IsString() content: string;
}

@Validator()
export class ReorderNotesValidator implements ReorderNotesRequest {
  @IsArray() @ValidateNested({ each: true })
  orders: Array<{ id: string; sortOrder: number }>;
}
```

## API

All endpoints require authentication. Base path: `/api/notes`.

| Method | Path | Description | Body |
|--------|------|-------------|------|
| GET | /api/notes | List all notes (no content) | — |
| POST | /api/notes | Create note | `CreateNoteRequest` |
| GET | /api/notes/:id | Get single note (with content) | — |
| PATCH | /api/notes/:id | Update note | `UpdateNoteRequest` |
| DELETE | /api/notes/:id | Delete note | — |
| PATCH | /api/notes/reorder | Batch update sort order | `ReorderNotesRequest` |

List endpoint returns: id, title, sortOrder, updatedAt. Sorted by sortOrder ascending.

Reorder endpoint changed from PUT to PATCH to avoid needing a new `put()` method on ApiService.

### Delete UX

- Confirmation dialog before deleting a note (reuse existing ToastService confirm)
- If the deleted note was the active note, navigate to `/notes` (empty state)
- If last note is deleted, list shows "还没有笔记，点击 + 创建" empty state

## Service Architecture

### Global Service: NoteService

Registered in `main.tsx` via `register()` because the note list is needed by NavContent (outside the notes page).

```
NoteService (global):
  - notes: Note[]              // note list (id, title, sortOrder, updatedAt)
  - currentNoteId: string      // active note id
  - currentNote: Note | null   // full note with content (loaded on demand)
  - noteListExpanded: boolean  // sidebar/drawer expand state
  - saveStatus: 'idle' | 'saving' | 'saved' | 'error'

  - loadNoteList()             // GET /api/notes
  - loadNote(id)               // GET /api/notes/:id
  - createNote()               // POST /api/notes → add to list
  - saveNote(id, content)      // PATCH /api/notes/:id (called by auto-save)
  - deleteNote(id)             // DELETE /api/notes/:id → remove from list
  - reorderNotes(orders)       // PATCH /api/notes/reorder
  - setCurrentNoteId(id)       // switch active note (triggers save + load)
```

### Note List Loading Strategy

- Note list is loaded on app init (inside NoteService constructor or an `init()` method)
- Note list is refetched after creating or deleting a note
- List updates optimistically on create/delete, reverts on API failure

## Auto-Save Strategy

1. CM6 `ViewPlugin` monitors `update()`, starts 2s debounce timer on document change
2. On debounce trigger, calls `NoteService.saveNote(id, content)` → `PATCH /api/notes/:id`
3. Switching notes: cancel debounce, await any in-flight save before loading new note
4. Save status indicator in info bar: 编辑中 → 保存中... → 已保存
5. Save failure: toast notification, non-blocking, retry on next change

## Frontend Structure

```
apps/web/src/
├── pages/notes/
│   ├── index.tsx                    # Note editor page (route: /notes/:id?)
│   └── components/
│       ├── note-editor/
│       │   ├── index.tsx            # CM6 editor wrapper component
│       │   ├── editor-setup.ts      # CM6 extensions: theme, keymap, etc.
│       │   ├── block-state.ts       # StateField: block tracking
│       │   ├── block-decoration.ts  # Decoration: language labels
│       │   ├── block-commands.ts    # Block manipulation commands
│       │   ├── block-layer.ts       # Layer: alternating block backgrounds
│       │   └── block-line-numbers.ts # Custom line numbers per block
│       └── note-empty-state.tsx     # Empty state when no note selected
├── services/
│   └── note.service.ts             # NoteService (global): CRUD, auto-save, state
├── components/
│   └── nav-content/index.tsx        # Modified: add expandable note list
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
