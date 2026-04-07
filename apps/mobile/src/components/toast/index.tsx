import { useState, useEffect } from 'react';
import { Text, StyleSheet, View, Modal } from 'react-native';
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

  useEffect(() => {
    toastRef = (msg: string) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2000);
    };
    return () => {
      toastRef = null;
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.container} pointerEvents="none">
        <View style={[styles.toastBox, { backgroundColor: colors.textPrimary }]}>
          <Text style={[styles.text, { color: colors.bgPrimary }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  toastBox: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ToastInner;
