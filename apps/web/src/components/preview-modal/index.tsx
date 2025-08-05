import React, { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

const PreviewModalComponent = observer(() => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = homeService.previewTransfer;
  const isOpen = transfer !== null;

  // Determine content type
  const firstItem = transfer?.items?.[0];
  const isImage = firstItem?.type === 'file' && firstItem?.mimeType?.startsWith('image/');
  const isText = firstItem?.type === 'text' || transfer?.contentType?.startsWith('text/');

  // Load file blob when modal opens
  useEffect(() => {
    if (!transfer) {
      setBlobUrl(null);
      setError(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    const loadBlob = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const blob = await apiService.getTransferFile(transfer.id);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load file');
      } finally {
        setIsLoading(false);
      }
    };

    if (transfer.items?.[0]?.type === 'file') {
      loadBlob();
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [transfer, apiService]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBlobUrl(null);
      setError(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        homeService.setPreviewTransfer(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, homeService]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        homeService.setPreviewTransfer(null);
      }
    },
    [homeService]
  );

  // Zoom handlers
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.min(Math.max(s + delta, 0.5), 4));
    },
    []
  );

  // Pan handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset zoom and position
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Download handler
  const handleDownload = useCallback(() => {
    if (!blobUrl || !transfer) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = transfer.originalFileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [blobUrl, transfer]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[var(--bg-surface)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
          <h3 className="text-lg font-medium text-[var(--text-primary)] truncate">
            {transfer?.originalFileName || 'Preview'}
          </h3>
          <div className="flex items-center gap-2">
            {isImage && (
              <>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.25, 4))}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={18} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={18} className="text-[var(--text-secondary)]" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={18} className="text-[var(--text-secondary)]" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              title="Download"
            >
              <Download size={18} className="text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={() => homeService.setPreviewTransfer(null)}
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              title="Close"
            >
              <X size={18} className="text-[var(--text-secondary)]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="relative w-full h-[70vh] overflow-hidden bg-[var(--bg-elevated)] flex items-center justify-center"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--primary)] border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="text-center text-[var(--text-muted)]">
              <p>{error}</p>
            </div>
          )}

          {!isLoading && !error && isImage && blobUrl && (
            <img
              src={blobUrl}
              alt={transfer?.originalFileName || 'Preview'}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              }}
              draggable={false}
            />
          )}

          {!isLoading && !error && isText && firstItem?.content && (
            <div className="w-full h-full overflow-auto p-4">
              <pre className="text-[var(--text-primary)] whitespace-pre-wrap font-mono text-sm">
                {firstItem.content}
              </pre>
            </div>
          )}

          {!isLoading && !error && !isImage && !isText && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-none"
              title={transfer?.originalFileName || 'Preview'}
            />
          )}
        </div>

        {/* Footer with scale indicator for images */}
        {isImage && (
          <div className="px-4 py-2 border-t border-[var(--border-default)] text-center">
            <span className="text-xs text-[var(--text-muted)]">
              {Math.round(scale * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default PreviewModalComponent;