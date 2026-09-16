import React, { useCallback, useRef, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { ArrowUp, Paperclip } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

export const TextInputBar = observer(function TextInputBar() {
  const homeService = useService(HomeService);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const buffers = await Promise.all(files.map((f) => f.arrayBuffer()));
      const fileData = files.map((file, i) => ({
        name: file.name,
        size: file.size,
        type: file.type || getMimeTypeFromExtension(file.name),
        data: buffers[i],
      }));

      homeService.sendFiles(fileData);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [homeService]
  );

  const handleSendText = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    setIsSending(true);
    try {
      await homeService.sendText(trimmedText);
      setText('');
    } catch (err) {
      console.error('Failed to send text:', err);
    } finally {
      setIsSending(false);
    }
  }, [text, homeService, isSending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-[14px] p-[6px_6px_6px_8px] shrink-0">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="选择文件"
        className="w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center
                   text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]
                   transition-colors"
      >
        <Paperclip size={19} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="写点文字,回车发送;文件直接拖进来"
        className="flex-1 h-9 bg-transparent outline-none border-none
                   text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      <button
        type="button"
        onClick={handleSendText}
        disabled={!canSend}
        className={`inline-flex items-center gap-1.5 h-9 px-[15px] rounded-[10px]
                    text-[13px] font-medium shrink-0 transition-colors
                    ${
                      canSend
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}
      >
        <ArrowUp size={14} />
        发送
      </button>
    </div>
  );
});
