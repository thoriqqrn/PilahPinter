// src/pages/LoginPage.jsx
// Halaman Login/Daftar — minimalis, ramah lansia

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Mail, Lock, Eye, EyeOff, User, AlertCircle, Loader } from 'lucide-react';

export default function LoginPage() {
  const { masukDenganEmail, daftarDenganEmail, masukDenganGoogle } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('masuk'); // 'masuk' | 'daftar'
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pesanError = (code) => {
    const map = {
      'auth/user-not-found': 'Email tidak ditemukan. Silakan daftar terlebih dahulu.',
      'auth/wrong-password': 'Password salah. Coba lagi.',
      'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
      'auth/weak-password': 'Password terlalu pendek. Minimal 6 karakter.',
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/invalid-credential': 'Email atau password salah.',
      'auth/popup-closed-by-user': 'Login Google dibatalkan.',
      'auth/network-request-failed': 'Koneksi internet bermasalah. Coba lagi.',
    };
    return map[code] || 'Terjadi kesalahan. Silakan coba lagi.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'masuk') {
        await masukDenganEmail(email, password);
      } else {
        if (!namaLengkap.trim()) {
          setError('Nama lengkap tidak boleh kosong.');
          setLoading(false);
          return;
        }
        await daftarDenganEmail(email, password, namaLengkap);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(pesanError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await masukDenganGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(pesanError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex items-center justify-center px-4 py-10 font-['Nunito']">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Leaf size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-green-800">PilahPinter</h1>
          <p className="text-gray-600 text-lg font-semibold mt-1">
            {mode === 'masuk' ? 'Selamat datang kembali! 👋' : 'Buat akun baru 🌱'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Toggle Masuk / Daftar */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
            <button
              id="btn-toggle-masuk"
              onClick={() => { setMode('masuk'); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-black text-lg transition-all duration-200 ${
                mode === 'masuk'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Masuk
            </button>
            <button
              id="btn-toggle-daftar"
              onClick={() => { setMode('daftar'); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-black text-lg transition-all duration-200 ${
                mode === 'daftar'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Daftar
            </button>
          </div>

          {/* Pesan Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 font-bold text-base">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'daftar' && (
              <div>
                <label className="block text-gray-700 font-black text-lg mb-2">
                  👤 Nama Lengkap
                </label>
                <div className="relative">
                  <User size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="input-nama"
                    type="text"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    required
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-green-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-black text-lg mb-2">
                📧 Alamat Email
              </label>
              <div className="relative">
                <Mail size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  required
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-green-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-black text-lg mb-2">
                🔒 Password
              </label>
              <div className="relative">
                <Lock size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="input-password"
                  type={lihatPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-xl text-lg font-semibold focus:border-green-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword(!lihatPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-0"
                >
                  {lihatPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-auth"
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black text-xl py-5 rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-3 mt-2"
            >
              {loading ? (
                <>
                  <Loader size={24} className="animate-spin" />
                  Memproses...
                </>
              ) : mode === 'masuk' ? (
                '✅ Masuk ke Aplikasi'
              ) : (
                '🌱 Buat Akun Saya'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 font-bold text-base">atau</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Login */}
          <button
            id="btn-google-login"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-black text-xl py-5 rounded-xl shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-4"
          >
            <svg width="26" height="26" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </button>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <button
            id="btn-kembali-beranda"
            onClick={() => navigate('/')}
            className="text-green-700 font-bold text-lg hover:underline"
          >
            ← Kembali ke Beranda
          </button>
        </p>
      </div>
    </div>
  );
}
