import { AuthController } from './auth.controller.js';
import { DeviceController } from './device.controller.js';
import { HealthController } from './health.controller.js';
import { TransferController } from './transfer.controller.js';
import { ExternalLinkController } from './external-link.controller.js';

export const controllers = [AuthController, DeviceController, HealthController, TransferController, ExternalLinkController];
