// Art Deco theme tokens -- an ADDITIONAL theme, not a replacement for the app's
// original hardcoded styles. See src/theme/THEMING_GUIDE.md for how these are
// meant to be applied (additively, via `isArtDeco && deco.xxx` style arrays).
//
// Palette: emerald + gold + onyx (1920s), with a deep ruby standing in for the
// original app's pink/rose accents since this is a couple's app.
export const artDeco = {
  color: {
    bg: '#0d1f1a',
    bgAlt: '#0a1712',
    surface: '#13291f',
    surface2: '#18362c',

    line: '#c9a047',
    lineSoft: 'rgba(201,160,71,0.35)',
    lineFaint: 'rgba(201,160,71,0.16)',

    ink: '#f0e6c8',
    ink2: '#e9d9a0',
    muted: '#b6a97e',
    faint: '#8a7f5f',

    gold: '#c9a047',
    goldStrong: '#e8c876',
    goldSoft: 'rgba(201,160,71,0.14)',

    ruby: '#8c2f39',
    rubyStrong: '#b23b47',
    rubySoft: 'rgba(140,47,57,0.18)',

    emerald: '#1c4a3a',
    emeraldStrong: '#2a6b53',

    go: '#7fae6e',
    warn: '#d98c2b',
    stop: '#a8434a',

    black: '#05100c',
    white: '#f7efd8',
    overlay: 'rgba(5,16,12,0.72)',
  },
  radius: {
    none: 0,
    xs: 0,
    sm: 0,
    md: 0,
    lg: 0,
  },
  spacing: { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48 },
  font: {
    display: 'CinzelDecorative_700Bold',
    displayBlack: 'CinzelDecorative_900Black',
    displayRegular: 'CinzelDecorative_400Regular',
    serif: 'CormorantGaramond_600SemiBold',
    serifRegular: 'CormorantGaramond_500Medium',
    serifBold: 'CormorantGaramond_700Bold',
    serifItalic: 'CormorantGaramond_600SemiBold_Italic',
  },
  letterSpacingWide: 2,
  letterSpacingEyebrow: 3,
} as const;

export type ArtDecoTokens = typeof artDeco;
