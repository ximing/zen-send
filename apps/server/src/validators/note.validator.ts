import { IsString, IsOptional, IsArray, MaxLength, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateNoteRequest, UpdateNoteRequest, ReorderNotesRequest } from '@zen-send/dto';

export class CreateNoteDto implements CreateNoteRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateNoteDto implements UpdateNoteRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

class OrderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderNotesDto implements ReorderNotesRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orders!: OrderItemDto[];
}
