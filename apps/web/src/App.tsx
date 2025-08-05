import { HashRouter, useRoutes } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import DevicesPage from './pages/devices';
import SettingsPage from './pages/settings';

const routeConfig = [
  { path: '/', element: <HomePage /> },
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
