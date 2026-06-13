// src/pages/LandingPage.jsx
// Halaman utama (Landing Page) - Simpel, besar, ramah lansia

import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, BarChart3, Leaf, ChevronRight, Recycle } from 'lucide-react';

const langkahMudah = [
  {
    step: 1,
    icon: <Camera size={48} className="text-green-600" />,
    judul: 'Foto Sampah',
    deskripsi: 'Ambil foto atau unggah gambar sampah Anda dari HP atau laptop',
    warna: 'bg-green-100 border-green-300',
    iconBg: 'bg-green-200',
  },
  {
    step: 2,
    icon: <Recycle size={48} className="text-blue-600" />,
    judul: 'AI Memeriksa',
    deskripsi: 'Sistem pintar kami langsung mengenali jenis dan nama sampah',
    warna: 'bg-blue-100 border-blue-300',
    iconBg: 'bg-blue-200',
  },
  {
    step: 3,
    icon: <CheckCircle size={48} className="text-emerald-600" />,
    judul: 'Sampah Tercatat!',
    deskripsi: 'Data tersimpan otomatis dan tersaji di laporan Anda',
    warna: 'bg-emerald-100 border-emerald-300',
    iconBg: 'bg-emerald-200',
  },
];

const manfaat = [
  { icon: '🌱', teks: 'Bantu lingkungan desa lebih bersih' },
  { icon: '📊', teks: 'Pantau catatan sampah kapan saja' },
  { icon: '🤖', teks: 'Dibantu kecerdasan buatan (AI)' },
  { icon: '📱', teks: 'Mudah dipakai di HP maupun laptop' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 font-['Nunito']">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <Leaf size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-green-800 leading-tight">PilahPinter</h1>
              <p className="text-xs text-green-600 font-semibold">Catat Sampah Jadi Mudah</p>
            </div>
          </div>
          <button
            id="btn-masuk-header"
            onClick={() => navigate('/login')}
            className="bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-base px-5 py-3 rounded-xl transition-all duration-200 shadow-md"
          >
            Masuk
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 pt-14 pb-10 text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-green-200 text-green-800 font-bold text-sm px-4 py-2 rounded-full mb-6">
            <span>🌿</span> Aplikasi Pilah Sampah Desa
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6">
            PilahPinter:{' '}
            <span className="text-green-600">Catat Sampah</span>
            <br />
            Jadi Mudah
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 font-semibold mb-10 max-w-2xl mx-auto leading-relaxed">
            Cukup <strong className="text-green-700">foto sampahmu</strong>,<br />
            sistem kami yang pilah! 🤖
          </p>

          {/* CTA Utama */}
          <button
            id="btn-mulai-utama"
            onClick={() => navigate('/login')}
            className="animate-pulse-slow inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black text-2xl px-10 py-6 rounded-2xl shadow-2xl transition-all duration-200 mb-4"
          >
            <Camera size={32} />
            Mulai Catat Sekarang
            <ChevronRight size={28} />
          </button>
          <p className="text-gray-500 text-base font-semibold">
            ✅ Gratis • 🔒 Aman • 📱 Mudah Dipakai
          </p>
        </div>
      </section>

      {/* 3 Langkah Mudah */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-black text-center text-gray-800 mb-3">
          Cara Pakainya Gampang Banget!
        </h2>
        <p className="text-center text-gray-600 text-lg font-semibold mb-10">
          Hanya 3 langkah, langsung bisa dipakai
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {langkahMudah.map((item, i) => (
            <div
              key={item.step}
              className={`${item.warna} border-2 rounded-2xl p-8 text-center shadow-lg animate-fade-in-up delay-${(i + 1) * 100}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className={`${item.iconBg} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5`}>
                {item.icon}
              </div>
              <div className="bg-white text-gray-800 font-black text-lg w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 shadow">
                {item.step}
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3">{item.judul}</h3>
              <p className="text-gray-600 text-lg font-semibold leading-relaxed">{item.deskripsi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Manfaat */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-black text-center text-gray-800 mb-10">
            Kenapa Pakai PilahPinter?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {manfaat.map((item, i) => (
              <div
                key={i}
                className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center hover:bg-green-100 transition-colors"
              >
                <div className="text-5xl mb-3">{item.icon}</div>
                <p className="text-gray-700 font-bold text-lg leading-snug">{item.teks}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bawah */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-16 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
          Siap Bantu Lingkungan Desa Kita? 🌿
        </h2>
        <p className="text-green-100 text-xl font-semibold mb-8">
          Daftar gratis dan mulai catat sampah sekarang juga!
        </p>
        <button
          id="btn-mulai-bawah"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-3 bg-white text-green-700 font-black text-2xl px-10 py-5 rounded-2xl hover:bg-green-50 active:scale-95 shadow-2xl transition-all duration-200"
        >
          <Camera size={30} />
          Mulai Sekarang — Gratis!
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 text-center py-6 px-4">
        <p className="text-lg font-semibold">
          © 2026 PilahPinter — Dibuat dengan ❤️ untuk desa Indonesia
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Didukung oleh Firebase &  AI PilahPinter
        </p>
      </footer>
    </div>
  );
}
