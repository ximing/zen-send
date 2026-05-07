import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import AppLayout from './components/app-layout';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import DevicesPage from './pages/devices';
import SettingsPage from './pages/settings';
import SearchPage from './pages/search';
import DownloadsPage from './pages/downloads';

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Routes>
          {/* Auth routes - no AppLayout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Authenticated routes - wrapped by AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
