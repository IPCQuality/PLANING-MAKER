# 🚀 PLANING-MAKER
### AI Assisted CQI Machine Planning System

![Status](https://img.shields.io/badge/Status-Development-orange)
![Platform](https://img.shields.io/badge/Platform-GitHub%20Pages-blue)
![Technology](https://img.shields.io/badge/Technology-HTML%20%7C%20JavaScript%20%7C%20JSON-yellow)

---

## 📌 Overview

**PLANING-MAKER** adalah sistem web berbasis AI untuk membantu membuat **planning pengecekan CQI (Critical Quality Inspection)** terhadap mesin produksi secara otomatis.

Sistem ini dibuat untuk menggantikan proses manual dalam pembagian mesin ke CQI dengan pendekatan:

- Mapping posisi mesin secara visual
- Perhitungan jarak mesin dan CQI
- Optimasi pembagian workload
- Analisa history planning sebelumnya
- AI recommendation untuk planning berikutnya

Tujuan utama:

> Membuat planning CQI yang lebih cepat, akurat, merata, dan mengurangi risiko mesin terlewat.

---

# ✨ Main Features

## 🗺️ Interactive Machine Map

Menampilkan layout produksi secara interaktif.

Fitur:

- Klik mesin untuk menentukan status running
- Klik CQI untuk menentukan titik pengecekan
- Visualisasi posisi berdasarkan mapping aktual
- Support koordinat mesin dan CQI


---

## 🤖 AI Planning Engine

Sistem menggunakan `brain.js` sebagai otak utama planning.

Kemampuan:

- Membaca kondisi mesin running
- Menganalisa CQI yang tersedia
- Menghitung jarak terdekat
- Membagi mesin secara otomatis
- Menyeimbangkan jumlah pengecekan setiap CQI

---

# 🧠 Planning Logic

AI mempertimbangkan beberapa aturan:

### 1. Coverage Mesin

Semua mesin running harus mendapatkan pengecekan.

Prioritas:
