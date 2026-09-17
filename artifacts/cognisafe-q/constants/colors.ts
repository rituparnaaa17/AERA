/**
 * Cognisafe-Q Design Tokens — Premium Safety App
 *
 * Color philosophy:
 * - Light, clean backgrounds communicate calm and trustworthiness
 * - Deep red (#E53935) is reserved for SOS, emergency, and primary actions
 * - Green (#20A66A) signals SAFE — calm, reassuring
 * - Amber (#F59E0B) signals ALERT — noticeable but not panic-inducing
 * - Red (#E53935) signals EMERGENCY — immediate, unmistakable
 */

const colors = {
  light: {
    // Legacy aliases
    text: '#222222',
    tint: '#E53935',

    // Core surfaces
    background: '#F7F7F5',
    foreground: '#222222',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#222222',

    // Primary action color — Emergency Red
    primary: '#E53935',
    primaryForeground: '#FFFFFF',

    // Secondary red (softer)
    secondary: '#FFF0F0',
    secondaryForeground: '#E53935',

    // Muted / subdued elements
    muted: '#F0F0EE',
    mutedForeground: '#737373',

    // Accent — light red tint for backgrounds
    accent: '#FFF5F5',
    accentForeground: '#E53935',

    // Safety states
    safe: '#20A66A',
    safeForeground: '#FFFFFF',
    safeBackground: '#F0FBF5',
    safeBorder: '#B7E9D2',

    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    warningBackground: '#FFFBEB',
    warningBorder: '#FDE68A',

    // Destructive / Emergency
    destructive: '#E53935',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E8E8E8',
    input: '#E0E0E0',

    // Surface elevations
    surface1: '#FFFFFF',
    surface2: '#F7F7F5',
    surface3: '#EFEFED',

    // Text hierarchy
    text1: '#171717',
    text2: '#404040',
    text3: '#737373',
    text4: '#A3A3A3',

    // Special — dark overlay for hero sections
    overlay: '#171717',
    overlayForeground: '#FFFFFF',
  },

  dark: {
    text: '#F5F5F5',
    tint: '#FF5A55',

    background: '#0F0F0F',
    foreground: '#F5F5F5',

    card: '#1A1A1A',
    cardForeground: '#F5F5F5',

    primary: '#FF5A55',
    primaryForeground: '#FFFFFF',

    secondary: '#2A1515',
    secondaryForeground: '#FF5A55',

    muted: '#1F1F1F',
    mutedForeground: '#737373',

    accent: '#2A1A1A',
    accentForeground: '#FF5A55',

    safe: '#22C55E',
    safeForeground: '#FFFFFF',
    safeBackground: '#0D2B1D',
    safeBorder: '#166534',

    warning: '#F59E0B',
    warningForeground: '#000000',
    warningBackground: '#2B1F00',
    warningBorder: '#92400E',

    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    border: '#2A2A2A',
    input: '#333333',

    surface1: '#1A1A1A',
    surface2: '#0F0F0F',
    surface3: '#262626',

    text1: '#F5F5F5',
    text2: '#D4D4D4',
    text3: '#737373',
    text4: '#525252',

    overlay: '#0F0F0F',
    overlayForeground: '#F5F5F5',
  },

  radius: 20,
};

export default colors;
