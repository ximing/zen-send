import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';

export class RegisterService extends Service {
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  async register(): Promise<boolean> {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all fields';
      return false;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return false;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.authService.register({
        email: this.email,
        password: this.password,
      });
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Registration failed';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
