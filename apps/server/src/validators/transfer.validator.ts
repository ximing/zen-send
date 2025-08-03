import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MinLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';

export class InitTransferDto implements InitTransferRequest {
  @IsString()
  sourceDeviceId!: string;

  @IsOptional()
  @IsString()
  targetDeviceId?: string;

  @IsEnum(['file', 'text', 'clipboard'])
  type!: 'file' | 'text' | 'clipboard';

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  totalSize!: number;

  @IsNumber()
  @IsInt()
  @IsPositive()
  chunkCount!: number;
}

export class UploadChunkDto implements UploadChunkRequest {
  @IsNumber()
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @IsString()
  @MinLength(1)
  etag!: string;
}
