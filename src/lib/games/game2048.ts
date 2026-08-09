export type Grid = number[][]

export function emptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0))
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row])
}

export function addRandomTile(g: Grid): void {
  const empties: [number, number][] = []
  g.forEach((row, y) => row.forEach((v, x) => v === 0 && empties.push([y, x])))
  if (empties.length === 0) return
  const [y, x] = empties[Math.floor(Math.random() * empties.length)]
  g[y][x] = Math.random() < 0.9 ? 2 : 4
}

function slideLeft(grid: Grid): { grid: Grid; gained: number; moved: boolean } {
  let gained = 0
  let moved = false
  const next = grid.map((row, rowIndex) => {
    const nums = row.filter((n) => n !== 0)
    for (let i = 0; i < nums.length - 1; i++) {
      if (nums[i] === nums[i + 1]) {
        nums[i] *= 2
        gained += nums[i]
        nums[i + 1] = 0
      }
    }
    const merged = nums.filter((n) => n !== 0)
    while (merged.length < 4) merged.push(0)
    if (merged.some((v, i) => v !== grid[rowIndex][i])) moved = true
    return merged
  })
  return { grid: next, gained, moved }
}

function rotateClockwise(g: Grid): Grid {
  const result = emptyGrid()
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) result[x][3 - y] = g[y][x]
  return result
}

export function move(grid: Grid, dir: 'left' | 'right' | 'up' | 'down') {
  const rotations = dir === 'up' ? 3 : dir === 'right' ? 2 : dir === 'down' ? 1 : 0
  let g = cloneGrid(grid)
  for (let i = 0; i < rotations; i++) g = rotateClockwise(g)
  const { grid: slid, gained, moved } = slideLeft(g)
  let result = slid
  for (let i = 0; i < (4 - rotations) % 4; i++) result = rotateClockwise(result)
  return { grid: result, gained, moved }
}

export function isGameOver(g: Grid): boolean {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (g[y][x] === 0) return false
      if (x < 3 && g[y][x] === g[y][x + 1]) return false
      if (y < 3 && g[y][x] === g[y + 1][x]) return false
    }
  }
  return true
}

export const TILE_COLORS: Record<number, string> = {
  2: 'bg-secondary/30 text-text',
  4: 'bg-secondary/50 text-text',
  8: 'bg-accent/60 text-white',
  16: 'bg-accent text-white',
  32: 'bg-primary/70 text-onPrimary',
  64: 'bg-primary text-onPrimary',
  128: 'bg-primary text-onPrimary',
  256: 'bg-primary text-onPrimary',
  512: 'bg-primary text-onPrimary',
  1024: 'bg-primary text-onPrimary',
  2048: 'bg-primary text-onPrimary',
}
