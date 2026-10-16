/* Weton — mesin hitung kalender Jawa.
   Anchor: 1 Suro 1555 AJ = 8 Juli 1633 M = Jumat Legi.
   Validasi silang: 17 Agustus 1945 -> Jumat Legi (sesuai catatan sejarah proklamasi).
   Neptu & watak & ramalan: tradisi primbon rakyat (BUKAN fakta ilmiah) — selalu dilabeli.
*/

export const PASARAN = [
  { nama: 'Legi',   neptu: 5, watak: 'Jujur dan murah hati. Gampang dipercaya orang, rezekinya mengalir dari pergaulan.', warna: 'Putih', arah: 'Timur' },
  { nama: 'Pahing', neptu: 9, watak: 'Keras hati dan pemberani. Kalau sudah niat, pantang mundur sebelum kelar.', warna: 'Merah', arah: 'Selatan' },
  { nama: 'Pon',    neptu: 7, watak: 'Bijaksana dan tenang. Pandai menyimpan rahasia, omongannya ditunggu orang.', warna: 'Kuning', arah: 'Barat' },
  { nama: 'Wage',   neptu: 4, watak: 'Penyabar dan hemat. Setia kawan, pelan tapi pasti sampai tujuan.', warna: 'Hitam', arah: 'Utara' },
  { nama: 'Kliwon', neptu: 8, watak: 'Berwibawa dan intuisinya tajam. Auranya misterius, disegani kawan maupun lawan.', warna: 'Abu-abu', arah: 'Tengah' },
];

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NEPTU_HARI = [5, 4, 3, 7, 8, 6, 9]; // index = getUTCDay()

const EPOCH_UTC = Date.UTC(1633, 6, 8); // 8 Juli 1633

export function wetonOf(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  if (Number.isNaN(t)) return null;
  const diff = Math.round((t - EPOCH_UTC) / 86400000);
  const pasaran = PASARAN[((diff % 5) + 5) % 5];
  const dayIdx = new Date(t).getUTCDay();
  const hari = HARI[dayIdx];
  const neptu = NEPTU_HARI[dayIdx] + pasaran.neptu;
  return { y, m, d, hari, dayIdx, pasaran, neptu, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

export function parseISO(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const w = wetonOf(y, mo, d);
  // pastikan tanggalnya valid (mis. 30 Feb tidak lolos)
  if (!w || new Date(Date.UTC(y, mo - 1, d)).getUTCDate() !== d) return null;
  return w;
}

export const RAMALAN = [
  { nama: 'Pesthi',  arti: 'Rukun dan tenteram. Rumah tangganya adem, rezeki datang dari arah tak disangka.' },
  { nama: 'Pegat',   arti: 'Bakal banyak rintangan di tengah jalan. Kudu sabar dan saling menguatkan.' },
  { nama: 'Ratu',    arti: 'Dihormati banyak orang. Pasangan ini auranya pemimpin, rezekinya lancar.' },
  { nama: 'Jodoh',   arti: 'Cocok dan langgeng. Kata orang tua, ini pasangan yang "ketemu jodohnya".' },
  { nama: 'Topo',    arti: 'Awalnya berat seperti tirakat, tapi kalau kuat justru makin kokoh di akhir.' },
  { nama: 'Tinari',   arti: 'Mudah dapat keberuntungan. Sering ditolong orang di saat yang pas.' },
  { nama: 'Padu',    arti: 'Sering bertengkar soal sepele, tapi anehnya tidak pernah sampai pisah.' },
  { nama: 'Sujanan', arti: 'Gampang cekcok dan curiga. Kuncinya satu: komunikasi jangan dipendam.' },
];

export function ramalanJodoh(n1, n2) {
  return RAMALAN[(n1 + n2) % 8];
}

export function hariIstimewa(w) {
  // menurut tradisi: malam Jumat Kliwon & Selasa Kliwon
  if (w.pasaran.nama === 'Kliwon' && (w.hari === 'Jumat' || w.hari === 'Selasa')) return true;
  return false;
}

export function formatTanggalID(w) {
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${w.hari}, ${w.d} ${bulan[w.m - 1]} ${w.y}`;
}
