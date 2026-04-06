import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { AuthService } from '../../src/services/auth.service';
import { SocketService } from '../../src/services/socket.service';

function MainLayoutInner() {
  const router = useRouter();
  const authService = useService(AuthService);
  const socketService = useService(SocketService);

  useEffect(() => {
    console.log('[MainLayout] isLoading:', authService.isLoading, 'isAuthenticated:', authService.isAuthenticated, 'user:', !!authService.user);

    if (authService.isLoading) return;

    if (!authService.isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    if (authService.user) {
      authService.loadDeviceId().then((deviceId) => {
        console.log('[MainLayout] Calling connect with deviceId:', deviceId);
        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
        socketService.connect(deviceId, 'Mobile Device', deviceType);
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [authService.isLoading, authService.isAuthenticated, authService.user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
    </Stack>
  );
}

export default observer(MainLayoutInner);
