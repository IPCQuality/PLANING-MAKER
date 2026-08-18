/*
================================================================================
 PLANNER CQI LIQUID 3
 Brain AI Engine
 Version: 1.1.2
================================================================================
*/

/*
================================================================================
 MACHINE DATABASE & CONSTANTS
================================================================================
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
 DISTANCE ENGINE
================================================================================
*/

const DistanceEngine = {
  getDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  },

  getRoutedDistance(machine, cqi, getWsKeyFn) {
    let wsKey = machine.wsKey || getWsKeyFn(machine.name || machine.id);
    if (wsKey && WORKSTATION_GATES[wsKey]) {
      let gate = WORKSTATION_GATES[wsKey];
      let distMachineToGate = this.getDistance(machine.row, machine.col, gate.row, gate.col);
      let distGateToCQI = this.getDistance(gate.row, gate.col, cqi.row, cqi.col);
      return distMachineToGate + distGateToCQI;
    }
    return this.getDistance(machine.row, machine.col, cqi.row, cqi.col);
  }
};

/*
================================================================================
 HISTORY LEARNING ENGINE
================================================================================
*/

const HistoryEngine = {
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

  async initHistory(githubRawUrl = 'https://raw.githubusercontent.com/IPCQuality/PLANING-MAKER/refs/heads/main/data/history.json') {
    try {
      const response = await fetch(githubRawUrl);
      if (!response.ok) throw new Error();
      const githubHistory = await response.json();
      let localHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');
      for (let machineId in githubHistory) {
        if (!localHistory[machineId]) localHistory[machineId] = {};
        for (let cqiId in githubHistory[machineId]) {
          if (!localHistory[machineId][cqiId]) localHistory[machineId][cqiId] = githubHistory[machineId][cqiId];
          else { 
            localHistory[machineId][cqiId].count += githubHistory[machineId][cqiId].count; 
            localHistory[machineId][cqiId].success += githubHistory[machineId][cqiId].success; 
          }
        }
      }
      localStorage.setItem('planning_history', JSON.stringify(localHistory));
    } catch (e) { 
      console.warn("Sync GitHub dilewati."); 
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
        machinePart.split(/[\+,]/).map(m => m.trim()).forEach(machineStr => {
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

/*
================================================================================
 PLANNING ENGINE & MAIN BRAIN AI
================================================================================
*/

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
    return DistanceEngine.getDistance(r1, c1, r2, c2);
  },

  getRoutedDistance(machine, cqi) {
    return DistanceEngine.getRoutedDistance(machine, cqi, this.getWorkstationKey.bind(this));
  },

  getHistory(machineId, cqiId) {
    return HistoryEngine.getHistory(machineId, cqiId);
  },

  recordHistory(machineId, cqiId, success = true, meta = {}) {
    return HistoryEngine.recordHistory(machineId, cqiId, success, meta);
  },

  initHistory(githubRawUrl) {
    return HistoryEngine.initHistory(githubRawUrl);
  },

  parseAndLearn(planningText) {
    return HistoryEngine.parseAndLearn(planningText);
  },

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

    if (total <= 4) return 0;
    
    let isAstDominant = astCount > 0;
    
    if (isAstDominant) {
      if (total <= 6) return 1;
      return 2;
    } else {
      if (total <= 5) return 0;
      if (total <= 7) return 1;
      return 2;
    }
  },

  _canAcceptMachine(slot, m, availableTotalNC) {
    if (slot.isExclusive) return { can: false };

    let hasAst = slot.machines.some(sm => sm.isAst);
    let hasApk = slot.machines.some(sm => sm.isApk);
    let hasKX = slot.machines.some(sm => sm.isKX);
    let hasC1C2 = slot.machines.some(sm => sm.isC1C2);
    let hasAnyApk = hasApk || hasKX || hasC1C2;
    let mIsAnyApk = m.isApk || m.isKX || m.isC1C2;

    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let is24 = cqiIdStr === '24';
    let is10 = cqiIdStr === '10';

    if (is10) {
        if ((hasAst && m.isKX) || (hasKX && m.isAst)) return { can: false, reason: "strict_mix_cqi10" };
    } else {
        if (hasAst && mIsAnyApk) return { can: false, reason: "strict_mix" };
        if (hasAnyApk && m.isAst) return { can: false, reason: "strict_mix" };
    }

    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isAnyApk).length + (mIsAnyApk ? 1 : 0);
    
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
    let currentNC = slot.nonCore.length + (slot.longshift ? slot.longshift.length : 0);
    let neededNC = reqNC - currentNC;
    
    let hasTargetC1C2 = hasC1C2 || m.isC1C2;
    let isAstDominant = astCount > 0;
    
    let absoluteMax;
    if (is24 && hasTargetC1C2) {
      absoluteMax = 4;
    } else if (isAstDominant) {
      absoluteMax = (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8);
    } else {
      absoluteMax = (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8);
    }
    
    if (astCount + apkCount > absoluteMax) return { can: false, reason: "capacity" }; 
    if (neededNC > availableTotalNC) return { can: false, reason: "no_nc" }; 
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: absoluteMax };
  },

  _scoreSlot(m, slot, slots, availableTotalNC, planMode = 'ai') {
    let acceptStatus = this._canAcceptMachine(slot, m, availableTotalNC);
    if (!acceptStatus.can) return -Infinity;

    let dist = this.getRoutedDistance(m, slot.cqi);
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
    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getRoutedDistance(sm, slot.cqi), 0);
    let workloadPenalty = (slotMachineCount * 25) + (slotDistSum * 2);

    return distScore + histScore + wsBonus + priorityBonus + capScore + ncPenalty - workloadPenalty;
  },

  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;

    let availableCores = [];
    let rawCores = config.coreData || config.coreNames || [];
    
    // PEMBAGIAN DATA MANPOWER DENGAN PASSTHROUGH PROPERTI LENGKAP (ID, NAME, CQI_PRIORITY)
    for (let i = 0; i < coreLimit; i++) {
        if (rawCores[i]) {
            if (typeof rawCores[i] === 'object') {
                availableCores.push({
                    id: rawCores[i].id || null,
                    name: rawCores[i].name || `CORE ${i+1}`,
                    cqi_priority: rawCores[i].cqi_priority || null
                });
            } else {
                availableCores.push({ id: null, name: rawCores[i], cqi_priority: null });
            }
        } else {
            availableCores.push({ id: null, name: `CORE ${i+1}`, cqi_priority: null });
        }
    }

    let nonCorePool = [];
    let rawNonCores = config.nonCoreData || config.nonCoreNames || [];
    for (let i = 0; i < nonCoreCount; i++) {
        if (rawNonCores[i]) {
            if (typeof rawNonCores[i] === 'object') {
                nonCorePool.push(rawNonCores[i].name || `NON CORE ${i+1}`);
            } else {
                nonCorePool.push(rawNonCores[i]);
            }
        } else {
            nonCorePool.push(`NON CORE ${i+1}`);
        }
    }

    let lsPool = [];
    let rawLS = config.longshiftData || config.longshiftNames || [];
    let lsCount = parseInt(config.longshift) || rawLS.length || 0;
    for (let i = 0; i < lsCount; i++) {
        if (rawLS[i]) {
            if (typeof rawLS[i] === 'object') {
                lsPool.push(rawLS[i].name || `(LS)`);
            } else {
                lsPool.push(rawLS[i]);
            }
        } else {
            lsPool.push(`(LS)`);
        }
    }

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

    let cqiScores = cqis.map(cqi => {
        let score = 0;
        let match = String(cqi.name || cqi.id).match(/\d+/);
        let cqiIdStr = match ? match[0] : String(cqi.id);

        let is19 = cqiIdStr === '19';
        let is24 = cqiIdStr === '24';

        unassigned.forEach(m => {
            if (m.wsKey && CQI_PRIORITY_MAP[cqiIdStr] && CQI_PRIORITY_MAP[cqiIdStr].includes(m.wsKey)) score += 1500;
            let dist = this.getRoutedDistance(m, cqi);
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

    let slots = activeCQIs.map((cqi, i) => {
      return {
        slotId: 'SLOT-' + i, 
        cqi: cqi, 
        core: null,
        nonCore: [], 
        longshift: [], 
        machines: [],
        isExclusive: false
      };
    });

    // MULTI-CHECK HELPER: MENDELEKSI CORE OT (COT1 DAN COT2) DENGAN CERDAS (ID, NAME, ATAU PRIORITY)
    const isOTPerson = (coreObj) => {
        if (!coreObj) return false;
        let idUpper = String(coreObj.id || '').toUpperCase();
        let nameUpper = String(coreObj.name || '').toUpperCase();
        let prioUpper = String(coreObj.cqi_priority || '').toUpperCase();

        return (
            idUpper === 'COT1' || idUpper === 'COT2' ||
            nameUpper.includes('FARHAN') || nameUpper.includes('DINI') ||
            prioUpper.includes('CQI 19') || prioUpper.includes('19')
        );
    };

    const assignCoreToCQI = (cqiStr) => {
        if (availableCores.length === 0) return "UNKNOWN CORE";
        let match = String(cqiStr).match(/\d+/);
        let targetCqi = match ? match[0] : null;

        // VALIDASI OT / CQI 19 STRICT CHECK: HANYA BOLEH COT1/COT2 (FARHAN/DINI)
        if (targetCqi === '19') {
            let otCoreIndex = availableCores.findIndex(c => isOTPerson(c));
            if (otCoreIndex !== -1) {
                let otCore = availableCores.splice(otCoreIndex, 1)[0];
                return otCore.name;
            }
            return "NO VALID OT CORE (COT1/COT2 REQUIRED)";
        }

        // CARI KANDIDAT NORMAL DENGAN MATCHING CQI_PRIORITY (DAN BUKAN COT1/COT2)
        let candidates = availableCores.filter(c => {
            let prioMatch = false;
            if (c.cqi_priority) {
                let prioNum = String(c.cqi_priority).match(/\d+/);
                prioMatch = prioNum && prioNum[0] === targetCqi;
            }
            return prioMatch && !isOTPerson(c);
        });

        if (candidates.length > 0) {
            let selected = candidates[0];
            availableCores.splice(availableCores.indexOf(selected), 1);
            return selected.name;
        }

        // FALLBACK STANDAR: AMBIL CORE APA SAJA SELAIN COT1/COT2 UNTUK CQI NORMAL
        let fallbackIndex = availableCores.findIndex(c => !isOTPerson(c));
        if (fallbackIndex !== -1) {
            let fallback = availableCores.splice(fallbackIndex, 1)[0];
            return fallback.name;
        }

        let fallback = availableCores.shift();
        return fallback ? fallback.name : "UNKNOWN CORE";
    };

    let slot19 = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '19'; });
    if (slot19) {
        slot19.core = assignCoreToCQI('19');
    }

    slots.forEach(slot => {
        if (!slot.core) {
            slot.core = assignCoreToCQI(slot.cqi.name || slot.cqi.id);
        }
    });

    const applyNonCoreIfNeeded = (slot) => {
      let astCount = slot.machines.filter(sm => sm.isAst).length;
      let apkCount = slot.machines.filter(sm => sm.isAnyApk).length;
      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
      let currentTotalNC = slot.nonCore.length + slot.longshift.length;
      
      while (currentTotalNC < reqNC) {
        if (nonCorePool.length > 0) {
          slot.nonCore.push(nonCorePool.shift());
          currentTotalNC++;
        } else if (lsPool.length > 0) {
          slot.longshift.push(lsPool.shift());
          currentTotalNC++;
        } else {
          break;
        }
      }
    };

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
      
      slot24.isExclusive = true; 
      applyNonCoreIfNeeded(slot24);
    }

    slots.forEach(slot => {
      if (slot.machines.length === 0 && unassigned.length > 0) {
        unassigned.sort((a, b) => this.getRoutedDistance(a, slot.cqi) - this.getRoutedDistance(b, slot.cqi));
        let seedMachine = unassigned.shift();
        slot.machines.push(seedMachine);
        applyNonCoreIfNeeded(slot);
      }
    });

    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));
    
    // FASE 1: MASUKKAN MESIN SECA NORMAL
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length + lsPool.length, config.planMode || 'ai');
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
        applyNonCoreIfNeeded(bestSlot);
      } else {
        remainingUnassigned.push(m);
      }
    });

    let slot24Fallback = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '24'; });
    if (slot24Fallback && slot24Fallback.machines.some(m => m.isC1C2)) {
        slot24Fallback.isExclusive = false;
    }
    
    // FASE 2: GESER & TUKAR NORMAL
    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 5; 
      
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift();
        let placed = false;

        let fallbackSlots = [...slots].filter(s => !s.isExclusive)
          .sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi));

        for (let target of fallbackSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length);
          
          if (accept.can) {
            target.machines.push(u); 
            applyNonCoreIfNeeded(target);
            placed = true; 
            break;
          } 
          else if (accept.reason === "capacity" || accept.reason === "no_nc") {
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i];
              target.machines.splice(i, 1); 

              let acceptU = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length);
              if (acceptU.can) {
                let newHomes = [...slots].filter(s => s !== target && !s.isExclusive)
                  .sort((a, b) => this.getRoutedDistance(occupant, a.cqi) - this.getRoutedDistance(occupant, b.cqi));
                
                let foundHome = false;
                for(let home of newHomes) {
                  let currentTotalPool = nonCorePool.length + lsPool.length;
                  let currentAvail = Math.max(0, currentTotalPool - acceptU.neededNC);
                  let acceptOcc = this._canAcceptMachine(home, occupant, currentAvail);
                  
                  if(acceptOcc.can) {
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
              target.machines.splice(i, 0, occupant); 
            }
          }
          if (placed) break;
        }
        
        if (!placed) remainingUnassigned.push(u); 
        iterations--;
      }
    }

    // FASE 3: BULLDOZER (BYPASSING WORKSTATION PRIORITY)
    if (remainingUnassigned.length > 0) {
        let tempUnassigned = [...remainingUnassigned];
        remainingUnassigned = [];
        
        while(tempUnassigned.length > 0) {
            let u = tempUnassigned.shift();
            
            let possibleSlots = slots.filter(s => {
                let match = String(s.cqi.name || s.cqi.id).match(/\d+/);
                let is19 = match && match[0] === '19';
                
                if (is19 && !u.isM2M3) return false;
                if (!is19 && u.isM2M3) return false;
                
                let accept = this._canAcceptMachine(s, u, nonCorePool.length + lsPool.length);
                return accept.can;
            });
            
            if (possibleSlots.length > 0) {
                let closestTarget = possibleSlots.sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi))[0];
                closestTarget.machines.push(u);
                applyNonCoreIfNeeded(closestTarget);
            } else {
                remainingUnassigned.push(u);
            }
        }
    }

    // FASE 4: DESPERATE FORCE (FORCE ALL MESHIN IN)
    if (remainingUnassigned.length > 0) {
        console.warn("BULLDOZER FASE AKHIR AKTIF: Memaksa sisa mesin masuk demi 100% Coverage (Max 8/CQI)!");
        
        let tempUnassigned = [...remainingUnassigned];
        remainingUnassigned = [];
        
        while(tempUnassigned.length > 0) {
            let u = tempUnassigned.shift();
            
            let possibleSlots = slots.filter(s => {
                let match = String(s.cqi.name || s.cqi.id).match(/\d+/);
                let is19 = match && match[0] === '19';
                let is24 = match && match[0] === '24';
                let is10 = match && match[0] === '10';
                
                if (is19 && !u.isM2M3) return false;
                if (!is19 && u.isM2M3) return false;
                
                let hasC1C2 = s.machines.some(m => m.isC1C2) || u.isC1C2;
                let hardLimit = (is24 && hasC1C2) ? 4 : 8; 

                let hasAst = s.machines.some(sm => sm.isAst);
                let hasApk = s.machines.some(sm => sm.isApk);
                let hasKX = s.machines.some(sm => sm.isKX);
                let hasAnyApk = s.machines.some(sm => sm.isAnyApk);

                if (is10) {
                    if ((hasKX && u.isAst) || (hasAst && u.isKX)) return false;
                } else {
                    if (hasAst && u.isAnyApk) return false;
                    if (hasAnyApk && u.isAst) return false;
                }

                return s.machines.length < hardLimit;
            });
            
            if(possibleSlots.length > 0) {
                let forcedTarget = possibleSlots.sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi))[0];
                forcedTarget.machines.push(u);
                applyNonCoreIfNeeded(forcedTarget); 
            } else {
                remainingUnassigned.push(u); 
            }
        }
    }

    slots.forEach(slot => {
        let astCount = slot.machines.filter(sm => sm.isAst).length;
        let apkCount = slot.machines.filter(sm => sm.isAnyApk).length;
        let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
        let is19 = match && match[0] === '19';
        
        if (!is19 && slot.machines.length > 4) {
            let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
            let currentTotalNC = slot.nonCore.length + slot.longshift.length;
            while (currentTotalNC < reqNC) {
                if (nonCorePool.length > 0) {
                    slot.nonCore.push(nonCorePool.shift());
                    currentTotalNC++;
                } else if (lsPool.length > 0) {
                    slot.longshift.push(lsPool.shift());
                    currentTotalNC++;
                } else {
                    break;
                }
            }
        }
    });

    // OPTIMASI SWAPPING JARAK
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

              let distBefore = this.getRoutedDistance(mA, sA.cqi) + this.getRoutedDistance(mB, sB.cqi);
              let distAfter = this.getRoutedDistance(mA, sB.cqi) + this.getRoutedDistance(mB, sA.cqi);
              
              if (distAfter < distBefore - 3) {
                sA.machines.splice(m, 1); sA.machines.push(mB);
                sB.machines.splice(n, 1); sB.machines.push(mA);
                
                let cqiA = String(sA.cqi.name || sA.cqi.id).match(/\d+/); let is10A = cqiA && cqiA[0] === '10';
                let cqiB = String(sB.cqi.name || sB.cqi.id).match(/\d+/); let is10B = cqiB && cqiB[0] === '10';

                let astA = sA.machines.filter(sm => sm.isAst).length; let kxA = sA.machines.filter(sm => sm.isKX).length; let anyApkA = sA.machines.filter(sm => sm.isAnyApk).length;
                let astB = sB.machines.filter(sm => sm.isAst).length; let kxB = sB.machines.filter(sm => sm.isKX).length; let anyApkB = sB.machines.filter(sm => sm.isAnyApk).length;

                let validA = true;
                if (is10A) { if(astA > 0 && kxA > 0) validA = false; } else { if(astA > 0 && anyApkA > 0) validA = false; }
                
                let validB = true;
                if (is10B) { if(astB > 0 && kxB > 0) validB = false; } else { if(astB > 0 && anyApkB > 0) validB = false; }
                
                let reqA = this._getRequiredNonCore(sA, astA, anyApkA);
                let reqB = this._getRequiredNonCore(sB, astB, anyApkB);
                
                let totalNCA = sA.nonCore.length + sA.longshift.length;
                let totalNCB = sB.nonCore.length + sB.longshift.length;

                if (!validA || !validB || reqA > totalNCA || reqB > totalNCB) {
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

    slots.leftoverNonCores = nonCorePool;
    slots.leftoverLongshifts = lsPool;
    slots.sort((a,b) => {
        let mA = String(a.cqi.name || a.cqi.id).match(/\d+/);
        let mB = String(b.cqi.name || b.cqi.id).match(/\d+/);
        return (mA ? parseInt(mA[0]) : 0) - (mB ? parseInt(mB[0]) : 0);
    });

    return slots;
  },

/*
================================================================================
 VALIDATION ENGINE & OUTPUT FORMATTERS
================================================================================
*/

  validate(plan, machinesData) {
    let isMachinesArray = Array.isArray(machinesData);
    let totalMachinesCount = isMachinesArray ? machinesData.length : machinesData;

    let report = {
      valid: true, coveragePercent: 0, totalMachines: totalMachinesCount,
      assignedCount: 0, unassignedMachines: [], duplicateMachines: [],
      violations: [], info: [], totalDistance: 0, avgDistance: 0, score: 100
    };

    let coveredIds = new Set();
    let machineDistances = [];
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
      if (is24 && hasC1C2 && slot.machines.length > 2 && totalNC > 0) {
          report.info.push(`💡 [INFO] CQI 24 menyerap Pekerja cadangan.`);
      }

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
        if (coveredIds.has(m.id)) {
          report.duplicateMachines.push(m.name);
          report.valid = false;
        }
        coveredIds.add(m.id);
        
        let dist = this.getRoutedDistance(m, slot.cqi);
        report.totalDistance += dist;
        machineDistances.push(dist);
      });
    });

    report.assignedCount = coveredIds.size;
    report.coveragePercent = Math.round((report.assignedCount / report.totalMachines) * 100) || 0;
    report.avgDistance = report.assignedCount > 0 ? +(report.totalDistance / report.assignedCount).toFixed(2) : 0;

    if (isMachinesArray) report.unassignedMachines = machinesData.filter(m => !coveredIds.has(m.id));

    if (isNonCoreShortageDetected) {
        report.info.push(`🚨 [PERINGATAN KRITIS] KEKURANGAN MANPOWER! AI memaksa mesin beroperasi tanpa pekerja standar.`);
    }

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