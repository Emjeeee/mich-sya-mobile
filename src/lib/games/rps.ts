export type Move = 'rock' | 'paper' | 'scissors'

export const MOVES: { key: Move; emoji: string; label: string }[] = [
  { key: 'rock', emoji: '✊', label: 'Batu' },
  { key: 'paper', emoji: '✋', label: 'Kertas' },
  { key: 'scissors', emoji: '✌️', label: 'Gunting' },
]

const BEATS: Record<Move, Move> = { rock: 'scissors', paper: 'rock', scissors: 'paper' }

/** Returns 'a' | 'b' | 'draw' from a's perspective. */
export function roundWinner(a: Move, b: Move): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw'
  return BEATS[a] === b ? 'a' : 'b'
}
