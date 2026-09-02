#!/usr/bin/env node

/**
 * ============================================================================
 * TOOL GENERATOR HISTORY UNTUK PEMBELAJARAN BRAIN AI & GITHUB DATASET
 * ============================================================================
 * 
 * Script ini menghasilkan file history alokasi mesin realistis (60 - 90 mesin)
 * sesuai seluruh aturan pabrik & cluster di brain.js, dan menyimpannya ke folder
 * /history/ dalam format JSON standar yang siap di-commit ke GitHub.
 * 
 * Penggunaan CLI:
 *   npm run generate-history
 *   node tools/generate_history.js --count=10 --min=60 --max=90 --start-date=2026-01-02
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import BrainAI from '../src/brain/index.js';


// Parsing CLI Arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    count: 10,
    minMachines: 60,
    maxMachines: 90,
    mode: 1,
    startDate: '2026-01-02',
    outDir: path.join(rootDir, 'history'),
    quiet: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--count=')) options.count = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--min=')) options.minMachines = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--max=')) options.maxMachines = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--mode=')) options.mode = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--start-date=')) options.startDate = arg.split('=')[1];
    else if (arg.startsWith('--out-dir=')) options.outDir = path.resolve(rootDir, arg.split('=')[1]);
    else if (arg === '--quiet') options.quiet = true;
  });

  return options;
}

/**
 * Utility untuk memformat tanggal
 */
function formatDate(dateObj) {
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return {
    dmy: `${d}-${m}-${y}`,
    iso: `${y}-${m}-${d}`,
  };
}

/**
 * Generator Utama History
 */
export async function generateHistoryDataset(customOptions = {}) {
  const opts = { ...parseArgs(), ...customOptions };

  if (!opts.quiet) {
    console.log('\n========================================================');
    console.log('🧠 AI HISTORY DATASET GENERATOR — MAP LIQUID 3');
    console.log('========================================================');
    console.log(`📌 Jumlah File Simulasi : ${opts.count} sesi`);
    console.log(`📌 Rentang Mesin Running : ${opts.minMachines} s/d ${opts.maxMachines} mesin`);
    console.log(`📌 Mode Perencanaan     : Mode ${opts.mode}`);
    console.log(`📌 Tanggal Awal         : ${opts.startDate}`);
    console.log(`📁 Folder Output        : ${opts.outDir}`);
    console.log('--------------------------------------------------------\n');
  }

  // Pastikan direktori output ada
  if (!fs.existsSync(opts.outDir)) {
    fs.mkdirSync(opts.outDir, { recursive: true });
  }

  // Muat data denah & manpower
  const mapPath = path.join(rootDir, 'data', 'map.json');
  const mpPath = path.join(rootDir, 'data', 'manpower.json');

  if (!fs.existsSync(mapPath)) {
    throw new Error(`File map data tidak ditemukan di ${mapPath}`);
  }

  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const mpData = fs.existsSync(mpPath)
    ? JSON.parse(fs.readFileSync(mpPath, 'utf8'))
    : { core: [], nonCore: [] };

  const allMachines = mapData.machines || [];
  const allCqis = mapData.cqis || [];

  const shifts = ['Pagi', 'Siang', 'Malam'];
  const generatedFiles = [];
  const allHistoricalPairs = [];

  let currentDate = new Date(opts.startDate);
  if (isNaN(currentDate.getTime())) {
    currentDate = new Date();
  }

  for (let i = 0; i < opts.count; i++) {
    const shift = shifts[i % shifts.length];
    const { dmy, iso } = formatDate(currentDate);

    // Tentukan jumlah mesin running secara acak dalam batas [minMachines, maxMachines]
    const targetRunningCount = Math.min(
      allMachines.length,
      Math.max(
        opts.minMachines,
        Math.floor(Math.random() * (opts.maxMachines - opts.minMachines + 1)) + opts.minMachines
      )
    );

    // Pilih mesin running secara cerdas (pastikan variasi cluster & line realistis)
    const shuffled = [...allMachines].sort(() => Math.random() - 0.5);
    const selectedMachines = shuffled.slice(0, targetRunningCount).map((m) => ({
      ...m,
      status: 'RUNNING',
    }));

    // Siapkan CQI berstatus READY
    const selectedCqis = allCqis.map((c) => ({
      ...c,
      status: 'READY',
    }));

    // Konfigurasi Manpower
    const config = {
      mode: opts.mode,
      core: mpData.core && mpData.core.length > 0 ? mpData.core.length : 14,
      coreData: mpData.core || [],
      nonCoreData: mpData.nonCore || [],
      longshift: 0,
    };

    // Jalankan engine perencanaan BrainAI
    const plan = BrainAI.generatePlan(selectedMachines, selectedCqis, config, mapData);

    const allRunning = plan.flatMap((s) => s.machines || []);
    const filePairs = [];

    // Bentuk struktur data planning yang rapi untuk GitHub
    const structuredPlanning = plan.map((slot, sIdx) => {
      const cqiName = slot.cqi ? slot.cqi.name || slot.cqi.id : `CQI-${sIdx + 1}`;
      const coreNames = slot.coreNames || (slot.core ? [String(slot.core)] : []);
      const nonCoreNames = slot.nonCore || [];
      const longshiftNames = slot.longshift || [];
      const machineNames = (slot.machines || []).map((m) => m.name || m.id || String(m));
      const formattedMachines = BrainAI.formatMachineList(slot.machines, allRunning);

      // Rekam pasangan mesin-CQI untuk pembelajaran AI
      (slot.machines || []).forEach((m) => {
        const pair = {
          machineId: m.id || m.name,
          machineName: m.name || m.id,
          line: m.line || '',
          cluster: m.cluster || '',
          cqiId: slot.cqi ? slot.cqi.id || slot.cqi.name : cqiName,
          cqiName: cqiName,
          cqiLine: slot.cqi ? slot.cqi.line || '' : '',
          date: dmy,
          shift: shift,
          timestamp: currentDate.toISOString(),
        };
        filePairs.push(pair);
        allHistoricalPairs.push(pair);
      });

      return {
        no: sIdx + 1,
        cqi: cqiName,
        cqi_line: slot.cqi ? slot.cqi.line || '-' : '-',
        core: coreNames,
        non_core: nonCoreNames,
        longshift: longshiftNames,
        total_manpower: coreNames.length + nonCoreNames.length + longshiftNames.length,
        total_machines: machineNames.length,
        machines: machineNames,
        machines_formatted: formattedMachines,
      };
    });

    // Format legacy untuk kompatibilitas riwayat lama (planning_history)
    const legacyCqiFormat = plan.map((slot) => ({
      nama: slot.cqi ? slot.cqi.name || slot.cqi.id : 'CQI',
      mesin: (slot.machines || []).map((m) => m.name || m.id || String(m)),
      total_jarak: 0,
      efisiensi: 0,
    }));

    const filePayload = {
      meta: {
        app: 'MAP LIQUID 3 - Production View',
        date: dmy,
        date_iso: iso,
        shift: shift,
        generated_at: new Date().toISOString(),
        total_cqi: structuredPlanning.length,
        total_machines_running: allRunning.length,
        mode: opts.mode,
        total_core: config.coreData.length,
        total_non_core: config.nonCoreData.length,
        total_longshift: config.longshift,
      },
      planning: structuredPlanning,
      planning_history: [
        {
          tanggal: iso,
          shift: shift,
          area: 'Liquid 3',
          cqi: legacyCqiFormat,
        },
      ],
      pairs: filePairs,
    };

    // Nama file standar: planning-YYYY-MM-DD-shift.json atau DD-MM-YYYY.json
    const fileName = `planning-${iso}-${shift.toLowerCase()}.json`;
    const filePath = path.join(opts.outDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(filePayload, null, 2), 'utf8');

    generatedFiles.push({
      fileName,
      filePath,
      date: dmy,
      shift,
      totalMachines: allRunning.length,
      totalCqi: structuredPlanning.length,
      totalPairs: filePairs.length,
    });

    if (!opts.quiet) {
      console.log(
        ` ✅ [${i + 1}/${opts.count}] ${fileName} -> ${allRunning.length} Mesin | ${structuredPlanning.length} CQI`
      );
    }

    // Naikkan tanggal untuk iterasi berikutnya
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 1. Simpan / Perbarui learning_data.json gabungan
  const learningDataPath = path.join(opts.outDir, 'learning_data.json');
  let existingLearning = [];
  if (fs.existsSync(learningDataPath)) {
    try {
      const raw = fs.readFileSync(learningDataPath, 'utf8');
      existingLearning = JSON.parse(raw);
    } catch (e) {
      existingLearning = [];
    }
  }

  const combinedLearning = [...allHistoricalPairs, ...existingLearning];
  // Filter deduplikasi timestamp + machineId + cqiId
  const seenKey = new Set();
  const dedupedLearning = combinedLearning.filter((item) => {
    const key = `${item.machineId}_${item.cqiId}_${item.date || item.timestamp}`;
    if (seenKey.has(key)) return false;
    seenKey.add(key);
    return true;
  });

  fs.writeFileSync(learningDataPath, JSON.stringify(dedupedLearning, null, 2), 'utf8');

  // 2. Simpan manifest.json untuk indexing semua history
  const manifestPath = path.join(opts.outDir, 'manifest.json');
  const allHistoryFiles = fs
    .readdirSync(opts.outDir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json' && f !== 'learning_data.json');

  const manifest = {
    updated_at: new Date().toISOString(),
    total_files: allHistoryFiles.length,
    total_learning_records: dedupedLearning.length,
    files: allHistoryFiles,
    generated_sessions: generatedFiles,
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  if (!opts.quiet) {
    console.log('\n========================================================');
    console.log('🎉 SELESAI! Data History Berhasil Dibuat');
    console.log('========================================================');
    console.log(`📁 File Baru Dibuat    : ${generatedFiles.length} file di ${opts.outDir}`);
    console.log(`🧠 Total Data Training : ${dedupedLearning.length} riwayat pasangan`);
    console.log(`📑 Manifest Index      : ${manifestPath}`);
    console.log('--------------------------------------------------------');
    console.log('🚀 PERINTAH UNTUK MEMASUKKAN KE GITHUB:');
    console.log('   git add history/');
    console.log('   git commit -m "feat(history): update AI training dataset from planning-maker"');
    console.log('   git push origin main');
    console.log('========================================================\n');
  }

  return {
    success: true,
    generatedFiles,
    totalLearningRecords: dedupedLearning.length,
    manifest,
  };
}

// Jalankan otomatis jika dipanggil langsung via CLI
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  generateHistoryDataset().catch((err) => {
    console.error('❌ Gagal membuat history:', err);
    process.exit(1);
  });
}
