import React, { useEffect, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Trash2, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { DeviceService } from '../../services/device.service';
import { ThemeService } from '../../services/theme.service';
import { SocketService } from '../../services/socket.service';
import type { Device, DeviceType } from '@zen-send/shared';
import iconSprite from '../../assets/icon.png';

const DevicesPage = observer(() => {
  const navigate = useNavigate();
  const deviceService = useService(DeviceService);
  const themeService = useService(ThemeService);
  const socketService = useService(SocketService);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [removing, setRemoving] = useState(false);
  const isDarkTheme = themeService.resolvedTheme === 'dark';

  useEffect(() => {
    deviceService.registerCurrentDevice();
    deviceService.loadDevices();
  }, []);

  const handleRemoveDevice = async () => {
    if (!deviceToRemove) return;
    setRemoving(true);
    try {
      await deviceService.removeDevice(deviceToRemove.id);
      setDeviceToRemove(null);
    } catch {
      // Error already logged in service
    } finally {
      setRemoving(false);
    }
  };

  const DEVICE_SPRITE_POSITIONS: Record<DeviceType, number> = {
    web: 0,
    android: 120,
    ios: 240,
    desktop: 360,
  };

  const getDeviceIcon = (type: DeviceType, isDarkTheme: boolean) => {
    const bgPosition = DEVICE_SPRITE_POSITIONS[type];
    const spriteOffsetX = isDarkTheme ? 480 : 0;

    return (
      <div
        style={{
          backgroundImage: `url(${iconSprite})`,
          backgroundPosition: `${-(bgPosition + spriteOffsetX)}px 0`,
          backgroundSize: '960px 120px',
          backgroundRepeat: 'no-repeat',
          width: '24px',
          height: '24px',
        }}
      />
    );
  };

  const formatLastSeen = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Device List Section */}
          <div className="bg-[var(--bg-surface)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">已注册设备</h2>
            <div className="mt-4 space-y-3">
              {deviceService.loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                </div>
              ) : deviceService.devices.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无已注册设备</p>
                </div>
              ) : (
                deviceService.devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)]">
                        {getDeviceIcon(device.type, isDarkTheme)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">
                            {device.name}
                          </span>
                          {deviceService.isCurrentDevice(device.id) && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] rounded-full">
                              当前设备
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                          {device.isOnline ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              <span>在线</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>离线</span>
                            </>
                          )}
                          <span className="text-[var(--text-muted)]">
                            最近活跃 {formatLastSeen(device.lastSeenAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!deviceService.isCurrentDevice(device.id) && (
                      <button
                        onClick={() => setDeviceToRemove(device)}
                        className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Remove Device Confirmation Modal */}
      {deviceToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">移除设备</h3>
              <button
                onClick={() => setDeviceToRemove(null)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-secondary)]">
              确定要移除 <strong>{deviceToRemove.name}</strong> 吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeviceToRemove(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRemoveDevice}
                disabled={removing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {removing ? '移除中...' : '移除设备'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DevicesPage;
