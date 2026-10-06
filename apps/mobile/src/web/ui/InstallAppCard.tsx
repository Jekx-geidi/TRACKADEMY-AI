import { useInstallPrompt } from '@/lib/pwa';

import { Button } from './Button';
import { Card } from './Card';

/** Offers to add Trackademic to the home screen. Renders nothing once installed. */
export function InstallAppCard() {
  const { canInstall, showIosHint, install } = useInstallPrompt();
  if (!canInstall && !showIosHint) return null;

  return (
    <Card>
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--heading)' }}>Add Trackademic to your home screen</p>
      {canInstall ? (
        <>
          <p className="muted" style={{ fontSize: 15 }}>
            Open it like an app, without looking for the website each time.
          </p>
          <Button label="Install App" icon="download-outline" variant="accent" onPress={install} />
        </>
      ) : (
        <p className="muted" style={{ fontSize: 15 }}>
          In Safari, tap the Share button, then choose <strong style={{ color: 'var(--heading)' }}>Add to Home Screen</strong>.
        </p>
      )}
    </Card>
  );
}
