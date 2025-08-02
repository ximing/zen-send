import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { BrowserRouter, useRoutes, Route, Navigate } from 'react-router';
import type { Device } from '@zen-send/shared';
import { ThemeProvider, useTheme } from './theme/theme-provider';

const socket: Socket = io('http://localhost:3001');

// Placeholder page components - to be implemented
function HomePage() {
  return <div>Home Page - To be implemented</div>;
}

function LoginPage() {
  return <div>Login Page - To be implemented</div>;
}

function RegisterPage() {
  return <div>Register Page - To be implemented</div>;
}

function SetupPage() {
  return <div>Setup Page - To be implemented</div>;
}

function AppContent() {
  const { setMode, resolvedTheme } = useTheme();
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName] = useState('Web Device');

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('register', { name: deviceName, type: 'web' });
    });

    socket.on('registered', (data: { deviceId: string }) => {
      setDeviceId(data.deviceId);
    });

    socket.on('devices', (deviceList: Device[]) => {
      setDevices(deviceList);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.off('connect');
      socket.off('registered');
      socket.off('devices');
      socket.off('disconnect');
    };
  }, [deviceName]);

  const handleDiscover = () => {
    socket.emit('discover');
  };

  const toggleTheme = () => {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans p-5">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Zen Send</h1>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-surface-secondary dark:bg-surface-elevated border border-border-default rounded-md hover:bg-bg-elevated transition-colors duration-normal text-sm"
        >
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-error'}`} />
          <span className="text-text-secondary">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {deviceId && <p className="text-sm text-text-muted">Device ID: {deviceId}</p>}

        <div className="mt-4">
          <button
            onClick={handleDiscover}
            className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover transition-colors duration-normal"
          >
            Discover Devices
          </button>
        </div>

        <h2 className="text-lg font-medium text-text-primary mt-6">Available Devices</h2>

        {devices.length === 0 ? (
          <p className="text-text-muted">No devices found</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((device) => (
              <li
                key={device.id}
                className="p-3 bg-surface-secondary dark:bg-surface-elevated rounded-md border border-border-default"
              >
                <span className="text-text-primary font-medium">{device.name}</span>
                <span className="ml-2 text-sm text-text-muted">({device.type})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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
