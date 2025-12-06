import { randomBytes } from 'crypto';
import { eq, and, asc } from 'drizzle-orm';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { notes } from '../db/schema.js';
import { generateNoteId } from '../utils/id.js';
import type { NoteDetail, NoteListItem, SharedNoteDetail } from '@zen-send/dto';

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
    if (!result[0]) return null;
    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      content: row.content,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isShared: row.isShared === 1,
      shareToken: row.shareToken ?? undefined,
    };
  }

  async getNoteByShareToken(token: string): Promise<SharedNoteDetail | null> {
    const result = await this.db
      .select({
        id: notes.id,
        title: notes.title,
        content: notes.content,
        isShared: notes.isShared,
      })
      .from(notes)
      .where(and(eq(notes.shareToken, token), eq(notes.isShared, 1)))
      .limit(1);
    if (!result[0]) return null;
    const row = result[0];
    return { id: row.id, title: row.title, content: row.content };
  }

  async enableShare(id: string, userId: string): Promise<string> {
    const existing = await this.db
      .select({ shareToken: notes.shareToken })
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (existing.length === 0) throw new Error('Note not found');

    const token = existing[0].shareToken ?? randomBytes(16).toString('hex');
    await this.db
      .update(notes)
      .set({ shareToken: token, isShared: 1 })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    return token;
  }

  async disableShare(id: string, userId: string): Promise<void> {
    const existing = await this.db
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
    if (existing.length === 0) throw new Error('Note not found');

    await this.db
      .update(notes)
      .set({ isShared: 0 })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
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
