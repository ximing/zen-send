import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import type { RegisterDeviceRequest } from '@zen-send/dto';

export class RegisterDeviceDto implements RegisterDeviceRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(['web', 'android', 'ios', 'desktop'])
  type!: 'web' | 'android' | 'ios' | 'desktop';
}
