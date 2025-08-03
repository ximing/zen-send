// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { DeviceService } from '../services/device.service.js';
import { RegisterDeviceDto } from '../dto/device.dto.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../config/jwt.js';

@JsonController('/api/devices')
@Service()
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Get()
  async list(@CurrentUser() user: TokenPayload) {
    const devices = await this.deviceService.getUserDevices(user.userId);
    return ResponseUtil.success({ devices });
  }

  @Post()
  async register(@CurrentUser() user: TokenPayload, @Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice({
      userId: user.userId,
      name: dto.name,
      type: dto.type,
    });
    return ResponseUtil.created({ device });
  }

  @Delete('/:id')
  async unbind(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const device = await this.deviceService.getDeviceById(id);
    if (!device) {
      throw new HttpError(404, 'Device not found');
    }

    if (device.userId !== user.userId) {
      throw new HttpError(403, 'Cannot unbind another user\'s device');
    }

    const deleted = await this.deviceService.unbindDevice(id, user.userId);
    if (!deleted) {
      throw new HttpError(404, 'Device not found');
    }

    return ResponseUtil.success({ deleted: true });
  }

  @Patch('/:id/heartbeat')
  @HttpCode(200)
  async heartbeat(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const device = await this.deviceService.getDeviceById(id);
    if (!device) {
      throw new HttpError(404, 'Device not found');
    }

    if (device.userId !== user.userId) {
      throw new HttpError(403, 'Cannot update another user\'s device');
    }

    await this.deviceService.updateDeviceHeartbeat(id);
    return ResponseUtil.success({ ok: true });
  }
}
