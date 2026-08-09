export const MAX_WRONG = 6
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function maskWord(word: string, guessed: string[]): string {
  return word
    .split('')
    .map((ch) => (ch === ' ' ? ' ' : guessed.includes(ch) ? ch : '_'))
    .join(' ')
}

export function wrongGuessCount(word: string, guessed: string[]): number {
  return guessed.filter((g) => !word.includes(g)).length
}

export function isWordGuessed(word: string, guessed: string[]): boolean {
  return word.split('').every((ch) => ch === ' ' || guessed.includes(ch))
}
