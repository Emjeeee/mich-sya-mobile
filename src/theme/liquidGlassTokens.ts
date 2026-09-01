// Liquid Glass theme tokens -- an ADDITIONAL theme (like Art Deco), not a
// replacement for the app's original hardcoded styles. See
// src/theme/THEMING_GUIDE.md for how these are meant to be applied
// (additively, via `isLiquidGlass && glass.xxx` style arrays).
//
// Modeled on Apple's iOS 26 "Liquid Glass" material (see
// .claude/skills/ios26-mobile-design): a navigation-layer material that
// floats above solid content. Keeps the app's pink brand hue rather than
// Apple's neutral grays/blues -- warm pink/rose gradients stand in for
// "real content behind the glass to refract".
export const liquidGlass = {
  color: {
    // Text -- dark, warm-toned inks with enough contrast against the pale
    // gradients/glass below. Never pure black (looks harsh on a soft bg).
    ink: '#4a2b3d',
    ink2: '#5c2440',
    inkSoft: '#6b3355',
    muted: '#6b3a56',

    // Brand pink, in three weights: a mid tone for large filled elements
    // (buttons, active states), a deeper tone for text/icons that need to
    // pass contrast on a light glass surface, and the original app pink
    // for large solid accents/shadows where contrast isn't a concern.
    accent: '#e11d74',
    accentDeep: '#b0155c',
    accentText: '#9c1257',

    go: '#166534',
    goSoft: 'rgba(22,101,52,0.14)',

    // Glass surface -- a translucent white wash + bright hairline border,
    // meant to sit over a BlurView (see GlassSurface.tsx). Two strengths:
    // "panel" for a whole floating card, "chip" for smaller nested controls.
    glassPanelWash: 'rgba(255,255,255,0.4)',
    glassPanelBorder: 'rgba(255,255,255,0.6)',
    glassChipWash: 'rgba(255,255,255,0.5)',
    glassChipBorder: 'rgba(255,255,255,0.7)',

    // Dark-tinted glass, for floating controls over a busy/colorful game
    // board where a light glass wash wouldn't read against the content
    // (see the Snake D-pad).
    glassDarkWash: 'rgba(20,26,22,0.45)',
    glassDarkBorder: 'rgba(255,255,255,0.18)',

    white: '#ffffff',
  },

  // Background gradients -- pass to LiquidGlassBackground's `variant` prop.
  // Each is a base diagonal sweep plus two soft radial highlights, echoing
  // the "real content behind the glass to refract" requirement.
  gradient: {
    warm: {
      base: ['#fff2f8', '#ffe1ee', '#f6c8e6'] as const,
      blobTopLeft: '#ffe0ef',
      blobBottomRight: '#f5b6d9',
    },
    cool: {
      base: ['#f2fbf5', '#eafaf0', '#fbe9f3'] as const,
      blobTopLeft: '#d8f6e4',
      blobBottomRight: '#ffd9ec',
    },
  },

  radius: {
    chip: 16,
    control: 20,
    card: 28,
    panel: 30,
    pill: 999,
  },

  shadow: {
    panel: {
      shadowColor: 'rgba(150,60,110,0.35)',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 8,
    },
    dark: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const;
