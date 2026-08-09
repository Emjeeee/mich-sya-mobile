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

// A curated pool of fixed-orientation polyomino shapes (no in-game rotation,
// matching the real Block Blast) — several shapes appear pre-rotated as
// separate entries so the tray still gets orientation variety.
const RAW_SHAPES: [string, [number, number][]][] = [
  ['single', [[0, 0]]],
  ['domino-h', [[0, 0], [0, 1]]],
  ['domino-v', [[0, 0], [1, 0]]],
  ['tromino-i-h', [[0, 0], [0, 1], [0, 2]]],
  ['tromino-i-v', [[0, 0], [1, 0], [2, 0]]],
  ['tromino-l-1', [[0, 0], [1, 0], [1, 1]]],
  ['tromino-l-2', [[0, 0], [0, 1], [1, 0]]],
  ['tromino-l-3', [[0, 0], [0, 1], [1, 1]]],
  ['tromino-l-4', [[1, 0], [1, 1], [0, 1]]],
  ['square-2x2', [[0, 0], [0, 1], [1, 0], [1, 1]]],
  ['tetromino-i-h', [[0, 0], [0, 1], [0, 2], [0, 3]]],
  ['tetromino-i-v', [[0, 0], [1, 0], [2, 0], [3, 0]]],
  ['tetromino-l-1', [[0, 0], [1, 0], [2, 0], [2, 1]]],
  ['tetromino-l-2', [[0, 0], [0, 1], [0, 2], [1, 0]]],
  ['tetromino-l-3', [[0, 0], [0, 1], [1, 1], [2, 1]]],
  ['tetromino-l-4', [[1, 0], [1, 1], [1, 2], [0, 2]]],
  ['tetromino-j-1', [[0, 1], [1, 1], [2, 1], [2, 0]]],
  ['tetromino-j-2', [[0, 0], [1, 0], [1, 1], [1, 2]]],
  ['tetromino-j-3', [[0, 0], [0, 1], [1, 0], [2, 0]]],
  ['tetromino-j-4', [[0, 0], [0, 1], [0, 2], [1, 2]]],
  ['tetromino-t-1', [[0, 0], [0, 1], [0, 2], [1, 1]]],
  ['tetromino-t-2', [[0, 0], [1, 0], [2, 0], [1, 1]]],
  ['tetromino-t-3', [[1, 0], [1, 1], [1, 2], [0, 1]]],
  ['tetromino-t-4', [[0, 1], [1, 0], [1, 1], [2, 1]]],
  ['tetromino-s', [[0, 1], [0, 2], [1, 0], [1, 1]]],
  ['tetromino-z', [[0, 0], [0, 1], [1, 1], [1, 2]]],
  ['square-3x3', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]],
  ['plus', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]],
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

  // 1 point per block placed, plus a quadratic bonus for clearing multiple
  // lines in one placement (1 line = 10, 2 = 40, 3 = 90...) to reward combos.
  const placedScore = piece.cells.length
  const lineScore = linesCleared * linesCleared * 10
  return { grid: next, linesCleared, scoreGained: placedScore + lineScore }
}
