import { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useService } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';

let toastRef: ((message: string) => void) | null = null;

export function showToast(message: string) {
  toastRef?.(message);
}

function ToastInner() {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    toastRef = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, 1500);
      });
    };
    return () => {
      toastRef = null;
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.textPrimary, opacity },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: colors.bgPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ToastInner;
