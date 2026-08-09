// Static curated content — same "big hand-written pool, no live AI" approach
// already used for quotes/date-ideas/greetings. Shared by Word Scramble and
// Hangman (both just need a plain word list).
export const WORD_BANK: string[] = [
  'CINTA', 'SAYANG', 'BAHAGIA', 'KENANGAN', 'RINDU', 'PELUKAN', 'SENYUM', 'SETIA',
  'ROMANTIS', 'PERJALANAN', 'KEJUTAN', 'GENGGAM', 'KENCAN', 'MESRA', 'TULUS',
  'HARMONIS', 'KELUARGA', 'IMPIAN', 'PERCAYA', 'ABADI', 'INDAH', 'CERIA', 'TENANG',
  'DAMAI', 'SEMANGAT', 'PERHATIAN', 'PERSAHABATAN', 'KEBERSAMAAN', 'KEHANGATAN', 'SYUKUR',
]

export interface EmojiQuizQuestion {
  emoji: string
  answer: string
}

export const EMOJI_QUIZ: EmojiQuizQuestion[] = [
  { emoji: '🍕', answer: 'PIZZA' },
  { emoji: '🐝', answer: 'LEBAH' },
  { emoji: '🌈', answer: 'PELANGI' },
  { emoji: '💍❤️', answer: 'LAMARAN' },
  { emoji: '🎂🎉', answer: 'ULANG TAHUN' },
  { emoji: '🌅🏖️', answer: 'MATAHARI TERBIT' },
  { emoji: '🍿🎬', answer: 'NONTON FILM' },
  { emoji: '☔👫', answer: 'HUJAN BERDUA' },
  { emoji: '🎸🎤', answer: 'KARAOKE' },
  { emoji: '✈️🧳', answer: 'LIBURAN' },
  { emoji: '🍫🌹', answer: 'COKLAT DAN MAWAR' },
  { emoji: '🐶🐱', answer: 'HEWAN PELIHARAAN' },
  { emoji: '🏔️⛺', answer: 'CAMPING' },
  { emoji: '☕📖', answer: 'NGOPI SAMBIL BACA' },
  { emoji: '🎣🐟', answer: 'MEMANCING' },
  { emoji: '🌙⭐', answer: 'BINTANG MALAM' },
  { emoji: '🚲🌳', answer: 'BERSEPEDA' },
  { emoji: '🍳🥞', answer: 'SARAPAN' },
  { emoji: '🎁🎀', answer: 'KADO' },
  { emoji: '🕯️🍽️', answer: 'CANDLE LIGHT DINNER' },
]

export interface TriviaQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { question: 'Ibu kota Jepang adalah?', options: ['Seoul', 'Tokyo', 'Beijing', 'Bangkok'], correctIndex: 1 },
  { question: 'Berapa jumlah planet di tata surya?', options: ['7', '8', '9', '10'], correctIndex: 1 },
  { question: 'Hewan darat tercepat adalah?', options: ['Singa', 'Kuda', 'Cheetah', 'Rusa'], correctIndex: 2 },
  { question: 'Warna campuran biru dan kuning adalah?', options: ['Ungu', 'Hijau', 'Oranye', 'Coklat'], correctIndex: 1 },
  { question: 'Berapa jumlah sisi bangun segi enam?', options: ['5', '6', '7', '8'], correctIndex: 1 },
  { question: 'Bahasa resmi Brasil adalah?', options: ['Spanyol', 'Inggris', 'Portugis', 'Prancis'], correctIndex: 2 },
  { question: 'Organ tubuh yang memompa darah adalah?', options: ['Paru-paru', 'Jantung', 'Ginjal', 'Hati'], correctIndex: 1 },
  { question: 'Candi Borobudur terletak di provinsi?', options: ['Jawa Timur', 'Jawa Tengah', 'Yogyakarta', 'Jawa Barat'], correctIndex: 1 },
  { question: 'Satuan dasar arus listrik adalah?', options: ['Volt', 'Watt', 'Ampere', 'Ohm'], correctIndex: 2 },
  { question: 'Benua terluas di dunia adalah?', options: ['Afrika', 'Asia', 'Eropa', 'Amerika'], correctIndex: 1 },
  { question: 'Gunung tertinggi di dunia adalah?', options: ['K2', 'Everest', 'Kilimanjaro', 'Fuji'], correctIndex: 1 },
  { question: 'Proses tumbuhan membuat makanan disebut?', options: ['Respirasi', 'Fotosintesis', 'Fermentasi', 'Transpirasi'], correctIndex: 1 },
  { question: 'Mata uang Jepang adalah?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], correctIndex: 2 },
  { question: 'Penemu bola lampu adalah?', options: ['Newton', 'Edison', 'Einstein', 'Tesla'], correctIndex: 1 },
  { question: 'Lautan terluas di dunia adalah?', options: ['Atlantik', 'Hindia', 'Pasifik', 'Arktik'], correctIndex: 2 },
  { question: 'Jumlah huruf vokal dalam abjad Latin?', options: ['4', '5', '6', '7'], correctIndex: 1 },
  { question: 'Hewan yang dijuluki "raja hutan" adalah?', options: ['Harimau', 'Gajah', 'Singa', 'Serigala'], correctIndex: 2 },
  { question: 'Alat musik tradisional Jawa adalah?', options: ['Angklung', 'Gamelan', 'Sasando', 'Kolintang'], correctIndex: 1 },
  { question: 'Planet terdekat dengan matahari adalah?', options: ['Venus', 'Bumi', 'Merkurius', 'Mars'], correctIndex: 2 },
  { question: 'Bahan utama pembuatan tahu adalah?', options: ['Beras', 'Kedelai', 'Jagung', 'Kacang tanah'], correctIndex: 1 },
]

export interface TruthOrDare {
  type: 'truth' | 'dare'
  text: string
}

export const TRUTH_OR_DARE: TruthOrDare[] = [
  { type: 'truth', text: 'Apa kesan pertamamu waktu ketemu aku?' },
  { type: 'truth', text: 'Momen apa yang paling bikin kamu jatuh cinta sama aku?' },
  { type: 'truth', text: 'Kebiasaan kecilku yang paling kamu suka apa?' },
  { type: 'truth', text: 'Kalau bisa ulang satu momen kita, momen apa yang kamu pilih?' },
  { type: 'truth', text: 'Apa yang paling kamu takutkan soal hubungan kita?' },
  { type: 'truth', text: 'Hal receh apa yang bikin kamu ketawa dari aku?' },
  { type: 'truth', text: 'Impian besar yang belum kamu ceritain ke aku apa?' },
  { type: 'truth', text: 'Apa satu hal yang pengen kamu ubah dariku (dengan sayang)?' },
  { type: 'truth', text: 'Lagu apa yang selalu ingetin kamu sama aku?' },
  { type: 'truth', text: 'Kapan terakhir kali kamu diam-diam kangen aku banget?' },
  { type: 'dare', text: 'Peluk pasanganmu 20 detik tanpa ngomong apa-apa.' },
  { type: 'dare', text: 'Kasih 3 pujian tulus buat pasanganmu sekarang juga.' },
  { type: 'dare', text: 'Nyanyiin potongan lagu cinta favoritmu.' },
  { type: 'dare', text: 'Ceritain ulang gimana kalian pertama ketemu, versi lucu.' },
  { type: 'dare', text: 'Kirim pesan manis ke pasangan lewat chat, sekarang.' },
  { type: 'dare', text: 'Tirukan gaya bicara pasanganmu selama 30 detik.' },
  { type: 'dare', text: 'Kasih satu kecupan di kening pasanganmu.' },
  { type: 'dare', text: 'Bikin janji kecil buat besok dan ucapkan keras-keras.' },
  { type: 'dare', text: 'Foto selfie berdua dengan ekspresi paling lucu.' },
  { type: 'dare', text: 'Ceritain satu hal yang kamu syukuri dari hubungan ini.' },
]

export const WOULD_YOU_RATHER: { optionA: string; optionB: string }[] = [
  { optionA: 'Liburan ke pantai', optionB: 'Liburan ke gunung' },
  { optionA: 'Nonton di bioskop', optionB: 'Nonton di rumah sambil rebahan' },
  { optionA: 'Masak bareng di rumah', optionB: 'Makan di luar' },
  { optionA: 'Bangun subuh buat lihat sunrise', optionB: 'Begadang buat lihat bintang' },
  { optionA: 'Dapat hadiah kejutan', optionB: 'Dapat kejutan berupa momen bareng' },
  { optionA: 'Rumah kecil di kota', optionB: 'Rumah besar di desa' },
  { optionA: 'Traveling tanpa rencana', optionB: 'Traveling dengan itinerary detail' },
  { optionA: 'Punya banyak teman', optionB: 'Punya sedikit teman tapi dekat' },
  { optionA: 'Kerja dari rumah', optionB: 'Kerja di kantor' },
  { optionA: 'Nabung buat rumah', optionB: 'Nabung buat traveling' },
  { optionA: 'Pelihara kucing', optionB: 'Pelihara anjing' },
  { optionA: 'Pesta besar pas anniversary', optionB: 'Dinner berdua yang intim' },
  { optionA: 'Selalu jujur walau nyakitin', optionB: 'Kadang bohong demi kebaikan' },
  { optionA: 'Hidup tanpa musik', optionB: 'Hidup tanpa film' },
  { optionA: 'Jadi kaya tapi sibuk', optionB: 'Cukup tapi banyak waktu luang' },
  { optionA: 'Tinggal di pinggir laut', optionB: 'Tinggal di pinggir kota' },
  { optionA: 'Kejutan romantis kecil tiap minggu', optionB: 'Kejutan besar setahun sekali' },
  { optionA: 'Masak enak tapi berantakan', optionB: 'Masak biasa tapi rapi' },
  { optionA: 'Nonton ulang film lama', optionB: 'Coba film baru yang belum tentu bagus' },
  { optionA: 'Rencana matang tiap hari', optionB: 'Jalani hidup apa adanya' },
]
