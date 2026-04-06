// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { JsonController, Get, Param, HttpError, CurrentUser, Authorized } from 'routing-controllers';
import { Service } from 'typedi';
import { TransferService } from '../services/transfer.service.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../utils/jwt.js';

@JsonController('/api/transfers')
@Service()
export class ExternalLinkController {
  constructor(private transferService: TransferService) {}

  @Get('/:id/external-link')
  @Authorized()
  async getExternalLink(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    try {
      const { url, expiresAt } = await this.transferService.getExternalLink(id, user.userId);
      return ResponseUtil.success({ url, expiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate external link';
      if (message.includes('not found') || message.includes('not belong')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }
}
