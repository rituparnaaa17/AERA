import { useColorScheme } from 'react-native';
import colors, { ColorPalette } from '@/constants/colors';

export type AppColors = ColorPalette;

/**
 * Returns the full design token set for the current color scheme.
 * Falls back to light palette. Includes all geometry tokens (radius, radiusMd, radiusSm).
 */
export function useColors(): AppColors {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors as { light: typeof colors.light; dark: typeof colors.dark }).dark
      : colors.light;
  return {
    ...palette,
    radius: colors.radius,
    radiusMd: colors.radiusMd,
    radiusSm: colors.radiusSm,
  } as AppColors;
}
