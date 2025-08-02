import { BrowserRouter, useRoutes } from 'react-router';
import { ThemeProvider } from './theme/theme-provider';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';

const routeConfig = [
  { path: '/', element: <HomePage /> },
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
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
