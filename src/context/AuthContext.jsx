// src/context/AuthContext.jsx
// Context autentikasi — dengan fallback signInWithRedirect untuk mobile/popup-blocker

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tangkap hasil redirect login Google (setelah kembali dari halaman Google)
    getRedirectResult(auth).catch((err) => {
      // Abaikan error "no redirect" — ini normal saat tidak ada redirect pending
      if (err.code !== 'auth/no-current-user') {
        console.warn('[Auth] Redirect result error:', err.code);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const masukDenganEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const daftarDenganEmail = async (email, password, namaLengkap) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: namaLengkap });
    return result;
  };

  /**
   * Login Google — coba popup dulu.
   * Jika popup diblokir (mobile browser, iframe, browser lama),
   * otomatis fallback ke redirect (halaman Google langsung).
   */
  const masukDenganGoogle = async () => {
    try {
      // Popup: lebih cepat, tidak reload halaman
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Fallback ke redirect jika popup diblokir
      const popupBlocked = [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/unauthorized-domain', // domain belum terdaftar di Firebase
      ];

      if (popupBlocked.includes(err.code)) {
        // Redirect mode: buka halaman Google → kembali ke app otomatis
        return signInWithRedirect(auth, googleProvider);
      }

      // Error lain (misal: network) — lempar ke atas
      throw err;
    }
  };

  const keluar = () => signOut(auth);

  const value = {
    user, loading,
    masukDenganEmail,
    daftarDenganEmail,
    masukDenganGoogle,
    keluar,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
};
