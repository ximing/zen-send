import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
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
      <div className="flex flex-col gap-4 p-4 bg-surface border border-border-default rounded-lg">
        <div className="flex flex-wrap gap-3">
          {/* Select File Button */}
          <button
            onClick={handleSelectFile}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-border-default
                       rounded-lg transition-colors text-text-primary"
          >
            <span>📎</span>
            <span>Select File</span>
          </button>

          {/* Enter Text Button */}
          <button
            onClick={() => service.openModal('text')}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-border-default
                       rounded-lg transition-colors text-text-primary"
          >
            <span>✏️</span>
            <span>Enter Text</span>
          </button>

          {/* Clipboard Button */}
          <button
            onClick={() => service.openModal('clipboard')}
            className="flex items-center gap-2 px-4 py-2 bg-bg-elevated hover:bg-border-default
                       rounded-lg transition-colors text-text-primary"
          >
            <span>📋</span>
            <span>Clipboard</span>
          </button>
        </div>

        {/* Selected Files Display */}
        {homeService.selectedFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm text-text-secondary font-medium">
              Selected Files ({homeService.selectedFiles.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {homeService.selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated
                             border border-border-default rounded-lg text-sm"
                >
                  <span className="text-text-primary truncate max-w-[150px]">
                    {file.name}
                  </span>
                  <span className="text-text-muted text-xs">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => homeService.removeFile(index)}
                    className="ml-1 text-text-muted hover:text-error transition-colors"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => homeService.clearFiles()}
              className="self-start text-xs text-text-muted hover:text-error transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Text Input Modal */}
      {service.modalType === 'text' && (
        <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-50">
          <div className="bg-surface border border-border-default rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <h3 className="text-lg font-medium text-text-primary">Enter Text</h3>
              <button
                onClick={() => service.closeModal()}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={service.textInput}
                onChange={(e) => service.setTextInput(e.target.value)}
                placeholder="Enter text to send..."
                className="w-full h-40 px-3 py-2 bg-bg-elevated border border-border-default
                           rounded-lg text-text-primary placeholder:text-text-muted
                           focus:outline-none focus:border-border-focus resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-4 py-3 border-t border-border-default">
              <button
                onClick={() => service.closeModal()}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => service.submitText()}
                disabled={!service.textInput.trim()}
                className="px-4 py-2 bg-primary hover:bg-primaryHover text-onPrimary
                           rounded-lg transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clipboard Modal */}
      {service.modalType === 'clipboard' && (
        <div className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-50">
          <div className="bg-surface border border-border-default rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <h3 className="text-lg font-medium text-text-primary">Clipboard Content</h3>
              <button
                onClick={() => service.closeModal()}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {service.clipboardContent ? (
                <textarea
                  value={service.clipboardContent}
                  readOnly
                  className="w-full h-40 px-3 py-2 bg-bg-elevated border border-border-default
                             rounded-lg text-text-primary resize-none"
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-text-muted">
                  Clipboard is empty or access denied
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-4 py-3 border-t border-border-default">
              <button
                onClick={() => service.closeModal()}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => service.submitClipboard()}
                disabled={!service.clipboardContent.trim()}
                className="px-4 py-2 bg-primary hover:bg-primaryHover text-onPrimary
                           rounded-lg transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed"
              >
                Add Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default bindServices(SendToolbarContent, [SendToolbarService]); 
