import { Service } from '@rabjs/react';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { ToastService } from '../components/toast/toast.service';
import type { NoteListItem, NoteDetail } from '@zen-send/dto';

export class NoteService extends Service {
  notes: NoteListItem[] = [];
  currentNoteId: string = '';
  currentNote: NoteDetail | null = null;
  noteListExpanded: boolean = false;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  _saveNowFn: (() => void) | null = null;
  private _inflightSave: Promise<void> | null = null;
  private _manualTitleEdited: Set<string> = new Set(
    JSON.parse(localStorage.getItem('zen_send_manual_title_edited') || '[]'),
  );

  private get authService() {
    return this.resolve(AuthService);
  }

  private get apiService() {
    return this.resolve(ApiService);
  }

  private get toastService() {
    return this.resolve(ToastService);
  }

  async loadNoteList(): Promise<void> {
    try {
      this.notes = await this.apiService.get<NoteListItem[]>('/api/notes');
    } catch {
      this.toastService.show('加载笔记列表失败', 'error');
    }
  }

  async loadNote(id: string): Promise<void> {
    if (this._inflightSave) {
      await this._inflightSave;
    }
    try {
      this.currentNote = await this.apiService.get<NoteDetail>(`/api/notes/${id}`);
      this.currentNoteId = id;
    } catch {
      this.toastService.show('加载笔记失败', 'error');
    }
  }

  async createNote(): Promise<void> {
    try {
      const note = await this.apiService.post<NoteDetail>('/api/notes', {});
      this.notes.push({
        id: note.id,
        title: note.title,
        sortOrder: note.sortOrder,
        updatedAt: note.updatedAt,
      });
      this.currentNoteId = note.id;
      this.currentNote = note;
    } catch {
      this.toastService.show('创建笔记失败', 'error');
    }
  }

  async saveNote(id: string, content: string, title?: string): Promise<void> {
    this.saveStatus = 'saving';
    this._inflightSave = (async () => {
      try {
        await this.apiService.patch(`/api/notes/${id}`, { content, title });
        this.saveStatus = 'saved';
        const listItem = this.notes.find((n) => n.id === id);
        if (listItem && title) {
          listItem.title = title;
        }
        if (this.currentNote) {
          this.currentNote.content = content;
          if (title) this.currentNote.title = title;
          this.currentNote.updatedAt = Math.floor(Date.now() / 1000);
        }
      } catch {
        this.saveStatus = 'error';
        this.toastService.show('保存笔记失败', 'error');
      } finally {
        this._inflightSave = null;
      }
    })();
    return this._inflightSave;
  }

  async deleteNote(id: string): Promise<void> {
    try {
      await this.apiService.delete(`/api/notes/${id}`);
      this.notes = this.notes.filter((n) => n.id !== id);
      if (this.currentNoteId === id) {
        this.currentNoteId = '';
        this.currentNote = null;
      }
    } catch {
      this.toastService.show('删除笔记失败', 'error');
    }
  }

  setCurrentNoteId(id: string): void {
    this.currentNoteId = id;
  }

  toggleNoteList(): void {
    this.noteListExpanded = !this.noteListExpanded;
  }

  extractTitleFromContent(content: string): string {
    const match = content.match(/^#{1,2}\s+(.+)$/m);
    return match ? match[1].trim() : '未命名笔记';
  }

  shouldAutoExtractTitle(noteId: string): boolean {
    return !this._manualTitleEdited.has(noteId);
  }

  markTitleManuallyEdited(noteId: string): void {
    this._manualTitleEdited.add(noteId);
    localStorage.setItem('zen_send_manual_title_edited', JSON.stringify([...this._manualTitleEdited]));
  }
}
