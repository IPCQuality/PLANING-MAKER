/**
 * PLANNER CQI LIQUID 3 - BRAIN AI
 * --------------------------------
 * Algoritma: Constraint Satisfaction + Heuristic Scoring + Local Search
 * Prioritas : Coverage > No Empty Core > Strict AST/APK Split > WS Proximity > Capacity Limit
 * Aturan Aktif: 
 * - Kapasitas AST : Max 4 (0 NC), Max 6 (1 NC), Max 8 (2 NC)
 * - Kapasitas APK : Max 5 (0 NC), Max 7 (1 NC), Max 8 (2 NC)
 * - DILARANG KERAS membiarkan CORE kosong.
 * - DILARANG KERAS menyatukan AST dan APK/K/X dalam 1 CQI.
 * - Pengelompokan berdasarkan Workstation sangat diutamakan.
 * - CQI 24 (C1, C2) = 0 NC. Jika C1, C2 + 2 APK = 1 NC.
 * - TAMBAHAN: Maksimalkan NON CORE (hingga batas max 2 per slot, kecuali CQI 19).
 * - TAMBAHAN: CQI 19 tidak perlu ditambah NON CORE[cite: 1].
 * - TAMBAHAN: Pertimbangkan beban pengecekan CORE agar merata dari jarak hingga jumlah mesin.
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

  _getRequiredNonCore(slot, astCount, apkCount) {
    let is19 = String(slot.cqi.name).includes('19') || String(slot.cqi.id) === '19';
    if (is19) return 0; // ATURAN: CQI 19 tidak perlu ditambah NON CORE[cite: 1]

    let is24 = String(slot.cqi.name).includes('24') || String(slot.cqi.id) === '24';
    let hasC1C2 = slot.machines.some(m => m.isC1C2);
    let total = astCount + apkCount;
    
    // ATURAN KHUSUS CQI 24
    if (is24 && hasC1C2) {
       if (total <= 2) return 0; // Hanya C1 & C2
       return 1; // Jika ada tambahan APK, wajib 1 NON CORE
    }

    if (total === 0) return 0;
    
    let isAstDominant = astCount > 0;
    
    // ATURAN KAPASITAS
    if (isAstDominant) {
      if (total <= 4) return 0; // 1 CORE
      if (total <= 6) return 1; // 1 CORE + 1 NC
      return 2;                 // 1 CORE + 2 NC (Max 8)
    } else {
      if (total <= 5) return 0; // 1 CORE
      if (total <= 7) return 1; // 1 CORE + 1 NC
      return 2;                 // 1 CORE + 2 NC (Max 8)
    }
  },

  _canAcceptMachine(slot, m, availableNC) {
    if (slot.isExclusive) return { can: false };

    let hasAst = slot.machines.some(sm => sm.isAst);
    let hasApk = slot.machines.some(sm => sm.isApk || sm.isC1C2);

    // Strict Mix Check
    if (hasAst && (m.isApk || m.isC1C2)) return { can: false, reason: "strict_mix" };
    if (hasApk && m.isAst) return { can: false, reason: "strict_mix" };

    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isApk || sm.isC1C2).length + (m.isApk || m.isC1C2 ? 1 : 0);
    
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
    let neededNC = reqNC - slot.nonCore.length;
    
    let is24 = String(slot.cqi.name).includes('24') || String(slot.cqi.id) === '24';
    let hasC1C2 = slot.machines.some(sm => sm.isC1C2) || m.isC1C2;
    let isAstDominant = astCount > 0;
    
    let absoluteMax;
    if (is24 && hasC1C2) {
      absoluteMax = 4; // 2 (C1, C2) + Max 2 APK
    } else if (isAstDominant) {
      absoluteMax = (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8);
    } else {
      absoluteMax = (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8);
    }
    
    if (astCount + apkCount > absoluteMax) return { can: false, reason: "capacity" }; 
    if (neededNC > availableNC) return { can: false, reason: "no_nc" }; 
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: absoluteMax };
  },

  _scoreSlot(m, slot, slots, availableNC) {
    let acceptStatus = this._canAcceptMachine(slot, m, availableNC);
    if (!acceptStatus.can) return -Infinity;

    let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
    let distScore = Math.max(0, 100 - (dist * 2)); 
    let histScore = this.getHistory(m.id, slot.cqi.id) * 0.3; 

    let ncPenalty = acceptStatus.neededNC > 0 ? -1000 : 0; 

    let wsBonus = 0;
    if (m.wsKey) {
      let sameWs = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
      if (sameWs > 0) {
        wsBonus = 500 + (sameWs * 200); 
      }
    }

    let lineA_Priority = 0;
    const lineACqiPriority = { "0A":0, "1A":0, "2A":1, "3A":1, "4A":2, "5A":2, "6A":3, "7A":3, "8A":4, "9A":4, "10A":4 };
    if (m.wsKey && lineACqiPriority[m.wsKey] !== undefined) {
      let idx = slots.indexOf(slot);
      if (idx === lineACqiPriority[m.wsKey] || idx === (lineACqiPriority[m.wsKey] % slots.length)) {
        lineA_Priority = 80;
      }
    }

    let totalMachines = slot.machines.length + 1;
    let capScore = ((acceptStatus.absoluteMax - totalMachines) * 10); 

    // ATURAN TAMBAHAN: Pertimbangkan beban pengecekan CORE agar merata dari jarak hingga jumlah mesin
    let slotMachineCount = slot.machines.length;
    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getDistance(sm.row, sm.col, slot.cqi.row, slot.cqi.col), 0);
    let workloadPenalty = (slotMachineCount * 25) + (slotDistSum * 2);

    return distScore + histScore + wsBonus + lineA_Priority + capScore + ncPenalty - workloadPenalty;
  },

  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    let activeCQIs = cqis.slice(0, coreLimit); 

    let nonCorePool = [];
    for (let i = 0; i < nonCoreCount; i++) {
      nonCorePool.push((config.nonCoreNames && config.nonCoreNames[i]) ? config.nonCoreNames[i] : `NON CORE ${i+1}`);
    }

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

    // RULE 19 (M2/M3)
    let slot19 = slots.find(s => String(s.cqi.name).includes('19') || String(s.cqi.id) === '19');
    let m2m3Machines = unassigned.filter(m => m.isM2M3);
    if (slot19 && m2m3Machines.length > 0) {
      slot19.machines.push(...m2m3Machines);
      slot19.isExclusive = true; 
      unassigned = unassigned.filter(m => !m.isM2M3);
      applyNonCoreIfNeeded(slot19);
    }

    // RULE 24 (C1/C2 + APK Syarat NC)
    let slot24 = slots.find(s => String(s.cqi.name).includes('24') || String(s.cqi.id) === '24');
    let c1c2Machines = unassigned.filter(m => m.isC1C2);
    if (slot24 && c1c2Machines.length > 0) {
      slot24.machines.push(...c1c2Machines);
      unassigned = unassigned.filter(m => !m.isC1C2);
      
      let apks = unassigned.filter(m => m.isApk)
        .sort((a, b) => this.getDistance(a.row, a.col, slot24.cqi.row, slot24.cqi.col) - this.getDistance(b.row, b.col, slot24.cqi.row, slot24.cqi.col));
      
      let toFill = Math.min(apks.length, 2);
      if (nonCorePool.length >= 1 && toFill > 0) {
          let selectedApks = apks.slice(0, toFill);
          slot24.machines.push(...selectedApks);
          unassigned = unassigned.filter(m => !selectedApks.map(s => s.id).includes(m.id));
      }
      slot24.isExclusive = true; 
      applyNonCoreIfNeeded(slot24);
    }

    // SEEDING (Pastikan Tidak Ada CORE Tersisa/Kosong)
    slots.forEach(slot => {
      if (slot.machines.length === 0 && unassigned.length > 0) {
        unassigned.sort((a, b) => this.getDistance(a.row, a.col, slot.cqi.row, slot.cqi.col) - this.getDistance(b.row, b.col, slot.cqi.row, slot.cqi.col));
        let seedMachine = unassigned.shift();
        slot.machines.push(seedMachine);
        applyNonCoreIfNeeded(slot);
      }
    });

    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));
    
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length);
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
        applyNonCoreIfNeeded(bestSlot);
      } else {
        remainingUnassigned.push(m);
      }
    });

    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 3;
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift();
        let placed = false;

        let fallbackSlots = [...slots].filter(s => !s.isExclusive)
          .sort((a, b) => this.getDistance(u.row, u.col, a.cqi.row, a.cqi.col) - this.getDistance(u.row, u.col, b.cqi.row, b.cqi.col));

        for (let target of fallbackSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length);
          if (accept.can) {
            target.machines.push(u); 
            applyNonCoreIfNeeded(target);
            placed = true; 
            break;
          } else {
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i];
              target.machines.splice(i, 1); 

              let acceptU = this._canAcceptMachine(target, u, nonCorePool.length);
              if (acceptU.can) {
                let newHomes = [...slots].filter(s => s !== target && !s.isExclusive)
                  .sort((a, b) => this.getDistance(occupant.row, occupant.col, a.cqi.row, a.cqi.col) - this.getDistance(occupant.row, occupant.col, b.cqi.row, b.cqi.col));
                
                let foundHome = false;
                for(let home of newHomes) {
                  let acceptOcc = this._canAcceptMachine(home, occupant, nonCorePool.length - acceptU.neededNC);
                  if(acceptOcc.can) {
                     target.machines.push(u); applyNonCoreIfNeeded(target);
                     home.machines.push(occupant); applyNonCoreIfNeeded(home);
                     placed = true; foundHome = true;
                     break;
                  }
                }
                if (foundHome) break;
              }
              target.machines.splice(i, 0, occupant); 
            }
          }
          if (placed) break;
        }
        if (!placed) remainingUnassigned.push(u); 
        iterations--;
      }
    }

    // ATURAN TAMBAHAN: Maksimalkan NON CORE yang tersisa ke slot yang memenuhi syarat (maksimal 2 NC per slot, kecuali CQI 19)
    slots.forEach(slot => {
      let is19 = String(slot.cqi.name).includes('19') || String(slot.cqi.id) === '19';
      if (!is19 && slot.machines.length > 0) {
        while (slot.nonCore.length < 2 && nonCorePool.length > 0) {
          slot.nonCore.push(nonCorePool.shift());
        }
      }
    });

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
      if (slot.machines.length === 0) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} KOSONG. CORE tidak boleh tersisa/menganggur.`);
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
      let is24 = String(slot.cqi.name).includes('24') || String(slot.cqi.id) === '24';
      let hasC1C2 = slot.machines.some(sm => ['C1','C2'].includes((sm.name||sm.id).toUpperCase()));
      
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