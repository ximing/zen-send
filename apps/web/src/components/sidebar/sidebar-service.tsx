import { Service } from '@rabjs/react';
import { Sun, Moon } from 'lucide-react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

const DEVICE_ID_KEY = 'zen-send-device-id';

export class SidebarService extends Service {
  get themeService() {
    return this.resolve(ThemeService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  get deviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
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

  get userInitial() {
    return this.userEmail.charAt(0).toUpperCase() || '?';
  }

  async logout() {
    await this.authService.logout();
  }
}
