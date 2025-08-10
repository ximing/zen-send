import { View, Text, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../src/services/theme.service';

function HomeScreen() {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Zen Send</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your devices are connected
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
});

export default observer(HomeScreen);
