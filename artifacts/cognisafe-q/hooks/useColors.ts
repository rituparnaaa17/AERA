import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export type AppColors = typeof colors.light & { radius: number };

/**
 * Returns the design tokens for the current color scheme.
 * Falls back to light palette. When dark key is defined, auto-switches.
 */
export function useColors(): AppColors {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors as {
          light: typeof colors.light;
          dark: typeof colors.dark;
        }).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
