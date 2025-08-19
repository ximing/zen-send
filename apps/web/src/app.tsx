import { HashRouter, useRoutes, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import { useService } from '@rabjs/react';
import { AuthService } from './services/auth.service';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import DevicesPage from './pages/devices';
import SettingsPage from './pages/settings';

// Root redirect - checks auth before rendering HomePage
function RootRoute() {
  const authService = useService(AuthService);
  if (!authService.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <HomePage />;
}

const routeConfig = [
  { path: '/', element: <RootRoute /> },
  { path: '/devices', element: <DevicesPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/setup', element: <SetupPage /> },
];

function AppRoutes() {
  const routes = useRoutes(routeConfig);
  return routes;
}

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
