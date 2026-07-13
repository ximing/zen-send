# 笔记模块架构改进方案

## 当前问题

1. **Effect cleanup 保存数据** - 反模式，不可靠
2. **currentNote 被立即覆盖** - 旧笔记上下文丢失
3. **内容与标题不同步** - Yjs 自动保存，标题需手动 API 调用

## 推荐方案：显式会话管理

### 核心思想
- 笔记切换前**显式保存**旧笔记
- 保存完成后再切换
- 不用 effect cleanup 做持久化

### 修改点

#### 1. NoteService 增加显式切换方法

```typescript
class NoteService {
  // 正在编辑的笔记会话（独立于 currentNote）
  private _activeSession: {
    noteId: string;
    title: string;
    content: string;
    lastSavedTitle: string;
  } | null = null;

  // 开始编辑一个笔记（建立会话）
  startEditing(noteId: string, initialTitle: string): void {
    this._activeSession = {
      noteId,
      title: initialTitle,
      content: '',
      lastSavedTitle: initialTitle,
    };
  }

  // 更新会话中的内容/标题
  updateSession(content: string, title?: string): void {
    if (!this._activeSession) return;
    this._activeSession.content = content;
    if (title !== undefined) {
      this._activeSession.title = title;
    }
  }

  // 显式保存当前会话
  async saveSession(): Promise<void> {
    if (!this._activeSession) return;
    const { noteId, content, title, lastSavedTitle } = this._activeSession;
    if (title === lastSavedTitle) return; // 标题未变，跳过
    await this.saveNote(noteId, content, title);
    this._activeSession.lastSavedTitle = title;
  }

  // 切换笔记前调用：保存旧会话 + 清理
  async switchToNote(newNoteId: string): Promise<void> {
    // 1. 先保存当前会话
    await this.saveSession();
    // 2. 清理会话
    this._activeSession = null;
    // 3. 加载新笔记
    await this.loadNote(newNoteId);
  }

  // 获取会话标题（用于保存）
  getSessionTitle(): string | null {
    return this._activeSession?.title ?? null;
  }
}
```

#### 2. 笔记列表点击时显式切换

```typescript
// NoteListItem onClick
const handleNoteClick = async (noteId: string) => {
  if (noteId === noteService.currentNoteId) return;
  
  // 显式保存旧笔记，然后切换
  await noteService.switchToNote(noteId);
};
```

#### 3. Editor 简化 - 不再在 cleanup 中保存

```typescript
useEffect(() => {
  if (!editorRef.current || !noteService.currentNote) return;

  const noteId = noteService.currentNote.id;
  
  // 开始编辑会话
  noteService.startEditing(noteId, noteService.currentNote.title);

  // ... 初始化编辑器 ...

  return () => {
    // ❌ 不再在这里保存
    noteCollabService.leaveNote();
    view.destroy();
    viewRef.current = null;
  };
}, [noteService.currentNoteId]);
```

### 方案 B：彻底重构 - 标题存入 Yjs

将标题作为 Yjs 文档的一部分，统一同步机制：

```typescript
// Yjs 文档结构
interface NoteDoc {
  content: Y.Text;      // 正文
  title: Y.Text;        // 标题（新增）
  metadata: Y.Map;      // 其他元数据
}
```

优点：
- 标题和内容原子性同步
- 无需单独 API 保存标题
- 多人协作时标题实时同步

缺点：
- 需要后端支持 Yjs 持久化标题
- 改动范围大

### 方案 C：妥协方案 - 悲观保存

切换笔记时，如果保存失败，阻止切换：

```typescript
async function switchNote(newNoteId: string) {
  try {
    // 强制保存当前笔记
    await noteService.forceSaveCurrentNote();
    // 保存成功才切换
    noteService.loadNote(newNoteId);
  } catch (e) {
    // 保存失败，提示用户
    toast.error('保存失败，无法切换笔记');
  }
}
```

---

## 推荐实施：方案 A

1. **最小改动**
2. **逻辑清晰** - 保存时机显式可控
3. **可预测** - 没有竞态条件
4. **向后兼容** - 不影响其他功能

## 实施步骤

1. NoteService 增加 `_activeSession` 和 `switchToNote()`
2. 笔记列表点击改为调用 `switchToNote()`
3. Editor cleanup 移除 save 逻辑
4. 测试切换场景
