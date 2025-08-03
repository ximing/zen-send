import { Service } from '@rabjs/react';
import { Sun, Moon } from 'lucide-react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

export class HeaderService extends Service {
  get themeService() {
    return this.resolve(ThemeService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get themeIcon() {
    const Icon = this.themeService.resolvedTheme === 'dark' ? Sun : Moon;
    return <Icon size={20} className="text-[var(--text-secondary)]" />;
  }

  get userEmail() {
    return this.authService.user?.email || '';
  }

  async logout() {
    await this.authService.logout();
  }
}
