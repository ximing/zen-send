import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(['web', 'android', 'ios', 'desktop'])
  type!: 'web' | 'android' | 'ios' | 'desktop';
}
