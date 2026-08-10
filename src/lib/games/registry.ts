import { ColorMatchGame } from '../../components/games/ColorMatchGame';
import { ComingSoonGame } from '../../components/games/ComingSoonGame';
import { ConnectFourLocal } from '../../components/games/ConnectFourLocal';
import { ConnectFourOnline } from '../../components/games/ConnectFourOnline';
import { DiceBattleLocal } from '../../components/games/DiceBattleLocal';
import { DiceBattleOnline } from '../../components/games/DiceBattleOnline';
import { EmojiQuizGame } from '../../components/games/EmojiQuizGame';
import { HangmanLocal } from '../../components/games/HangmanLocal';
import { HangmanOnline } from '../../components/games/HangmanOnline';
import { MemoryMatchGame } from '../../components/games/MemoryMatchGame';
import { NumberGuessGame } from '../../components/games/NumberGuessGame';
import { NumberGuessOnline } from '../../components/games/NumberGuessOnline';
import { ReactionDuelGame } from '../../components/games/ReactionDuelGame';
import { RockPaperScissorsLocal } from '../../components/games/RockPaperScissorsLocal';
import { RockPaperScissorsOnline } from '../../components/games/RockPaperScissorsOnline';
import { SimonSaysGame } from '../../components/games/SimonSaysGame';
import { SlidingPuzzleGame } from '../../components/games/SlidingPuzzleGame';
import { TapBattleGame } from '../../components/games/TapBattleGame';
import { TapBattleOnline } from '../../components/games/TapBattleOnline';
import { TicTacToeLocal } from '../../components/games/TicTacToeLocal';
import { TicTacToeOnline } from '../../components/games/TicTacToeOnline';
import { TriviaDuelLocal } from '../../components/games/TriviaDuelLocal';
import { TriviaDuelOnline } from '../../components/games/TriviaDuelOnline';
import { TruthOrDareGame } from '../../components/games/TruthOrDareGame';
import { TruthOrDareOnline } from '../../components/games/TruthOrDareOnline';
import { WhackAMoleGame } from '../../components/games/WhackAMoleGame';
import { WordScrambleGame } from '../../components/games/WordScrambleGame';
import { WouldYouRatherGame } from '../../components/games/WouldYouRatherGame';
import { WouldYouRatherOnline } from '../../components/games/WouldYouRatherOnline';
import type { GameDef } from './types';

// Mirrors the web app's src/lib/games/registry.ts (same 21 games, same
// keys/titles/descriptions/icons/scoreMode so game_scores/game_sessions rows
// are shared between the two apps). Games not yet ported point at
// ComingSoonGame -- see plan batches 2-4.
export const GAMES: GameDef[] = [
  {
    key: 'tictactoe',
    title: 'Tic-Tac-Toe',
    description: 'Klasik tapi seru — main satu HP gantian, atau online dari device masing-masing.',
    icon: 'grid3',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: TicTacToeLocal,
    OnlineComponent: TicTacToeOnline,
  },
  {
    key: 'connectfour',
    title: 'Connect Four',
    description: 'Susun 4 keping sejajar duluan buat menang.',
    icon: 'connect4',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: ConnectFourLocal,
    OnlineComponent: ConnectFourOnline,
  },
  {
    key: 'rps',
    title: 'Batu Gunting Kertas',
    description: 'Best of 5 — siapa yang lebih jago baca gerakan pasangan?',
    icon: 'hand',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: RockPaperScissorsLocal,
    OnlineComponent: RockPaperScissorsOnline,
  },
  {
    key: 'hangman',
    title: 'Tebak Kata',
    description: 'Satu pasang bikin kata rahasia, satunya nebak sebelum kesempatan habis.',
    icon: 'gallows',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: HangmanLocal,
    OnlineComponent: HangmanOnline,
  },
  {
    key: 'dice',
    title: 'Adu Dadu',
    description: 'Gantian lempar dadu, pertama sampai skor 30 menang.',
    icon: 'dice',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: DiceBattleLocal,
    OnlineComponent: DiceBattleOnline,
  },
  {
    key: 'trivia',
    title: 'Duel Trivia',
    description: 'Jawab pertanyaan gantian, pertama sampai 5 benar menang.',
    icon: 'brain',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: TriviaDuelLocal,
    OnlineComponent: TriviaDuelOnline,
  },
  {
    key: 'memory',
    title: 'Kartu Jodoh',
    description: 'Cocokkan pasangan kartu secepat mungkin — main bareng satu layar.',
    icon: 'cards',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'asc',
    scoreUnit: ' langkah',
    LocalComponent: MemoryMatchGame,
  },
  {
    key: '2048',
    title: '2048',
    description: 'Gabungkan angka sampai ke 2048 (atau lebih).',
    icon: 'tile2048',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    LocalComponent: ComingSoonGame,
    implemented: false,
  },
  {
    key: 'snake',
    title: 'Ular Klasik',
    description: 'Makan sebanyak mungkin tanpa nabrak diri sendiri.',
    icon: 'snake',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' panjang',
    LocalComponent: ComingSoonGame,
    implemented: false,
  },
  {
    key: 'simon',
    title: 'Simon Says',
    description: 'Ingat & ulangi urutan warna yang makin panjang tiap ronde.',
    icon: 'pad4',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' ronde',
    LocalComponent: SimonSaysGame,
  },
  {
    key: 'whackamole',
    title: 'Pukul Tikus',
    description: 'Ketuk mol yang muncul secepat mungkin dalam 30 detik.',
    icon: 'mallet',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' poin',
    LocalComponent: WhackAMoleGame,
  },
  {
    key: 'reactionduel',
    title: 'Adu Refleks',
    description: 'Dua tombol, satu warna hijau — siapa duluan tap, menang rondenya.',
    icon: 'bolt',
    hasOnline: false,
    scoreMode: 'none',
    LocalComponent: ReactionDuelGame,
  },
  {
    key: 'numberguess',
    title: 'Tebak Angka',
    description: 'Tebak angka 1-100 sesedikit mungkin coba.',
    icon: 'question',
    hasOnline: true,
    scoreMode: 'score',
    scoreSort: 'asc',
    scoreUnit: ' tebakan',
    LocalComponent: NumberGuessGame,
    OnlineComponent: NumberGuessOnline,
  },
  {
    key: 'wordscramble',
    title: 'Acak Kata',
    description: 'Susun ulang huruf yang teracak sebanyak mungkin dalam 60 detik.',
    icon: 'letters',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' kata',
    LocalComponent: WordScrambleGame,
  },
  {
    key: 'emojiquiz',
    title: 'Tebak Emoji',
    description: 'Tebak kata dari kombinasi emoji-nya, sebanyak mungkin dalam 60 detik.',
    icon: 'quizface',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' benar',
    LocalComponent: EmojiQuizGame,
  },
  {
    key: 'slidingpuzzle',
    title: 'Puzzle Geser',
    description: 'Urutkan angka 1-15 dengan langkah sesedikit mungkin.',
    icon: 'puzzlepiece',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'asc',
    scoreUnit: ' langkah',
    LocalComponent: SlidingPuzzleGame,
  },
  {
    key: 'truthordare',
    title: 'Truth or Dare',
    description: 'Pilih Truth atau Dare, gantian sama pasanganmu.',
    icon: 'spinner',
    hasOnline: true,
    scoreMode: 'none',
    LocalComponent: TruthOrDareGame,
    OnlineComponent: TruthOrDareOnline,
  },
  {
    key: 'wouldyourather',
    title: 'Would You Rather',
    description: 'Pilih diam-diam, buka bareng — sama atau beda pilihan?',
    icon: 'fork',
    hasOnline: true,
    scoreMode: 'none',
    LocalComponent: WouldYouRatherGame,
    OnlineComponent: WouldYouRatherOnline,
  },
  {
    key: 'tapbattle',
    title: 'Adu Ketuk',
    description: 'Siapa paling banyak ketuk layar dalam 10 detik?',
    icon: 'tap',
    hasOnline: true,
    scoreMode: 'wins',
    LocalComponent: TapBattleGame,
    OnlineComponent: TapBattleOnline,
  },
  {
    key: 'colormatch',
    title: 'Tebak Warna',
    description: 'Ketuk warna yang sesuai nama secepat mungkin sebelum waktu habis.',
    icon: 'palette',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' poin',
    LocalComponent: ColorMatchGame,
  },
  {
    key: 'blockblast',
    title: 'Block Blast',
    description: 'Susun potongan di kotak 8x8, penuhi baris/kolom buat hapus dan dapat skor.',
    icon: 'grid3',
    hasOnline: false,
    scoreMode: 'score',
    scoreSort: 'desc',
    scoreUnit: ' poin',
    LocalComponent: ComingSoonGame,
    implemented: false,
  },
];
