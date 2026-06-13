// src/services/geminiService.js
// Model: gemini-2.0-flash — stabil, cepat, NON-thinking (tidak boros token)

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// gemini-flash-latest (maps ke gemini-3.5-flash) dengan thinkingBudget:0
// → matikan mode thinking = hemat token, JSON tidak terpotong (STOP bukan MAX_TOKENS)
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Konversi File gambar ke Base64 murni (tanpa prefix data URL)
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analisis foto sampah dengan Gemini Flash API
 * @param {string} imageBase64
 * @param {string} mimeType
 * @returns {Promise<{nama_sampah, jenis_sampah, deskripsi}>}
 */
export const analisaSampah = async (imageBase64, mimeType = 'image/jpeg') => {
  // Prompt pendek = hemat token, output tidak terpotong
  const prompt = `Identifikasi sampah dalam foto. Jawab HANYA dengan JSON ini (tanpa markdown):
{"nama_sampah":"nama spesifik","jenis_sampah":"Organik atau Anorganik atau B3","deskripsi":"tips pilah 1 kalimat"}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: 'application/json', // paksa output JSON murni
      thinkingConfig: { thinkingBudget: 0 }, // ← matikan thinking = 0 thought tokens
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

  // Cek apakah dipotong karena MAX_TOKENS
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Respons AI terpotong. Coba foto dengan resolusi lebih kecil.');
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText.trim()) {
    throw new Error('AI tidak memberikan respons. Coba foto ulang dengan pencahayaan lebih baik.');
  }

  // Bersihkan wrapper markdown jika ada
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Coba parse langsung
  try {
    const parsed = JSON.parse(cleaned);
    return normalisasiHasil(parsed);
  } catch (_) {
    // Fallback: ekstrak objek JSON pertama dari teks
    const match = cleaned.match(/\{[^{}]*\}/s);
    if (match) {
      try {
        return normalisasiHasil(JSON.parse(match[0]));
      } catch (_2) {}
    }
    // Log untuk debug
    console.error('[Gemini] Raw response:', rawText);
    throw new Error('Format respons AI tidak valid. Coba foto ulang.');
  }
};

/** Normalisasi dan validasi field hasil AI */
const JENIS_VALID = ['Organik', 'Anorganik', 'B3'];

function normalisasiHasil(parsed) {
  let jenis = parsed.jenis_sampah || 'Anorganik';

  // Toleransi penulisan berbeda: organik, ORGANIK, dsb
  const jenísFix = JENIS_VALID.find(
    (j) => j.toLowerCase() === jenis.toLowerCase()
  );
  if (!jenísFix) jenis = 'Anorganik';
  else jenis = jenísFix;

  return {
    nama_sampah: (parsed.nama_sampah || 'Sampah Tidak Dikenal').trim(),
    jenis_sampah: jenis,
    deskripsi: (parsed.deskripsi || '').trim(),
  };
}

/**
 * Tes cepat koneksi Gemini API (teks saja, tanpa gambar)
 */
export const testKoneksiGemini = async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Balas hanya dengan kata: OK' }] }],
      generationConfig: { maxOutputTokens: 10, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${err?.error?.message}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { ok: true, model: data.modelVersion, text };
};
