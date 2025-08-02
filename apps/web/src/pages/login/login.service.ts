import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';

export class LoginService extends Service {
  email = '';
  password = '';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  async login(): Promise<boolean> {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.authService.login({
        email: this.email,
        password: this.password,
      });
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Login failed';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
