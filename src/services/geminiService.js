// src/services/geminiService.js
// Gemini Flash — deteksi BANYAK sampah sekaligus dari 1 foto

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Konversi File ke Base64 murni
 */
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Analisis foto sampah — deteksi SEMUA jenis sampah dalam satu foto.
 * Return: array of { nama_sampah, jenis_sampah, deskripsi }
 *
 * @param {string} imageBase64
 * @param {string} mimeType
 * @returns {Promise<Array<{nama_sampah: string, jenis_sampah: string, deskripsi: string}>>}
 */
export const analisaSampah = async (imageBase64, mimeType = 'image/jpeg') => {
  // Prompt 2-fase: SCAN semua dulu → KATEGORIKAN
  // Kunci: paksa model listing semua objek fisik terpisah sebelum assign jenis
  const prompt = `TUGAS: Identifikasi dan kategorikan SEMUA sampah dalam foto ini.

LANGKAH 1 — SCAN TOTAL:
Perhatikan SETIAP sudut foto. Daftarkan semua benda fisik berbeda yang kamu lihat.
Jangan lewatkan apapun meskipun kecil atau tidak jelas.
Contoh benda: botol plastik, daun kering, tisu, kaleng, kantong plastik, sisa makanan, kertas, ranting, dll.

LANGKAH 2 — KATEGORIKAN:
Untuk setiap benda yang berbeda JENIS MATERINYA, buat entri terpisah:
- Organik  = daun, ranting, sisa makanan, kulit buah, kertas tidak dilapisi
- Anorganik = plastik, kaca, logam, styrofoam, karet, kertas berlapis/glossy
- B3        = baterai, elektronik, cat, oli, obat, bahan kimia

ATURAN PENTING:
* Benda berbeda jenis material = ENTRI TERPISAH (botol plastik + daun = 2 entri)
* Benda sama jenis material = 1 entri mewakili semua (3 botol = 1 entri "Botol Plastik")
* Minimum deteksi: periksa apakah ada benda organik DAN anorganik — jika ya, keduanya WAJIB masuk
* Jangan hanya fokus ke benda paling dominan

OUTPUT: Hanya JSON array, tanpa markdown, tanpa penjelasan:
[{"nama_sampah":"<nama spesifik>","jenis_sampah":"Organik|Anorganik|B3","deskripsi":"<tips pilah 1 kalimat>"}]`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      // temperature 0.4: lebih eksploratif saat mendeteksi banyak objek
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      // Budget 1024 token thinking: beri ruang model untuk scan & reasoning
      // sebelum output JSON — jauh lebih akurat untuk multi-item detection
      thinkingConfig: { thinkingBudget: 1024 },
    },
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini Error ${response.status}: ${err?.error?.message || 'Cek koneksi internet'}`);
  }

  const data = await response.json();

  if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new Error('Respons AI terpotong. Coba foto dengan resolusi lebih kecil.');
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!rawText.trim()) throw new Error('AI tidak memberikan respons. Coba foto ulang.');

  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: cari array JSON dalam teks
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try { parsed = JSON.parse(match[0]); }
      catch { parsed = null; }
    }
    // Coba objek tunggal → bungkus jadi array
    if (!parsed) {
      const objMatch = cleaned.match(/\{[^{}]*\}/s);
      if (objMatch) {
        try { parsed = [JSON.parse(objMatch[0])]; }
        catch { parsed = null; }
      }
    }
    if (!parsed) {
      console.error('[Gemini] Raw:', rawText);
      throw new Error('Format respons AI tidak valid. Coba foto ulang.');
    }
  }

  // Pastikan array
  const items = Array.isArray(parsed) ? parsed : [parsed];

  const JENIS_VALID = ['Organik', 'Anorganik', 'B3'];

  return items
    .filter(item => item && typeof item === 'object')
    .map(item => {
      const jenisRaw = item.jenis_sampah || '';
      const jenis = JENIS_VALID.find(j => j.toLowerCase() === jenisRaw.toLowerCase()) || 'Anorganik';
      return {
        nama_sampah: (item.nama_sampah || 'Sampah Tidak Dikenal').trim(),
        jenis_sampah: jenis,
        deskripsi: (item.deskripsi || '').trim(),
      };
    })
    .slice(0, 8); // maks 8 item
};

/**
 * Test koneksi Gemini (teks saja)
 */
export const testKoneksiGemini = async () => {
  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Balas: OK' }] }],
      generationConfig: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const d = await response.json();
  return { ok: true, model: d.modelVersion, text: d.candidates?.[0]?.content?.parts?.[0]?.text };
};
