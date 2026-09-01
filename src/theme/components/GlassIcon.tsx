// SF-Symbol-style line icons for the Liquid Glass theme -- the rest of the
// app uses PNG bitmaps (assets/icons/*.png) and the pixel-art `Pixel` set
// (src/components/ui/pixel-icons.tsx), both intentionally colorful/chunky
// for the Klasik/gamify look. Liquid Glass wants the opposite: consistent
// single-color stroke icons, matching what was approved in the design
// canvas (the same path data as HomeGlass.dc.html's dock icons, so the
// shipped look matches what was reviewed). Only rendered when
// `isLiquidGlass` -- Klasik/Art Deco keep their existing icons untouched.
import Svg, { Circle, Path } from 'react-native-svg';

interface GlassIconProps {
  size?: number;
  color?: string;
}

const STROKE_PROPS = {
  fill: 'none' as const,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SparkleIcon({ size = 20, color = '#9c1257' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill={color} />
    </Svg>
  );
}

export function CameraIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M3 7H21V20H3V7Z" />
      <Path d="M8 7L9.5 4.5H14.5L16 7" />
      <Circle cx={12} cy={13.5} r={3.2} />
    </Svg>
  );
}

export function TargetIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={4.5} />
      <Circle cx={12} cy={12} r={1} fill={color} />
    </Svg>
  );
}

export function CompassIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M15 9L13 13L9 15L11 11Z" fill={color} stroke="none" />
    </Svg>
  );
}

export function MapPinIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M12 21C12 21 5 14.5 5 9.5C5 5.9 8.13 3 12 3C15.87 3 19 5.9 19 9.5C19 14.5 12 21 12 21Z" />
      <Circle cx={12} cy={9.5} r={2.3} />
    </Svg>
  );
}

export function HeartIcon({ size = 22, color = '#e11d74' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20C12 20 3.5 14.5 3.5 8.7C3.5 5.9 5.7 4 8.2 4C9.8 4 11.2 4.9 12 6.2C12.8 4.9 14.2 4 15.8 4C18.3 4 20.5 5.9 20.5 8.7C20.5 14.5 12 20 12 20Z"
        fill={color}
      />
    </Svg>
  );
}

export function GamepadIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M6 9H18C20 9 21 10.8 21 13C21 15.5 19.5 16.5 18 15.5L16 14H8L6 15.5C4.5 16.5 3 15.5 3 13C3 10.8 4 9 6 9Z" />
      <Circle cx={17} cy={12} r={0.8} fill={color} stroke="none" />
      <Circle cx={15} cy={14} r={0.8} fill={color} stroke="none" />
    </Svg>
  );
}

export function SettingsIcon({ size = 22, color = '#7a2b52' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" stroke={color} fill="none">
      <Path d="M4 7H20M4 12H20M4 17H20" />
      <Circle cx={9} cy={7} r={1.6} fill="#fff" stroke={color} />
      <Circle cx={16} cy={12} r={1.6} fill="#fff" stroke={color} />
      <Circle cx={10} cy={17} r={1.6} fill="#fff" stroke={color} />
    </Svg>
  );
}

export function SpeakerIcon({ size = 18, color = '#fff' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M4 9V15H8L13 19V5L8 9H4Z" fill={color} stroke="none" />
      <Path d="M16.5 8.5C17.5 9.7 18 11.1 18 12.5C18 13.9 17.5 15.3 16.5 16.5" />
      <Path d="M19 6C20.6 7.8 21.5 10.1 21.5 12.5C21.5 14.9 20.6 17.2 19 19" />
    </Svg>
  );
}

export function SpeakerMuteIcon({ size = 18, color = '#fff' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M4 9V15H8L13 19V5L8 9H4Z" fill={color} stroke="none" />
      <Path d="M16 9L21 15M21 9L16 15" />
    </Svg>
  );
}

export function VibrateIcon({ size = 18, color = '#fff' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M8 5H16C16.55 5 17 5.45 17 6V18C17 18.55 16.55 19 16 19H8C7.45 19 7 18.55 7 18V6C7 5.45 7.45 5 8 5Z" />
      <Path d="M2 9V15M22 9V15" />
    </Svg>
  );
}

export function BellIcon({ size = 15, color = '#4a2b3d' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M6 10C6 6.7 8.7 4 12 4C15.3 4 18 6.7 18 10V14L20 17H4L6 14V10Z" />
      <Path d="M10 20C10 21.1 10.9 22 12 22C13.1 22 14 21.1 14 20" />
    </Svg>
  );
}

export function MusicNoteIcon({ size = 15, color = '#4a2b3d' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M9 18V5L20 3V16" />
      <Circle cx={6.5} cy={18} r={2.5} />
      <Circle cx={17.5} cy={16} r={2.5} />
    </Svg>
  );
}

export function AlarmClockIcon({ size = 15, color = '#4a2b3d' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Circle cx={12} cy={13} r={8} />
      <Path d="M12 9V13L15 15" />
      <Path d="M5 4L2 7M19 4L22 7" />
    </Svg>
  );
}

export function FlashlightIcon({ size = 18, color = '#4a2b3d' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...STROKE_PROPS} stroke={color}>
      <Path d="M8 2H16L15 8H17V10L9 22V14H7V10L9 8H8V2Z" />
    </Svg>
  );
}

export function StopIcon({ size = 18, color = '#4a2b3d' }: GlassIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5H19V19H5V5Z" fill={color} />
    </Svg>
  );
}
