import React, { useState, useCallback, useRef } from 'react';
import { observer, useService } from '@rabjs/react';
import { FolderOpen, Image, Clipboard, Send, ArrowUp } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

function BottomToolbarInner() {
  const homeService = useService(HomeService);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const fileData = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || getMimeTypeFromExtension(file.name),
        data: undefined as ArrayBuffer | undefined,
      }));

      files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = () => {
          fileData[i].data = reader.result as ArrayBuffer;
        };
        reader.readAsArrayBuffer(file);
      });

      setTimeout(() => {
        homeService.addFiles(fileData);
        homeService.uploadFiles();
      }, 100);

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [homeService]
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const fileData = files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        data: undefined as ArrayBuffer | undefined,
      }));

      files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = () => {
          fileData[i].data = reader.result as ArrayBuffer;
        };
        reader.readAsArrayBuffer(file);
      });

      setTimeout(() => {
        homeService.addFiles(fileData);
        homeService.uploadFiles();
      }, 100);

      if (imageInputRef.current) imageInputRef.current.value = '';
    },
    [homeService]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setText(text);
      }
    } catch {
      // Clipboard API may not be available
    }
  }, []);

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
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  const hasText = text.trim().length > 0;
  const canSend = hasText && !isSending;

  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
  }, []);

  return (
    <div className="w-full bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] px-3 py-2 shrink-0">
      {/* Icons row */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          title="Select file"
        >
          <FolderOpen size={22} className="text-[var(--text-primary)]" />
        </button>
        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          title="Select image"
        >
          <Image size={22} className="text-[var(--text-primary)]" />
        </button>
        <button
          onClick={handlePaste}
          className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          title="Paste from clipboard"
        >
          <Clipboard size={22} className="text-[var(--text-primary)]" />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleTextareaInput}
          placeholder="输入文字..."
          rows={1}
          className="flex-1 px-4 py-2.5 bg-[var(--bg-elevated)] rounded-[20px] resize-none
                     text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none min-h-[40px] max-h-[100px]"
          style={{ height: 'auto', overflow: 'hidden' }}
        />
        <button
          onClick={handleSendText}
          disabled={!canSend}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150
            ${
              canSend
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:-translate-y-0.5'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}
        >
          {canSend ? <ArrowUp size={20} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

export default observer(BottomToolbarInner);
