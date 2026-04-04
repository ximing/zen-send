import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Device } from '@zen-send/shared';
import { ThemeProvider } from './theme/ThemeProvider';

const socket: Socket = io('http://localhost:3001');

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('Web Device');

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
  }, []);

  const handleDiscover = () => {
    socket.emit('discover');
  };

  return (
    <ThemeProvider>
      <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
        <h1>Zen Send</h1>
        <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
        {deviceId && <p>Device ID: {deviceId}</p>}

        <div style={{ marginTop: '20px' }}>
          <button onClick={handleDiscover}>Discover Devices</button>
        </div>

        <h2>Available Devices</h2>
        {devices.length === 0 ? (
          <p>No devices found</p>
        ) : (
          <ul>
            {devices.map((device) => (
              <li key={device.id}>
                {device.name} ({device.type})
              </li>
            ))}
          </ul>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
