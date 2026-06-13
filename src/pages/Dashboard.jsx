// src/pages/Dashboard.jsx
// Dashboard utama — Foto AI + Form Berat/Jumlah + DataTable Riwayat

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { analisaSampah, fileToBase64 } from '../services/geminiService';
import { simpanCatatan, langgananCatatan } from '../services/firestoreService';
import RiwayatTable from '../components/RiwayatTable';
import {
  Camera, LogOut, Leaf, RotateCcw, Save, CheckCircle,
  AlertTriangle, TrendingUp, RefreshCw, X, Info, Scale,
  Package, ShoppingBag, Layers, FlaskConical, Plus, Minus,
} from 'lucide-react';

// ─── Pilihan Satuan ────────────────────────────────────────────────────────────
const SATUAN_LIST = [
  { value: 'kg',      label: 'Kilogram',  icon: '⚖️',  satuan: 'kg' },
  { value: 'sak',     label: 'Sak',       icon: '🪣',  satuan: 'sak' },
  { value: 'kantong', label: 'Kantong',   icon: '🛍️', satuan: 'kantong' },
  { value: 'ikat',    label: 'Ikat',      icon: '🎀',  satuan: 'ikat' },
  { value: 'buah',    label: 'Buah',      icon: '📦',  satuan: 'buah' },
  { value: 'liter',   label: 'Liter',     icon: '🧴',  satuan: 'liter' },
  { value: 'ember',   label: 'Ember',     icon: '🪣',  satuan: 'ember' },
  { value: 'gerobak', label: 'Gerobak',   icon: '🛒',  satuan: 'gerobak' },
];

// ─── Badge Jenis Sampah ────────────────────────────────────────────────────────
const BadgeJenis = ({ jenis, size = 'md' }) => {
  const config = {
    Organik:   { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', icon: '🌿' },
    Anorganik: { bg: 'bg-blue-100',  border: 'border-blue-400',  text: 'text-blue-800',  icon: '♻️' },
    B3:        { bg: 'bg-red-100',   border: 'border-red-400',   text: 'text-red-800',   icon: '⚠️' },
  };
  const c = config[jenis] || config['Anorganik'];
  const sizeClass = size === 'lg' ? 'text-xl px-5 py-2.5 font-black' : 'text-sm px-3 py-1.5 font-bold';
  return (
    <span className={`inline-flex items-center gap-2 ${c.bg} ${c.border} border-2 ${c.text} ${sizeClass} rounded-xl`}>
      {c.icon} {jenis}
    </span>
  );
};

const STATUS = { IDLE: 'IDLE', LOADING: 'LOADING', HASIL: 'HASIL', ERROR: 'ERROR' };

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus]       = useState(STATUS.IDLE);
  const [preview, setPreview]     = useState(null);
  const [hasilAI, setHasilAI]     = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  // ── State Form Berat ─────────────────────────────────────────────────────────
  const [jumlah, setJumlah]         = useState('1');
  const [satuan, setSatuan]         = useState('kg');
  const [catatan, setCatatan]       = useState('');

  const [riwayat, setRiwayat]               = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [errorFirestore, setErrorFirestore] = useState('');

  // Real-time Firestore listener
  useEffect(() => {
    if (!user) return;
    setLoadingRiwayat(true);
    setErrorFirestore('');
    const unsubscribe = langgananCatatan(
      user.uid,
      (data) => { setRiwayat(data); setLoadingRiwayat(false); },
      (err)  => { setErrorFirestore(`Gagal memuat: ${err.message}`); setLoadingRiwayat(false); }
    );
    return () => unsubscribe();
  }, [user]);

  // ── Dropzone ─────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setStatus(STATUS.LOADING);
    setHasilAI(null);
    setErrorMsg('');
    setTersimpan(false);
    // Reset form berat ke default
    setJumlah('1');
    setSatuan('kg');
    setCatatan('');
    try {
      const base64 = await fileToBase64(f);
      const hasil  = await analisaSampah(base64, f.type);
      setHasilAI({ ...hasil, base64 });
      setStatus(STATUS.HASIL);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menganalisis foto. Coba foto ulang.');
      setStatus(STATUS.ERROR);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const reset = () => {
    setStatus(STATUS.IDLE);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setHasilAI(null);
    setErrorMsg('');
    setTersimpan(false);
    setJumlah('1');
    setSatuan('kg');
    setCatatan('');
  };

  // ── Simpan ke Firestore ───────────────────────────────────────────────────────
  const simpan = async () => {
    if (!hasilAI || menyimpan) return;
    const jumlahNum = parseFloat(jumlah) || 0;
    if (jumlahNum <= 0) {
      setErrorMsg('Jumlah/berat harus lebih dari 0');
      return;
    }
    setMenyimpan(true);
    setErrorMsg('');
    try {
      await simpanCatatan({
        userId: user.uid,
        namaSampah: hasilAI.nama_sampah,
        jenisSampah: hasilAI.jenis_sampah,
        deskripsi: hasilAI.deskripsi,
        imageBase64: hasilAI.base64,
        jumlah: jumlahNum,
        satuan,
        catatan: catatan.trim(),
      });
      setTersimpan(true);
    } catch (err) {
      setErrorMsg(`Gagal menyimpan: ${err.message}`);
    } finally {
      setMenyimpan(false);
    }
  };

  const tambahJumlah = (delta) => {
    const v = Math.max(0.1, (parseFloat(jumlah) || 0) + delta);
    setJumlah(String(parseFloat(v.toFixed(1))));
  };

  const handleKeluar = async () => { await keluar(); navigate('/'); };
  const namaUser = user?.displayName || user?.email?.split('@')[0] || 'Pengguna';
  const now = new Date();
  const jumlahBulanIni = riwayat.filter(r =>
    r.timestamp.getMonth() === now.getMonth() && r.timestamp.getFullYear() === now.getFullYear()
  ).length;

  const satuanTerpilih = SATUAN_LIST.find(s => s.value === satuan) || SATUAN_LIST[0];

  return (
    <div className="min-h-screen bg-gray-50 font-['Nunito']">
      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Leaf size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500 font-semibold">Halo,</p>
              <p className="text-lg font-black text-gray-800 truncate">{namaUser} 👋</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-green-50 border-2 border-green-200 px-4 py-2 rounded-xl">
            <TrendingUp size={20} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500 font-bold leading-none">Bulan Ini</p>
              <p className="text-base font-black text-green-700 leading-tight">
                {loadingRiwayat ? '...' : `${jumlahBulanIni} Catatan`}
              </p>
            </div>
          </div>
          <button id="btn-keluar" onClick={handleKeluar}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 font-black text-base px-4 py-3 rounded-xl transition-all active:scale-95"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── AREA FOTO ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-black text-gray-800 mb-5 flex items-center gap-3">
            <Camera size={28} className="text-green-600" />
            Foto Sampah Anda
          </h2>

          {/* IDLE */}
          {status === STATUS.IDLE && (
            <div {...getRootProps()} id="dropzone-area"
              className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 min-h-64 flex flex-col items-center justify-center gap-5 ${
                isDragActive ? 'border-green-500 bg-green-50' : 'border-green-300 bg-white hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all ${isDragActive ? 'bg-green-500' : 'bg-green-100'}`}>
                <Camera size={64} className={isDragActive ? 'text-white' : 'text-green-600'} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800 mb-2">
                  {isDragActive ? '📸 Lepaskan Foto di Sini!' : 'KLIK DI SINI UNTUK FOTO SAMPAH'}
                </p>
                <p className="text-lg text-gray-500 font-semibold">Atau seret dan lepas foto ke sini</p>
                <p className="text-base text-gray-400 font-semibold mt-2">Format: JPG, PNG, WEBP</p>
              </div>
              <button id="btn-pilih-foto" type="button"
                onClick={(e) => { e.stopPropagation(); open(); }}
                className="bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg transition-all"
              >
                📁 Pilih dari Galeri
              </button>
            </div>
          )}

          {/* LOADING */}
          {status === STATUS.LOADING && (
            <div className="bg-white border-4 border-green-200 rounded-3xl p-12 text-center min-h-64 flex flex-col items-center justify-center gap-6">
              {preview && <img src={preview} alt="preview" className="w-36 h-36 object-cover rounded-2xl shadow-lg opacity-60" />}
              <div className="w-20 h-20 border-8 border-green-200 border-t-green-600 rounded-full animate-spin-slow" />
              <div>
                <p className="text-2xl font-black text-gray-800 mb-2">🤖 Sedang Memeriksa Sampah...</p>
                <p className="text-lg text-gray-500 font-semibold">Mohon Tunggu, AI sedang bekerja</p>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === STATUS.ERROR && (
            <div className="bg-red-50 border-4 border-red-300 rounded-3xl p-10 text-center">
              <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
              <p className="text-2xl font-black text-red-700 mb-3">Oops! Ada Masalah</p>
              <p className="text-lg text-red-600 font-semibold mb-6">{errorMsg}</p>
              <button id="btn-coba-lagi" onClick={reset}
                className="inline-flex items-center gap-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xl px-8 py-4 rounded-2xl transition-all"
              >
                <RotateCcw size={24} /> Coba Foto Lagi
              </button>
            </div>
          )}

          {/* HASIL */}
          {status === STATUS.HASIL && hasilAI && (
            <div className="bg-white border-4 border-green-200 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header kartu */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={28} className="text-white" />
                  <p className="text-xl font-black text-white">Hasil Deteksi AI</p>
                </div>
                <button id="btn-close-hasil" onClick={reset}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors min-h-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Baris atas: Foto + Info AI */}
                <div className="flex flex-col md:flex-row gap-6">
                  {preview && (
                    <div className="flex-shrink-0">
                      <img src={preview} alt="Foto sampah" className="w-full md:w-48 h-48 object-cover rounded-2xl shadow-lg" />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-gray-500 font-bold text-sm mb-0.5">Nama Sampah</p>
                      <p className="text-3xl font-black text-gray-900">{hasilAI.nama_sampah}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold text-sm mb-1.5">Jenis Sampah</p>
                      <BadgeJenis jenis={hasilAI.jenis_sampah} size="lg" />
                    </div>
                    {hasilAI.deskripsi && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
                        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-gray-700 font-semibold text-sm">{hasilAI.deskripsi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ═══ FORM BERAT / JUMLAH ═══ */}
                {!tersimpan && (
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5 space-y-5">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                      <Scale size={22} className="text-green-600" />
                      Isi Data Jumlah Sampah
                    </h3>

                    {/* Pilihan Satuan — tombol besar */}
                    <div>
                      <label className="block text-gray-700 font-black text-base mb-3">
                        📏 Satuan Pengukuran
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {SATUAN_LIST.map((s) => (
                          <button
                            key={s.value}
                            id={`btn-satuan-${s.value}`}
                            type="button"
                            onClick={() => setSatuan(s.value)}
                            className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${
                              satuan === s.value
                                ? 'bg-green-600 border-green-600 text-white shadow-md scale-105'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'
                            }`}
                          >
                            <span className="text-2xl">{s.icon}</span>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Input Jumlah dengan tombol +/- */}
                    <div>
                      <label className="block text-gray-700 font-black text-base mb-3" htmlFor="input-jumlah">
                        🔢 Jumlah ({satuanTerpilih.label})
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          id="btn-kurangi-jumlah"
                          type="button"
                          onClick={() => tambahJumlah(satuan === 'kg' ? -0.5 : -1)}
                          className="w-14 h-14 bg-gray-200 hover:bg-gray-300 active:scale-90 rounded-2xl flex items-center justify-center transition-all"
                        >
                          <Minus size={24} className="text-gray-700" />
                        </button>

                        <div className="flex-1 relative">
                          <input
                            id="input-jumlah"
                            type="number"
                            min="0.1"
                            step={satuan === 'kg' ? '0.5' : '1'}
                            value={jumlah}
                            onChange={(e) => setJumlah(e.target.value)}
                            className="w-full text-center text-4xl font-black text-gray-900 border-2 border-gray-200 focus:border-green-500 rounded-2xl py-4 focus:outline-none transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
                            {satuanTerpilih.satuan}
                          </span>
                        </div>

                        <button
                          id="btn-tambah-jumlah"
                          type="button"
                          onClick={() => tambahJumlah(satuan === 'kg' ? 0.5 : 1)}
                          className="w-14 h-14 bg-green-100 hover:bg-green-200 active:scale-90 rounded-2xl flex items-center justify-center transition-all"
                        >
                          <Plus size={24} className="text-green-700" />
                        </button>
                      </div>

                      {/* Shortcut cepat */}
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {(satuan === 'kg'
                          ? [0.5, 1, 2, 5, 10]
                          : [1, 2, 3, 5, 10]
                        ).map(n => (
                          <button
                            key={n}
                            id={`btn-quick-${n}`}
                            type="button"
                            onClick={() => setJumlah(String(n))}
                            className={`px-4 py-2 rounded-xl text-base font-black border-2 transition-all ${
                              parseFloat(jumlah) === n
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
                            }`}
                          >
                            {n} {satuanTerpilih.satuan}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Catatan Tambahan */}
                    <div>
                      <label className="block text-gray-700 font-black text-base mb-2" htmlFor="input-catatan">
                        📝 Catatan Tambahan <span className="font-semibold text-gray-400">(opsional)</span>
                      </label>
                      <textarea
                        id="input-catatan"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        placeholder="Contoh: dari kebun belakang, campuran daun dan ranting..."
                        rows={2}
                        maxLength={200}
                        className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl text-base font-semibold text-gray-700 placeholder:text-gray-400 focus:outline-none transition-colors resize-none"
                      />
                      <p className="text-right text-xs text-gray-400 font-semibold mt-1">{catatan.length}/200</p>
                    </div>

                    {/* Ringkasan sebelum simpan */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-3xl">{satuanTerpilih.icon}</span>
                      <div>
                        <p className="text-sm text-gray-500 font-semibold">Yang akan disimpan:</p>
                        <p className="text-xl font-black text-gray-800">
                          {jumlah || '0'} {satuanTerpilih.satuan} {hasilAI.nama_sampah}
                          <BadgeJenis jenis={hasilAI.jenis_sampah} size="md" />
                        </p>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                        <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-700 font-bold text-sm">{errorMsg}</p>
                      </div>
                    )}

                    {/* Tombol Aksi */}
                    <div className="flex gap-3 flex-wrap pt-1">
                      <button id="btn-simpan-catatan" onClick={simpan} disabled={menyimpan}
                        className="flex-1 inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 active:scale-95 text-white font-black text-xl px-6 py-5 rounded-2xl transition-all shadow-lg"
                      >
                        {menyimpan
                          ? <><RefreshCw size={22} className="animate-spin" /> Menyimpan...</>
                          : <><Save size={22} /> Simpan Catatan</>
                        }
                      </button>
                      <button id="btn-foto-ulang" onClick={reset}
                        className="inline-flex items-center justify-center gap-3 bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-700 font-black text-xl px-6 py-5 rounded-2xl transition-all"
                      >
                        <RotateCcw size={22} /> Foto Ulang
                      </button>
                    </div>
                  </div>
                )}

                {/* Sukses tersimpan */}
                {tersimpan && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-8 text-center">
                    <CheckCircle size={56} className="text-green-600 mx-auto mb-3" />
                    <p className="text-green-700 font-black text-2xl mb-1">Catatan Berhasil Disimpan! ✅</p>
                    <p className="text-green-600 font-semibold text-lg mb-6">
                      {jumlah} {satuanTerpilih.satuan} {hasilAI.nama_sampah} telah tercatat
                    </p>
                    <button id="btn-foto-lagi" onClick={reset}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-black text-xl px-8 py-4 rounded-2xl transition-all active:scale-95 shadow-lg"
                    >
                      <Camera size={24} /> Foto Sampah Lagi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── RIWAYAT CATATAN — DataTable ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-black text-gray-800">📋 Riwayat Catatan</h2>
              <p className="text-sm text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
                Sinkronisasi real-time
              </p>
            </div>
          </div>

          {errorFirestore && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4 flex gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-bold text-sm">{errorFirestore}</p>
            </div>
          )}

          {loadingRiwayat ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}
            </div>
          ) : (
            <RiwayatTable data={riwayat} />
          )}
        </section>
      </main>
    </div>
  );
}
