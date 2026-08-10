# Spec: Kompas Arah Pasangan & Bunyikan HP Pasangan

Dokumen ini menjelaskan cara kerja dua fitur di aplikasi mobile MichSya secara
detail, sebagai referensi untuk menerapkan fungsi yang sama di web app
(`michael-tasya`). Tujuannya: kalau salah satu pasangan lupa bawa HP, mereka
tetap bisa (a) lihat arah & jarak ke pasangan, dan (b) bunyikan HP pasangan,
lewat browser.

Kedua fitur berbagi backend Supabase yang sama dengan mobile app (tidak perlu
migration baru untuk baca/tulis data yang sudah ada), tapi **kemampuan native
di HP (Bluetooth, SMS, sensor kompas) tidak semuanya bisa dipindah ke
browser** -- bagian "Batasan & pertimbangan untuk web" di tiap fitur
menjelaskan persis apa yang portable dan apa yang tidak.

---

## 1. Cari Pasangan (kompas arah + jarak)

### Data model (Supabase, sudah ada -- `supabase/migrations/0001_find_partner.sql`)

```sql
partner_presence (
  id uuid primary key,
  couple_id uuid references couple(id),
  user_id uuid references auth.users(id),
  lat double precision,
  lng double precision,
  heading double precision,       -- kolom ada, tapi TIDAK PERNAH DIISI oleh mobile app saat ini
  is_sharing boolean default true,
  updated_at timestamptz,
  unique (couple_id, user_id)
)
```

RLS: siapa saja di couple yang sama boleh `select` semua baris; tiap user
cuma boleh `insert`/`update` barisnya sendiri. Tabel ini juga didaftarkan ke
`supabase_realtime` publication, jadi bisa di-subscribe via Postgres Changes
(`postgres_changes` di `supabase-js`, sama persis di web maupun mobile --
tidak butuh sesuatu yang mobile-only).

Satu baris per user per couple (`unique(couple_id, user_id)`) -- di-`upsert`
tiap kali lokasi baru masuk, bukan insert baris baru tiap kali.

### Alur di mobile (`src/hooks/useFindPartner.ts`, `src/lib/backgroundFindPartner.ts`)

1. User tap "Mulai cari pasangan" di `FindPartnerModal.tsx`.
2. Minta izin lokasi foreground **dan background** (`expo-location`). Kalau
   background permission ditolak, sharing tetap gagal di-start (background
   permission ini konsep khusus native app, tidak ada equivalent-nya di web).
3. `Location.startLocationUpdatesAsync` mendaftarkan background task
   (`expo-task-manager`) yang jalan tiap ±15 detik / tiap gerak 10 meter,
   nge-`upsert` `{lat, lng, is_sharing: true}` ke `partner_presence`.
   Task ini didefinisikan di module scope (bukan di dalam komponen React) --
   itu yang bikin sharing tetap jalan walau app di-kill oleh OS.
4. **Auto-stop setelah 30 menit** -- dicek di dalam background task itu
   sendiri (bandingkan `Date.now()` vs `startedAt` yang disimpan di
   AsyncStorage), bukan lewat `setTimeout` JS biasa, supaya tetap berlaku
   walau proses app sempat mati lalu di-restart OS.
5. Begitu mulai sharing, kirim push `{ type: 'find_start', coupleId }` ke
   pasangan -- kalau device pasangan sudah pernah kasih izin background
   location, push ini otomatis men-trigger `startFindPartnerTracking` di
   sisi pasangan juga (lihat `backgroundNotifications.ts`), jadi ideal-nya
   begitu satu pihak mulai cari, pihak lain ikut mulai share tanpa perlu
   buka app dulu.
6. `stopFinding()` / tombol "Berhenti berbagi lokasi" -- stop location task,
   update `is_sharing = false`.

### Kompas (`src/components/CompassArrow.tsx`, `src/lib/geo.ts`)

- **Jarak**: haversine distance (`distanceMeters`) dari `{myLocation}` ke
  `{partnerLocation}` (kedua titik dari `partner_presence`, punya sendiri +
  punya pasangan). Status: `bersama` (<50m), `berdekatan` (<1km), `jauh`
  (>=1km).
- **Arah (bearing)**: initial great-circle bearing (`bearingDegrees`, rumus
  standar atan2) dari posisiku ke posisi pasangan, dalam derajat 0-360
  (0 = utara sejati).
- **Heading device**: `Location.watchHeadingAsync` (kompas magnetometer HP).
  Nilai mentahnya di-smooth pakai *circular mean* dari 5 sample terakhir
  (magnetometer HP murah suka jitter) -- lihat `circularMeanDegrees`.
  `heading.accuracy <= 1` ditampilkan sebagai peringatan "kompas kurang
  akurat, goyangkan HP membentuk angka 8".
- **Rotasi panah yang ditampilkan** = `bearing - deviceHeading` (di-wrap ke
  0-360), di-animate dengan `Animated.timing` 200ms supaya halus, bukan
  loncat-loncat.

### Batasan & pertimbangan untuk web

- **Lokasi sendiri**: `navigator.geolocation.watchPosition()` di browser
  bisa gantiin `expo-location`, tapi **tidak ada equivalent background
  task** -- begitu tab ditutup/minimize lama, tracking berhenti. Realistisnya
  versi web hanya jalan selama tab terbuka, tidak ada auto-stop 30 menit yang
  perlu ditiru persis (karena memang tidak akan hidup selama itu di
  background).
- **Heading device (arah kompas berputar)**: `DeviceOrientationEvent` ada di
  browser, tapi:
  - Butuh permintaan izin eksplisit lewat gesture user di iOS Safari 13+
    (`DeviceOrientationEvent.requestPermission()`), beda API dari Android
    Chrome (`event.absolute` + `event.alpha`, atau `webkitCompassHeading`
    di iOS).
  - **Laptop/desktop tidak punya sensor ini sama sekali.** Kalau target
    pemakaian adalah "lupa HP, pakai browser di laptop", panah kompas yang
    berputar mengikuti arah hadap user **tidak akan bisa berfungsi** --
    perlu fallback UI (misal: tampilkan bearing sebagai angka derajat +
    jarak, atau pin di peta, bukan panah yang berputar).
  - Kalau target pemakaian adalah "pakai HP lain / browser di HP orang
    lain", sensor ada tapi tetap perlu langkah izin ekstra yang berbeda tiap
    browser.
- **Baca posisi pasangan**: tidak ada masalah -- cukup `select` /
  `subscribe` ke `partner_presence` filter `couple_id`, sama persis logic-nya
  dengan `useFindPartner.ts`, `supabase-js` di browser identik dengan di RN.
- **Nge-share posisi sendiri dari web** (supaya pasangan yang pegang HP bisa
  lihat posisi user yang di web): perlu diputuskan saat implementasi apakah
  ini benar-benar dibutuhkan. Kalau use case-nya cuma "saya lupa HP, saya
  mau lihat pasangan saya di mana", maka web **cukup jadi read-only viewer**
  -- tidak perlu nulis baris `partner_presence` sendiri sama sekali.

---

## 2. Bunyikan HP Pasangan (Ring)

### Data model (`supabase/migrations/0001_find_partner.sql` + `0003_phone_number.sql`)

```sql
device_push_tokens (
  id uuid primary key,
  user_id uuid unique references auth.users(id),
  couple_id uuid references couple(id),
  expo_push_token text,      -- nullable (device belum tentu grant notif permission)
  phone_number text,         -- nullable (device belum tentu isi nomor HP)
  updated_at timestamptz
)
```

RLS sama seperti `partner_presence`: satu couple bisa saling baca token/nomor
satu sama lain, tapi cuma boleh tulis baris sendiri.

### Tiga jalur paralel (`src/lib/ringPartner.ts`)

`ringPartner(coupleId)` menembak ketiga jalur ini **sekaligus** (`Promise.all`
setelah broadcast BLE & push jalan paralel), masing-masing dibungkus
`.catch(() => false)` supaya satu jalur gagal (misal: fetch ke Expo API
gagal karena tidak ada internet) **tidak pernah** menggagalkan jalur lain.
Fungsi resolve `true` kalau salah satu dari ketiganya berhasil "dikirim" --
tidak ada cara memastikan pasangan benar-benar menerimanya secara sinkron.

#### a. Push notification (butuh internet di kedua sisi)

- Panggil langsung Expo Push API dari client:
  `POST https://exp.host/--/api/v2/push/send` dengan `to: <expo_push_token
  pasangan>`, payload **data-only**: `{ data: { type: 'ring' } }`.
- **Detail kritis**: payload data-only **tidak boleh** ikut set field
  `sound`/`channelId` -- kalau ikut di-set, gateway Expo membentuk pesan FCM
  jadi tipe "notification" (bukan "data"), dan Android **tidak pernah**
  memanggil kode app (`onMessageReceived`) untuk pesan tipe itu kalau app-nya
  lagi background/killed -- notifikasi kosong langsung nongol dari sistem,
  bukan lewat kode kita. Ini bug nyata yang pernah ditemukan & diperbaiki di
  season development ini.
- Sisi penerima (mobile): `TaskManager` background task
  (`backgroundNotifications.ts`, didaftarkan di module scope) menangkap
  payload `type: 'ring'`, muter ringtone (`expo-audio`) + tampilkan
  notifikasi full-screen dengan tombol "Stop" (`notifee`) + broadcast ke UI
  yang lagi hidup lewat pub-sub kecil (`ringSignal.ts`).
- Ada **jalur native tambahan** (`RingAwareFirebaseMessagingService.kt`)
  yang intercept FCM langsung di level native Android (bukan lewat JS sama
  sekali) sebagai lapisan defense-in-depth untuk kasus JS engine belum/tidak
  jalan -- **ini murni implementasi detail Android, tidak relevan untuk
  web** baik sebagai pengirim maupun penerima.

#### b. Bluetooth LE broadcast (tanpa internet, butuh jarak dekat ~10m)

- Custom native Expo Module (`modules/ble-ring`). *Connectionless* -- bukan
  pairing Bluetooth biasa: pengirim advertise Service UUID tetap
  (`8f6a2e2e-6c2b-4a7d-9b6a-2e2e6c2b4a7d`, unik untuk MichSya) selama 6
  detik; penerima menjalankan BLE scan yang always-on (foreground service)
  yang mendengarkan UUID itu terus-menerus.
- Reaksi di sisi penerima 100% native Kotlin (`RingReactor` singleton:
  `MediaPlayer` + `Vibrator` + `Activity` full-screen yang bisa muncul di
  atas lock screen) -- **sengaja nol dependency ke JS engine**, supaya tetap
  jalan walau app benar-benar di-kill total.
- **Tidak portable ke web.** Web Bluetooth API cuma bisa jadi *central*
  (scan & connect ke device lain setelah user pilih dari dialog pairing
  browser), tidak bisa *advertise* seperti peripheral -- tidak ada cara bikin
  browser "menyiarkan" sinyal BLE seperti yang dilakukan native Android di
  sini.

#### c. SMS fallback (sinyal seluler ada, tapi tanpa data/internet)

- Butuh nomor HP pasangan sudah tersimpan (`device_push_tokens.phone_number`,
  diisi lewat `PhoneNumberModal.tsx`, normalisasi `08...` -> `+628...`).
- Kirim SMS native (`SmsManager` via native module) berisi marker string
  tetap (`RingBleConstants.SMS_TRIGGER_MARKER`); di sisi penerima,
  `SmsRingReceiver` (BroadcastReceiver) mendengarkan **semua** SMS masuk dan
  cek apakah isinya mengandung marker itu (perlu gabungkan semua bagian SMS
  dulu kalau pesannya kepecah jadi multi-part, karena ada emoji di
  pesannya yang memaksa encoding UCS-2 dengan kapasitas per-segmen lebih
  kecil).
- **Tidak portable ke web.** Browser tidak punya API untuk kirim/terima SMS
  sama sekali.

### Batasan & pertimbangan untuk web

- **Cuma jalur (a) push yang portable.** Kalau HP pasangan (penerima) tidak
  ada internet saat itu, ring yang dipicu dari web **tidak akan sampai sama
  sekali** -- tidak ada fallback BLE/SMS yang bisa ditiru dari browser. Ini
  perlu disampaikan jelas ke user di UI web ("ring lewat web butuh koneksi
  internet di HP pasangan").
- **Arah pemicu**: karena skenarionya "saya lupa HP, saya mau bunyikan HP
  pasangan", implementasinya persis sama arahnya dengan tombol ring yang
  sudah ada di mobile (device A memicu, device B yang bunyi) -- jadi cukup
  panggil Expo Push API dari client web yang sama seperti
  `sendPushToPartner()`, ambil `expo_push_token` pasangan dari
  `device_push_tokens` (baca biasa, RLS sudah mengizinkan). **Tidak perlu
  token/subscription baru di sisi web** karena yang menerima ring tetap HP
  Android pasangan, bukan browser.
- **Rate-limit / anti-spam** belum ada sama sekali di versi mobile saat ini
  (tombol bisa ditekan berkali-kali tanpa cooldown) -- pertimbangkan apakah
  perlu ditambah di web (lebih gampang di-spam lewat browser/bookmark
  daripada lewat app).

---

## Ringkasan portability

| Bagian | Portable ke web? | Catatan |
|---|---|---|
| Baca lokasi & jarak/bearing ke pasangan | ✅ Ya | `partner_presence` + `geo.ts` bisa dipakai langsung |
| Compass yang berputar sesuai arah hadap | ⚠️ Sebagian | Butuh `DeviceOrientationEvent`; tidak ada di desktop, beda API tiap browser |
| Share lokasi sendiri dari web | ⚠️ Sebagian | `navigator.geolocation`, tapi tanpa background task saat tab tertutup |
| Ring via push | ✅ Ya | Reuse `expo_push_token` pasangan + Expo Push API langsung dari client |
| Ring via Bluetooth LE | ❌ Tidak | Web Bluetooth tidak bisa advertise |
| Ring via SMS | ❌ Tidak | Tidak ada SMS API di browser |
