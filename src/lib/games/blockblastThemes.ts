// Palettes swapped in as a reward for a Perfect Clear (emptying the whole
// 8x8 board), matching the real game's "theme pack" feel. Not user-
// selectable by design -- it's a celebratory event triggered by play, not a
// settings screen.
export interface BlockTheme {
  id: string
  name: string
  boardBg: string // grid container behind the cells
  emptyCell: string // unfilled cell fill
  gridLine: string // per-cell border
  accent: string // score text + banner + perfect-clear wash
  // Tuple, not string[], so every theme is required to cover all 6 block
  // color indices randomPiece() can produce.
  blocks: readonly [string, string, string, string, string, string]
}

export const THEMES: readonly BlockTheme[] = [
  {
    // Index 0 = today's exact look, so a player who never gets a perfect
    // clear sees no change at all.
    id: 'blossom',
    name: 'Blossom',
    boardBg: '#eeeeee',
    emptyCell: '#f7f7f7',
    gridLine: '#ffffff',
    accent: '#e11d74',
    blocks: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'],
  },
  {
    id: 'senja',
    name: 'Senja',
    boardBg: '#2b1b3d',
    emptyCell: '#3b2752',
    gridLine: '#241634',
    accent: '#ff6b9d',
    blocks: ['#ff6b6b', '#ff9f43', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff'],
  },
  {
    id: 'laut',
    name: 'Laut',
    boardBg: '#0f2b3d',
    emptyCell: '#17415a',
    gridLine: '#0b2130',
    accent: '#2ec4b6',
    blocks: ['#ff5d8f', '#ffa62b', '#ffe066', '#2ec4b6', '#4895ef', '#9d4edd'],
  },
  {
    id: 'hutan',
    name: 'Hutan',
    boardBg: '#dff0e5',
    emptyCell: '#eef8f0',
    gridLine: '#ffffff',
    accent: '#2a9d8f',
    blocks: ['#e5533d', '#f08c00', '#e9c46a', '#2a9d8f', '#457b9d', '#7b6ef6'],
  },
  {
    id: 'malam',
    name: 'Malam',
    boardBg: '#12121c',
    emptyCell: '#1f1f2e',
    gridLine: '#0c0c14',
    accent: '#b197fc',
    blocks: ['#ff3864', '#ff8c42', '#ffe14d', '#3ddc84', '#4dabf7', '#b197fc'],
  },
]
