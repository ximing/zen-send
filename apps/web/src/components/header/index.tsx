import React from 'react';
import { observer, useService } from '@rabjs/react';
import { Menu, Search, Download } from 'lucide-react';
import { SocketService } from '../../services/socket.service';

interface HeaderProps {
  onMenuPress?: () => void;
  onSearchPress: () => void;
  onDownloadPress?: () => void;
}

function HeaderInner({ onMenuPress, onSearchPress, onDownloadPress }: HeaderProps) {
  const socketService = useService(SocketService);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0
                 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]"
    >
      {onMenuPress ? (
        <button
          onClick={onMenuPress}
          className="p-2 min-w-[44px] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <Menu size={24} className="text-[var(--text-primary)]" />
        </button>
      ) : (
        <div className="min-w-[44px]" />
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-base font-semibold tracking-widest text-[var(--text-primary)]">
          ZEN_SEND
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: socketService.isConnected ? '#22C55E' : '#EF4444' }}
        />
      </div>

      <div className="flex items-center gap-1">
        {onDownloadPress && (
          <button
            onClick={onDownloadPress}
            className="p-2 min-w-[44px] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          >
            <Download size={22} className="text-[var(--text-primary)]" />
          </button>
        )}
        <button
          onClick={onSearchPress}
          className="p-2 min-w-[44px] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <Search size={22} className="text-[var(--text-primary)]" />
        </button>
      </div>
    </header>
  );
}

export default observer(HeaderInner);
