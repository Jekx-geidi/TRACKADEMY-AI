import { StyleSheet, Text } from 'react-native';

import { useInstallPrompt } from '@/lib/pwa';

import { Button } from './Button';
import { Card } from './Card';
import { colors, fonts, spacing } from './theme';

/** Web only: offers to add Trackademic to the home screen. Renders nothing once installed. */
export function InstallAppCard() {
  const { canInstall, showIosHint, install } = useInstallPrompt();
  if (!canInstall && !showIosHint) return null;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Add Trackademic to your home screen</Text>
      {canInstall ? (
        <>
          <Text style={styles.body}>Open it like an app, without looking for the website each time.</Text>
          <Button label="Install App" icon="download-outline" variant="accent" onPress={install} />
        </>
      ) : (
        <Text style={styles.body}>
          In Safari, tap the Share button, then choose <Text style={styles.strong}>Add to Home Screen</Text>.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { fontSize: 17, fontFamily: fonts.extrabold, color: colors.heading },
  body: { fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },
  strong: { fontFamily: fonts.bold, color: colors.heading },
});
