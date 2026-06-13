// src/services/firestoreService.js
// Layanan Firestore — real-time listener + CRUD

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION_NAME = 'catatan_sampah';

/**
 * Simpan catatan sampah baru ke Firestore
 * @returns {Promise<string>} ID dokumen baru
 */
export const simpanCatatan = async ({
  userId, namaSampah, jenisSampah, deskripsi,
  imageBase64, jumlah = 1, satuan = 'kg', catatan = '',
}) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    userId,
    namaSampah,
    jenisSampah,
    deskripsi,
    imageBase64: imageBase64 ? imageBase64.substring(0, 50000) : '',
    jumlah,
    satuan,
    catatan,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Berlangganan real-time ke catatan sampah milik user.
 *
 * Menggunakan onSnapshot — data langsung muncul di UI saat disimpan
 * tanpa perlu re-fetch manual. Tidak butuh Composite Index Firestore
 * karena sorting dilakukan di sisi klien.
 *
 * @param {string}   userId   - UID pengguna
 * @param {Function} onChange - callback(data: Array) dipanggil tiap ada perubahan
 * @param {Function} onError  - callback(error) jika query gagal
 * @returns {Function} unsubscribe — panggil untuk berhenti mendengarkan
 */
export const langgananCatatan = (userId, onChange, onError) => {
  // Query sederhana: hanya filter userId (1 field = tidak butuh composite index)
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // serverTimestamp() bisa null sesaat setelah simpan (pending write)
        // Fallback ke Date.now() agar UI tidak crash
        timestamp: doc.data().timestamp?.toDate() ?? new Date(),
      }));

      // Sortir terbaru di atas — dilakukan client-side
      data.sort((a, b) => b.timestamp - a.timestamp);

      onChange(data);
    },
    (error) => {
      console.error('[Firestore] Error:', error.message);
      if (onError) onError(error);
    }
  );

  return unsubscribe; // dipanggil di useEffect cleanup
};
