import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { NoteListItem, NoteDetail } from '@zen-send/dto';

export class NoteService extends Service {
  notes: NoteListItem[] = [];

  get apiService() {
    return this.resolve(ApiService);
  }

  async loadNoteList(): Promise<void> {
    this.notes = await this.apiService.get<NoteListItem[]>('/api/notes');
  }

  async createNote(): Promise<NoteListItem> {
    const note = await this.apiService.post<NoteDetail>('/api/notes', {});
    const listItem: NoteListItem = {
      id: note.id,
      title: note.title,
      sortOrder: note.sortOrder,
      updatedAt: note.updatedAt,
    };
    this.notes = [listItem, ...this.notes];
    return listItem;
  }

  async deleteNote(id: string): Promise<void> {
    await this.apiService.delete<void>(`/api/notes/${id}`);
    this.notes = this.notes.filter((n) => n.id !== id);
  }
}
