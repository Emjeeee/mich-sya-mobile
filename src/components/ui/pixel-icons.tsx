// Ported from the web app's src/components/ui/pixel-icons.tsx -- same 8x8
// bitmap icon set, rendered with react-native-svg instead of raw <svg>/<rect>
// DOM tags. Keep bitmap defs in sync with the web version when adding icons.
import Svg, { Rect, type SvgProps } from 'react-native-svg';

type Bitmap = string[]; // 8 rows of 8 chars; '.' is empty, any other char is a filled cell
type Palette = Record<string, string>;

function PixelIcon({
  bitmap,
  palette,
  size = 24,
  color,
  ...props
}: { bitmap: Bitmap; palette?: Palette; size?: number; color?: string } & Omit<SvgProps, 'children'>) {
  const gridSize = bitmap.length;
  const cells: { x: number; y: number; fill: string }[] = [];
  bitmap.forEach((row, y) => {
    row.split('').forEach((c, x) => {
      if (c !== '.') cells.push({ x, y, fill: palette?.[c] ?? color ?? '#000000' });
    });
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${gridSize} ${gridSize}`} {...props}>
      {cells.map((c) => (
        <Rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={c.fill} />
      ))}
    </Svg>
  );
}

type IconDef = { bitmap: Bitmap; palette?: Palette };
function def(bitmap: Bitmap, palette?: Palette): IconDef {
  return { bitmap, palette };
}

const ICONS = {
  home: def(
    ['...XX...', '..XXXX..', '.XXXXXX.', 'XXXXXXXX', 'XX.XX.XX', 'XX.XX.XX', 'XX....XX', 'XX....XX'],
    { X: '#f97316' }
  ),
  heart: def(
    ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...', '........'],
    { X: '#f43f5e' }
  ),
  camera: def(
    ['........', '.XX.....', 'XXXXXXXX', 'X.XXXX.X', 'X.X..X.X', 'X.XXXX.X', 'XXXXXXXX', '........'],
    { X: '#475569' }
  ),
  image: def(
    ['XXXXXXXX', 'X......X', 'X..XX..X', 'X......X', 'X....X.X', 'X..X.XXX', 'X.XXXXXX', 'XXXXXXXX'],
    { X: '#38bdf8' }
  ),
  calendar: def(
    ['.X.XX.X.', 'XXXXXXXX', 'XXXXXXXX', 'X......X', 'X.X..X.X', 'X......X', 'X.X..X.X', 'XXXXXXXX'],
    { X: '#3b82f6' }
  ),
  envelope: def(
    ['XXXXXXXX', 'XX....XX', 'X.X..X.X', 'X..XX..X', 'X......X', 'X......X', 'X......X', 'XXXXXXXX'],
    { X: '#eab308' }
  ),
  target: def(
    ['..XXXX..', '.X....X.', 'X.XXXX.X', 'X.X..X.X', 'X.X..X.X', 'X.XXXX.X', '.X....X.', '..XXXX..'],
    { X: '#ef4444' }
  ),
  map: def(
    ['..XXXX..', '.X....X.', 'X..XX..X', 'X..XX..X', '.X....X.', '..XXXX..', '...XX...', '...XX...'],
    { X: '#22c55e' }
  ),
  dice: def(
    ['XXXXXXXX', 'X......X', 'X.X..X.X', 'X......X', 'X..XX..X', 'X......X', 'X.X..X.X', 'XXXXXXXX'],
    { X: '#8b5cf6' }
  ),
  gamepad: def(
    ['.XX..XX.', 'XXXXXXXX', 'X.X..X.X', 'X......X', 'X......X', 'X.X..X.X', 'XXXXXXXX', '........'],
    { X: '#6366f1' }
  ),
  gear: def(
    ['.X.XX.X.', 'XXXXXXXX', 'X.XXXX.X', 'XX.XX.XX', 'XX.XX.XX', 'X.XXXX.X', 'XXXXXXXX', '.X.XX.X.'],
    { X: '#64748b' }
  ),
  dots: def(['........', '........', 'XX.XX.XX', 'XX.XX.XX', '........', '........', '........', '........']),
  chevronLeft: def(['....XX..', '...XX...', '..XX....', '.XX.....', '..XX....', '...XX...', '....XX..', '........']),
  chevronRight: def(['..XX....', '...XX...', '....XX..', '.....XX.', '....XX..', '...XX...', '..XX....', '........']),
  eye: def(['........', '..XXXX..', '.X....X.', 'X..XX..X', 'X..XX..X', '.X....X.', '..XXXX..', '........']),
  eyeOff: def(['.......X', '..XXXXX.', '.X...XX.', 'X..XX..X', 'X..XX..X', '.XX...X.', '.XXXXX..', 'X.......']),
  compass: def(['...XX...', '..X..X..', '.X....X.', 'X..XX..X', 'X..XX..X', '.X....X.', '..X..X..', '...XX...']),
  sun: def(
    ['X.X..X.X', '.X.XX.X.', '..XXXX..', 'XXXXXXXX', 'XXXXXXXX', '..XXXX..', '.X.XX.X.', 'X.X..X.X'],
    { X: '#fbbf24' }
  ),
  moon: def(
    ['...XXX..', '..XXXXX.', '.XXXXXX.', 'XXXXXXX.', 'XXXXXXX.', '.XXXXXX.', '..XXXXX.', '...XXX..'],
    { X: '#818cf8' }
  ),
  logout: def(['XX......', 'XX...XX.', 'XX..XXXX', 'XXXXXXXX', 'XX..XXXX', 'XX...XX.', 'XX......', '........']),
  grid3: def(
    ['........', 'XX.XX.XX', 'XX.XX.XX', '........', 'XX.XX.XX', 'XX.XX.XX', '........', '........'],
    { X: '#14b8a6' }
  ),
  cards: def(
    ['.XXXXXX.', '.X....X.', '.X....X.', 'XXXXXXX.', 'X.....X.', 'X.....X.', 'XXXXXXX.', '........'],
    { X: '#ec4899' }
  ),
  connect4: def(
    ['Y.R.Y.R.', 'Y.R.Y.R.', '........', 'R.Y.R.Y.', 'R.Y.R.Y.', '........', 'Y.R.Y.R.', 'Y.R.Y.R.'],
    { Y: '#eab308', R: '#ef4444' }
  ),
  hand: def(
    ['..XX.XX.', '..XX.XX.', '.XXXXXXX', '.XXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'],
    { X: '#f59e0b' }
  ),
  tile2048: def(
    ['XXXXXXXX', 'X......X', 'X.XXXX.X', 'X.X..X.X', 'X.X..X.X', 'X.XXXX.X', 'X......X', 'XXXXXXXX'],
    { X: '#fb923c' }
  ),
  snake: def(
    ['XX......', 'XX......', 'XXXXXX..', '.....X..', '.....X..', '..XXXX..', '..X.....', '..X.....'],
    { X: '#22c55e' }
  ),
  pad4: def(
    ['.GGGG...', 'GGGGGG..', 'GGGGGG..', '.GGGG...', '...RRRR.', '..RRRRRR', '..RRRRRR', '...RRRR.'],
    { G: '#22c55e', R: '#ef4444' }
  ),
  mallet: def(
    ['..XXXXX.', '.XXXXXXX', '.XXXXXXX', '..XXXXX.', '....XX..', '....XX..', '....XX..', '...XXXX.'],
    { X: '#b91c1c' }
  ),
  bolt: def(
    ['....XX..', '...XX...', '..XX....', '.XXXXXX.', '....XX..', '...XX...', '..XX....', '.XX.....'],
    { X: '#facc15' }
  ),
  question: def(
    ['.XXXXX..', 'XX...XX.', '....XX..', '...XX...', '..XX....', '..XX....', '........', '..XX....'],
    { X: '#6366f1' }
  ),
  letters: def(
    ['........', 'XX.XX.XX', 'XX.XX.XX', '........', 'XX.XX.XX', 'XX.XX.XX', '........', '........'],
    { X: '#f472b6' }
  ),
  quizface: def(
    ['..XXXX..', '.X....X.', 'X.X..X.X', 'X......X', 'X.XXXX.X', 'X......X', '.X....X.', '..XXXX..'],
    { X: '#fbbf24' }
  ),
  puzzlepiece: def(
    ['.XXXX...', 'XXXXXX..', 'XXXXXXXX', '.XXXXXXX', '..XXXXXX', 'XXXXXXXX', '..XXXX..', '........'],
    { X: '#34d399' }
  ),
  gallows: def(
    ['XXXXXXX.', 'X.......', 'X.......', 'X..XX...', 'X..XX...', 'X.XXXX..', 'X.......', 'XXXXXXX.'],
    { X: '#78716c' }
  ),
  brain: def(
    ['.XXX.XX.', 'XXXXXXXX', 'X.XX.XXX', 'XXXXXXXX', 'X.XX.XXX', 'XXXXXXXX', '.XX.XXX.', '..XXXX..'],
    { X: '#a855f7' }
  ),
  spinner: def(
    ['..XXXX..', '.X....X.', 'X..XX..X', 'X..XX..X', 'X..XX..X', 'X......X', '.X....X.', '..XXXX..'],
    { X: '#fb7185' }
  ),
  fork: def(
    ['..X..X..', '..X..X..', '..X..X..', '..XXXX..', '...XX...', '...XX...', '...XX...', '...XX...'],
    { X: '#94a3b8' }
  ),
  tap: def(
    ['...XX...', '...XX...', '...XX...', '..XXXX..', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '........'],
    { X: '#22d3ee' }
  ),
  palette: def(
    ['.XXXXX..', 'X.....X.', 'X.XX..X.', 'X......X', 'X..XX.XX', 'X......X', '.X....X.', '..XXXX..'],
    { X: '#a78bfa' }
  ),
  check: def(['.......X', '......XX', '.....XX.', 'X...XX..', 'XX.XX...', '.XXX....', '..X.....', '........']),
  edit: def(['.....XXX', '....XX..', '...XX...', '.XX.XX..', 'XX.XX...', 'XXXX....', 'X.XX....', 'XXXX....']),
  list: def(['X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXXXXX', '........', 'X.XXXXXX', '........']),
  chatbubble: def(
    ['.XXXXXX.', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', '..XX....', '.X......'],
    { X: '#06b6d4' }
  ),
  mic: def(['..XXXX..', '.XXXXXX.', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '.XXXXXX.', '...XX...', '..XXXX..']),
  attach: def(['....XX..', '...X..X.', '..X....X', '..X.XX.X', '..X.X..X', '..X.XX..', '...XX...', '........']),
  send: def(['X.......', 'XXX.....', 'XXXXX...', 'XXXXXXX.', 'XXXXX...', 'XXX.....', 'X.......', '........']),
  search: def(['.XXX....', 'X...X...', 'X...X...', 'X...X...', '.XXX.X..', '.....XX.', '......X.', '........']),
} satisfies Record<string, IconDef>;

export type PixelIconName = keyof typeof ICONS;

function make(name: PixelIconName) {
  return function Icon(props: Omit<SvgProps, 'children'> & { size?: number; color?: string }) {
    return <PixelIcon bitmap={ICONS[name].bitmap} palette={ICONS[name].palette} {...props} />;
  };
}

/** Generic entry point -- pass any icon name (e.g. from the game registry). */
export function Pixel({
  name,
  ...props
}: { name: PixelIconName } & Omit<SvgProps, 'children'> & { size?: number; color?: string }) {
  return <PixelIcon bitmap={ICONS[name].bitmap} palette={ICONS[name].palette} {...props} />;
}

export const HomeIcon = make('home');
export const HeartIcon = make('heart');
export const CameraIcon = make('camera');
export const ImageIcon = make('image');
export const CalendarIcon = make('calendar');
export const EnvelopeIcon = make('envelope');
export const TargetIcon = make('target');
export const MapIcon = make('map');
export const DiceIcon = make('dice');
export const GamepadIcon = make('gamepad');
export const GearIcon = make('gear');
export const DotsIcon = make('dots');
export const ChevronLeftIcon = make('chevronLeft');
export const ChevronRightIcon = make('chevronRight');
export const SunPixelIcon = make('sun');
export const MoonPixelIcon = make('moon');
export const LogoutPixelIcon = make('logout');
export const CheckIcon = make('check');
export const EditIcon = make('edit');
export const ListIcon = make('list');
export const ChatBubbleIcon = make('chatbubble');
export const MicIcon = make('mic');
export const AttachIcon = make('attach');
export const SendIcon = make('send');
export const SearchIcon = make('search');
export const PaletteIcon = make('palette');
export const EyeIcon = make('eye');
export const EyeOffIcon = make('eyeOff');
export const CompassIcon = make('compass');
