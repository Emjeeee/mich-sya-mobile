export const GRID_SIZE = 8

// Grid cell values: 0 = empty, 1..N = filled with that color index (see
// blockblastThemes.ts's BlockTheme.blocks).
export type Grid = number[][]

export function emptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
}

export interface TrayPiece {
  shapeId: string
  cells: [number, number][] // [row, col] offsets, normalized so min row/col = 0 — no rotation
  color: number
}

// Color count only -- the actual hex values live per-theme in
// blockblastThemes.ts (BlockTheme.blocks), since this module stays
// presentation-free.
export const BLOCK_COLOR_COUNT = 6

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
  const color = Math.floor(Math.random() * BLOCK_COLOR_COUNT)
  return { shapeId: shape.shapeId, cells: shape.cells, color }
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

// Uniform-random piece selection (the old randomTray's whole behavior) had
// no connection to the current board at all, which could hand out a tray
// that's a poor match for the board state -- reported directly as feeling
// unfairly hard compared to the real game, where "the blocks provided are
// expected to be able to complete the round" with good play, not blocked by
// unlucky RNG. Resampling a few times and keeping the first candidate that
// fits somewhere biases toward a usable tray without making it deterministic
// or removing challenge -- a full board still eventually runs out of places
// to put even a biased piece, so isGameOver can still fire legitimately.
const PLACEABLE_BIAS_ATTEMPTS = 6

function biasedPiece(grid: Grid): TrayPiece {
  let candidate = randomPiece()
  for (let attempt = 0; attempt < PLACEABLE_BIAS_ATTEMPTS; attempt++) {
    if (canPlaceAnywhere(grid, candidate)) return candidate
    candidate = randomPiece()
  }
  return candidate
}

// `grid` is optional (defaults to an empty board) so every existing call
// site -- the initial tray on game start/reset, before any grid exists yet
// -- keeps working unchanged; the bias only matters once the board actually
// has content, since canPlaceAnywhere on an empty board is trivially true
// for every shape anyway.
export function randomTray(grid: Grid = emptyGrid()): (TrayPiece | null)[] {
  const tray = [biasedPiece(grid), biasedPiece(grid), biasedPiece(grid)]
  // Last-resort safety net: if bad luck still left every biased pick
  // unplaceable (vanishingly unlikely, but possible on a nearly-full
  // board), force one single-cell piece in -- the only shape that can be
  // unplaceable is a completely full board, which is already a legitimate
  // game over regardless of what the tray contains.
  if (tray.every((p) => !canPlaceAnywhere(grid, p))) {
    tray[0] = { shapeId: 'single', cells: [[0, 0]], color: Math.floor(Math.random() * BLOCK_COLOR_COUNT) }
  }
  return tray
}

export function isGameOver(grid: Grid, tray: (TrayPiece | null)[]): boolean {
  return tray.every((p) => !p || !canPlaceAnywhere(grid, p))
}

export interface PlaceResult {
  grid: Grid // final board, cleared lines already removed
  filledGrid: Grid // board with the piece placed, BEFORE clearing -- the "about to clear" flash frame
  placedCells: [number, number][] // absolute [row,col] of the cells just placed
  clearedRows: number[]
  clearedCols: number[]
  linesCleared: number // = clearedRows.length + clearedCols.length
  scoreGained: number
  perfectClear: boolean // this placement emptied the entire board
}

export function placePiece(grid: Grid, piece: TrayPiece, row: number, col: number): PlaceResult | null {
  if (!canPlace(grid, piece, row, col)) return null

  const filled = grid.map((r) => [...r])
  const placedCells: [number, number][] = []
  for (const [dr, dc] of piece.cells) {
    filled[row + dr][col + dc] = piece.color + 1
    placedCells.push([row + dr, col + dc])
  }

  const clearedRows: number[] = []
  const clearedCols: number[] = []
  for (let r = 0; r < GRID_SIZE; r++) {
    if (filled[r].every((v) => v !== 0)) clearedRows.push(r)
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (filled.every((row) => row[c] !== 0)) clearedCols.push(c)
  }

  // Separate copy from `filled` -- the component renders both, at different
  // moments (filled as the pre-clear flash frame, next as the real board),
  // so they must not alias.
  const next = filled.map((r) => [...r])
  for (const r of clearedRows) next[r] = Array(GRID_SIZE).fill(0)
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) next[r][c] = 0
  }

  const linesCleared = clearedRows.length + clearedCols.length

  // 1 point per block placed (spec section 14 "Placement"). Line-clear bonus
  // matches the spec's table exactly (1=10, 2=30, 3=60, 4=100) via the
  // triangular-number formula 10*n*(n+1)/2, which reproduces that table for
  // n=1..4 and extends sensibly for a placement that completes more lines.
  const placedScore = piece.cells.length
  const lineScore = (10 * linesCleared * (linesCleared + 1)) / 2

  // A placement always fills at least one cell, so an all-empty board here
  // can only mean the clear above wiped everything -- no need to also
  // require linesCleared > 0.
  const perfectClear = next.every((r) => r.every((v) => v === 0))

  return {
    grid: next,
    filledGrid: filled,
    placedCells,
    clearedRows,
    clearedCols,
    linesCleared,
    scoreGained: placedScore + lineScore,
    perfectClear,
  }
}
