export const TARGET_SCORE = 30

export function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

export const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
