import { useService } from '@rabjs/react';
import { DeviceService } from '../../../services/device.service';
import type { TransferSession, Device } from '@zen-send/shared';

export type MessageDirection = 'sent' | 'received';

export function useTransferBubble(transfer: TransferSession) {
  const deviceService = useService(DeviceService);

  const currentDeviceId = deviceService.currentDeviceId;
  const isSent = transfer.sourceDeviceId === currentDeviceId;
  const direction: MessageDirection = isSent ? 'sent' : 'received';

  const deviceId = isSent ? transfer.targetDeviceId : transfer.sourceDeviceId;
  const device = deviceService.devices.find((d) => d.id === deviceId) || null;

  return {
    direction,
    device,
    isSent,
  };
}
