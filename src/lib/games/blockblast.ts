export const GRID_SIZE = 8

// Grid cell values: 0 = empty, 1..N = filled with that color index (see BLOCK_COLORS).
export type Grid = number[][]

export function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
}

export interface TrayPiece {
  shapeId: string
  cells: [number, number][] // [row, col] offsets, normalized so min row/col = 0 — no rotation
  color: number
}

export const BLOCK_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
]

function normalize(cells: [number, number][]): [number, number][] {
  const minRow = Math.min(...cells.map((c) => c[0]))
  const minCol = Math.min(...cells.map((c) => c[1]))
  return cells.map(([r, c]) => [r - minRow, c - minCol])
}

// The exact 10 shapes from the MVP spec (block-blast-mvp-mobile.md section
// 5), fixed-orientation (no in-game rotation) -- deliberately not the larger
// curated pool this used to have (tetrominoes, 3x3 square, plus, S/Z...).
const RAW_SHAPES: [string, [number, number][]][] = [
  ['single', [[0, 0]]],
  ['horizontal-2', [[0, 0], [0, 1]]],
  ['horizontal-3', [[0, 0], [0, 1], [0, 2]]],
  ['vertical-2', [[0, 0], [1, 0]]],
  ['vertical-3', [[0, 0], [1, 0], [2, 0]]],
  ['square', [[0, 0], [0, 1], [1, 0], [1, 1]]],
  ['l', [[0, 0], [1, 0], [1, 1]]],
  ['reverse-l', [[0, 1], [1, 0], [1, 1]]],
  ['t', [[0, 0], [0, 1], [0, 2], [1, 1]]],
  ['z', [[0, 0], [0, 1], [1, 1], [1, 2]]],
]

const SHAPES = RAW_SHAPES.map(([shapeId, cells]) => ({ shapeId, cells: normalize(cells) }))

export function randomPiece(): TrayPiece {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const color = Math.floor(Math.random() * BLOCK_COLORS.length)
  return { shapeId: shape.shapeId, cells: shape.cells, color }
}

export function randomTray(): (TrayPiece | null)[] {
  return [randomPiece(), randomPiece(), randomPiece()]
}

export function canPlace(grid: Grid, piece: TrayPiece, row: number, col: number): boolean {
  for (const [dr, dc] of piece.cells) {
    const r = row + dr
    const c = col + dc
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false
    if (grid[r][c] !== 0) return false
  }
  return true
}

export function canPlaceAnywhere(grid: Grid, piece: TrayPiece): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlace(grid, piece, r, c)) return true
    }
  }
  return false
}

export function isGameOver(grid: Grid, tray: (TrayPiece | null)[]): boolean {
  return tray.every((p) => !p || !canPlaceAnywhere(grid, p))
}

export interface PlaceResult {
  grid: Grid
  linesCleared: number
  scoreGained: number
}

export function placePiece(grid: Grid, piece: TrayPiece, row: number, col: number): PlaceResult | null {
  if (!canPlace(grid, piece, row, col)) return null
  const next = grid.map((r) => [...r])
  for (const [dr, dc] of piece.cells) {
    next[row + dr][col + dc] = piece.color + 1
  }

  const fullRows: number[] = []
  const fullCols: number[] = []
  for (let r = 0; r < GRID_SIZE; r++) {
    if (next[r].every((v) => v !== 0)) fullRows.push(r)
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (next.every((row) => row[c] !== 0)) fullCols.push(c)
  }

  const linesCleared = fullRows.length + fullCols.length
  for (const r of fullRows) next[r] = Array(GRID_SIZE).fill(0)
  for (const c of fullCols) {
    for (let r = 0; r < GRID_SIZE; r++) next[r][c] = 0
  }

  // 1 point per block placed (spec section 14 "Placement"). Line-clear bonus
  // matches the spec's table exactly (1=10, 2=30, 3=60, 4=100) via the
  // triangular-number formula 10*n*(n+1)/2, which reproduces that table for
  // n=1..4 and extends sensibly for a placement that completes more lines.
  const placedScore = piece.cells.length
  const lineScore = (10 * linesCleared * (linesCleared + 1)) / 2
  return { grid: next, linesCleared, scoreGained: placedScore + lineScore }
}
