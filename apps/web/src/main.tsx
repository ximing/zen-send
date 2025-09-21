import React from 'react';
import ReactDOM from 'react-dom/client';
import { register } from '@rabjs/react';
import App from './app';
import './index.css';

// Global Services
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { SocketService } from './services/socket.service';
import { ConfigService } from './services/config.service';
import { DeviceService } from './services/device.service';
import { ToastService } from './components/toast/toast.service';
import { HomeService } from './pages/home/home.service';
import { UserService } from './services/user.service';

// Register global Services
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(ConfigService);
register(DeviceService);
register(ToastService);
register(HomeService);
register(UserService);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
