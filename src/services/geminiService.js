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
  const prompt = `Kamu adalah sistem AI ahli identifikasi dan pemilahan sampah.
Analisis foto ini secara teliti. Identifikasi SEMUA objek sampah yang terlihat, bahkan jika ada beberapa jenis berbeda dalam satu foto.

Jawab HANYA dengan JSON array (tanpa markdown, tanpa komentar):
[
  {"nama_sampah":"nama spesifik item 1","jenis_sampah":"Organik atau Anorganik atau B3","deskripsi":"tips pilah singkat"},
  {"nama_sampah":"nama spesifik item 2","jenis_sampah":"Organik atau Anorganik atau B3","deskripsi":"tips pilah singkat"}
]

Aturan:
- Organik: sisa makanan, daun, kulit buah, kayu, kertas polos
- Anorganik: plastik, kaca, logam, karet, styrofoam, kertas berlapis
- B3: baterai, elektronik, oli, lampu neon, obat kadaluarsa, cairan kimia
- Jika ada 3 botol plastik → cukup 1 entri "Botol Plastik"
- Jika ada jenis berbeda (mis. botol + sisa nasi) → 2 entri terpisah
- Minimal 1 entri, maksimal 8 entri`;

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
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
