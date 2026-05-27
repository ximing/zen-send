import { useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { X, Copy, Check, Link } from 'lucide-react';
import { NoteService } from '../../../../services/note.service';
import { ToastService } from '../../../../components/toast/toast.service';

interface ShareDialogProps {
  noteId: string;
  open: boolean;
  onClose: () => void;
}

function ShareDialogInner({ noteId, open, onClose }: ShareDialogProps) {
  const noteService = useService(NoteService);
  const toastService = useService(ToastService);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const note = noteService.currentNote;
  const isShared = note?.isShared ?? false;
  const shareToken = note?.shareToken;
  const shareUrl = shareToken
    ? `${window.location.origin}/notes/shared/${shareToken}`
    : '';

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isShared) {
        await noteService.disableShare(noteId);
      } else {
        await noteService.enableShare(noteId);
      }
    } catch {
      toastService.show('操作失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl shadow-xl w-full mx-4 p-6"
        style={{
          background: 'var(--bg-elevated)',
          maxWidth: '420px',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Link size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              分享笔记
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 开关行 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              允许通过链接访问
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              任何持有链接的人可实时协作编辑
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200"
            style={{
              backgroundColor: isShared ? 'var(--accent)' : 'var(--border-default)',
              opacity: loading ? 0.6 : 1,
            }}
            role="switch"
            aria-checked={isShared}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow transition duration-200"
              style={{
                backgroundColor: 'white',
                transform: isShared ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {/* 链接区域 */}
        {isShared && shareUrl && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
          >
            <span
              className="flex-1 text-xs truncate font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {shareUrl}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded p-1 transition-colors"
              style={{ color: copied ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {!isShared && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            开启分享后将生成协作链接
          </p>
        )}
      </div>
    </div>
  );
}

export default observer(ShareDialogInner);
