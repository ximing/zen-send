// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { JsonController, Post, Body, HttpCode, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthService, AuthError } from '../services/auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dto/auth.dto.js';
import { ResponseUtil } from '../utils/response.js';

@JsonController('/api/auth')
@Service()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register')
  async register(@Body() dto: RegisterDto) {
    try {
      const tokens = await this.authService.register(dto);
      return ResponseUtil.created(tokens);
    } catch (error) {
      if (error instanceof AuthError && error.code === 'DUPLICATE_USER') {
        throw new HttpError(409, 'Registration failed');
      }
      throw new HttpError(400, 'Registration failed');
    }
  }

  @Post('/login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    try {
      const tokens = await this.authService.login(dto);
      return ResponseUtil.success(tokens);
    } catch (error) {
      throw new HttpError(401, 'Login failed');
    }
  }

  @Post('/refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      const tokens = await this.authService.refresh(dto.refreshToken);
      return ResponseUtil.success(tokens);
    } catch (error) {
      throw new HttpError(401, 'Refresh failed');
    }
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(@Body() dto: RefreshTokenDto) {
    try {
      this.authService.logout(dto.refreshToken);
      return ResponseUtil.success({ message: 'Logged out successfully' });
    } catch (error) {
      throw new HttpError(500, 'Logout failed');
    }
  }
}
