import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService, type TransferFilter } from './home.service';
import { AuthService } from '../../services/auth.service';
import Header from '../../components/header';
import Toast from '../../components/toast';

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  const filters: { label: string; value: TransferFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Files', value: 'file' },
    { label: 'Text', value: 'text' },
    { label: 'Clipboard', value: 'clipboard' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-4xl mx-auto p-5">
        {/* Send toolbar */}
        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-medium
                             hover:bg-primary-hover transition-colors"
          >
            📎 Select File
          </button>
          <button
            className="flex-1 py-3 bg-surface border border-border-default text-text-primary
                             rounded-lg font-medium hover:bg-bg-elevated transition-colors"
          >
            ✏️ Enter Text
          </button>
          <button
            className="flex-1 py-3 bg-surface border border-border-default text-text-primary
                             rounded-lg font-medium hover:bg-bg-elevated transition-colors"
          >
            📋 Clipboard
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => service.setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${service.filter === f.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface border border-border-default text-text-secondary hover:bg-bg-elevated'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transfer list */}
        <div className="space-y-3">
          {service.isLoading ? (
            <p className="text-text-muted text-center py-8">Loading...</p>
          ) : service.filteredTransfers.length === 0 ? (
            <p className="text-text-muted text-center py-8">No transfers yet</p>
          ) : (
            service.filteredTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 bg-surface border border-border-default rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-text-primary">
                      {transfer.items?.[0]?.name || transfer.originalFileName}
                    </span>
                    <span className="ml-2 text-sm text-text-muted">
                      {formatSize(transfer.totalSize)}
                    </span>
                  </div>
                  <span className="text-sm text-text-muted">
                    {formatTime(transfer.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Online devices */}
        <div className="mt-8 p-4 bg-surface border border-border-default rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            📱 Online Devices
          </h3>
          <p className="text-text-muted text-sm">No devices online</p>
        </div>
      </main>

      <Toast />
    </div>
  );
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default bindServices(HomeContent, [HomeService]);
