import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { Paperclip, Pencil, FileText, X } from 'lucide-react';
import { SendToolbarService } from './send-toolbar.service';
import { getZenBridge, browserOpenFileDialog } from '../../lib/zen-bridge';

const SendToolbarContent = observer(() => {
  const service = useService(SendToolbarService);
  const homeService = service.homeService;

  const handleSelectFile = async () => {
    const bridge = getZenBridge();
    if (bridge.openFileDialog) {
      const files = await bridge.openFileDialog({ multiple: true });
      if (files && files.length > 0) {
        service.addFiles(files);
      }
    } else {
      const files = await browserOpenFileDialog({ multiple: true });
      if (files && files.length > 0) {
        service.addFiles(files);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="bg-[var(--bg-surface)] rounded-xl p-6 mb-8">
        {/* Action buttons grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Select File */}
          <button
            onClick={handleSelectFile}
            className="flex flex-col items-center gap-2 p-4
                       bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]
                       rounded-lg transition-colors"
          >
            <Paperclip size={20} className="text-[var(--text-secondary)]" />
            <span className="label text-[var(--text-secondary)]">SELECT_FILE</span>
          </button>

          {/* Enter Text */}
          <button
            onClick={() => service.openModal('text')}
            className="flex flex-col items-center gap-2 p-4
                       bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]
                       rounded-lg transition-colors"
          >
            <Pencil size={20} className="text-[var(--text-secondary)]" />
            <span className="label text-[var(--text-secondary)]">ENTER_TEXT</span>
          </button>
        </div>

        {/* Selected files */}
        {homeService.selectedFiles.length > 0 && (
          <div className="pt-5">
            <div className="label mb-3">
              SELECTED — {homeService.selectedFiles.length} {homeService.selectedFiles.length === 1 ? 'FILE' : 'FILES'}
            </div>
            <div className="flex flex-wrap gap-2">
              {homeService.selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-2
                             bg-[var(--bg-elevated)] rounded-md"
                >
                  <FileText size={16} className="text-[var(--text-secondary)]" />
                  <span className="text-sm text-[var(--text-primary)] truncate max-w-[120px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => homeService.removeFile(index)}
                    className="text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => homeService.clearFiles()}
              className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
            >
              CLEAR_ALL
            </button>
          </div>
        )}
      </div>

      {/* Text Modal */}
      {service.modalType === 'text' && (
        <div
          className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => service.closeModal()}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-sm font-medium tracking-wider text-[var(--text-primary)]">
                ENTER_TEXT
              </h3>
              <button
                onClick={() => service.closeModal()}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={service.textInput}
                onChange={(e) => service.setTextInput(e.target.value)}
                placeholder="Type something..."
                className="w-full h-40 px-4 py-3 bg-[var(--bg-elevated)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]
                           focus:outline-none resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-5 py-4">
              <button
                onClick={() => service.closeModal()}
                className="px-4 py-2 text-xs tracking-wider uppercase
                           text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => service.submitText()}
                disabled={!service.textInput.trim()}
                className="h-[46px] px-5 text-[13px] font-medium tracking-wide
                           bg-[var(--primary)] text-[var(--on-primary)]
                           rounded-xl hover:opacity-90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD_TEXT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default bindServices(SendToolbarContent, [SendToolbarService]);
