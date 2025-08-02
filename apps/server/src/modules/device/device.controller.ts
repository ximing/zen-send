import type { Request, Response } from 'express';
import { z } from 'zod';
import { deviceService } from './device.service.js';
import { created, success, badRequest, notFound, forbidden } from '../../utils/response.js';

const registerDeviceSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['web', 'android', 'ios', 'desktop']),
});

export const deviceController = {
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const devices = await deviceService.getUserDevices(userId);
    success(res, { devices });
  },

  async register(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const parseResult = registerDeviceSchema.safeParse(req.body);

    if (!parseResult.success) {
      badRequest(res, 'Invalid device name or type');
      return;
    }

    const device = await deviceService.registerDevice({
      userId,
      name: parseResult.data.name,
      type: parseResult.data.type,
    });

    created(res, { device });
  },

  async unbind(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const deviceId = req.params.id as string;

    const device = await deviceService.getDeviceById(deviceId);
    if (!device) {
      notFound(res, 'Device not found');
      return;
    }

    if (device.userId !== userId) {
      forbidden(res, 'Cannot unbind another user\'s device');
      return;
    }

    const deleted = await deviceService.unbindDevice(deviceId, userId);
    if (deleted) {
      success(res, { deleted: true });
    } else {
      notFound(res, 'Device not found');
    }
  },

  async heartbeat(req: Request, res: Response): Promise<void> {
    const deviceId = req.params.id as string;

    const device = await deviceService.getDeviceById(deviceId);
    if (!device) {
      notFound(res, 'Device not found');
      return;
    }

    await deviceService.updateDeviceHeartbeat(deviceId);
    success(res, { ok: true });
  },
};
