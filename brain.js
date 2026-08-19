/*
================================================================================
 PLANNER CQI LIQUID 3
 Brain AI Engine - OPTIMIZED VERSION
 Version: 1.2.0 (Coverage First, Auto-Repair, Load Balancing, Smart History)
================================================================================
*/

/*
================================================================================
 MACHINE DATABASE & CONSTANTS
================================================================================
*/

const WORKSTATIONS = {
  "0A": ["AST 33-16L", "AST 63-16L", "AST 14-12L"],
  "1A": ["AST 36-16L", "AST 44-16L", "AST 61-16L"],
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

// Gate Coordinator: Waypoints Gerbang Lorong untuk Jarak Rute
const WORKSTATION_GATES = {
  "0A": { row: 9, col: 6 }, "1A": { row: 9, col: 8 }, "2A": { row: 9, col: 10 }, "3A": { row: 9, col: 12 }, "4A": { row: 9, col: 14 }, "5A": { row: 9, col: 16 }, "6A": { row: 9, col: 18 }, "7A": { row: 9, col: 20 }, "8A": { row: 9, col: 22 }, "9A": { row: 9, col: 24 }, "10A": { row: 9, col: 26 },
  "0B": { row: 11, col: 6 }, "1B": { row: 11, col: 8 }, "2B": { row: 11, col: 10 }, "3B": { row: 11, col: 12 }, "4B": { row: 11, col: 14 }, "5B": { row: 11, col: 16 }, "6B": { row: 11, col: 18 }, "7B": { row: 11, col: 20 }, "8B": { row: 11, col: 22 }, "9B": { row: 11, col: 24 }, "10B": { row: 11, col: 26 }, "11B": { row: 11, col: 28 },
  "1C": { row: 13, col: 33 }, "2C": { row: 13, col: 35 }, "3C": { row: 13, col: 37 }, "4C": { row: 13, col: 39 }, "5C": { row: 13, col: 41 }, "6C": { row: 13, col: 43 }, "7C": { row: 13, col: 45 }, "8C": { row: 13, col: 48 }, "9C": { row: 13, col: 50 }, "10C": { row: 13, col: 52 },
  "WW": { row: 9, col: 33 }, "OT": { row: 5, col: 33 }
};

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

/*
================================================================================
 DISTANCE ENGINE (Dipertahankan & Dioptimasi)
================================================================================
*/
const DistanceEngine = {
  getDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  },

  getRoutedDistance(machine, cqi, getWsKeyFn) {
    let wsKey = machine.wsKey || getWsKeyFn(machine.name || machine.id);
    let cqiMatch = String(cqi.name || cqi.id).match(/\d+/);
    let cqiNum = cqiMatch ? cqiMatch[0] : null;
    let isWWorOT = (cqiNum === '24' || cqiNum === '19' || wsKey === 'WW' || wsKey === 'OT');

    let mZone = (wsKey && wsKey.endsWith('C')) ? 'C' : 'AB';
    if (!wsKey && machine.col >= 32) mZone = 'C'; 
    let cZone = (cqi.col >= 32) ? 'C' : 'AB';

    let currentStartRow = machine.row;
    let currentStartCol = machine.col;
    let currentEndRow = cqi.row;
    let currentEndCol = cqi.col;
    let distTotal = 0;

    if (wsKey && WORKSTATION_GATES[wsKey]) {
      let gate = WORKSTATION_GATES[wsKey];
      distTotal += this.getDistance(currentStartRow, currentStartCol, gate.row, gate.col);
      currentStartRow = gate.row;
      currentStartCol = gate.col;
    }

    if (!isWWorOT && mZone === 'AB' && cZone === 'C') {
      distTotal += this.getDistance(currentStartRow, currentStartCol, 10, 31) + 
                   this.getDistance(10, 31, 12, 31) + 
                   this.getDistance(12, 31, currentEndRow, currentEndCol);
    } else if (!isWWorOT && mZone === 'C' && cZone === 'AB') {
      distTotal += this.getDistance(currentStartRow, currentStartCol, 12, 31) + 
                   this.getDistance(12, 31, 10, 31) + 
                   this.getDistance(10, 31, currentEndRow, currentEndCol);
    } else {
      distTotal += this.getDistance(currentStartRow, currentStartCol, currentEndRow, currentEndCol);
    }

    return distTotal;
  }
};

/*
================================================================================
 HISTORY ENGINE (Diperkuat: Mempelajari Jarak, Beban Core/Non-Core)
================================================================================
*/
const HistoryEngine = {
  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      // Boost jika sering sukses dan frekuensi penggunaannya tinggi
      let baseScore = h.count > 0 ? (h.success / h.count) * 100 : 50;
      let freqBonus = Math.min(h.freq || 0, 10) * 2; 
      return baseScore + freqBonus;
    }
    return 50;
  },

  recordHistory(machineId, cqiId, success = true, meta = {}) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (!hist[machineId]) hist[machineId] = {};
    if (!hist[machineId][cqiId]) {
      hist[machineId][cqiId] = { 
        count: 0, success: 0, freq: 0, lastDistance: null, 
        lastUsed: null, coreCount: 0, nonCoreCount: 0, mode: '' 
      };
    }
    let h = hist[machineId][cqiId];
    h.count++;
    h.freq = (h.freq || 0) + 1;
    if (success) h.success++;
    h.lastUsed = new Date().toISOString();
    
    if (meta.dist) h.lastDistance = meta.dist;
    if (meta.coreCount !== undefined) h.coreCount = meta.coreCount;
    if (meta.nonCoreCount !== undefined) h.nonCoreCount = meta.nonCoreCount;
    if (meta.mode) h.mode = meta.mode;

    localStorage.setItem('planning_history', JSON.stringify(hist));
  },

  async initHistory(githubRawUrl = 'https://raw.githubusercontent.com/IPCQuality/PLANING-MAKER/refs/heads/main/data/history.json') {
    try {
      const response = await fetch(githubRawUrl);
      if (!response.ok) throw new Error();
      const githubHistory = await response.json();
      let localHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');
      
      for (let machineId in githubHistory) {
        if (!localHistory[machineId]) localHistory[machineId] = {};
        for (let cqiId in githubHistory[machineId]) {
          if (!localHistory[machineId][cqiId]) {
            localHistory[machineId][cqiId] = githubHistory[machineId][cqiId];
          } else { 
            localHistory[machineId][cqiId].count += (githubHistory[machineId][cqiId].count || 0); 
            localHistory[machineId][cqiId].success += (githubHistory[machineId][cqiId].success || 0); 
            localHistory[machineId][cqiId].freq = (localHistory[machineId][cqiId].freq || 0) + 1;
          }
        }
      }
      localStorage.setItem('planning_history', JSON.stringify(localHistory));
    } catch (e) { console.warn("Sync GitHub history dilewati."); }
  },

  parseAndLearn(planningText) {
    const lines = planningText.split('\n');
    let currentHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');
    lines.forEach(line => {
      let match = line.match(/^\d+\.\s+(.*?)\s+:\s+(.*)$/);
      if (match) {
        let machinePart = match[1]; 
        let cqiPart = match[2].split('->').pop().trim();
        machinePart.split(/[\+,]/).map(m => m.trim()).forEach(machineStr => {
          let machineId = machineStr.replace(/\s*\d+\s*mesin/gi, '').trim();
          if (!machineId) return;
          if (!currentHistory[machineId]) currentHistory[machineId] = {};
          if (!currentHistory[machineId][cqiPart]) {
            currentHistory[machineId][cqiPart] = { count: 0, success: 0, freq: 0, lastUsed: null };
          }
          currentHistory[machineId][cqiPart].count += 1;
          currentHistory[machineId][cqiPart].success += 1;
          currentHistory[machineId][cqiPart].freq = (currentHistory[machineId][cqiPart].freq || 0) + 1;
          currentHistory[machineId][cqiPart].lastUsed = new Date().toISOString();
        });
      }
    });
    localStorage.setItem('planning_history', JSON.stringify(currentHistory));
    return JSON.stringify(currentHistory, null, 2);
  }
};

/*
================================================================================
 PLANNING ENGINE & MAIN BRAIN AI
================================================================================
*/
const BrainAI = {
  WORKSTATIONS: WORKSTATIONS,

  // Alias fungsi lama (Backward Compatibility)
  normalizeName(str) { return str ? String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : ''; },
  getWorkstationKey(machineName) {
    let norm = this.normalizeName(machineName);
    for (let wsKey in WORKSTATIONS) {
      if (WORKSTATIONS[wsKey].some(item => this.normalizeName(item) === norm)) return wsKey;
    }
    return null;
  },
  getDistance(r1, c1, r2, c2) { return DistanceEngine.getDistance(r1, c1, r2, c2); },
  getRoutedDistance(machine, cqi) { return DistanceEngine.getRoutedDistance(machine, cqi, this.getWorkstationKey.bind(this)); },
  getHistory(machineId, cqiId) { return HistoryEngine.getHistory(machineId, cqiId); },
  recordHistory(machineId, cqiId, success = true, meta = {}) { return HistoryEngine.recordHistory(machineId, cqiId, success, meta); },
  initHistory(githubRawUrl) { return HistoryEngine.initHistory(githubRawUrl); },
  parseAndLearn(planningText) { return HistoryEngine.parseAndLearn(planningText); },

  // Helper Rules Manpower
  _getRequiredNonCore(slot, astCount, apkCount) {
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    if (cqiIdStr === '19') return 0;
    
    let is24 = cqiIdStr === '24';
    let hasC1C2 = slot.machines.some(m => m.isC1C2);
    let total = astCount + apkCount;
    
    if (is24 && hasC1C2) return (total <= 2) ? 0 : 1;
    if (total <= 4) return 0;
    
    let isAstDominant = astCount > 0;
    if (isAstDominant) return (total <= 6) ? 1 : 2;
    return (total <= 5) ? 0 : (total <= 7) ? 1 : 2;
  },

  // Validator Mesin vs Slot CQI
  _canAcceptMachine(slot, m, availableTotalNC, forceRepair = false) {
    if (slot.isExclusive && !forceRepair) return { can: false, reason: "exclusive" };

    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let is24 = cqiIdStr === '24';
    let is10 = cqiIdStr === '10';

    // ATURAN MUTLAK (Tidak boleh dilanggar meski forceRepair)
    if (m.isC1C2 && !is24) return { can: false, reason: "ww_exclusive_cqi24" };
    if (!m.isC1C2 && is24) return { can: false, reason: "cqi24_only_ww" };

    let hasAst = slot.machines.some(sm => sm.isAst);
    let hasApk = slot.machines.some(sm => sm.isApk);
    let hasKX = slot.machines.some(sm => sm.isKX);
    let hasC1C2 = slot.machines.some(sm => sm.isC1C2);
    let hasAnyApk = hasApk || hasKX || hasC1C2;
    let mIsAnyApk = m.isApk || m.isKX || m.isC1C2;

    if (is10) {
      if ((hasAst && m.isKX) || (hasKX && m.isAst)) return { can: false, reason: "strict_mix_cqi10" };
    } else {
      if (hasAst && mIsAnyApk) return { can: false, reason: "strict_mix" };
      if (hasAnyApk && m.isAst) return { can: false, reason: "strict_mix" };
    }

    // ATURAN KAPASITAS (Bisa dilonggarkan saat Auto-Repair)
    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isAnyApk).length + (mIsAnyApk ? 1 : 0);
    
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
    let currentNC = slot.nonCore.length + (slot.longshift ? slot.longshift.length : 0);
    let neededNC = reqNC - currentNC;
    let hasTargetC1C2 = hasC1C2 || m.isC1C2;
    
    let absoluteMax = (is24 && hasTargetC1C2) ? 4 : (astCount > 0 ? (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8) : (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8));
    
    if (!forceRepair) {
      if (astCount + apkCount > absoluteMax) return { can: false, reason: "capacity" }; 
      if (neededNC > availableTotalNC) return { can: false, reason: "no_nc" }; 
    }
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: absoluteMax };
  },

  // Scoring AI Baru: Prioritaskan Coverage & Distribusi Merata
  _scoreSlot(m, slot, slots, availableTotalNC, planMode = 'ai') {
    let acceptStatus = this._canAcceptMachine(slot, m, availableTotalNC);
    if (!acceptStatus.can) return -Infinity;

    let dist = this.getRoutedDistance(m, slot.cqi);
    let distScore = Math.max(0, 500 - (dist * 4)); // Skala jarak diperbesar
    
    const historyWeight = planMode === 'history' ? 3.0 : 0.8;
    let histScore = this.getHistory(m.id, slot.cqi.id) * historyWeight;
    
    let priorityBonus = 0;
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);

    // 2. CQI Priority Rule (Bobot Tertinggi setelah rule mutlak)
    if (m.wsKey && CQI_PRIORITY_MAP[cqiIdStr] && CQI_PRIORITY_MAP[cqiIdStr].includes(m.wsKey)) {
      priorityBonus = 3000; 
    }

    // 3. Workstation Cluster (Menjaga agar mesin deret berdekatan)
    let wsBonus = 0;
    if (m.wsKey) {
      let sameWsCount = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
      wsBonus = sameWsCount > 0 ? (2000 + (sameWsCount * 500)) : 0; 
    }

    // 6. Capacity & Load Balancing (Mencegah 1 CQI terlalu penuh, isi yang kosong)
    let ncPenalty = acceptStatus.neededNC > 0 ? -800 : 0; 
    let slotMachineCount = slot.machines.length;
    
    // Bonus besar jika CQI kosong, penalti eksponensial jika mulai penuh
    let distributionScore = slotMachineCount === 0 ? 1500 : (acceptStatus.absoluteMax - slotMachineCount) * 100;
    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getRoutedDistance(sm, slot.cqi), 0);
    let workloadPenalty = (slotMachineCount * 150) + (slotDistSum * 3);

    return distScore + histScore + wsBonus + priorityBonus + distributionScore + ncPenalty - workloadPenalty;
  },

  /*================ NEW FITUR: AUTO REPAIR & COVERAGE CHECK ================*/
  detectUnassignedMachine(machinesData, slots) {
    let assignedIds = new Set();
    slots.forEach(s => s.machines.forEach(m => assignedIds.add(m.id)));
    return machinesData.filter(m => !assignedIds.has(m.id));
  },

  repairUnassignedMachine(unassigned, slots, availableTotalNC) {
    let stillUnassigned = [];
    unassigned.forEach(u => {
      let placed = false;
      // Urutkan slot berdasarkan Jarak terdekat
      let fallbackSlots = [...slots].sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi));
      
      for (let target of fallbackSlots) {
        // Coba masukkan dengan mode forceRepair = true (mengabaikan kapasitas & sisa NC, tapi tetap menjaga aturan ketat)
        let accept = this._canAcceptMachine(target, u, availableTotalNC, true);
        if (accept.can) {
          target.machines.push(u);
          placed = true;
          break;
        }
      }
      if (!placed) stillUnassigned.push(u);
    });
    return stillUnassigned;
  },

  finalCoverageCheck(machinesData, slots) {
    return this.detectUnassignedMachine(machinesData, slots).length === 0;
  },

  /*================ NEW FITUR: HEATMAP BEBAN CQI ================*/
  getCQILoadHeatmap(slots) {
    return slots.map(slot => {
      let machineCount = slot.machines.length;
      let totalDist = slot.machines.reduce((sum, m) => sum + this.getRoutedDistance(m, slot.cqi), 0);
      let is24 = String(slot.cqi.name || slot.cqi.id).includes('24');
      let hasC1C2 = slot.machines.some(sm => ['C1', 'C2'].includes((sm.name || sm.id).toUpperCase()));
      let astCount = slot.machines.filter(sm => (sm.name || sm.id).toUpperCase().startsWith('AST')).length;
      
      let hardLimit = (is24 && hasC1C2) ? 4 : (astCount > 0 ? 8 : 8); 
      let capacityRatio = machineCount / hardLimit;

      let status = "LOW";
      if (capacityRatio >= 1) status = "OVERLOAD";
      else if (capacityRatio >= 0.8) status = "HIGH";
      else if (capacityRatio >= 0.5) status = "NORMAL";
      
      if (machineCount === 0) status = "EMPTY";

      return {
        cqi: slot.cqi.name,
        machines: machineCount,
        totalDistance: totalDist,
        usedCapacity: Math.round(capacityRatio * 100) + "%",
        status: status
      };
    });
  },

  /*================ MAIN GENERATOR ENGINE ================*/
  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    
    // Inisialisasi Pool (Sama seperti versi sebelumnya)
    let availableCores = (config.coreData || config.coreNames || []).slice(0, coreLimit).map((c, i) => 
      typeof c === 'object' ? { id: c.id, name: c.name || `CORE ${i+1}`, cqi_priority: c.cqi_priority } : { id: null, name: c || `CORE ${i+1}` }
    );
    while (availableCores.length < coreLimit) availableCores.push({ id: null, name: `CORE ${availableCores.length+1}` });

    let nonCorePool = (config.nonCoreData || config.nonCoreNames || []).slice(0, nonCoreCount).map(nc => typeof nc === 'object' ? nc.name : nc);
    while (nonCorePool.length < nonCoreCount) nonCorePool.push(`NON CORE ${nonCorePool.length+1}`);

    let rawLS = config.longshiftData || config.longshiftNames || [];
    let lsCount = parseInt(config.longshift) || rawLS.length || 0;
    let lsPool = rawLS.slice(0, lsCount).map(ls => typeof ls === 'object' ? ls.name : ls);
    while (lsPool.length < lsCount) lsPool.push(`(LS)`);

    // Mapping Mesin
    let unassigned = machines.map(m => {
      let nm = { ...m };
      let upName = (nm.name || nm.id).toUpperCase();
      nm.wsKey = this.getWorkstationKey(nm.name || nm.id) || nm.ws || null;
      nm.isAst = upName.startsWith('AST');
      nm.isApk = upName.startsWith('APK');
      nm.isKX = upName.startsWith('K') || upName.startsWith('X');
      nm.isM2M3 = ['M2', 'M3'].includes(upName);
      nm.isC1C2 = ['C1', 'C2'].includes(upName);
      nm.isAnyApk = nm.isApk || nm.isKX || nm.isC1C2;
      return nm;
    });

    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || '') || (a.name || '').localeCompare(b.name || ''));

    // Memilih CQI Aktif
    let cqiScores = cqis.map(cqi => {
      let score = 0;
      let match = String(cqi.name || cqi.id).match(/\d+/);
      let cqiIdStr = match ? match[0] : String(cqi.id);
      unassigned.forEach(m => {
        if (m.wsKey && CQI_PRIORITY_MAP[cqiIdStr] && CQI_PRIORITY_MAP[cqiIdStr].includes(m.wsKey)) score += 1500;
        let dist = this.getRoutedDistance(m, cqi);
        score += dist < 15 ? 200 : dist < 30 ? 100 : dist < 50 ? 50 : dist < 80 ? 20 : 0;
        score += this.getHistory(m.id, cqi.id) * (config.planMode === 'history' ? 2.0 : 0.1);
        if (cqiIdStr === '19' && m.isM2M3) score += 10000;
        if (cqiIdStr === '24' && m.isC1C2) score += 10000;
      });
      return { cqi: cqi, score: score };
    });

    cqiScores.sort((a, b) => b.score - a.score);
    let activeCQIs = cqiScores.slice(0, coreLimit).map(cs => cs.cqi);
    let slots = activeCQIs.map((cqi, i) => ({ slotId: 'SLOT-'+i, cqi: cqi, core: null, nonCore: [], longshift: [], machines: [], isExclusive: false }));

    // Handler Khusus OT & WW Core Assignment (Dipertahankan)
    const isCOT1 = (c) => c && (String(c.id).toUpperCase() === 'COT1' || String(c.id).toUpperCase() === 'CORE2' || String(c.name).toUpperCase().includes('FARHAN'));
    const isCOT2 = (c) => c && (String(c.id).toUpperCase() === 'COT2' || String(c.id).toUpperCase() === 'CORE4' || String(c.name).toUpperCase().includes('DINI'));
    const isCWW1 = (c) => c && (String(c.id).toUpperCase() === 'CWW1' || String(c.id).toUpperCase() === 'C1' || String(c.id).toUpperCase() === 'CORE1' || String(c.name).toUpperCase().includes('JIDDAN'));
    const isCWW2 = (c) => c && (String(c.id).toUpperCase() === 'CWW2' || String(c.name).toUpperCase().includes('MIA'));

    const assignCoreToCQI = (cqiStr) => {
      if (availableCores.length === 0) return "UNKNOWN CORE";
      let match = String(cqiStr).match(/\d+/);
      let tCqi = match ? match[0] : null;
      let slot19 = slots.find(s => String(s.cqi.name).includes('19'));
      let slot24 = slots.find(s => String(s.cqi.name).includes('24'));
      let is19Act = slot19 && unassigned.some(m => m.isM2M3);
      let is24Act = slot24 && unassigned.some(m => m.isC1C2);

      if (tCqi === '19' && is19Act) {
        let i = availableCores.findIndex(c => isCOT1(c));
        if (i !== -1) return availableCores.splice(i, 1)[0].name;
        i = availableCores.findIndex(c => isCOT2(c));
        return i !== -1 ? availableCores.splice(i, 1)[0].name : "NO VALID OT CORE";
      }
      if (tCqi === '24' && is24Act) {
        let i = availableCores.findIndex(c => isCWW1(c));
        if (i !== -1) return availableCores.splice(i, 1)[0].name;
        i = availableCores.findIndex(c => isCWW2(c));
        return i !== -1 ? availableCores.splice(i, 1)[0].name : "NO VALID WW CORE";
      }
      let cands = availableCores.filter(c => {
        let prioMatch = c.cqi_priority && String(c.cqi_priority).match(/\d+/) && String(c.cqi_priority).match(/\d+/)[0] === tCqi;
        let isRestricted = (is19Act && isCOT1(c)) || (is24Act && isCWW1(c));
        return prioMatch && !isRestricted;
      });
      if (cands.length > 0) {
        let sel = cands[0]; availableCores.splice(availableCores.indexOf(sel), 1); return sel.name;
      }
      let fIndex = availableCores.findIndex(c => !((is19Act && isCOT1(c)) || (is24Act && isCWW1(c))));
      if (fIndex !== -1) return availableCores.splice(fIndex, 1)[0].name;
      return availableCores.shift()?.name || "UNKNOWN CORE";
    };

    slots.forEach(slot => { if (!slot.core) slot.core = assignCoreToCQI(slot.cqi.name || slot.cqi.id); });

    const applyNonCoreIfNeeded = (slot) => {
      let astCount = slot.machines.filter(sm => sm.isAst).length;
      let apkCount = slot.machines.filter(sm => sm.isAnyApk).length;
      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
      while (slot.nonCore.length + slot.longshift.length < reqNC) {
        if (nonCorePool.length > 0) slot.nonCore.push(nonCorePool.shift());
        else if (lsPool.length > 0) slot.longshift.push(lsPool.shift());
        else break;
      }
    };

    // Alokasi M2/M3 & C1/C2 (Eksklusif Mutlak)
    let slot19 = slots.find(s => String(s.cqi.name).includes('19'));
    if (slot19 && unassigned.some(m => m.isM2M3)) {
      slot19.machines.push(...unassigned.filter(m => m.isM2M3));
      slot19.isExclusive = true;
      unassigned = unassigned.filter(m => !m.isM2M3);
      applyNonCoreIfNeeded(slot19);
    }
    let slot24 = slots.find(s => String(s.cqi.name).includes('24'));
    if (slot24 && unassigned.some(m => m.isC1C2)) {
      slot24.machines.push(...unassigned.filter(m => m.isC1C2));
      slot24.isExclusive = true;
      unassigned = unassigned.filter(m => !m.isC1C2);
      applyNonCoreIfNeeded(slot24);
    }

    // Hindari CQI Kosong
    slots.forEach(slot => {
      if (slot.machines.length === 0 && unassigned.length > 0) {
        unassigned.sort((a, b) => this.getRoutedDistance(a, slot.cqi) - this.getRoutedDistance(b, slot.cqi));
        slot.machines.push(unassigned.shift());
        applyNonCoreIfNeeded(slot);
      }
    });

    // FASE 1: Distribusi Cerdas (Load Balancing & Clustering)
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null, bestScore = -Infinity;
      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length + lsPool.length, config.planMode || 'ai');
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });
      if (bestSlot) {
        bestSlot.machines.push(m); applyNonCoreIfNeeded(bestSlot);
      } else remainingUnassigned.push(m);
    });

    // Lepas eksklusivitas CQI 24 jika cadangan penuh (Bisa tampung APK)
    if (slot24 && slot24.machines.some(m => m.isC1C2)) slot24.isExclusive = false;
    
    // FASE 2: SWAP Taktis
    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 5;
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift();
        let placed = false;
        let fbSlots = [...slots].filter(s => !s.isExclusive).sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi));
        
        for (let target of fbSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length);
          if (accept.can) {
            target.machines.push(u); applyNonCoreIfNeeded(target); placed = true; break;
          } else if (accept.reason === "capacity" || accept.reason === "no_nc") {
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i]; target.machines.splice(i, 1);
              if (this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length).can) {
                let foundHome = [...slots].filter(s => s !== target && !s.isExclusive)
                  .sort((a, b) => this.getRoutedDistance(occupant, a.cqi) - this.getRoutedDistance(occupant, b.cqi))
                  .some(home => {
                     let poolCount = nonCorePool.length + lsPool.length;
                     if(this._canAcceptMachine(home, occupant, poolCount).can) {
                        target.machines.push(u); applyNonCoreIfNeeded(target);
                        home.machines.push(occupant); applyNonCoreIfNeeded(home);
                        placed = true; return true;
                     }
                     return false;
                  });
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

    // FASE 3: AUTO-REPAIR & COVERAGE FIRST (100% Assurance)
    let repCount = 0;
    while (remainingUnassigned.length > 0 && repCount < 3) {
      remainingUnassigned = this.repairUnassignedMachine(remainingUnassigned, slots, nonCorePool.length + lsPool.length);
      slots.forEach(s => applyNonCoreIfNeeded(s));
      repCount++;
    }

    // Memastikan pengurutan UI CQI
    slots.leftoverNonCores = nonCorePool;
    slots.leftoverLongshifts = lsPool;
    slots.sort((a,b) => {
        let mA = String(a.cqi.name || a.cqi.id).match(/\d+/);
        let mB = String(b.cqi.name || b.cqi.id).match(/\d+/);
        return (mA ? parseInt(mA[0]) : 0) - (mB ? parseInt(mB[0]) : 0);
    });

    return slots;
  },

  /*================ VALIDATION ENGINE (Dipertahankan) ================*/
  validate(plan, machinesData) {
    let isMachinesArray = Array.isArray(machinesData);
    let totalMachinesCount = isMachinesArray ? machinesData.length : machinesData;

    let report = {
      valid: true, coveragePercent: 0, totalMachines: totalMachinesCount,
      assignedCount: 0, unassignedMachines: [], duplicateMachines: [],
      violations: [], info: [], totalDistance: 0, avgDistance: 0, score: 100
    };

    let coveredIds = new Set();
    let isNonCoreShortageDetected = false;

    plan.forEach(slot => {
      if (slot.machines.length === 0) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} KOSONG.`);
        report.valid = false;
      }

      let astCount = 0; let kxCount = 0; let anyApkCount = 0;
      slot.machines.forEach(sm => {
          let u = (sm.name||sm.id).toUpperCase();
          if(u.startsWith('AST')) astCount++;
          else if(u.startsWith('K') || u.startsWith('X')) { kxCount++; anyApkCount++; }
          else if(u.startsWith('APK') || ['C1','C2'].includes(u)) anyApkCount++;
      });
      
      let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
      let is10 = match && match[0] === '10';
      let is24 = match && match[0] === '24';

      if (astCount > 0 && anyApkCount > 0) {
          if (is10 && kxCount > 0) {
              report.violations.push(`[FATAL] CQI ${slot.cqi.name} (CQI 10) mencampur AST dan K/X.`);
              report.valid = false;
          } else if (!is10) {
              report.violations.push(`[FATAL] CQI ${slot.cqi.name} mencampur AST dan APK/K/X.`);
              report.valid = false;
          }
      }

      let reqNC = this._getRequiredNonCore(slot, astCount, anyApkCount);
      let totalNC = slot.nonCore.length + slot.longshift.length;
      let hasC1C2 = slot.machines.some(sm => ['C1','C2'].includes((sm.name||sm.id).toUpperCase()));
      if (is24 && hasC1C2 && slot.machines.length > 2 && totalNC > 0) report.info.push(`💡 [INFO] CQI 24 menyerap Pekerja cadangan.`);
      
      let hardLimit = (is24 && hasC1C2) ? 4 : 8; 

      if (totalNC > 2) {
        report.violations.push(`[FATAL] CQI ${slot.cqi.name} memiliki ${totalNC} pekerja (Maks 2).`);
        report.valid = false;
      }
      
      if (totalNC < reqNC && slot.machines.length > 0) {
        report.violations.push(`[OVERLOAD] CQI ${slot.cqi.name} menampung ${slot.machines.length} mesin, butuh ${reqNC} pekerja tapi ada ${totalNC}.`);
        report.score -= 20;
        isNonCoreShortageDetected = true; 
      }

      if (slot.machines.length > hardLimit) {
        report.violations.push(`[FATAL OVERLOAD] CQI ${slot.cqi.name} melampaui limit (${slot.machines.length}/${hardLimit}).`);
        report.valid = false;
      }
      
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
      if (hasM2M3 && !slot.machines.every(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()))) {
          report.violations.push(`[RULE] CQI ${slot.cqi.name} mencampur M2/M3.`);
          report.score -= 30;
      }

      slot.machines.forEach(m => {
        if (coveredIds.has(m.id)) { report.duplicateMachines.push(m.name); report.valid = false; }
        coveredIds.add(m.id);
        report.totalDistance += this.getRoutedDistance(m, slot.cqi);
      });
    });

    report.assignedCount = coveredIds.size;
    report.coveragePercent = Math.round((report.assignedCount / report.totalMachines) * 100) || 0;
    report.avgDistance = report.assignedCount > 0 ? +(report.totalDistance / report.assignedCount).toFixed(2) : 0;

    if (isMachinesArray) report.unassignedMachines = machinesData.filter(m => !coveredIds.has(m.id));
    if (isNonCoreShortageDetected) report.info.push(`🚨 [PERINGATAN KRITIS] KEKURANGAN MANPOWER! AI memaksa mesin beroperasi tanpa pekerja standar.`);

    if (report.coveragePercent < 100) {
      report.valid = false;
      let missingMsg = `[COVERAGE] Ada ${report.totalMachines - report.assignedCount} mesin yang gagal masuk planning.`;
      if (report.unassignedMachines && report.unassignedMachines.length > 0) {
          missingMsg += `<br><b>Terlewat:</b> ${report.unassignedMachines.map(m => m.name || m.id).join(', ')}`;
      }
      report.violations.push(missingMsg);
      report.score -= (100 - report.coveragePercent); 
    }

    if (report.violations.length > 0) report.valid = false;
    return report;
  },

  /*================ FORMATTER OUTPUT (Dipertahankan) ================*/
  formatMachineList(machines) {
    if (!machines || machines.length === 0) return '-';
    let wsGroups = {}; let unGrouped = [];

    machines.forEach(m => {
      let mName = m.name || m.id;
      let wsKey = this.getWorkstationKey(mName);
      if (wsKey && WORKSTATIONS[wsKey]) {
        if (!wsGroups[wsKey]) wsGroups[wsKey] = [];
        wsGroups[wsKey].push(mName);
      } else unGrouped.push(mName);
    });

    let parts = [];
    for (let wsKey in wsGroups) {
      let group = wsGroups[wsKey];
      if (group.length === WORKSTATIONS[wsKey].length) parts.push(`${wsKey} (${group.length})`);
      else group.forEach(name => parts.push(name));
    }
    unGrouped.forEach(name => parts.push(name));
    return parts.join(', ');
  },

  formatText(plan, config) {
    let date = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let txt = `PLANNING LIQUID 3\nTanggal ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}\n\n`;
    
    plan.forEach((slot, i) => {
      txt += `${i + 1}.\nMESIN : ${this.formatMachineList(slot.machines)}\n`;
      let ncDisplayArr = [];
      if (slot.nonCore && slot.nonCore.length > 0) ncDisplayArr.push(...slot.nonCore);
      if (slot.longshift && slot.longshift.length > 0) ncDisplayArr.push(...slot.longshift);
      txt += `NON CORE : ${ncDisplayArr.length > 0 ? ncDisplayArr.join(', ') : '-'}\n`;
      txt += `CORE : ${slot.core}\nCQI : ${slot.cqi.name}\n\n`;
    });

    if (plan.leftoverNonCores && plan.leftoverNonCores.length > 0) txt += `INFO SISA NON-CORE: ${plan.leftoverNonCores.join(', ')}\n\n`;
    if (plan.leftoverLongshifts && plan.leftoverLongshifts.length > 0) txt += `INFO SISA LONGSHIFT: ${plan.leftoverLongshifts.join(', ')}\n\n`;

    txt += `QC PASSED :\n`;
    let qcArr = config.qcPassed ? config.qcPassed.split('\n').filter(x => x.trim() !== '') : [];
    qcArr.forEach(q => txt += `${q}\n`);

    txt += `\nMIL-STD : ${config.milStd || '-'}\nStandby OT : ${config.standbyOt || '-'}\nSupport FG : ${config.supportFg || '-'}\n`;
    return txt;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = BrainAI;
