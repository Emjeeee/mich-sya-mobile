# Theming guide (Art Deco + Liquid Glass)

This app now has THREE designs living side by side: the original ("Klasik"),
Art Deco, and Liquid Glass (an iOS 26-inspired frosted-glass look, built from
`.claude/skills/ios26-mobile-design`). The user switches between them at
runtime from a toggle on the Home screen, persisted in AsyncStorage. **This
must stay non-destructive**: the original look is never edited or deleted,
only added to. If every `deco.*`/`glass.*` style were stripped out of a file,
that file must render pixel-identical to how it looked before this project
started.

The rest of this file was written for the Art Deco pass and still applies
verbatim to Liquid Glass -- everywhere it says `isArtDeco`/`deco`, the same
mechanical pattern applies with `isLiquidGlass`/`glass`. The Liquid-Glass-
specific pieces (tokens, background, the blur panel component) are
documented in their own section near the bottom.

## The pattern

Every file gets converted the same mechanical way:

1. Import the hook and tokens:
   ```tsx
   import { useAppTheme } from '../theme/ThemeContext'; // adjust relative path
   import { artDeco } from '../theme/artDecoTokens';
   ```
   (from `src/components/games/*.tsx` the path is `../../theme/ThemeContext` etc.)

2. Inside the component:
   ```tsx
   const { isArtDeco } = useAppTheme();
   ```

3. **Never edit the existing `const styles = StyleSheet.create({...})`.**
   Leave every key, value, and property exactly as-is.

4. Add a second stylesheet below it, `deco`, with ONLY the properties that
   should change in Art Deco mode. You don't need to repeat properties that
   stay the same:
   ```tsx
   const deco = StyleSheet.create({
     container: {
       backgroundColor: 'transparent', // let ArtDecoBackground show through
     },
     title: {
       color: artDeco.color.gold,
       fontFamily: artDeco.font.display,
       letterSpacing: artDeco.letterSpacingWide,
     },
     card: {
       borderRadius: artDeco.radius.none,
       borderWidth: 1.5,
       borderColor: artDeco.color.line,
       backgroundColor: artDeco.color.surface,
     },
   });
   ```

5. At every JSX usage site, merge with an array — the second element wins
   when truthy, and is ignored (no-op) when `isArtDeco` is false:
   ```tsx
   <View style={[styles.container, isArtDeco && deco.container]}>
   <Text style={[styles.title, isArtDeco && deco.title]}>MichSya</Text>
   ```
   This is the ENTIRE mechanism. Do not use ternaries that pick one
   stylesheet or the other — always array-merge so nothing needs to be
   duplicated.

6. For a screen's root background, don't just recolor `styles.container`'s
   `backgroundColor` — replace it with `'transparent'` in `deco.container`
   and render the decorative backdrop behind everything else:
   ```tsx
   import { ArtDecoBackground } from '../theme/components/ArtDecoBackground';
   // ...
   return (
     <View style={[styles.container, isArtDeco && deco.container]}>
       {isArtDeco && <ArtDecoBackground />}
       {/* ...rest of the existing JSX, unchanged... */}
     </View>
   );
   ```
   `ArtDecoBackground` is `position: absolute` and fills its parent — the
   parent just needs `position: relative` (Views default to that) and
   non-opaque background.

7. Card/panel elevation: the original often uses `shadow*`/`elevation`
   props. Art Deco doesn't use shadows — it uses a double gold border. You
   can either add border properties directly in `deco.card` (borderWidth +
   borderColor, see step 4), or wrap the card's children in
   `<DecoFrame>` from `src/theme/components/DecoFrame.tsx` for the fancier
   double-border look. Don't remove the original shadow style — it simply
   won't be visible once a background/border override sits on top, and it's
   still there for when `isArtDeco` is false.

8. Round bullets/dots/active-indicators → swap for `<DiamondMarker />`
   (`src/theme/components/DiamondMarker.tsx`) only when `isArtDeco`,
   conditionally rendered, e.g.:
   ```tsx
   {isArtDeco ? <DiamondMarker size={8} /> : <View style={styles.dot} />}
   ```

9. Section separators / dividers → `<DecoDivider />` conditionally, same
   pattern as above.

10. Buttons/accents that use the original's pink/purple/blue accent colors
    (commonly `#e11d74`, and other bright hex literals scattered per file)
    → map to `artDeco.color.gold` for primary actions/accents, and
    `artDeco.color.ruby` for anything explicitly "romantic" (hearts, love
    references) or destructive/danger actions where the original used red.

11. Text color/fonts: body text `ink` → `artDeco.color.ink`, muted/secondary
    text → `artDeco.color.muted`. Headings/titles get
    `fontFamily: artDeco.font.display` (Cinzel Decorative, use sparingly —
    it's a display face, only for short titles/labels) or
    `artDeco.font.serif` / `artDeco.font.serifRegular` (Cormorant Garamond)
    for longer headings/subheadings. Regular body copy should NOT get a
    custom fontFamily — leave it on the system font for legibility; instead
    just recolor it.

12. Icons (`Pixel` from `src/components/ui/pixel-icons.tsx`, or
    `@expo/vector-icons`) are low priority — leave their bitmap colors as-is
    unless the icon accepts a `color`/`tintColor` prop, in which case pass
    `isArtDeco ? artDeco.color.gold : undefined` (or the original explicit
    color) so it still works when the prop isn't overridden.

13. Never change component logic, props, function signatures, state, or
    business logic. Only: (a) the two new imports, (b) the
    `const { isArtDeco } = useAppTheme();` line, (c) the new `deco`
    StyleSheet, (d) `isArtDeco && deco.xxx` added into existing `style={...}`
    props (converting a single style prop into an array if it wasn't one
    already), (e) a handful of conditionally-rendered decorative elements
    per points 6, 8, 9 above.

14. If a file has no meaningful visual surface (a pure logic hook, a type
    file, a lib helper) skip it — don't add theming to files with no JSX.

## Reference tokens (`src/theme/artDecoTokens.ts`)

```
artDeco.color.bg        #0d1f1a  deep emerald (screen background)
artDeco.color.bgAlt     #0a1712  darker emerald
artDeco.color.surface   #13291f  card/panel surface
artDeco.color.surface2  #18362c  slightly lighter surface (nested panels)
artDeco.color.line      #c9a047  gold hairline / border / primary accent
artDeco.color.lineSoft  rgba gold 35%   subtle divider lines
artDeco.color.lineFaint rgba gold 16%   inset border on DecoFrame
artDeco.color.ink       #f0e6c8  primary text (cream)
artDeco.color.ink2      #e9d9a0  secondary text (cream, slightly dimmer)
artDeco.color.muted     #b6a97e  muted/help text
artDeco.color.faint     #8a7f5f  faintest text (placeholders)
artDeco.color.gold      #c9a047  == line, used for buttons/icons/emphasis
artDeco.color.goldStrong #e8c876 brighter gold (pressed/hover state)
artDeco.color.goldSoft  rgba gold 14%   tinted background chips
artDeco.color.ruby      #8c2f39  romantic/danger accent (was pink/red)
artDeco.color.rubyStrong #b23b47
artDeco.color.rubySoft  rgba ruby 18%
artDeco.color.emerald   #1c4a3a  secondary surface tint
artDeco.color.go        #7fae6e  success (muted green, not original's bright green)
artDeco.color.warn      #d98c2b  warning (amber)
artDeco.color.stop      #a8434a  error/reject
artDeco.color.black     #05100c
artDeco.color.white     #f7efd8
artDeco.color.overlay   rgba(5,16,12,0.72)   modal backdrop

artDeco.radius.none/xs/sm/md/lg  all 0 -- Art Deco is sharp-cornered, no rounding

artDeco.font.display        CinzelDecorative_700Bold   (short titles/labels only)
artDeco.font.displayBlack   CinzelDecorative_900Black
artDeco.font.displayRegular CinzelDecorative_400Regular
artDeco.font.serif          CormorantGaramond_600SemiBold
artDeco.font.serifRegular   CormorantGaramond_500Medium
artDeco.font.serifBold      CormorantGaramond_700Bold
artDeco.font.serifItalic    CormorantGaramond_600SemiBold_Italic

artDeco.letterSpacingWide     2   (labels/buttons)
artDeco.letterSpacingEyebrow  3   (small uppercase "eyebrow" text)
```

## Worked example

Before (`src/components/games/GameButton.tsx`):
```tsx
const styles = StyleSheet.create({
  button: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  primary: { backgroundColor: '#e11d74' },
});
```

After:
```tsx
import { useAppTheme } from '../../theme/ThemeContext';
import { artDeco } from '../../theme/artDecoTokens';

export function GameButton({ ... }: GameButtonProps) {
  const { isArtDeco } = useAppTheme();
  return (
    <Pressable
      style={[
        styles.button,
        variant === 'secondary' ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        isArtDeco && deco.button,
        isArtDeco && (variant === 'secondary' ? deco.secondary : deco.primary),
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {/* unchanged */}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  primary: { backgroundColor: '#e11d74' },
  // ...rest untouched
});

const deco = StyleSheet.create({
  button: { borderRadius: artDeco.radius.none },
  primary: { backgroundColor: artDeco.color.gold },
  secondary: { borderColor: artDeco.color.gold },
});
```

Text color/font inside the same file follows the identical array-merge
pattern on the `<Text>` elements.

## Checklist per file

- [ ] Original `styles` object is byte-for-byte untouched.
- [ ] New `deco` stylesheet added, imports added, `useAppTheme()` called.
- [ ] Every visually-relevant `style={...}` prop that should change in Art
      Deco mode is now `style={[original, isArtDeco && deco.x]}`.
- [ ] Screen-level root containers render `<ArtDecoBackground />` when
      `isArtDeco` (only for screens, not small components — nesting multiple
      full-screen backgrounds is wasteful).
- [ ] No logic/behavior changed — only styling and the isArtDeco/import
      additions.
- [ ] File still type-checks (`npx tsc --noEmit`).

## Liquid Glass specifics

Everything above applies unchanged with `isLiquidGlass`/`glass` in place of
`isArtDeco`/`deco`. What's different is WHAT the override styles contain --
Art Deco recolors/reshapes; Liquid Glass adds real blur.

- **Tokens**: `src/theme/liquidGlassTokens.ts` (`liquidGlass.color.*`,
  `.radius.*`, `.gradient.*`, `.shadow.*`) -- the equivalent of
  `artDecoTokens.ts`.
- **Screen background**: `<LiquidGlassBackground variant="warm" | "cool" />`
  (`src/theme/components/LiquidGlassBackground.tsx`), mounted the exact same
  way as `<ArtDecoBackground />` (screen-level only, inside a
  `position:relative` wrapper, `{isLiquidGlass && <LiquidGlassBackground />}`).
  Renders a diagonal gradient + two soft radial highlights via
  `react-native-svg` -- glass needs "something to refract" behind it or it
  looks dead (a flat single color).
- **Floating glass panels**: `<GlassSurface>`
  (`src/theme/components/GlassSurface.tsx`) wraps `expo-blur`'s `BlurView` +
  a translucent color wash + a bright hairline border into one component.
  Takes `style` (the outer box -- position/size/margin) and `contentStyle`
  (padding/flex layout for the actual children) as SEPARATE props -- see
  the comment at the top of that file for why they can't be merged (the
  blur/wash/border layers are absolute-fill and would be inset by padding
  otherwise, leaving a visible unblurred seam). Use this whenever you're
  introducing a NEW wrapping surface (a dock, a card, a panel).
- **Retrofitting an EXISTING element's background** (a button, a chip, a
  track) instead of introducing a new wrapper: don't restructure it into
  GlassSurface -- add the blur/wash as extra `StyleSheet.absoluteFill`
  sibling elements rendered as the FIRST children, before the existing
  content, same effect with a smaller diff. Every file this pass touched
  this way (`SwipeToConfirm.tsx`, `HomeScreen.tsx`'s theme toggle and sign
  out button, `FindPartnerModal.tsx`'s buttons via its local `GlassFill`
  helper) follows this shape:
  ```tsx
  <Pressable style={[styles.button, isLiquidGlass && glass.button]}>
    {isLiquidGlass && (
      <>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: liquidGlass.color.glassChipWash, borderRadius: R }]} />
      </>
    )}
    <Text>...</Text>
  </Pressable>
  ```
  The container needs `overflow: 'hidden'` (in its `glass.*` override) for
  the blur to respect rounded corners.
- **The one rule that matters most**: glass is a NAVIGATION-layer material
  (bars, floating buttons, control clusters, dock-style panels) -- never put
  it on CONTENT (game boards, long text, lists of data). Snake's board stays
  a solid card; its D-pad becomes a floating dark-glass control cluster.
  Don't stack two glass surfaces directly on each other either (e.g. the
  Home action dock's individual buttons are plain/transparent text-on-icon,
  not their own nested glass chips, since they already sit on the shared
  glass dock).
- **Smaller nested chips** (mode toggles inside an already-glass panel, a
  segmented control) often don't need real `BlurView` at all -- a flat
  semi-opaque tint (`liquidGlass.color.glassChipWash`) is enough and avoids
  literal glass-on-glass. See `GameScreen.tsx`'s `modeButton` or
  `RemoteControlPanel.tsx`'s mode chips for this lighter treatment.
- **Primary vs. secondary actions**: a primary CTA (Mulai cari pasangan)
  gets a solid, opaque fill in `liquidGlass.color.accentDeep` -- no blur --
  matching iOS 26's `.buttonStyle(.glassProminent)`. Secondary/tertiary
  actions (Bunyikan HP pasangan, torch controls) get the translucent
  `.glass`-style treatment with `BlurView`.
- **Currently reskinned this way**: `HomeScreen.tsx`, `SwipeToConfirm.tsx`,
  `ArcadeScreen.tsx`, `GameScreen.tsx` (the shared shell around every game --
  header, mode toggle, leaderboard card), `GameCard.tsx` (the shared card
  every game renders into), `SnakeGame.tsx` (deep pass: header pills +
  dark-glass D-pad), `FindPartnerModal.tsx` and everything it renders
  (`RemoteControlPanel.tsx`, `RemoteControlAccess.tsx`,
  `SilentRingToggle.tsx`, `BatteryOptimizationNotice.tsx`,
  `CompassArrow.tsx`). Every other screen/game only has Klasik + Art Deco so
  far -- `isLiquidGlass` there is simply never true yet, which is safe
  (falls through to the Klasik look) but not yet visually finished; extend
  the same patterns there in a follow-up pass rather than assuming it's
  done.
