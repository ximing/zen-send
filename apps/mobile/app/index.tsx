import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, FlatList } from 'react-native';
import { io, Socket } from 'socket.io-client';
import type { Device } from '@zen-send/shared';

const socket: Socket = io('http://localhost:3001');

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('register', { name: 'Mobile Device', type: 'mobile' });
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
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Zen Send</Text>
      <Text style={styles.status}>Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      {deviceId && <Text style={styles.deviceId}>Device ID: {deviceId}</Text>}

      <View style={styles.buttonContainer}>
        <Button title="Discover Devices" onPress={handleDiscover} />
      </View>

      <Text style={styles.sectionTitle}>Available Devices</Text>
      {devices.length === 0 ? (
        <Text style={styles.emptyText}>No devices found</Text>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <Text>
                {item.name} ({item.type})
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
  },
  deviceId: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 30,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  deviceItem: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
});
