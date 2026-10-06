// Browser copy of the Expo theme's values (src/components/theme.ts), for the few places that
// pass a colour as a prop (icon tints). Everything else is styled in styles.css with the
// same values as CSS variables.
export const colors = {
  background: '#F7F5FC',
  surface: '#FFFFFF',
  surfaceTint: '#E9E3F6',
  inputFill: '#F1EFF6',
  text: '#040407',
  heading: '#181738',
  textMuted: '#7D7B80',
  border: '#EDE9F5',
  primary: '#181738',
  primaryText: '#FCFBFE',
  accent: '#9E89E1',
  accentText: '#181738',
  accentSoft: '#EEE9FB',
  heroMuted: '#B9B4D6',
  success: '#1E7A4C',
  successSoft: '#E3F6EC',
  warning: '#9A5B00',
  warningSoft: '#FDEFE0',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
} as const;
