import React from 'react';
import { Globe, Smartphone, Tablet, Monitor } from 'lucide-react';
import type { Device, DeviceType } from '@zen-send/shared';

const DEVICE_COLORS: Record<DeviceType, string> = {
  web: '#3B82F6',
  android: '#22C55E',
  ios: '#A855F7',
  desktop: '#F97316',
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  web: <Globe size={12} />,
  android: <Smartphone size={12} />,
  ios: <Tablet size={12} />,
  desktop: <Monitor size={12} />,
};

interface DeviceTagProps {
  device: Device | null;
  direction: 'sent' | 'received';
}

export const DeviceTag: React.FC<DeviceTagProps> = ({ device, direction }) => {
  const isSent = direction === 'sent';
  const deviceType = device?.type || 'web';
  const deviceName = device?.name || 'Unknown Device';
  const color = DEVICE_COLORS[deviceType];
  const icon = DEVICE_ICONS[deviceType];

  return (
    <div className={`flex items-center gap-1.5 text-[var(--text-muted)] ${isSent ? 'justify-end' : 'justify-start'}`}>
      {icon}
      <span className="text-[11px]">{deviceName}</span>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default DeviceTag;
