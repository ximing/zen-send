import { Stack } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { useEffect } from 'react';
import { AuthService } from '../../src/services/auth.service';
import { SocketService } from '../../src/services/socket.service';

function MainLayoutInner() {
  const authService = useService(AuthService);
  const socketService = useService(SocketService);

  useEffect(() => {
    if (authService.isAuthenticated && authService.user) {
      const deviceId = 'mobile-' + Math.random().toString(36).slice(2);
      socketService.connect(deviceId, 'Mobile Device', 'ios');
    }
    return () => {
      socketService.disconnect();
    };
  }, [authService.isAuthenticated]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default observer(MainLayoutInner);
