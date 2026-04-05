import { Stack } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthService } from '../../src/services/auth.service';
import { SocketService } from '../../src/services/socket.service';

function MainLayoutInner() {
  const authService = useService(AuthService);
  const socketService = useService(SocketService);

  useEffect(() => {
    if (authService.isAuthenticated && authService.user) {
      // Load or generate device ID (loadDeviceId handles persistence)
      authService.loadDeviceId().then((deviceId) => {
        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
        socketService.connect(deviceId, 'Mobile Device', deviceType);
      });
    }
    return () => {
      socketService.disconnect();
    };
  }, [authService.isAuthenticated]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default observer(MainLayoutInner);
