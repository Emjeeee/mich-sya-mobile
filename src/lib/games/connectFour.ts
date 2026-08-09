export type Cell = '' | 'x' | 'o'

export const COLS = 7
export const ROWS = 6

export const EMPTY_BOARD: Cell[] = Array(COLS * ROWS).fill('')

/** Drops a disc into a column; returns the new board, or null if the column is full. */
export function dropDisc(board: Cell[], col: number, mark: Cell): Cell[] | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    const i = row * COLS + col
    if (board[i] === '') {
      const next = [...board]
      next[i] = mark
      return next
    }
  }
  return null
}

export function checkWinner(board: Cell[]): 'x' | 'o' | 'draw' | null {
  const at = (row: number, col: number) => board[row * COLS + col]

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const mark = at(row, col)
      if (!mark) continue
      // right, down, down-right, down-left
      const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]
      for (const [dr, dc] of dirs) {
        let count = 1
        for (let step = 1; step < 4; step++) {
          const r = row + dr * step
          const c = col + dc * step
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || at(r, c) !== mark) break
          count++
        }
        if (count === 4) return mark
      }
    }
  }

  if (board.every((c) => c !== '')) return 'draw'
  return null
}
