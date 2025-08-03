import { IsEmail, IsString, MinLength } from 'class-validator';
import type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@zen-send/dto';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto implements RefreshTokenRequest {
  @IsString()
  refreshToken!: string;
}
