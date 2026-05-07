import React, { useEffect, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { RefreshCw, Trash2, X, CheckCircle, XCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { DeviceService } from '../../services/device.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import type { Device, DeviceType, AuthTokens } from '@zen-send/shared';
import iconSprite from '../../assets/icon.png';

const DevicesPage = observer(() => {
  const navigate = useNavigate();
  const deviceService = useService(DeviceService);
  const themeService = useService(ThemeService);
  const authService = useService(AuthService);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [removing, setRemoving] = useState(false);
  const isDarkTheme = themeService.resolvedTheme === 'dark';

  useEffect(() => {
    deviceService.registerCurrentDevice();
    deviceService.loadDevices();
    generateQRCode().catch(() => {});
  }, []);

  const generateQRCode = useCallback(async () => {
    if (!authService.isAuthenticated || !authService.accessToken) return;
    const tokens: AuthTokens = {
      accessToken: authService.accessToken,
      refreshToken: authService.refreshToken || '',
      user: authService.user!,
    };
    const serverUrl = window.location.origin;
    const url = `${serverUrl}/api/auth/qr-login?data=${encodeURIComponent(JSON.stringify(tokens))}`;
    const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrCodeUrl(qr);
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
    <div className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-2 py-2 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate('/')}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-[var(--text-primary)]" />
        </button>
        <span className="flex-1 text-lg font-semibold text-[var(--text-primary)] ml-2">
          Devices
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* QR Code Section */}
          <div className="bg-[var(--bg-surface)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Scan to Add Device</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Open Zen Send on your mobile device and scan this QR code to pair
            </p>
            <div className="mt-4 flex flex-col items-center">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Pairing QR Code" className="rounded-lg" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-[var(--bg-elevated)] rounded-lg">
                  <RefreshCw className="w-8 h-8 animate-spin text-[var(--text-secondary)]" />
                </div>
              )}
              <button
                onClick={generateQRCode}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh QR Code
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium">
                    1
                  </span>
                  <span>Open Zen Send on target device</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium">
                    2
                  </span>
                  <span>Scan the QR code</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium">
                    3
                  </span>
                  <span>Start transferring</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Device List Section */}
          <div className="mt-6 bg-[var(--bg-surface)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Registered Devices</h2>
            <div className="mt-4 space-y-3">
              {deviceService.loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                </div>
              ) : deviceService.devices.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)]">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No devices registered yet</p>
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
                              Current device
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                          {device.isOnline ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              <span>Online</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>Offline</span>
                            </>
                          )}
                          <span className="text-[var(--text-muted)]">
                            Last seen {formatLastSeen(device.lastSeenAt)}
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
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove Device</h3>
              <button
                onClick={() => setDeviceToRemove(null)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to remove <strong>{deviceToRemove.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeviceToRemove(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveDevice}
                disabled={removing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {removing ? 'Removing...' : 'Remove Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DevicesPage;
