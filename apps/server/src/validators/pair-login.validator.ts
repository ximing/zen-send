import { IsString, IsNotEmpty } from 'class-validator';

export class PairLoginDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
