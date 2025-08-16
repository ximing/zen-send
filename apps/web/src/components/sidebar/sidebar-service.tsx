import { Service } from '@rabjs/react';
import { Sun, Moon } from 'lucide-react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import logoLight from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';

const DEVICE_ID_KEY = 'zen-send-device-id';
const THEME_CHANGE_EVENT = 'zen-send:themechange';

export class SidebarService extends Service {
  // Service 中的普通属性自动是 observable 的
  currentTheme: 'light' | 'dark' = 'light';

  get themeService() {
    return this.resolve(ThemeService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  constructor() {
    super();
    // Initialize with current theme
    this.currentTheme = this.themeService.resolvedTheme;
    // Listen for theme changes
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
  }

  private handleThemeChange = () => {
    this.currentTheme = this.themeService.resolvedTheme;
  };

  dispose() {
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
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
    const Icon = this.currentTheme === 'dark' ? Sun : Moon;
    return <Icon size={20} className="text-[var(--text-secondary)]" />;
  }

  get logoSrc() {
    return this.currentTheme === 'dark' ? logoDark : logoLight;
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
