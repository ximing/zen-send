import { useService } from '@rabjs/react';
import { observer } from '@rabjs/react';
import type { Device, DeviceType } from '@zen-send/shared';
import { ThemeService } from '../../services/theme.service';
import iconSprite from '../../assets/icon.png';

const DEVICE_COLORS: Record<DeviceType, string> = {
  web: '#3B82F6',
  android: '#22C55E',
  ios: '#A855F7',
  desktop: '#F97316',
};

// Sprite map: 1000x420px, 4x2 grid
// Icons are roughly 184x184px
// Layout:
// Row 1: Light Web, Light Android, Dark Web, Dark Android
// Row 2: Light iOS, Light Desktop, Dark iOS, Dark Desktop
const DEVICE_SPRITE_CENTERS: Record<DeviceType, { light: {x: number, y: number}, dark: {x: number, y: number} }> = {
  web: { light: { x: 132, y: 94.5 }, dark: { x: 619.5, y: 94.5 } },
  android: { light: { x: 377, y: 94.5 }, dark: { x: 864, y: 94.5 } },
  ios: { light: { x: 132, y: 326.5 }, dark: { x: 619.5, y: 326.5 } },
  desktop: { light: { x: 377, y: 326.5 }, dark: { x: 864, y: 326.5 } },
};

interface DeviceTagProps {
  device: Device | null;
  direction: 'sent' | 'received';
}

export const DeviceTag = observer<DeviceTagProps>(({ device, direction }) => {
  const themeService = useService(ThemeService);
  const isSent = direction === 'sent';
  const deviceType = device?.type || 'web';
  const isDarkTheme = themeService.resolvedTheme === 'dark';
  // When device is unknown (not in device list), show context-aware name
  const deviceName = device?.name || (isSent ? 'To Device' : 'From Device');
  
  const centers = DEVICE_SPRITE_CENTERS[deviceType] || DEVICE_SPRITE_CENTERS.web;
  const { x: centerX, y: centerY } = isDarkTheme ? centers.dark : centers.light;
  
  // Scale image so icon (184px) becomes 12px
  const scale = 12 / 184;
  const bgWidth = 1000 * scale;
  const bgHeight = 420 * scale;
  
  const posX = 6 - centerX * scale;
  const posY = 6 - centerY * scale;

  return (
    <div className={`flex items-center gap-1.5 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        style={{
          backgroundImage: `url(${iconSprite})`,
          backgroundPosition: `${posX}px ${posY}px`,
          backgroundSize: `${bgWidth}px ${bgHeight}px`,
          backgroundRepeat: 'no-repeat',
          width: '12px',
          height: '12px',
        }}
      />
      <span className="text-[11px] text-[var(--text-muted)]">{deviceName}</span>
    </div>
  );
});

export default DeviceTag;
