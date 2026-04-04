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

// Sprite map: each icon is 120x120px (including background)
// Light theme (left): 0-480px, Dark theme (right): 480-960px
const DEVICE_SPRITE_POSITIONS: Record<DeviceType, number> = {
  web: 0,       // First icon (0px)
  android: 120, // Second icon (120px)
  ios: 240,     // Third icon (240px)
  desktop: 360, // Fourth icon (360px)
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
  
  const bgPosition = DEVICE_SPRITE_POSITIONS[deviceType];
  const spriteOffsetX = isDarkTheme ? 480 : 0;

  return (
    <div className={`flex items-center gap-1.5 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        style={{
          backgroundImage: `url(${iconSprite})`,
          backgroundPosition: `${-(bgPosition + spriteOffsetX)}px 0`,
          backgroundSize: '960px 120px',
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
