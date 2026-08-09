export type Cell = '' | 'x' | 'o'

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const EMPTY_BOARD: Cell[] = Array(9).fill('')

/** Returns 'x' | 'o' if that mark has a line, 'draw' if the board is full, else null. */
export function checkWinner(board: Cell[]): 'x' | 'o' | 'draw' | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as 'x' | 'o'
    }
  }
  if (board.every((cell) => cell !== '')) return 'draw'
  return null
}
