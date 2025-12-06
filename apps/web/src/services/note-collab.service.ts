import { Service } from '@rabjs/react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { IndexeddbPersistence } from 'y-indexeddb';
import { SocketService } from './socket.service';

export interface CollabUser {
  name: string;
  color: string;
  clientId: number;
}

interface Session {
  noteId: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  idb: IndexeddbPersistence;
  shareToken?: string;
  cleanup: () => void;
}

export class NoteCollabService extends Service {
  activeNoteId: string | null = null;
  collaborators: CollabUser[] = [];
  synced = false;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'connected';

  private session: Session | null = null;

  private get socketService() {
    return this.resolve(SocketService);
  }

  /**
   * 加入笔记协作。返回 ytext、awareness 和 waitForSync。
   * waitForSync 在服务端首次 sync 完成后 resolve，editor 应等待后再初始化内容。
   */
  joinNote(
    noteId: string,
    userName: string,
    userColor: string,
    shareToken?: string
  ): { ytext: Y.Text; awareness: awarenessProtocol.Awareness; waitForSync: Promise<void> } {
    this.leaveNote();

    const doc = new Y.Doc();
    const ytext = doc.getText('content');
    const awareness = new awarenessProtocol.Awareness(doc);
    const idb = new IndexeddbPersistence(`zen-send-note-${noteId}`, doc);

    awareness.setLocalState({ user: { name: userName, color: userColor } });

    this.activeNoteId = noteId;
    this.synced = false;
    this.connectionStatus = 'connected';

    let resolveSyncPromise!: () => void;
    const waitForSync = new Promise<void>((resolve) => {
      resolveSyncPromise = resolve;
    });

    const socket = this.socketService.socket;

    if (!socket) {
      // 无 socket 时，等 IndexedDB 加载后 resolve（内容来自本地缓存）
      idb.whenSynced.then(() => resolveSyncPromise());
      const session: Session = { noteId, doc, awareness, idb, shareToken, cleanup: () => {} };
      this.session = session;
      return { ytext, awareness, waitForSync };
    }

    // ── 等 IndexedDB 加载完再 join，stateVector 包含离线内容 ─────
    const emitJoin = () => {
      if (!socket.connected) return;
      const stateVector = Array.from(Y.encodeStateVector(doc));
      const localUpdate = Y.encodeStateAsUpdate(doc);
      const hasLocalContent = localUpdate.length > 2; // 空 doc 约 2 字节
      socket.emit('note:collab:join', {
        noteId,
        ...(shareToken ? { shareToken } : {}),
        stateVector,
        ...(hasLocalContent ? { clientState: Array.from(localUpdate) } : {}),
      });
    };

    // ── 接收 sync（首次全量或重连增量）───────────────────────────
    const onSync = (data: { noteId: string; update: number[] }) => {
      if (data.noteId !== noteId) return;
      Y.applyUpdate(doc, new Uint8Array(data.update), 'remote');
      if (!this.synced) {
        this.synced = true;
        resolveSyncPromise();
      }
      if (this.connectionStatus === 'reconnecting') {
        this.connectionStatus = 'connected';
      }
    };

    // ── 接收远端增量 update ──────────────────────────────────────
    const onUpdate = (data: { noteId: string; update: number[] }) => {
      if (data.noteId !== noteId) return;
      Y.applyUpdate(doc, new Uint8Array(data.update), 'remote');
    };

    // ── 接收 Awareness ───────────────────────────────────────────
    const onAwareness = (data: { noteId: string; awareness: number[] }) => {
      if (data.noteId !== noteId) return;
      awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(data.awareness), 'remote');
    };

    // ── 本地 doc 变更 → 发送给服务端 ─────────────────────────────
    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      socket.emit('note:collab:update', { noteId, update: Array.from(update) });
    };

    // ── Awareness 变更 → 广播 ─────────────────────────────────────
    const onAwarenessUpdate = ({
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoded = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
      socket.emit('note:collab:awareness', { noteId, awareness: Array.from(encoded) });

      this.collaborators = Array.from(awareness.getStates().entries())
        .filter(([id]) => id !== doc.clientID)
        .map(([id, state]) => ({
          clientId: id,
          name: (state.user as { name?: string })?.name ?? 'Anonymous',
          color: (state.user as { color?: string })?.color ?? '#999',
        }));
    };

    // ── socket 断线 / 重连 ────────────────────────────────────────
    const onDisconnect = () => {
      this.connectionStatus = 'disconnected';
      this.collaborators = [];
      // 不重置 synced，保持本地内容
    };

    const onReconnect = () => {
      this.connectionStatus = 'reconnecting';
      // 重连时带上本地 stateVector 和离线编辑，服务端只发 diff
      emitJoin();
    };

    socket.on('note:collab:sync', onSync);
    socket.on('note:collab:update', onUpdate);
    socket.on('note:collab:awareness', onAwareness);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onReconnect);
    doc.on('update', onDocUpdate);
    awareness.on('update', onAwarenessUpdate);

    // 等 IndexedDB 加载完再首次 join，确保 stateVector 包含离线内容
    idb.whenSynced.then(() => emitJoin());

    const cleanup = () => {
      socket.off('note:collab:sync', onSync);
      socket.off('note:collab:update', onUpdate);
      socket.off('note:collab:awareness', onAwareness);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onReconnect);
      doc.off('update', onDocUpdate);
      awareness.off('update', onAwarenessUpdate);
      socket.emit('note:collab:leave', { noteId });
      awareness.setLocalState(null);
    };

    this.session = { noteId, doc, awareness, idb, shareToken, cleanup };
    return { ytext, awareness, waitForSync };
  }

  leaveNote(): void {
    if (!this.session) return;
    this.session.cleanup();
    this.session.idb.destroy();
    this.session.doc.destroy();
    this.session.awareness.destroy();
    this.session = null;
    this.activeNoteId = null;
    this.collaborators = [];
    this.synced = false;
    this.connectionStatus = 'connected';
  }
}
