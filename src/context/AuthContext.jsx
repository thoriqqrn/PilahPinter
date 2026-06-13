// src/context/AuthContext.jsx
// Context untuk manajemen status autentikasi pengguna

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const masukDenganGoogle = () => signInWithPopup(auth, googleProvider);

  const keluar = () => signOut(auth);

  const value = {
    user,
    loading,
    masukDenganEmail,
    daftarDenganEmail,
    masukDenganGoogle,
    keluar,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
};
