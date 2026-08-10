// Supabase/fetch surface raw native exception text for network failures
// (e.g. "fetch failed: java.net.UnknownHostException: ...") instead of a
// normal error message -- translate the common case into something
// readable instead of showing it verbatim to the user.
export function friendlyError(message: string): string {
  if (/UnknownHostException|Network request failed|fetch failed/i.test(message)) {
    return 'Tidak ada koneksi internet. Coba lagi kalau sudah tersambung.';
  }
  return message;
}
