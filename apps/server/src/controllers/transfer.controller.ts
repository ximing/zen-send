// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Post,
  Delete,
  Param,
  QueryParams,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { TransferService } from '../services/transfer.service.js';
import { InitTransferDto, UploadChunkDto } from '../dto/transfer.dto.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../config/jwt.js';

@JsonController('/api/transfers')
@Service()
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post('/init')
  async init(@CurrentUser() user: TokenPayload, @Body() dto: InitTransferDto) {
    try {
      const result = await this.transferService.initTransfer({
        userId: user.userId,
        sourceDeviceId: dto.sourceDeviceId,
        targetDeviceId: dto.targetDeviceId,
        type: dto.type,
        fileName: dto.fileName,
        contentType: dto.contentType,
        totalSize: dto.totalSize,
        chunkCount: dto.chunkCount,
      });
      return ResponseUtil.created(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize transfer';
      throw new HttpError(400, message);
    }
  }

  @Post('/:id/chunks')
  @HttpCode(200)
  async uploadChunk(
    @CurrentUser() user: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UploadChunkDto
  ) {
    const session = await this.transferService.getTransferById(id, user.userId);
    if (!session) {
      throw new HttpError(404, 'Transfer session not found');
    }

    await this.transferService.uploadChunk(id, dto.chunkIndex, dto.etag);
    return ResponseUtil.success({ received: true });
  }

  @Post('/:id/complete')
  @HttpCode(200)
  async complete(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    try {
      const result = await this.transferService.completeTransfer(id, user.userId);
      return ResponseUtil.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete transfer';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Get()
  async list(
    @CurrentUser() user: TokenPayload,
    @QueryParams('limit') limit?: string,
    @QueryParams('offset') offset?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 0 || isNaN(parsedOffset) || parsedOffset < 0) {
      throw new HttpError(400, 'Invalid limit or offset parameter');
    }

    const transfers = await this.transferService.getTransferList(user.userId, parsedLimit, parsedOffset);
    return ResponseUtil.success({ transfers });
  }

  @Get('/:id')
  async get(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const transfer = await this.transferService.getTransferById(id, user.userId);
    if (!transfer) {
      throw new HttpError(404, 'Transfer not found');
    }
    return ResponseUtil.success({ transfer });
  }

  @Get('/:id/download')
  async getDownloadUrl(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    try {
      const url = await this.transferService.getDownloadUrl(id, user.userId);
      return ResponseUtil.success({ downloadUrl: url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get download URL';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Delete('/:id')
  @HttpCode(200)
  async delete(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const deleted = await this.transferService.deleteTransfer(id, user.userId);
    if (!deleted) {
      throw new HttpError(404, 'Transfer not found');
    }
    return ResponseUtil.success({ message: 'Transfer deleted successfully' });
  }
}
