import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { register } from '@rabjs/react';
import App from './app';
import './index.css';

// Global Services
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { SocketService } from './services/socket.service';
import { ConfigService } from './services/config.service';

// Register global Services
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(ConfigService);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/setup" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
