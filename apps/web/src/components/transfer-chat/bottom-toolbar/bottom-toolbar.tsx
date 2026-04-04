import React, { useCallback, useRef, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { Paperclip, Search, Send, ArrowUp } from 'lucide-react';
import { HomeService } from '../../../pages/home/home.service';

const BottomToolbar = observer(() => {
  const homeService = useService(HomeService);
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const fileData = files.map((file) => ({
      name: file.name,
      size: file.size,
      data: undefined as ArrayBuffer | undefined,
    }));

    // Read file data
    fileData.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        fileData[index].data = reader.result as ArrayBuffer;
        homeService.addFiles([fileData[index]]);
        homeService.uploadFiles();
      };
      reader.readAsArrayBuffer(files[index]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [homeService]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  const handlePaperclipClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSearchClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-search-modal'));
  }, []);

  const handleSendText = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    try {
      await homeService.sendText(trimmedText);
      setText('');
    } catch (err) {
      console.error('Failed to send text:', err);
    }
  }, [text, homeService]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const hasText = text.trim().length > 0;

  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
      {/* Icons row */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={handlePaperclipClick}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Paperclip size={20} />
        </button>
        <button
          type="button"
          onClick={handleSearchClick}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="输入文字..."
          rows={1}
          className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] rounded-xl resize-none
                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none transition-colors min-h-[36px] max-h-[120px]"
          style={{
            height: 'auto',
            overflow: 'hidden',
          }}
          onInput={handleTextareaInput}
        />
        <button
          type="button"
          onClick={handleSendText}
          disabled={!hasText}
          className={`p-2 rounded-xl transition-colors ${
            hasText
              ? 'bg-[var(--primary)] text-white'
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
          }`}
        >
          {hasText ? <ArrowUp size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
});

export { BottomToolbar };
export default bindServices(BottomToolbar, [HomeService]);
