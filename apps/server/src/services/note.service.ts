import { eq, and, asc } from 'drizzle-orm';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { notes } from '../db/schema.js';
import { generateNoteId } from '../utils/id.js';
import type { NoteDetail, NoteListItem } from '@zen-send/dto';

@Service()
export class NoteService {
  constructor(private dbService: DbService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getUserNotes(userId: string): Promise<NoteListItem[]> {
    return this.db
      .select({
        id: notes.id,
        title: notes.title,
        sortOrder: notes.sortOrder,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(asc(notes.sortOrder));
  }

  async getNoteById(id: string, userId: string): Promise<NoteDetail | null> {
    const result = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    return (result[0] as NoteDetail) ?? null;
  }

  async createNote(
    userId: string,
    data: { title?: string; content?: string }
  ): Promise<NoteDetail> {
    const id = generateNoteId();
    const now = Math.floor(Date.now() / 1000);

    const existing = await this.db
      .select({ sortOrder: notes.sortOrder })
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(asc(notes.sortOrder));
    const maxSortOrder = existing.length > 0 ? Math.max(...existing.map((e) => e.sortOrder)) : -1;

    await this.db.insert(notes).values({
      id,
      userId,
      title: data.title ?? '未命名笔记',
      content: data.content ?? '',
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      title: data.title ?? '未命名笔记',
      content: data.content ?? '',
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateNote(
    id: string,
    userId: string,
    data: { title?: string; content?: string }
  ): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (existing.length === 0) return false;

    const now = Math.floor(Date.now() / 1000);
    await this.db
      .update(notes)
      .set({ ...data, updatedAt: now })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return true;
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (existing.length === 0) return false;

    await this.db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return true;
  }

  async reorderNotes(
    userId: string,
    orders: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    for (const item of orders) {
      await this.db
        .update(notes)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(notes.id, item.id), eq(notes.userId, userId)));
    }
  }
}
