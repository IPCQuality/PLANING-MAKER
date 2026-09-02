import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import BrainAI from '../src/brain/index.js';

const mapData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/map.json'), 'utf8'));
const manpowerData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/manpower.json'), 'utf8'));

const allMachines = mapData.machines;
// Aktifkan semua CQI sebagai READY untuk menguji jika CQI di line B dan C diaktifkan
const allReadyCqis = mapData.cqis.map(c => ({ ...c, status: 'READY' }));

const scenarios = [
  {
    name: "Skenario 1: Full Running Semua Line (Semua CQI READY)",
    mode: 1,
    machines: allMachines.slice(0, 75),
    cqis: allReadyCqis
  },
  {
    name: "Skenario 2: Line B Ramai (0B-11B) + Line A Sebagian (Semua CQI READY)",
    mode: 1,
    machines: allMachines.filter(m => {
      const ws = BrainAI.getWorkstationKey(m, mapData.labels);
      return ws.endsWith('B') || ['1A', '2A', '3A', '4A', '1C', '2C'].includes(ws);
    }),
    cqis: allReadyCqis
  },
  {
    name: "Skenario 3: Mode 2 (2 Checker per CQI, Semua CQI READY)",
    mode: 2,
    machines: allMachines.slice(0, 50),
    cqis: allReadyCqis
  },
  {
    name: "Skenario 4: Line C Dominan (1C-10C) + OT & WW (Semua CQI READY)",
    mode: 1,
    machines: allMachines.filter(m => {
      const ws = BrainAI.getWorkstationKey(m, mapData.labels);
      return ws.endsWith('C') || ['OT', 'WW', '1A', '2A', '1B', '2B'].includes(ws);
    }),
    cqis: allReadyCqis
  }
];

let allPassed = true;

scenarios.forEach((sc) => {
  console.log(`\n==================================================`);
  console.log(`TEST: ${sc.name}`);
  console.log(`Total Mesin Running: ${sc.machines.length}`);

  const config = {
    mode: sc.mode,
    coreData: manpowerData.core,
    coreNames: manpowerData.core.map(c => c.name),
    nonCoreData: manpowerData.nonCore,
    nonCoreNames: manpowerData.nonCore.map(c => c.name),
    longshift: 0
  };

  const plan = BrainAI.generatePlan(sc.machines, sc.cqis, config, mapData);
  console.log(`Jumlah Slot CQI Terpilih: ${plan.length}`);

  let crossLineViolations = [];

  plan.forEach(slot => {
    const cqiLine = BrainAI.getCqiPrimaryLine(slot.cqi);
    const macNames = slot.machines.map(m => {
      const ws = BrainAI.getWorkstationKey(m, mapData.labels);
      const mLine = BrainAI.getMachineLine ? BrainAI.getMachineLine(m, mapData.labels) : 'UNKNOWN';

      if (cqiLine !== 'OTHER' && mLine !== 'OTHER' && cqiLine !== mLine) {
        if (slot.cqiNum === '15' && (ws === '1C' || ws === '2C')) {
          // Resmi boleh
        } else if (slot.cqiNum === '24' && mLine === 'LINE C') {
          // Resmi boleh (APK Line C ke WW)
        } else {
          crossLineViolations.push({
            cqi: slot.cqi.name,
            cqiLine,
            machine: m.name || m.id,
            ws,
            mLine
          });
        }
      }
      return `${m.name}(${ws})`;
    });

    console.log(`- [${slot.cqi.name}] (${cqiLine} | ${slot.machines.length} mesin): ${macNames.join(', ')}`);
  });

  if (plan.unassignedMachines && plan.unassignedMachines.length > 0) {
    console.log(`⚠️ Unassigned Machines (${plan.unassignedMachines.length}): ${plan.unassignedMachines.map(m => m.name).join(', ')}`);
    allPassed = false;
  }

  if (crossLineViolations.length > 0) {
    console.log(`🚨 DETEKSI CROSS-LINE (${crossLineViolations.length} mesin):`);
    crossLineViolations.forEach(v => {
      console.log(`  * Mesin ${v.machine} (${v.ws} - ${v.mLine}) masuk ke ${v.cqi} (${v.cqiLine})`);
    });
    allPassed = false;
  } else {
    console.log(`✅ TIDAK ADA CROSS-LINE ILEGAL!`);
  }
});

console.log(`\n==================================================`);
if (allPassed) {
  console.log(`🎉 SEMUA TEST SKENARIO BERHASIL & LOLOS VALIDASI!`);
} else {
  console.log(`❌ ADA SKENARIO YANG MEMILIKI PELANGGARAN.`);
}
