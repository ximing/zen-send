import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, AlertCircle, Download, Share2, X } from 'lucide-react';
import { HomeService } from '../home/home.service';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function DownloadsPage() {
  const navigate = useNavigate();
  const homeService = useService(HomeService);

  const handleBack = () => {
    navigate('/');
  };

  const downloads = homeService.uploadingFiles.filter((f) => f.status === 'completed');

  const handleClearCompleted = () => {
    homeService.uploadingFiles
      .filter((f) => f.status === 'completed')
      .forEach((f) => homeService.removeUpload(f.id));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-2 py-2 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-[var(--text-primary)]" />
        </button>
        <span className="flex-1 text-lg font-semibold text-[var(--text-primary)] ml-2">下载</span>
        {downloads.length > 0 && (
          <button
            onClick={handleClearCompleted}
            className="px-2 py-1 text-sm font-medium text-[var(--accent)] hover:opacity-80 transition-opacity"
          >
            清除已完成
          </button>
        )}
      </div>

      {/* Content */}
      {downloads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Download size={64} className="text-[var(--text-muted)] mb-4" />
          <p className="text-base text-[var(--text-muted)]">暂无下载记录</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {downloads.map((download) => (
            <div
              key={download.id}
              className="flex items-center p-3 rounded-[10px] mb-2 bg-[var(--bg-surface)]"
            >
              <div className="mr-3">
                <CheckCircle size={24} className="text-[#22C55E]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {download.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">下载完成</div>
              </div>
              <button
                onClick={() => homeService.removeUpload(download.id)}
                className="p-2 ml-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default observer(DownloadsPage);
