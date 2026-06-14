// src/pages/Dashboard.jsx — Multi-item waste detection
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { analisaSampah, fileToBase64 } from '../services/geminiService';
import { simpanBanyakCatatan, langgananCatatan } from '../services/firestoreService';
import RiwayatTable from '../components/RiwayatTable';
import {
  Camera, LogOut, Leaf, RotateCcw, Save, CheckCircle,
  AlertTriangle, TrendingUp, RefreshCw, X, Info, Scale, Plus, Minus,
} from 'lucide-react';

// ─── Konstanta ─────────────────────────────────────────────────────────────────
const SATUAN_LIST = [
  { value: 'kg',      label: 'kg',      icon: '⚖️' },
  { value: 'sak',     label: 'Sak',     icon: '🪣' },
  { value: 'kantong', label: 'Kantong', icon: '🛍️' },
  { value: 'ikat',    label: 'Ikat',    icon: '🎀' },
  { value: 'buah',    label: 'Buah',    icon: '📦' },
  { value: 'liter',   label: 'Liter',   icon: '🧴' },
  { value: 'ember',   label: 'Ember',   icon: '🪣' },
  { value: 'gerobak', label: 'Gerobak', icon: '🛒' },
];

const JENIS_COLOR = {
  Organik:   { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', headerBg: 'bg-green-600', icon: '🌿' },
  Anorganik: { bg: 'bg-blue-100',  border: 'border-blue-400',  text: 'text-blue-800',  headerBg: 'bg-blue-600',  icon: '♻️' },
  B3:        { bg: 'bg-red-100',   border: 'border-red-400',   text: 'text-red-800',   headerBg: 'bg-red-600',   icon: '⚠️' },
};

const STATUS = { IDLE: 'IDLE', LOADING: 'LOADING', HASIL: 'HASIL', ERROR: 'ERROR' };

// ─── Badge ────────────────────────────────────────────────────────────────────
const BadgeJenis = ({ jenis, size = 'sm' }) => {
  const c = JENIS_COLOR[jenis] || JENIS_COLOR.Anorganik;
  return (
    <span className={`inline-flex items-center gap-1 ${c.bg} ${c.border} border-2 ${c.text} ${size === 'lg' ? 'text-xl px-5 py-2 font-black' : 'text-sm px-2.5 py-1 font-bold'} rounded-xl`}>
      {c.icon} {jenis}
    </span>
  );
};

// ─── Item Form Card ────────────────────────────────────────────────────────────
function ItemCard({ item, index, total, form, onChange }) {
  const c = JENIS_COLOR[item.jenis_sampah] || JENIS_COLOR.Anorganik;
  const satuanObj = SATUAN_LIST.find(s => s.value === form.satuan) || SATUAN_LIST[0];

  const step = (delta) => {
    const v = Math.max(0.1, (parseFloat(form.jumlah) || 0) + delta);
    onChange({ ...form, jumlah: String(parseFloat(v.toFixed(1))) });
  };

  return (
    <div className={`border-2 ${c.border} rounded-2xl overflow-hidden`}>
      {/* Header item */}
      <div className={`${c.headerBg} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm bg-white/20 px-2 py-0.5 rounded-lg">
            Item {index + 1}/{total}
          </span>
          <span className="text-white font-black text-lg">{item.nama_sampah}</span>
        </div>
        <BadgeJenis jenis={item.jenis_sampah} size="sm" />
      </div>

      <div className={`${c.bg} p-4 space-y-3`}>
        {/* Deskripsi AI */}
        {item.deskripsi && (
          <div className="flex gap-2 bg-white/70 rounded-xl p-3">
            <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 text-sm font-semibold">{item.deskripsi}</p>
          </div>
        )}

        {/* Pilih Satuan */}
        <div>
          <p className="text-gray-700 font-black text-sm mb-2">📏 Satuan</p>
          <div className="flex flex-wrap gap-1.5">
            {SATUAN_LIST.map(s => (
              <button key={s.value} type="button"
                onClick={() => onChange({ ...form, satuan: s.value })}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  form.satuan === s.value
                    ? 'bg-white border-gray-700 text-gray-900 shadow-sm scale-105'
                    : 'bg-white/60 border-gray-300 text-gray-600 hover:border-gray-500'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Jumlah */}
        <div>
          <p className="text-gray-700 font-black text-sm mb-2">🔢 Jumlah ({satuanObj.label})</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => step(form.satuan === 'kg' ? -0.5 : -1)}
              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200 active:scale-90 transition-all"
            >
              <Minus size={20} className="text-gray-700" />
            </button>
            <div className="flex-1 relative">
              <input
                type="number" min="0.1" step={form.satuan === 'kg' ? '0.5' : '1'}
                value={form.jumlah}
                onChange={e => onChange({ ...form, jumlah: e.target.value })}
                className="w-full text-center text-3xl font-black bg-white border-2 border-gray-200 rounded-xl py-2.5 focus:border-gray-600 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                {satuanObj.value}
              </span>
            </div>
            <button type="button" onClick={() => step(form.satuan === 'kg' ? 0.5 : 1)}
              className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200 active:scale-90 transition-all"
            >
              <Plus size={20} className="text-gray-700" />
            </button>
          </div>
          {/* Quick picks */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {(form.satuan === 'kg' ? [0.5, 1, 2, 5] : [1, 2, 3, 5]).map(n => (
              <button key={n} type="button"
                onClick={() => onChange({ ...form, jumlah: String(n) })}
                className={`px-3 py-1 rounded-lg text-sm font-black border transition-all ${
                  parseFloat(form.jumlah) === n
                    ? 'bg-gray-800 border-gray-800 text-white'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                {n} {satuanObj.value}
              </button>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div>
          <p className="text-gray-700 font-black text-sm mb-1">📝 Catatan <span className="font-normal text-gray-400">(opsional)</span></p>
          <input type="text" maxLength={100}
            value={form.catatan}
            onChange={e => onChange({ ...form, catatan: e.target.value })}
            placeholder="Contoh: dari dapur, pasar pagi..."
            className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus]       = useState(STATUS.IDLE);
  const [preview, setPreview]     = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [itemsAI, setItemsAI]     = useState([]); // array hasil AI
  const [itemForms, setItemForms] = useState([]); // form state per item
  const [errorMsg, setErrorMsg]   = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);

  const [riwayat, setRiwayat]               = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);
  const [errorFirestore, setErrorFirestore] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoadingRiwayat(true);
    const unsub = langgananCatatan(
      user.uid,
      (data) => { setRiwayat(data); setLoadingRiwayat(false); },
      (err)  => { setErrorFirestore(err.message); setLoadingRiwayat(false); }
    );
    return () => unsub();
  }, [user]);

  // ── Dropzone ─────────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    const objUrl = URL.createObjectURL(f);
    setPreview(objUrl);
    setStatus(STATUS.LOADING);
    setItemsAI([]);
    setItemForms([]);
    setErrorMsg('');
    setTersimpan(false);

    try {
      const b64 = await fileToBase64(f);
      setImageBase64(b64);
      const items = await analisaSampah(b64, f.type);
      setItemsAI(items);
      // Inisialisasi form default untuk setiap item
      setItemForms(items.map(() => ({ jumlah: '1', satuan: 'kg', catatan: '' })));
      setStatus(STATUS.HASIL);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menganalisis foto.');
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
    setImageBase64('');
    setItemsAI([]);
    setItemForms([]);
    setErrorMsg('');
    setTersimpan(false);
  };

  const updateForm = (idx, newForm) => {
    setItemForms(prev => prev.map((f, i) => i === idx ? newForm : f));
  };

  // ── Simpan semua item ────────────────────────────────────────────────────────
  const simpanSemua = async () => {
    if (menyimpan || itemsAI.length === 0) return;
    const invalid = itemForms.findIndex(f => !(parseFloat(f.jumlah) > 0));
    if (invalid >= 0) {
      setErrorMsg(`Jumlah item ${invalid + 1} harus lebih dari 0`);
      return;
    }
    setMenyimpan(true);
    setErrorMsg('');
    try {
      const payload = itemsAI.map((item, i) => ({
        namaSampah: item.nama_sampah,
        jenisSampah: item.jenis_sampah,
        deskripsi: item.deskripsi,
        jumlah: parseFloat(itemForms[i].jumlah) || 1,
        satuan: itemForms[i].satuan,
        catatan: itemForms[i].catatan,
      }));
      await simpanBanyakCatatan(user.uid, imageBase64, payload);
      setTersimpan(true);
    } catch (err) {
      setErrorMsg(`Gagal menyimpan: ${err.message}`);
    } finally {
      setMenyimpan(false);
    }
  };

  const handleKeluar = async () => { await keluar(); navigate('/'); };
  const namaUser = user?.displayName || user?.email?.split('@')[0] || 'Pengguna';
  const now = new Date();
  const jumlahBulanIni = riwayat.filter(r =>
    r.timestamp.getMonth() === now.getMonth() && r.timestamp.getFullYear() === now.getFullYear()
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 font-['Nunito']">
      {/* TOP BAR */}
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
              <p className="text-base font-black text-green-700">{loadingRiwayat ? '...' : `${jumlahBulanIni} Catatan`}</p>
            </div>
          </div>
          <button id="btn-keluar" onClick={handleKeluar}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border-2 border-red-200 text-red-700 font-black text-base px-4 py-3 rounded-xl transition-all active:scale-95"
          >
            <LogOut size={20} /><span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* AREA FOTO */}
        <section>
          <h2 className="text-2xl font-black text-gray-800 mb-5 flex items-center gap-3">
            <Camera size={28} className="text-green-600" />
            Foto Sampah Anda
          </h2>

          {/* IDLE */}
          {status === STATUS.IDLE && (
            <div {...getRootProps()} id="dropzone-area"
              className={`border-4 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all min-h-64 flex flex-col items-center justify-center gap-5 ${
                isDragActive ? 'border-green-500 bg-green-50' : 'border-green-300 bg-white hover:border-green-500 hover:bg-green-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg ${isDragActive ? 'bg-green-500' : 'bg-green-100'}`}>
                <Camera size={64} className={isDragActive ? 'text-white' : 'text-green-600'} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800 mb-1">
                  {isDragActive ? '📸 Lepaskan Foto di Sini!' : 'KLIK UNTUK FOTO SAMPAH'}
                </p>
                <p className="text-base text-gray-500 font-semibold">AI bisa deteksi banyak jenis sampah sekaligus dalam 1 foto!</p>
              </div>
              <button id="btn-pilih-foto" type="button"
                onClick={e => { e.stopPropagation(); open(); }}
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
                <p className="text-2xl font-black text-gray-800 mb-2">🤖 AI Memindai Semua Sampah...</p>
                <p className="text-lg text-gray-500 font-semibold">Mendeteksi semua jenis sampah dalam foto</p>
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

          {/* HASIL — Multi Item */}
          {status === STATUS.HASIL && itemsAI.length > 0 && (
            <div className="bg-white border-4 border-green-200 rounded-3xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={28} className="text-white" />
                  <div>
                    <p className="text-xl font-black text-white">AI Menemukan {itemsAI.length} Jenis Sampah!</p>
                    <p className="text-green-200 text-sm font-semibold">Isi jumlah masing-masing lalu simpan</p>
                  </div>
                </div>
                <button onClick={reset} className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors min-h-0">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Foto + ringkasan badge */}
                <div className="flex gap-4 items-start">
                  {preview && (
                    <img src={preview} alt="Foto sampah" className="w-32 h-32 object-cover rounded-2xl shadow-lg flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-gray-600 font-semibold text-sm mb-2">Terdeteksi dalam foto ini:</p>
                    <div className="flex flex-wrap gap-2">
                      {itemsAI.map((item, i) => (
                        <BadgeJenis key={i} jenis={item.jenis_sampah} size="sm" />
                      ))}
                    </div>
                    <p className="text-gray-500 text-sm font-semibold mt-2">
                      {itemsAI.map(i => i.nama_sampah).join(' • ')}
                    </p>
                  </div>
                </div>

                {/* Kartu per item */}
                {!tersimpan && (
                  <>
                    <div className="space-y-4">
                      {itemsAI.map((item, idx) => (
                        <ItemCard
                          key={idx}
                          item={item}
                          index={idx}
                          total={itemsAI.length}
                          form={itemForms[idx] || { jumlah: '1', satuan: 'kg', catatan: '' }}
                          onChange={(newForm) => updateForm(idx, newForm)}
                        />
                      ))}
                    </div>

                    {errorMsg && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
                        <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                        <p className="text-red-700 font-bold text-sm">{errorMsg}</p>
                      </div>
                    )}

                    {/* Ringkasan total */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                      <p className="font-black text-gray-700 mb-2">📋 Ringkasan Simpanan ({itemsAI.length} catatan):</p>
                      <div className="space-y-1">
                        {itemsAI.map((item, i) => {
                          const f = itemForms[i] || {};
                          const s = SATUAN_LIST.find(s => s.value === f.satuan) || SATUAN_LIST[0];
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span>{JENIS_COLOR[item.jenis_sampah]?.icon}</span>
                              <span className="font-bold text-gray-800">{item.nama_sampah}</span>
                              <span className="text-gray-500">—</span>
                              <span className="font-black text-green-700">{f.jumlah || 0} {s.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button id="btn-simpan-semua" onClick={simpanSemua} disabled={menyimpan}
                        className="flex-1 inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 active:scale-95 text-white font-black text-xl px-6 py-5 rounded-2xl transition-all shadow-lg"
                      >
                        {menyimpan
                          ? <><RefreshCw size={22} className="animate-spin" /> Menyimpan {itemsAI.length} Item...</>
                          : <><Save size={22} /> Simpan {itemsAI.length} Catatan Sekaligus</>
                        }
                      </button>
                      <button id="btn-foto-ulang" onClick={reset}
                        className="inline-flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 active:scale-95 text-gray-700 font-black text-lg px-5 py-5 rounded-2xl transition-all"
                      >
                        <RotateCcw size={20} /> Foto Ulang
                      </button>
                    </div>
                  </>
                )}

                {/* Sukses */}
                {tersimpan && (
                  <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-8 text-center">
                    <CheckCircle size={56} className="text-green-600 mx-auto mb-3" />
                    <p className="text-green-700 font-black text-2xl mb-2">
                      {itemsAI.length} Catatan Berhasil Disimpan! ✅
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-5">
                      {itemsAI.map((item, i) => (
                        <span key={i} className="bg-white border border-green-200 px-3 py-1 rounded-xl text-sm font-bold text-gray-700">
                          {JENIS_COLOR[item.jenis_sampah]?.icon} {item.nama_sampah} — {itemForms[i]?.jumlah} {itemForms[i]?.satuan}
                        </span>
                      ))}
                    </div>
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

        {/* RIWAYAT */}
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black text-gray-800">📋 Riwayat Catatan</h2>
            <p className="text-sm text-green-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
              Sinkronisasi real-time
            </p>
          </div>
          {errorFirestore && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4 flex gap-3">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-700 font-bold text-sm">{errorFirestore}</p>
            </div>
          )}
          {loadingRiwayat
            ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
            : <RiwayatTable data={riwayat} />
          }
        </section>
      </main>
    </div>
  );
}
