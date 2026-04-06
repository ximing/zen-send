import { JsonController, Get } from 'routing-controllers';
import { Service } from 'typedi';
import { ResponseUtil } from '../utils/response.js';

@JsonController('/api/health')
@Service()
export class HealthController {
  @Get('')
  health() {
    return ResponseUtil.success({ status: 'ok', timestamp: Math.floor(Date.now() / 1000) });
  }
}
