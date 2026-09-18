/**
 * Cognisafe-Q Design Tokens — Liquid Minimalism
 *
 * Color philosophy:
 * - brandBlue (#0E6BD1)  = Safety Blue — all primary interactive actions
 * - brandCyan (#1AC7D6)  = Signal Cyan — accents, focused borders
 * - safe     (#20A66A)  = SAFE state — calm, reassuring green
 * - warning  (#F59E0B)  = ALERT state — noticeable amber
 * - destructive (#EB3038) = EMERGENCY / validation errors ONLY
 *
 * Alert Red is RESERVED for actual emergency and error states.
 * It must NOT be used for normal CTAs, navigation, or brand decoration.
 */

const colors = {
  light: {
    // ── Legacy aliases ───────────────────────────────────────────────
    text: '#1A1F2E',
    tint: '#0E6BD1',

    // ── Core surfaces ────────────────────────────────────────────────
    background: '#F4F6FA',
    foreground: '#1A1F2E',

    // ── Glass surfaces (for cards, modals, panels) ───────────────────
    // Semi-transparent so the ambient gradient shows through
    card: 'rgba(255, 255, 255, 0.70)',
    cardForeground: '#1A1F2E',
    glassBorder: 'rgba(255, 255, 255, 0.55)',
    glassBorderStrong: 'rgba(14, 107, 209, 0.15)',

    // ── Brand ────────────────────────────────────────────────────────
    brandBlue: '#0E6BD1',         // Safety Blue — primary CTAs
    brandCyan: '#1AC7D6',         // Signal Cyan — accents
    brandBlueSubtle: 'rgba(14, 107, 209, 0.10)', // icon bg tint

    // ── Primary action (Safety Blue, not red) ────────────────────────
    primary: '#0E6BD1',
    primaryForeground: '#FFFFFF',

    // ── Secondary / ghost ────────────────────────────────────────────
    secondary: 'rgba(14, 107, 209, 0.08)',
    secondaryForeground: '#0E6BD1',

    // ── Muted ────────────────────────────────────────────────────────
    muted: 'rgba(0, 0, 0, 0.05)',
    mutedForeground: '#6B7280',

    // ── Accent ───────────────────────────────────────────────────────
    accent: 'rgba(26, 199, 214, 0.08)',
    accentForeground: '#0E6BD1',

    // ── Safety states ────────────────────────────────────────────────
    safe: '#20A66A',
    safeForeground: '#FFFFFF',
    safeBackground: 'rgba(32, 166, 106, 0.08)',
    safeBorder: 'rgba(32, 166, 106, 0.25)',

    warning: '#F59E0B',
    warningForeground: '#FFFFFF',
    warningBackground: 'rgba(245, 158, 11, 0.08)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',

    // ── Destructive — EMERGENCY & ERROR ONLY ────────────────────────
    destructive: '#EB3038',
    destructiveForeground: '#FFFFFF',
    destructiveBackground: 'rgba(235, 48, 56, 0.08)',
    destructiveBorder: 'rgba(235, 48, 56, 0.25)',

    // ── Borders & inputs ─────────────────────────────────────────────
    border: 'rgba(255, 255, 255, 0.40)',
    input: 'rgba(0, 0, 0, 0.10)',

    // ── Surface elevations ───────────────────────────────────────────
    surface1: 'rgba(255, 255, 255, 0.90)',
    surface2: '#F4F6FA',
    surface3: 'rgba(255, 255, 255, 0.60)',

    // ── Text hierarchy ───────────────────────────────────────────────
    text1: '#0D1117',
    text2: '#374151',
    text3: '#6B7280',
    text4: '#9CA3AF',

    // ── Overlay ──────────────────────────────────────────────────────
    overlay: 'rgba(9, 19, 33, 0.72)',
    overlayForeground: '#FFFFFF',

    // ── Ambient gradient stops ───────────────────────────────────────
    gradientStart: '#E0E7FF', // soft airy blue
    gradientEnd: '#FAF5FF',   // pastel purple/cream
  },

  dark: {
    // ── Legacy aliases ───────────────────────────────────────────────
    text: '#E8ECF4',
    tint: '#3B8FE8',

    // ── Core surfaces ────────────────────────────────────────────────
    background: '#07101E',
    foreground: '#E8ECF4',

    // ── Glass surfaces ───────────────────────────────────────────────
    card: 'rgba(20, 20, 25, 0.60)',
    cardForeground: '#E8ECF4',
    glassBorder: 'rgba(255, 255, 255, 0.07)',
    glassBorderStrong: 'rgba(59, 143, 232, 0.20)',

    // ── Brand ────────────────────────────────────────────────────────
    brandBlue: '#3B8FE8',
    brandCyan: '#22D8E8',
    brandBlueSubtle: 'rgba(59, 143, 232, 0.12)',

    // ── Primary ──────────────────────────────────────────────────────
    primary: '#3B8FE8',
    primaryForeground: '#FFFFFF',

    // ── Secondary ────────────────────────────────────────────────────
    secondary: 'rgba(59, 143, 232, 0.10)',
    secondaryForeground: '#3B8FE8',

    // ── Muted ────────────────────────────────────────────────────────
    muted: 'rgba(255, 255, 255, 0.06)',
    mutedForeground: '#6B7280',

    // ── Accent ───────────────────────────────────────────────────────
    accent: 'rgba(34, 216, 232, 0.08)',
    accentForeground: '#22D8E8',

    // ── Safety states ────────────────────────────────────────────────
    safe: '#22C55E',
    safeForeground: '#FFFFFF',
    safeBackground: 'rgba(34, 197, 94, 0.08)',
    safeBorder: 'rgba(34, 197, 94, 0.22)',

    warning: '#F59E0B',
    warningForeground: '#000000',
    warningBackground: 'rgba(245, 158, 11, 0.08)',
    warningBorder: 'rgba(245, 158, 11, 0.22)',

    // ── Destructive — EMERGENCY & ERROR ONLY ────────────────────────
    destructive: '#F04046',
    destructiveForeground: '#FFFFFF',
    destructiveBackground: 'rgba(240, 64, 70, 0.10)',
    destructiveBorder: 'rgba(240, 64, 70, 0.25)',

    // ── Borders & inputs ─────────────────────────────────────────────
    border: 'rgba(255, 255, 255, 0.08)',
    input: 'rgba(255, 255, 255, 0.10)',

    // ── Surface elevations ───────────────────────────────────────────
    surface1: 'rgba(20, 32, 55, 0.95)',
    surface2: '#07101E',
    surface3: 'rgba(15, 24, 42, 0.70)',

    // ── Text hierarchy ───────────────────────────────────────────────
    text1: '#F0F4FF',
    text2: '#B8C4D8',
    text3: '#7A8BA6',
    text4: '#4A5568',

    // ── Overlay ──────────────────────────────────────────────────────
    overlay: 'rgba(0, 0, 0, 0.78)',
    overlayForeground: '#FFFFFF',

    // ── Ambient gradient stops ───────────────────────────────────────
    gradientStart: '#0F172A', // obsidian
    gradientEnd: '#1E1B4B',   // dark midnight indigo
  },

  // ── Geometry ─────────────────────────────────────────────────────────
  // Squircle-style concentric radii system
  // Outer container → inner element → innermost element
  radius: 20,    // outer cards
  radiusMd: 14,  // inner elements (card → button/field)
  radiusSm: 8,   // innermost (pill labels, badges)
} as const;

export type ColorPalette = typeof colors.light & {
  radius: number;
  radiusMd: number;
  radiusSm: number;
};

export default colors;
