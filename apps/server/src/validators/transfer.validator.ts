import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MinLength,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';
import type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';

export class InitTransferDto implements InitTransferRequest {
  @IsString()
  sourceDeviceId!: string;

  @IsOptional()
  @IsString()
  targetDeviceId?: string;

  @IsEnum(['file', 'text'])
  type!: 'file' | 'text';

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsNumber()
  @IsInt()
  @Min(0)
  totalSize!: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  chunkCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10 * 1024)
  content?: string;
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
