/**
 * PLANNER CQI LIQUID 3 - BRAIN AI (UPDATED WORKFLOW)
 * --------------------------------------------------
 * Sesuai dengan Alur:
 * 1. Identifikasi Mesin
 * 2. Cek Rule Khusus (CQI 19 & 24)
 * 3. Pilih CQI Terbaik
 * 4. Buat Slot CQI
 * 5. Masukkan Mesin
 * 6. Pembagian Prioritas
 * 6.5 Paksa & Geser (Bulldozer Logic - Jarak Aktual)
 * 7. Optimasi
 * 8. Validasi Akhir
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

// ACUAN PRIORITAS BERDASARKAN PLANNING LIQUID 3
const CQI_PRIORITY_MAP = {
  "1": ["0A", "1A"],
  "2": ["2A", "2B"],
  "3": ["3A", "4A"],
  "4": ["3A", "4A", "5B"],
  "5": ["5A", "6A"],
  "6": ["5A", "6A"],
  "7": ["7A", "8A"],
  "8": ["8A", "9A", "10B"],
  "9": ["9A", "10A"],
  "10": ["10A", "1C", "2C"],
  "11": ["1B", "2B"],
  "13": ["3B", "5B"],
  "14": ["0B", "6B", "7A", "10B"],
  "15": ["7B", "8B", "9B"],
  "17": ["3C", "4C", "5C", "8C"],
  "18": ["2C", "3C", "4C", "5C"],
  "19": ["OT"],
  "20": ["6C", "7C", "8C", "9C", "10C"],
  "24": ["WW"]
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

  /**
   * JARAK AKTUAL (Manhattan Distance)
   * Mengukur sesuai jalur jalan tegak lurus pada grid map, BUKAN garis lurus miring (Euclidean).
   */
  getDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  },

  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50;
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

  // PENENTUAN ATURAN KAPASITAS & NON CORE
  _getRequiredNonCore(slot, astCount, apkCount) {
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);

    let is19 = cqiIdStr === '19';
    if (is19) return 0;

    let is24 = cqiIdStr === '24';
    let hasC1C2 = slot.machines.some(m => m.isC1C2);
    let total = astCount + apkCount;
    
    if (is24 && hasC1C2) {
       if (total <= 2) return 0; 
       return 1; 
    }

    if (total === 0) return 0;
    
    let isAstDominant = astCount > 0;
    
    if (isAstDominant) {
      if (total <= 4) return 0;
      if (total <= 6) return 1;
      return 2;
    } else {
      if (total <= 5) return 0;
      if (total <= 7) return 1;
      return 2;
    }
  },

  // STEP 5: CEK APAKAH MESIN BOLEH MASUK CQI (Strict Maximum Capacity)
  _canAcceptMachine(slot, m, availableNC) {
    if (slot.isExclusive) return { can: false };

    let hasAst = slot.machines.some(sm => sm.isAst);
    let hasApk = slot.machines.some(sm => sm.isApk || sm.isC1C2);

    if (hasAst && (m.isApk || m.isC1C2)) return { can: false, reason: "strict_mix" };
    if (hasApk && m.isAst) return { can: false, reason: "strict_mix" };

    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isApk || sm.isC1C2).length + (m.isApk || m.isC1C2 ? 1 : 0);
    
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
    let neededNC = reqNC - slot.nonCore.length;
    
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let is24 = cqiIdStr === '24';
    
    let hasC1C2 = slot.machines.some(sm => sm.isC1C2) || m.isC1C2;
    let isAstDominant = astCount > 0;
    
    let absoluteMax;
    if (is24 && hasC1C2) {
      absoluteMax = 4;
    } else if (isAstDominant) {
      absoluteMax = (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8);
    } else {
      absoluteMax = (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8);
    }
    
    if (astCount + apkCount > absoluteMax) return { can: false, reason: "capacity" }; 
    if (neededNC > availableNC) return { can: false, reason: "no_nc" }; 
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: absoluteMax };
  },

  // STEP 6: PEMBAGIAN MESIN (Skoring)
  _scoreSlot(m, slot, slots, availableNC, planMode = 'ai') {
    let acceptStatus = this._canAcceptMachine(slot, m, availableNC);
    if (!acceptStatus.can) return -Infinity;

    let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
    let distScore = Math.max(0, 100 - (dist * 2)); 
    
    const historyWeight = planMode === 'history' ? 2.0 : 0.3;
    let histScore = this.getHistory(m.id, slot.cqi.id) * historyWeight;
    let priorityBonus = 0;
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);

    if (m.wsKey && CQI_PRIORITY_MAP[cqiIdStr] && CQI_PRIORITY_MAP[cqiIdStr].includes(m.wsKey)) {
        priorityBonus = 2000; 
    }

    let wsBonus = 0;
    if (m.wsKey) {
      let sameWs = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
      if (sameWs > 0) wsBonus = 500 + (sameWs * 200); 
    }

    let ncPenalty = acceptStatus.neededNC > 0 ? -1000 : 0; 
    let totalMachines = slot.machines.length + 1;
    let capScore = ((acceptStatus.absoluteMax - totalMachines) * 10); 

    let slotMachineCount = slot.machines.length;
    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getDistance(sm.row, sm.col, slot.cqi.row, slot.cqi.col), 0);
    let workloadPenalty = (slotMachineCount * 25) + (slotDistSum * 2);

    return distScore + histScore + wsBonus + priorityBonus + capScore + ncPenalty - workloadPenalty;
  },

  // INPUT DATA & PROSES UTAMA
  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;

    let nonCorePool = [];
    for (let i = 0; i < nonCoreCount; i++) {
      nonCorePool.push((config.nonCoreNames && config.nonCoreNames[i]) ? config.nonCoreNames[i] : `NON CORE ${i+1}`);
    }

    // ==========================================
    // STEP 1: IDENTIFIKASI MESIN
    // ==========================================
    let unassigned = machines.map(m => {
      let nm = { ...m };
      let upName = (nm.name || nm.id).toUpperCase();
      nm.wsKey = this.getWorkstationKey(nm.name || nm.id) || nm.ws || null;
      
      nm.isApk = upName.startsWith('APK') || upName.startsWith('K') || upName.startsWith('X');
      nm.isAst = upName.startsWith('AST');
      nm.isM2M3 = ['M2', 'M3'].includes(upName);
      nm.isC1C2 = ['C1', 'C2'].includes(upName);
      
      return nm;
    });

    // ==========================================
    // STEP 2 & 3: PILIH CQI TERBAIK
    // ==========================================
    let cqiScores = cqis.map(cqi => {
        let score = 0;
        let match = String(cqi.name || cqi.id).match(/\d+/);
        let cqiIdStr = match ? match[0] : String(cqi.id);

        let is19 = cqiIdStr === '19';
        let is24 = cqiIdStr === '24';

        unassigned.forEach(m => {
            if (m.wsKey && CQI_PRIORITY_MAP[cqiIdStr] && CQI_PRIORITY_MAP[cqiIdStr].includes(m.wsKey)) score += 1500;
            let dist = this.getDistance(m.row, m.col, cqi.row, cqi.col);
            if (dist < 15) score += 200;
            else if (dist < 30) score += 100;
            else if (dist < 50) score += 50;
            else if (dist < 80) score += 20;
            
            const cqiHistoryWeight = config.planMode === 'history' ? 2.0 : 0.1;
            score += this.getHistory(m.id, cqi.id) * cqiHistoryWeight;
            
            if (is19 && m.isM2M3) score += 10000;
            if (is24 && m.isC1C2) score += 10000;
        });
        return { cqi: cqi, score: score };
    });

    cqiScores.sort((a, b) => b.score - a.score);
    let activeCQIs = cqiScores.slice(0, coreLimit).map(cs => cs.cqi);

    // ==========================================
    // STEP 4: BUAT SLOT CQI
    // ==========================================
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

    const applyNonCoreIfNeeded = (slot) => {
      let astCount = slot.machines.filter(sm => sm.isAst).length;
      let apkCount = slot.machines.filter(sm => sm.isApk || sm.isC1C2).length;
      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
      while (slot.nonCore.length < reqNC && nonCorePool.length > 0) {
        slot.nonCore.push(nonCorePool.shift());
      }
    };

    let slot19 = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '19'; });
    let m2m3Machines = unassigned.filter(m => m.isM2M3);
    if (slot19 && m2m3Machines.length > 0) {
      slot19.machines.push(...m2m3Machines);
      slot19.isExclusive = true; 
      unassigned = unassigned.filter(m => !m.isM2M3);
      applyNonCoreIfNeeded(slot19);
    }

    let slot24 = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '24'; });
    let c1c2Machines = unassigned.filter(m => m.isC1C2);
    if (slot24 && c1c2Machines.length > 0) {
      slot24.machines.push(...c1c2Machines);
      unassigned = unassigned.filter(m => !m.isC1C2);
      
      // PERUBAHAN: Penarikan paksa APK ke CQI 24 Dihapus. 
      // Biarkan APK mencari slotnya sendiri saat Step 5.
      
      slot24.isExclusive = true; // Gembok agar mesin biasa tidak masuk sini di Step 5
      applyNonCoreIfNeeded(slot24);
    }

    // SEEDING
    slots.forEach(slot => {
      if (slot.machines.length === 0 && unassigned.length > 0) {
        unassigned.sort((a, b) => this.getDistance(a.row, a.col, slot.cqi.row, slot.cqi.col) - this.getDistance(b.row, b.col, slot.cqi.row, slot.cqi.col));
        let seedMachine = unassigned.shift();
        slot.machines.push(seedMachine);
        applyNonCoreIfNeeded(slot);
      }
    });

    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));
    
    // ==========================================
    // STEP 5: MASUKKAN MESIN (Skenario Normal)
    // ==========================================
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length, config.planMode || 'ai');
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
        applyNonCoreIfNeeded(bestSlot);
      } else {
        remainingUnassigned.push(m);
      }
    });

    // ==========================================
    // STEP 6.5: PAKSA & GESER (BULLDOZER LOGIC)
    // Paksakan mesin yang tersisa ke CQI terdekat (Jalur Aktual/Manhattan).
    // Jika penuh, geser penghuni lama ke CQI terdekat lainnya.
    // ==========================================
    
    // PERUBAHAN: Buka kunci CQI 24 HANYA sebagai pelarian terakhir untuk sisa APK (Fallback)
    let slot24Fallback = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '24'; });
    if (slot24Fallback && slot24Fallback.machines.some(m => m.isC1C2)) {
        slot24Fallback.isExclusive = false;
    }
    
    if (remainingUnassigned.length > 0) {
      // Loop ditingkatkan untuk memastikan proses cascading geser selesai
      let iterations = remainingUnassigned.length * 5; 
      
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift();
        let placed = false;

        // Cari CQI terdekat secara aktual (Tegak lurus sesuai lorong)
        let fallbackSlots = [...slots].filter(s => !s.isExclusive)
          .sort((a, b) => this.getDistance(u.row, u.col, a.cqi.row, a.cqi.col) - this.getDistance(u.row, u.col, b.cqi.row, b.cqi.col));

        for (let target of fallbackSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length);
          
          if (accept.can) {
            target.machines.push(u); 
            applyNonCoreIfNeeded(target);
            placed = true; 
            break;
          } 
          // Jika ditolak hanya karena masalah kapasitas atau kurang NON CORE (Bukan beda tipe AST/APK)
          else if (accept.reason === "capacity" || accept.reason === "no_nc") {
            
            // Coba geser salah satu mesin di dalam CQI ini (Occupant)
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i];
              
              // Angkat occupant sementara untuk memberi ruang
              target.machines.splice(i, 1); 

              let acceptU = this._canAcceptMachine(target, u, nonCorePool.length);
              
              if (acceptU.can) {
                // Cari rumah baru untuk si Occupant (Memprioritaskan jarak aktual terdekat dari Occupant ke CQI baru)
                let newHomes = [...slots].filter(s => s !== target && !s.isExclusive)
                  .sort((a, b) => this.getDistance(occupant.row, occupant.col, a.cqi.row, a.cqi.col) - this.getDistance(occupant.row, occupant.col, b.cqi.row, b.cqi.col));
                
                let foundHome = false;
                for(let home of newHomes) {
                  let currentNC = nonCorePool.length - acceptU.neededNC;
                  let acceptOcc = this._canAcceptMachine(home, occupant, Math.max(0, currentNC));
                  
                  if(acceptOcc.can) {
                     // Eksekusi Tukar! U masuk target, Occupant pindah ke Home.
                     target.machines.push(u); 
                     applyNonCoreIfNeeded(target);
                     
                     home.machines.push(occupant); 
                     applyNonCoreIfNeeded(home);
                     
                     placed = true; 
                     foundHome = true;
                     break;
                  }
                }
                if (foundHome) break;
              }
              // Jika gagal menemukan tempat untuk Occupant, kembalikan posisi semula (Rollback)
              target.machines.splice(i, 0, occupant); 
            }
          }
          if (placed) break;
        }
        
        // Jika masih gagal meski sudah dicoba geser, kembalikan ke antrean bawah
        if (!placed) remainingUnassigned.push(u); 
        iterations--;
      }
    }

    slots.forEach(slot => {
      let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
      let is19 = match && match[0] === '19';
      if (!is19 && slot.machines.length > 0) {
        while (slot.nonCore.length < 2 && nonCorePool.length > 0) {
          slot.nonCore.push(nonCorePool.shift());
        }
      }
    });

    // ==========================================
    // STEP 7: OPTIMASI
    // ==========================================
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
                sA.machines.splice(m, 1); sA.machines.push(mB);
                sB.machines.splice(n, 1); sB.machines.push(mA);
                
                let validA = !sA.machines.some(sm => sm.isAst) || !sA.machines.some(sm => sm.isApk || sm.isC1C2);
                let validB = !sB.machines.some(sm => sm.isAst) || !sB.machines.some(sm => sm.isApk || sm.isC1C2);

                let astA = sA.machines.filter(sm => sm.isAst).length;
                let apkA = sA.machines.filter(sm => sm.isApk || sm.isC1C2).length;
                let astB = sB.machines.filter(sm => sm.isAst).length;
                let apkB = sB.machines.filter(sm => sm.isApk || sm.isC1C2).length;
                
                let reqA = this._getRequiredNonCore(sA, astA, apkA);
                let reqB = this._getRequiredNonCore(sB, astB, apkB);

                if (!validA || !validB || reqA > sA.nonCore.length || reqB > sB.nonCore.length) {
                   sA.machines.splice(sA.machines.length-1, 1); sA.machines.splice(m, 0, mA);
                   sB.machines.splice(sB.machines.length-1, 1); sB.machines.splice(n, 0, mB);
                } else {
                   improved = true;
                }
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

    slots.leftoverNonCores = nonCorePool;

    slots.sort((a,b) => {
        let mA = String(a.cqi.name || a.cqi.id).match(/\d+/);
        let mB = String(b.cqi.name || b.cqi.id).match(/\d+/);
        return (mA ? parseInt(mA[0]) : 0) - (mB ? parseInt(mB[0]) : 0);
    });

    return slots;
  },

  // ==========================================
  // STEP 8: VALIDASI AKHIR (UPDATED DENGAN INFO/NOTIFIKASI)
  // ==========================================
  validate(plan, totalMachinesCount) {
    let report = {
      valid: true,
      coveragePercent: 0,
      totalMachines: totalMachinesCount,
      assignedCount: 0,
      unassignedMachines: [],
      duplicateMachines: [],
      violations: [],
      info: [], // PERUBAHAN: Menampung notifikasi sukses & catatan informasi
      totalDistance: 0,
      avgDistance: 0,
      score: 100
    };

    let coveredIds = new Set();
    let machineDistances = [];

    plan.forEach(slot => {
      if (slot.machines.length === 0) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} KOSONG. CORE tidak boleh tersisa.`);
        report.valid = false;
      }

      let astCount = slot.machines.filter(sm => (sm.name||sm.id).toUpperCase().startsWith('AST')).length;
      let apkCount = slot.machines.filter(sm => !(sm.name||sm.id).toUpperCase().startsWith('AST')).length;
      
      if (astCount > 0 && apkCount > 0) {
        let hasRealApk = slot.machines.some(sm => (sm.name||sm.id).toUpperCase().startsWith('APK') || (sm.name||sm.id).toUpperCase().startsWith('K') || (sm.name||sm.id).toUpperCase().startsWith('X'));
        if (astCount > 0 && hasRealApk) {
            report.violations.push(`[FATAL] CQI ${slot.cqi.name} melanggar aturan: menyatukan AST dan APK/K/X.`);
            report.valid = false;
        }
      }

      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
      let isAstDominant = astCount > 0;

      let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
      let is24 = match && match[0] === '24';

      let hasC1C2 = slot.machines.some(sm => ['C1','C2'].includes((sm.name||sm.id).toUpperCase()));
      
      // PERUBAHAN: Cek jika CQI 24 dipaksa menjadi penampung sisa APK dan memakan resource Non-Core
      if (is24 && hasC1C2 && slot.machines.length > 2 && slot.nonCore.length > 0) {
          report.info.push(`💡 [INFO] CQI 24 diaktifkan sebagai cadangan pelarian: Menyerap ${slot.nonCore.length} mesin Non-Core untuk menampung APK yang tumpah dari slot lain.`);
      }

      let absoluteMax;
      if (is24 && hasC1C2) {
         absoluteMax = 4;
      } else if (isAstDominant) {
         absoluteMax = (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8);
      } else {
         absoluteMax = (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8);
      }

      if (slot.nonCore.length > 2) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} memiliki ${slot.nonCore.length} NON CORE (Maks 2).`);
        report.valid = false;
      }
      
      if (slot.nonCore.length < reqNC && slot.machines.length > 0) {
        report.violations.push(`[OVERLOAD] CQI ${slot.cqi.name} butuh ${reqNC} NC, stok dipasangkan ${slot.nonCore.length}.`);
        report.score -= 20;
      }

      if (slot.machines.length > absoluteMax) {
        report.violations.push(`[OVERLOAD] CQI ${slot.cqi.name} melampaui batas formasi absolute (${slot.machines.length}/${absoluteMax}).`);
        report.score -= 20;
      }
      
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
      if (hasM2M3) {
        let pure = slot.machines.every(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
        if (!pure) {
          report.violations.push(`[RULE] CQI ${slot.cqi.name} mencampur M2/M3 dengan mesin biasa.`);
          report.score -= 30;
        }
      }

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

    // PERUBAHAN: Notifikasi tambahan berdasarkan Coverage dan validasi
    if (report.coveragePercent < 100) {
      report.valid = false;
      report.violations.push(`[COVERAGE] Peringatan! Ada ${report.totalMachines - report.assignedCount} mesin yang gagal masuk planning (Missing). Mohon cek alokasi jumlah mesin dengan kapasitas Slot CQI.`);
      report.score -= (100 - report.coveragePercent); 
    }

    if (report.violations.length > 0) {
        report.valid = false;
    }

    // Penambahan pesan Status Final Planning
    if (report.valid && report.coveragePercent === 100) {
        report.info.push(`✅ [SUCCESS] Planning sukses dibuat dengan coverage 100%. Semua mesin berhasil teralokasi pada slot terbaiknya!`);
    } else if (!report.valid) {
        report.info.push(`⚠️ [WARNING] Planning selesai dengan beberapa catatan pelanggaran atau kapasitas yang kurang. Mohon operator meninjau kembali report di bawah.`);
    }
    
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
      txt += `NON CORE : ${slot.nonCore.join(', ') || '-'}\n`;
      txt += `CORE : ${slot.core}\n`;
      txt += `CQI : ${slot.cqi.name}\n\n`;
    });

    if (plan.leftoverNonCores && plan.leftoverNonCores.length > 0) {
      txt += `INFO SISA NON-CORE (${plan.leftoverNonCores.length} Tersedia):\n`;
      txt += `- ${plan.leftoverNonCores.join(', ')}\n\n`;
    }

    txt += `QC PASSED :\n`;
    let qcArr = config.qcPassed ? config.qcPassed.split('\n').filter(x => x.trim() !== '') : [];
    if (qcArr.length === 1) txt += `${qcArr[0]}\n`;
    else for(let i=0; i<qcArr.length; i++) txt += `${qcArr[i]}\n`;

    txt += `\nMIL-STD : ${config.milStd || '-'}\n`;
    txt += `Standby OT : ${config.standbyOt || '-'}\n`;
    txt += `Support FG : ${config.supportFg || '-'}\n`;
    
    return txt;
  },

  async initHistory(githubRawUrl = 'https://raw.githubusercontent.com/IPCQuality/PLANING-MAKER/refs/heads/main/data/history.json') {
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
