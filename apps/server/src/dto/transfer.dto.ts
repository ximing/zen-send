import { IsString, IsOptional, IsNumber, IsEnum, Min, IsInt, Positive } from 'class-validator';

export class InitTransferDto {
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
  @Positive()
  totalSize!: number;

  @IsNumber()
  @IsInt()
  @Positive()
  chunkCount!: number;
}

export class UploadChunkDto {
  @IsNumber()
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @IsString()
  @MinLength(1)
  etag!: string;
}
