import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePairTokenDto {
  @IsString()
  @IsNotEmpty()
  deviceName!: string;
}
