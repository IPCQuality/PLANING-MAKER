/**
 * PLANNER CQI LIQUID 3 - BRAIN AI
 * --------------------------------
 * Algoritma: Constraint Satisfaction + Heuristic Scoring + Local Search
 * Prioritas : Coverage > Kapasitas Maks > Special Rules > Distance > Workstation > History > Line
 */

const WORKSTATIONS = {
  "0A": ["AST 33-16L", "AST 63-16L", "AST 14-12L"],
  "1A": ["AST 64-16L", "AST 36-16L", "AST 44-16L", "AST 61-16L"],
  "2A": ["AST 70-16L", "AST 69-16L", "AST 67-16L", "AST 68-16L"],
  "3A": ["AST 54-16L", "AST 55-16L", "AST 22-16L"],
  "4A": ["AST 26-16L", "AST 27-16L", "AST 28-16L", "AST 65-16L"],
  "5A": ["AST 29-16L", "AST 8-16L", "AST 10-16L", "AST 12-16L"],
  "6A": ["AST 30-16L", "AST 7-16L", "AST 9-16L", "AST 11-16L"],
  "7A": ["AST 71-16L", "AST 3-16L", "AST 5-16L", "AST 4-16L"],
  "8A": ["AST 72-16L", "AST 18-16L", "AST 6-16L", "AST 2-16L"],
  "9A": ["AST 15-16L", "AST 16-16L", "AST 17-16L"],
  "10A": ["AST 19-16L", "AST 20-16L", "AST 21-16L", "AST 60-16L"],
  
  "0B": ["K1", "K2"],
  "1B": ["AST 41-16L", "AST 47-16L", "AST 51-16L", "AST 50-16L"],
  "2B": ["AST 46-16L", "AST 45-16L", "AST 42-16L", "AST 43-16L"],
  "3B": ["AST 53-16L", "AST 52-16L", "AST 48-16L", "AST 49-16L"],
  "4B": ["APK 45", "APK 46"], 
  "5B": ["AST 24-12L", "AST 31-12L", "AST 23-12L", "AST 62-12L"],
  "6B": ["K8", "K7"],
  "7B": ["AST 39-12L", "AST 38-12L", "AST 37-12L", "AST 40-12L"],
  "8B": ["APK 15", "APK 12"], 
  "9B": ["AST 66-16L", "AST 35-16L", "AST 34-16L", "AST 73-12L"],
  "10B": ["AST 25-12L", "AST 13-12L", "AST 32-12L"],
  "11B": ["X3"],

  "1C": ["APK 40", "APK 43", "APK 44"],
  "2C": ["APK 19", "APK 26"],
  "3C": ["APK 13", "APK 61", "APK 9"],
  "4C": ["APK 42", "APK 38", "APK 55"],
  "5C": ["APK 32", "APK 54"],
  "6C": ["K5", "K6"],
  "7C": ["X2", "K9"],
  "8C": ["APK 58", "APK 59"],
  "9C": ["APK 63"],
  "10C": ["APK 31", "APK 56"],

  "WW": ["C1", "C2"],
  "OT": ["M2", "M3"]
};

const BrainAI = {
  WORKSTATIONS: WORKSTATIONS,

  normalizeName(str) {
    return str ? String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
  },

  getWorkstationKey(machineName) {
    if (!machineName) return null;
    let norm = this.normalizeName(machineName);
    for (let wsKey in WORKSTATIONS) {
      if (WORKSTATIONS[wsKey].some(item => this.normalizeName(item) === norm)) {
        return wsKey;
      }
    }
    return null;
  },

  getDistance(r1, c1, r2, c2) {
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(c1 - c2, 2));
  },

  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50; // Neutral score jika belum ada history
  },

  recordHistory(machineId, cqiId, success = true, meta = {}) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (!hist[machineId]) hist[machineId] = {};
    if (!hist[machineId][cqiId]) {
      hist[machineId][cqiId] = { count: 0, success: 0, lastDistance: meta.dist || null, lastUsed: null };
    }
    hist[machineId][cqiId].count++;
    if (success) hist[machineId][cqiId].success++;
    hist[machineId][cqiId].lastUsed = new Date().toISOString();
    if (meta.dist) hist[machineId][cqiId].lastDistance = meta.dist;
    localStorage.setItem('planning_history', JSON.stringify(hist));
  },

  _calculateCapacityLimits(nonCoreCount) {
    if (nonCoreCount === 0) return { min: 4, targetMin: 4, targetMax: 6, absoluteMax: 6 };
    if (nonCoreCount === 1) return { min: 5, targetMin: 5, targetMax: 6, absoluteMax: 6 };
    return { min: 8, targetMin: 8, targetMax: 9, absoluteMax: 9 };
  },

  _scoreSlot(m, slot, slots) {
    if (slot.isExclusive || slot.machines.length >= slot.limits.absoluteMax) return -Infinity;

    let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
    let distScore = Math.max(0, 100 - (dist * 2)); 
    let histScore = this.getHistory(m.id, slot.cqi.id) * 0.3; // 0 to 30

    let wsBonus = 0;
    if (m.wsKey) {
      let sameWs = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
      if (sameWs > 0) wsBonus = 150 + (sameWs * 50); // Tarik magnet kuat jika WS sama
    }

    let lineA_Priority = 0;
    const lineACqiPriority = { "0A":0, "1A":0, "2A":1, "3A":1, "4A":2, "5A":2, "6A":3, "7A":3, "8A":4, "9A":4, "10A":4 };
    if (m.wsKey && lineACqiPriority[m.wsKey] !== undefined) {
      let idx = slots.indexOf(slot);
      if (idx === lineACqiPriority[m.wsKey] || idx === (lineACqiPriority[m.wsKey] % slots.length)) {
        lineA_Priority = 80;
      }
    }

    let penaltyMix = 0;
    if (m.isApk && slot.machines.some(sm => sm.isAst)) penaltyMix = -200;
    if (m.isAst && slot.machines.some(sm => sm.isApk)) penaltyMix = -200;

    let capScore = ((slot.limits.absoluteMax - slot.machines.length) * 10); 

    return distScore + histScore + wsBonus + lineA_Priority + penaltyMix + capScore;
  },

  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    let activeCQIs = cqis.slice(0, coreLimit); 

    // 1. SETUP SLOTS & NON-CORE DISTRIBUTION (MAKSIMAL 2 ORANG PER CQI)
    let slots = activeCQIs.map((cqi, i) => {
      return {
        slotId: 'SLOT-' + i, 
        cqi: cqi, 
        core: (config.coreNames && config.coreNames[i]) ? config.coreNames[i] : `CORE ${i+1}`,
        nonCore: [], 
        machines: [],
        isExclusive: false
      };
    });

    let availableSlotsForNc = [...slots];
    for (let i = 0; i < nonCoreCount; i++) {
      // Sort slot berdasarkan jumlah Non Core terkecil
      availableSlotsForNc.sort((a, b) => a.nonCore.length - b.nonCore.length);
      let slot = availableSlotsForNc[0];
      
      if (slot && slot.nonCore.length < 2) {
        slot.nonCore.push((config.nonCoreNames && config.nonCoreNames[i]) ? config.nonCoreNames[i] : `NON CORE ${i+1}`);
      } else {
        // Break jika semua CQI sudah memiliki 2 Non Core (Maksimum Absolut)
        break;
      }
    }

    slots.forEach(slot => {
      slot.limits = this._calculateCapacityLimits(slot.nonCore.length);
    });

    // 2. PREPROCESSING MACHINES
    let unassigned = machines.map(m => {
      let nm = { ...m };
      let upName = (nm.name || nm.id).toUpperCase();
      nm.wsKey = this.getWorkstationKey(nm.name || nm.id) || nm.ws || null;
      nm.isApk = upName.startsWith('APK');
      nm.isAst = upName.startsWith('AST');
      nm.isM2M3 = ['M2', 'M3'].includes(upName);
      nm.isC1C2 = ['C1', 'C2'].includes(upName);
      return nm;
    });

    // 3. SPECIAL RULES ASSIGNMENT (KUNCI MUTLAK)
    
    // --- ATURAN 1: M2/M3 -> CQI 19 ---
    let slot19 = slots.find(s => String(s.cqi.name).includes('19') || String(s.cqi.id) === '19');
    let m2m3Machines = unassigned.filter(m => m.isM2M3);
    if (slot19 && m2m3Machines.length > 0) {
      slot19.machines.push(...m2m3Machines);
      slot19.isExclusive = true; // Kunci slot agar tidak dimasuki mesin lain sepenuhnya
      unassigned = unassigned.filter(m => !m.isM2M3);
    }

    // --- ATURAN 2: C1/C2 -> CQI 24 (Hanya Boleh Tambah Maksimal 2 Mesin APK Terdekat) ---
    let slot24 = slots.find(s => String(s.cqi.name).includes('24') || String(s.cqi.id) === '24');
    let c1c2Machines = unassigned.filter(m => m.isC1C2);
    if (slot24 && c1c2Machines.length > 0) {
      slot24.machines.push(...c1c2Machines);
      unassigned = unassigned.filter(m => !m.isC1C2);
      
      // Filter & Sorting mesin APK terdekat
      let apks = unassigned.filter(m => m.isApk)
        .sort((a, b) => this.getDistance(a.row, a.col, slot24.cqi.row, slot24.cqi.col) - this.getDistance(b.row, b.col, slot24.cqi.row, slot24.cqi.col));
      
      // Ambil maksimal 2 mesin APK saja (Sesuai Aturan)
      let toFill = Math.min(apks.length, 2);
      let selectedApks = apks.slice(0, toFill);
      slot24.machines.push(...selectedApks);
      
      unassigned = unassigned.filter(m => !selectedApks.map(s => s.id).includes(m.id));
      slot24.isExclusive = true; // Kunci slot agar tidak dicampur mesin AST atau APK berlebih pada fase berikutnya
    }

    // 4. GROUPING & GREEDY INITIALIZATION
    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));
    
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots);
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
      } else {
        remainingUnassigned.push(m);
      }
    });

    // 5. REPAIR PASS (Redistribusi Global utk 100% Coverage)
    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 3;
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift();
        let placed = false;

        let fallbackSlots = [...slots].filter(s => !s.isExclusive)
          .sort((a, b) => this.getDistance(u.row, u.col, a.cqi.row, a.cqi.col) - this.getDistance(u.row, u.col, b.cqi.row, b.cqi.col));

        for (let target of fallbackSlots) {
          if (target.machines.length < target.limits.absoluteMax) {
            target.machines.push(u); placed = true; break;
          } else {
            // Swap logik: Slot penuh, coba pindahkan salah satu mesin ke CQI lain yang belum penuh
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i];
              let newHomes = [...slots].filter(s => s !== target && !s.isExclusive && s.machines.length < s.limits.absoluteMax)
                .sort((a, b) => this.getDistance(occupant.row, occupant.col, a.cqi.row, a.cqi.col) - this.getDistance(occupant.row, occupant.col, b.cqi.row, b.cqi.col));
              
              if (newHomes.length > 0) {
                newHomes[0].machines.push(occupant); 
                target.machines.splice(i, 1);        
                target.machines.push(u);             
                placed = true;
                break;
              }
            }
          }
          if (placed) break;
        }
        if (!placed) remainingUnassigned.push(u); // Mentok kapasitas absolut seluruh sistem
        iterations--;
      }
    }

    // 6. OPTIMIZATION PASS (Swap & Local Search)
    let optIter = 0;
    let improved = true;
    while(improved && optIter < 10) {
      improved = false;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          let sA = slots[i]; let sB = slots[j];
          if (sA.isExclusive || sB.isExclusive) continue;

          for (let m = 0; m < sA.machines.length; m++) {
            for (let n = 0; n < sB.machines.length; n++) {
              let mA = sA.machines[m]; let mB = sB.machines[n];

              let distBefore = this.getDistance(mA.row, mA.col, sA.cqi.row, sA.cqi.col) + 
                               this.getDistance(mB.row, mB.col, sB.cqi.row, sB.cqi.col);
              let distAfter = this.getDistance(mA.row, mA.col, sB.cqi.row, sB.cqi.col) + 
                              this.getDistance(mB.row, mB.col, sA.cqi.row, sA.cqi.col);
              
              if (distAfter < distBefore - 3) {
                sA.machines[m] = mB;
                sB.machines[n] = mA;
                improved = true;
              }
            }
          }
        }
      }
      optIter++;
    }

    if (remainingUnassigned.length > 0) {
      console.warn("WARNING: Kekurangan kapasitas mutlak. Mesin terlewat:", remainingUnassigned.map(m=>m.name));
    }

    return slots;
  },

  validate(plan, totalMachinesCount) {
    let report = {
      valid: true,
      coveragePercent: 0,
      totalMachines: totalMachinesCount,
      assignedCount: 0,
      unassignedMachines: [],
      duplicateMachines: [],
      violations: [],
      totalDistance: 0,
      avgDistance: 0,
      score: 100
    };

    let coveredIds = new Set();
    let machineDistances = [];

    plan.forEach(slot => {
      // Validasi: Maksimum Non-Core 2
      if (slot.nonCore.length > 2) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} memiliki ${slot.nonCore.length} NON CORE (Maks 2).`);
        report.valid = false;
      }
      
      let limits = this._calculateCapacityLimits(slot.nonCore.length);
      if (slot.machines.length > limits.absoluteMax) {
        report.violations.push(`[OVERLOAD] CQI ${slot.cqi.name} melampaui Absolute Max (${slot.machines.length}/${limits.absoluteMax}).`);
        report.score -= 20;
      }
      
      // Strict rule check M2/M3
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
      if (hasM2M3) {
        let pure = slot.machines.every(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
        if (!pure) {
          report.violations.push(`[RULE] CQI ${slot.cqi.name} mencampur M2/M3 dengan mesin biasa.`);
          report.score -= 30;
        }
      }

      // Strict rule check C1/C2
      let hasC1C2 = slot.machines.some(m => ['C1', 'C2'].includes((m.name||m.id).toUpperCase()));
      if (hasC1C2) {
        let otherMachines = slot.machines.filter(m => !['C1', 'C2'].includes((m.name||m.id).toUpperCase()));
        let hasNonApk = otherMachines.some(m => !(m.name||m.id).toUpperCase().startsWith('APK'));
        
        if (hasNonApk) {
          report.violations.push(`[RULE] CQI ${slot.cqi.name} mencampur C1/C2 dengan mesin selain APK.`);
          report.score -= 30;
        }
        if (otherMachines.length > 2) {
          report.violations.push(`[RULE] CQI ${slot.cqi.name} (C1/C2) memuat lebih dari 2 mesin tambahan.`);
          report.score -= 30;
        }
      }

      // Hitung Jarak & Duplikat
      slot.machines.forEach(m => {
        if (coveredIds.has(m.id)) {
          report.duplicateMachines.push(m.name);
          report.valid = false;
        }
        coveredIds.add(m.id);
        
        let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
        report.totalDistance += dist;
        machineDistances.push(dist);
      });
    });

    report.assignedCount = coveredIds.size;
    report.coveragePercent = Math.round((report.assignedCount / report.totalMachines) * 100) || 0;
    report.avgDistance = report.assignedCount > 0 ? +(report.totalDistance / report.assignedCount).toFixed(2) : 0;

    if (report.coveragePercent < 100) {
      report.valid = false;
      report.violations.push(`[COVERAGE] Ada ${report.totalMachines - report.assignedCount} mesin yang gagal masuk planning (Missing).`);
      report.score -= (100 - report.coveragePercent); 
    }

    if (report.violations.length > 0) report.valid = false;
    
    return report;
  },

  formatMachineList(machines) {
    if (!machines || machines.length === 0) return '-';
    let wsGroups = {}; let unGrouped = [];

    machines.forEach(m => {
      let mName = m.name || m.id;
      let wsKey = this.getWorkstationKey(mName);
      if (wsKey && WORKSTATIONS[wsKey]) {
        if (!wsGroups[wsKey]) wsGroups[wsKey] = [];
        wsGroups[wsKey].push(mName);
      } else {
        unGrouped.push(mName);
      }
    });

    let parts = [];
    for (let wsKey in wsGroups) {
      let group = wsGroups[wsKey];
      if (group.length === WORKSTATIONS[wsKey].length) {
        parts.push(`${wsKey} (${group.length})`);
      } else {
        group.forEach(name => parts.push(name));
      }
    }
    unGrouped.forEach(name => parts.push(name));
    return parts.join(', ');
  },

  formatText(plan, config) {
    let date = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    
    let txt = `PLANNING LIQUID 3\nTanggal ${dateStr}\n\n`;
    
    plan.forEach((slot, i) => {
      txt += `${i + 1}.\n`;
      txt += `MESIN : ${this.formatMachineList(slot.machines)}\n`;
      // Dipastikan hanya menampilkan list Nama (tanpa jumlah orang)
      txt += `NON CORE : ${slot.nonCore.join(', ') || '-'}\n`;
      txt += `CORE : ${slot.core}\n`;
      txt += `CQI : ${slot.cqi.name}\n\n`;
    });

    txt += `QC PASSED :\n`;
    let qcArr = config.qcPassed ? config.qcPassed.split('\n').filter(x => x.trim() !== '') : [];
    if (qcArr.length === 1) txt += `${qcArr[0]}\n`;
    else for(let i=0; i<qcArr.length; i++) txt += `${qcArr[i]}\n`;

    txt += `\nMIL-STD : ${config.milStd || '-'}\n`;
    txt += `Standby OT : ${config.standbyOt || '-'}\n`;
    txt += `Support FG : ${config.supportFg || '-'}\n`;
    
    return txt;
  },

  async initHistory(githubRawUrl) {
    try {
      const response = await fetch(githubRawUrl);
      if (!response.ok) throw new Error("Gagal mengambil file history dari GitHub");
      const githubHistory = await response.json();
      let localHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');

      for (let machineId in githubHistory) {
        if (!localHistory[machineId]) localHistory[machineId] = {};
        for (let cqiId in githubHistory[machineId]) {
          if (!localHistory[machineId][cqiId]) {
            localHistory[machineId][cqiId] = githubHistory[machineId][cqiId];
          } else {
            localHistory[machineId][cqiId].count += githubHistory[machineId][cqiId].count;
            localHistory[machineId][cqiId].success += githubHistory[machineId][cqiId].success;
          }
        }
      }
      localStorage.setItem('planning_history', JSON.stringify(localHistory));
      console.log("✅ History AI tersinkronisasi");
    } catch (error) {
      console.warn("⚠️ Menggunakan local history (Sync GitHub dilewati).");
    }
  },

  parseAndLearn(planningText) {
    const lines = planningText.split('\n');
    let currentHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');

    lines.forEach(line => {
      let match = line.match(/^\d+\.\s+(.*?)\s+:\s+(.*)$/);
      if (match) {
        let machinePart = match[1]; 
        let cqiPart = match[2].split('->').pop().trim();
        
        let rawMachines = machinePart.split(/[\+,]/).map(m => m.trim());
        rawMachines.forEach(machineStr => {
          let machineId = machineStr.replace(/\s*\d+\s*mesin/gi, '').trim();
          if (!machineId) return;

          if (!currentHistory[machineId]) currentHistory[machineId] = {};
          if (!currentHistory[machineId][cqiPart]) currentHistory[machineId][cqiPart] = { count: 0, success: 0, lastUsed: null };

          currentHistory[machineId][cqiPart].count += 1;
          currentHistory[machineId][cqiPart].success += 1;
          currentHistory[machineId][cqiPart].lastUsed = new Date().toISOString();
        });
      }
    });

    localStorage.setItem('planning_history', JSON.stringify(currentHistory));
    return JSON.stringify(currentHistory, null, 2);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrainAI;
}
