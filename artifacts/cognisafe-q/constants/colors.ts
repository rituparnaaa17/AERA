/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F4F7F8',
    tint: '#54D6C7',

    // Core surfaces
    background: '#071416',
    foreground: '#F4F7F8',

    // Cards / elevated surfaces
    card: '#102124',
    cardForeground: '#F4F7F8',

    // Primary action color (buttons, links, active states)
    primary: '#22C55E',
    primaryForeground: '#071416',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#193235',
    secondaryForeground: '#D8E7E8',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#173033',
    mutedForeground: '#91A9AB',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#193F3C',
    accentForeground: '#B1FFF4',

    // Attention state (sensor anomaly / check-in countdown)
    warning: '#F59E0B',

    // Destructive actions (delete, error states)
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#244246',
    input: '#2B5054',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
