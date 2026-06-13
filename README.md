# PilahPinter — Aplikasi Manajemen Sampah Desa Berbasis AI

> 🌿 **Catat Sampah Jadi Mudah** — Dirancang khusus untuk lansia dan warga pedesaan

---

## 🚀 Cara Menjalankan Proyek

### 1. Prasyarat
- Node.js >= 18
- Akun Firebase (gratis)
- API Key Gemini (dari Google AI Studio — gratis)

### 2. Konfigurasi Environment

Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Isi nilai variabel berikut di file `.env`:

| Variabel | Cara Mendapatkan |
|---|---|
| `VITE_FIREBASE_API_KEY` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Project Settings |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |

### 3. Setup Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. **Authentication**: Aktifkan provider **Email/Password** dan **Google**
3. **Firestore**: Buat database, pilih mode **production** atau **test**
4. Tambahkan rules Firestore (lihat bagian di bawah)

#### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /catatan_sampah/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 4. Install & Jalankan
```bash
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

---

## 📁 Struktur Folder

```
src/
├── components/
│   └── ProtectedRoute.jsx     # Guard autentikasi
├── context/
│   └── AuthContext.jsx        # State manajemen auth
├── firebase/
│   └── config.js              # Inisialisasi Firebase
├── pages/
│   ├── LandingPage.jsx        # Halaman utama
│   ├── LoginPage.jsx          # Halaman login/daftar
│   └── Dashboard.jsx          # Dashboard pencatatan
├── services/
│   ├── geminiService.js       # Integrasi Gemini AI
│   └── firestoreService.js    # CRUD Firestore
├── App.jsx                    # Router utama
├── main.jsx                   # Entry point
└── index.css                  # Global styles + Tailwind
```

---

## 🗄️ Skema Firestore

**Koleksi:** `catatan_sampah`

| Field | Tipe | Keterangan |
|---|---|---|
| `userId` | string | UID pengguna Firebase Auth |
| `namaSampah` | string | Nama sampah dari AI (mis: "Kulit Pisang") |
| `jenisSampah` | string | "Organik" / "Anorganik" / "B3" |
| `deskripsi` | string | Tips cara memilah |
| `imageBase64` | string | Thumbnail foto (dibatasi 50KB) |
| `timestamp` | Timestamp | Waktu simpan (server) |
| `beratKg` | number | Estimasi berat (default 0.1 kg) |

---

## 🚢 Deploy ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables di Vercel Dashboard
# Settings → Environment Variables → tambahkan semua VITE_* vars
```

---

## 🎨 Prinsip UI Elderly-Friendly

- ✅ Font minimum 18px (Nunito, sangat mudah dibaca)
- ✅ Tombol minimum 48px touch target
- ✅ Warna kontras tinggi (hijau tua/putih/hitam)
- ✅ Ikon besar + label teks yang jelas
- ✅ Pesan error dalam Bahasa Indonesia yang mudah dipahami
- ✅ Alur 3-langkah yang sangat sederhana
