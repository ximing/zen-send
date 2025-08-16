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
  Authorized,
} from 'routing-controllers';
import { Service } from 'typedi';
import { TransferService } from '../services/transfer.service.js';
import { InitTransferDto, UploadChunkDto } from '../validators/transfer.validator.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../utils/jwt.js';
import { getSocketIO } from '../socket/socket-instance.js';

@JsonController('/api/transfers')
@Service()
@Authorized()
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post('/init')
  async init(@CurrentUser() user: TokenPayload, @Body() dto: InitTransferDto) {
    try {
      const TEXT_INLINE_MAX_SIZE = 10 * 1024;
      const isInlineText = dto.type === 'text' &&
                            dto.totalSize <= TEXT_INLINE_MAX_SIZE &&
                            dto.content !== undefined;

      const result = await this.transferService.initTransfer({
        userId: user.userId,
        sourceDeviceId: dto.sourceDeviceId,
        targetDeviceId: dto.targetDeviceId,
        type: dto.type,
        fileName: dto.fileName,
        contentType: dto.contentType,
        totalSize: dto.totalSize,
        chunkCount: dto.chunkCount || 0,
        content: dto.content,
      });

      // 根据是否内联文本返回不同响应
      if (isInlineText) {
        // Emit transfer:new to all user's devices (for inline text, transfer is complete immediately)
        const io = getSocketIO();
        if (io) {
          // Get transfer details for notification
          const transfer = await this.transferService.getTransferById(result.sessionId, user.userId);
          const sourceDevice = transfer?.sourceDeviceId || 'Unknown';
          const firstItem = transfer?.items?.[0];
          io.to(`user:${user.userId}`).emit('transfer:new', {
            session: {
              sourceDeviceName: sourceDevice,
              items: firstItem ? [{ name: firstItem.name || 'Text' }] : [],
            },
          });
        }
        return ResponseUtil.created({
          sessionId: result.sessionId,
          storageType: 'db',
        });
      }

      return ResponseUtil.created({
        sessionId: result.sessionId,
        s3Bucket: result.s3Bucket,
        s3Key: result.s3Key,
        chunkCount: result.chunkCount,
        chunkSize: result.chunkSize,
        presignedUrls: result.presignedUrls?.map(u => u.url),
      });
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
      // Emit transfer:new to all user's devices
      const io = getSocketIO();
      if (io) {
        // Get transfer details for notification
        const transfer = await this.transferService.getTransferById(id, user.userId);
        const sourceDevice = transfer?.sourceDeviceId || 'Unknown';
        const firstItem = transfer?.items?.[0];
        io.to(`user:${user.userId}`).emit('transfer:new', {
          session: {
            sourceDeviceName: sourceDevice,
            items: firstItem ? [{ name: firstItem.name || 'File' }] : [],
          },
        });
      }
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
    @QueryParams() query: { limit?: string; offset?: string }
  ) {
    const limit = query.limit;
    const offset = query.offset;
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 0 || isNaN(parsedOffset) || parsedOffset < 0) {
      throw new HttpError(400, 'Invalid limit or offset parameter');
    }

    const transfers = await this.transferService.getTransferList(
      user.userId,
      parsedLimit,
      parsedOffset
    );
    return ResponseUtil.success({ transfers });
  }

  @Get('/:id')
  async get(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const transfer = await this.transferService.getTransferById(id, user.userId);
    if (!transfer) {
      throw new HttpError(404, 'Transfer not found');
    }

    // 获取 items 并构建响应
    const items = (transfer as any).items || [];

    // 对于 s3 类型的 item，需要获取下载 URL
    const formattedItems = await Promise.all(
      items.map(async (item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        size: item.size,
        storageType: item.storageType,
        content: item.storageType === 'db' ? item.content : undefined,
        downloadUrl: item.storageType === 's3'
          ? await this.transferService.getDownloadUrl(id, user.userId)
          : undefined,
      }))
    );

    return ResponseUtil.success({
      id: transfer.id,
      status: transfer.status,
      items: formattedItems,
    });
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
