import * as Y from 'yjs';
import { Service } from 'typedi';
import { eq } from 'drizzle-orm';
import { DbService } from './db.service.js';
import { logger } from '@zen-send/logger';
import { notes } from '../db/schema.js';

const GC_THRESHOLD_BYTES = 1024 * 1024; // 1 MB
const LRU_TTL_MS = 30 * 60 * 1000; // 30 分钟无活跃连接后释放

@Service()
export class NoteCollabService {
  private docs = new Map<string, Y.Doc>();
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // noteId → { count: 活跃连接数, lastActiveAt: 时间戳 }
  private connections = new Map<string, { count: number; lastActiveAt: number }>();
  private lruTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private dbService: DbService) {
    // 每 5 分钟扫一次 LRU
    this.lruTimer = setInterval(() => this.evictStaleDocs(), 5 * 60 * 1000);
  }

  private get db() {
    return this.dbService.getDb();
  }

  async getOrCreateDoc(noteId: string): Promise<Y.Doc> {
    if (this.docs.has(noteId)) {
      return this.docs.get(noteId)!;
    }

    const doc = new Y.Doc();

    const rows = await this.db
      .select({ yjsState: notes.yjsState, content: notes.content })
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1);

    const row = rows[0];
    if (row?.yjsState) {
      const stateBytes = row.yjsState;
      if (stateBytes.length > GC_THRESHOLD_BYTES) {
        // GC：提取纯文本重建最小 doc，丢弃 tombstone 历史
        const tempDoc = new Y.Doc();
        Y.applyUpdate(tempDoc, new Uint8Array(stateBytes));
        const content = tempDoc.getText('content').toString();
        tempDoc.destroy();
        doc.transact(() => {
          doc.getText('content').insert(0, content);
        });
        logger.info({ noteId, originalSize: stateBytes.length }, 'Yjs GC: doc rebuilt');
        // 立即持久化压缩后的 state
        this.schedulePersist(noteId, doc);
      } else {
        Y.applyUpdate(doc, new Uint8Array(stateBytes));
      }
    } else if (row?.content) {
      doc.transact(() => {
        doc.getText('content').insert(0, row.content);
      });
    }

    this.docs.set(noteId, doc);
    return doc;
  }

  trackConnection(noteId: string): void {
    const entry = this.connections.get(noteId) ?? { count: 0, lastActiveAt: Date.now() };
    entry.count += 1;
    entry.lastActiveAt = Date.now();
    this.connections.set(noteId, entry);
  }

  untrackConnection(noteId: string): void {
    const entry = this.connections.get(noteId);
    if (!entry) return;
    entry.count = Math.max(0, entry.count - 1);
    entry.lastActiveAt = Date.now();
  }

  applyUpdate(noteId: string, update: Uint8Array): void {
    const doc = this.docs.get(noteId);
    if (!doc) return;
    Y.applyUpdate(doc, update);
    // 更新活跃时间
    const entry = this.connections.get(noteId);
    if (entry) entry.lastActiveAt = Date.now();
    this.schedulePersist(noteId, doc);
  }

  private async evictStaleDocs(): Promise<void> {
    const now = Date.now();
    for (const [noteId, entry] of this.connections.entries()) {
      if (entry.count === 0 && now - entry.lastActiveAt > LRU_TTL_MS) {
        // 先确保最新 state 已落库
        const doc = this.docs.get(noteId);
        if (doc) {
          try {
            const yjsState = Buffer.from(Y.encodeStateAsUpdate(doc));
            const content = doc.getText('content').toString();
            const updatedAt = Math.floor(Date.now() / 1000);
            await this.db
              .update(notes)
              .set({ yjsState, content, updatedAt })
              .where(eq(notes.id, noteId));
          } catch (err) {
            logger.error({ err, noteId }, 'LRU evict: failed to persist before release');
            continue;
          }
        }
        this.releaseDoc(noteId);
        this.connections.delete(noteId);
        logger.info({ noteId }, 'LRU evict: doc released');
      }
    }
  }

  encodeStateAsUpdate(noteId: string): Uint8Array | null {
    const doc = this.docs.get(noteId);
    if (!doc) return null;
    return Y.encodeStateAsUpdate(doc);
  }

  private schedulePersist(noteId: string, doc: Y.Doc): void {
    const existing = this.persistTimers.get(noteId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const yjsState = Buffer.from(Y.encodeStateAsUpdate(doc));
        const content = doc.getText('content').toString();
        const now = Math.floor(Date.now() / 1000);

        await this.db
          .update(notes)
          .set({ yjsState, content, updatedAt: now })
          .where(eq(notes.id, noteId));

        logger.debug({ noteId }, 'Yjs state persisted');
      } catch (err) {
        logger.error({ err, noteId }, 'Failed to persist Yjs state');
      } finally {
        this.persistTimers.delete(noteId);
      }
    }, 1000);

    this.persistTimers.set(noteId, timer);
  }

  releaseDoc(noteId: string): void {
    const doc = this.docs.get(noteId);
    if (doc) {
      doc.destroy();
      this.docs.delete(noteId);
    }
    const timer = this.persistTimers.get(noteId);
    if (timer) {
      clearTimeout(timer);
      this.persistTimers.delete(noteId);
    }
  }
}
