import { Platform, type ViewStyle } from 'react-native';

/** Brand palette. */
export const palette = {
  mist: '#FCFBFE',
  lilac: '#E9E3F6',
  lavender: '#9E89E1',
  slate: '#7D7B80',
  midnight: '#181738',
  ink: '#040407',
} as const;

export const colors = {
  background: '#F7F5FC',
  surface: '#FFFFFF',
  surfaceTint: palette.lilac,
  inputFill: '#F1EFF6',
  text: palette.ink,
  heading: palette.midnight,
  textMuted: palette.slate,
  border: '#EDE9F5',
  // Primary actions use midnight: white on lavender is too low-contrast for button text.
  primary: palette.midnight,
  primaryText: palette.mist,
  // Lavender is for highlights, icons and accents; text on it stays midnight.
  accent: palette.lavender,
  accentText: palette.midnight,
  accentSoft: '#EEE9FB',
  heroStart: palette.midnight,
  heroEnd: '#2D2766',
  heroMuted: '#B9B4D6',
  success: '#1E7A4C',
  successSoft: '#E3F6EC',
  warning: '#9A5B00',
  warningSoft: '#FDEFE0',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
} as const;

/**
 * Nunito, loaded in app/_layout.tsx. Custom fonts are picked by family, not fontWeight, so
 * each weight is its own family. Body text is Regular (the design's 405 rounds to 400:
 * React Native can't select arbitrary weights of a variable font on Android).
 */
export const fonts = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

/** Minimum comfortable touch target for children and non-technical parents. */
export const MIN_TOUCH = 52;

/** Soft lavender-tinted elevation used by cards. */
export const shadow: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 6px 20px rgba(24, 23, 56, 0.06)' } as ViewStyle,
  default: {
    shadowColor: palette.midnight,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});
