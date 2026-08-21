/*
================================================================================
 PLANNER CQI LIQUID 3
 Brain AI Engine - Optimized Version
 Version: 3.0.0 (Interactive Editor, AI Swap Suggestions, Dynamic Machine Mode)
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

const WORKSTATION_GATES = {
  "0A": { row: 9, col: 6 }, "1A": { row: 9, col: 8 }, "2A": { row: 9, col: 10 }, "3A": { row: 9, col: 12 }, "4A": { row: 9, col: 14 }, "5A": { row: 9, col: 16 }, "6A": { row: 9, col: 18 }, "7A": { row: 9, col: 20 }, "8A": { row: 9, col: 22 }, "9A": { row: 9, col: 24 }, "10A": { row: 9, col: 26 },
  "0B": { row: 11, col: 6 }, "1B": { row: 11, col: 8 }, "2B": { row: 11, col: 10 }, "3B": { row: 11, col: 12 }, "4B": { row: 11, col: 14 }, "5B": { row: 11, col: 16 }, "6B": { row: 11, col: 18 }, "7B": { row: 11, col: 20 }, "8B": { row: 11, col: 22 }, "9B": { row: 11, col: 24 }, "10B": { row: 11, col: 26 }, "11B": { row: 11, col: 28 },
  "1C": { row: 13, col: 33 }, "2C": { row: 13, col: 35 }, "3C": { row: 13, col: 37 }, "4C": { row: 13, col: 39 }, "5C": { row: 13, col: 41 }, "6C": { row: 13, col: 43 }, "7C": { row: 13, col: 45 }, "8C": { row: 13, col: 48 }, "9C": { row: 13, col: 50 }, "10C": { row: 13, col: 52 },
  "WW": { row: 9, col: 33 }, "OT": { row: 5, col: 33 }
};

const CQI_PRIORITY_MAP = {
  "1": ["0A", "1A"], "2": ["2A", "2B"], "3": ["3A", "4A"], "4": ["3A", "4A", "5B"], "5": ["5A", "6A"], "6": ["5A", "6A"],
  "7": ["7A", "8A"], "8": ["8A", "9A", "10B"], "9": ["9A", "10A"], "10": ["10A", "1C", "2C"], "11": ["1B", "2B"],
  "13": ["3B", "5B"], "14": ["0B", "6B", "7A", "10B"], "15": ["7B", "8B", "9B"], "17": ["3C", "4C", "5C", "8C"],
  "18": ["2C", "3C", "4C", "5C"], "19": ["OT"], "20": ["6C", "7C", "8C", "9C", "10C"], "24": ["WW"]
};

/* --- STRICT RULES ENGINE (Tetap Dipertahankan) --- */
const StrictRules = {
  getClusterFamily(clusterName) {
      if (!clusterName) return 'NEUTRAL';
      let n = String(clusterName).toLowerCase();
      if (n.includes('botol') || n.includes('liquid')) return 'LIQUID_BOTOL';
      if (n.includes('pouch')) return 'POUCH';
      if (n.includes('sklsct')) return 'SKLSCT';
      if (n.includes('sosoft') || n.includes('skl') || n.includes('sct') || n.includes('sachet')) return 'SACHET_OTHER';
      return 'NEUTRAL';
  },
  isClusterCompatible(slotMachines, newMachine, cqiIdStr) {
      let newFam = this.getClusterFamily(newMachine.clusterName);
      if (newFam === 'NEUTRAL') return true;
      for (let sm of slotMachines) {
          let smFam = this.getClusterFamily(sm.clusterName);
          if (smFam !== 'NEUTRAL' && smFam !== newFam) {
              let isPouchAndSklsct = (newFam === 'POUCH' && smFam === 'SKLSCT') || (newFam === 'SKLSCT' && smFam === 'POUCH');
              if (isPouchAndSklsct && cqiIdStr === '10') continue;
              return false;
          }
      }
      return true;
  },
  isMixingValid(slotMachines, newMachine, cqiIdStr) {
      let is10 = (cqiIdStr === '10');
      let hasAst = slotMachines.some(sm => sm.isAst);
      let hasKX = slotMachines.some(sm => sm.isKX);
      let hasApk = slotMachines.some(sm => sm.isApk);
      let hasAnyApk = hasApk || hasKX || slotMachines.some(sm => sm.isC1C2);
      let mIsAnyApk = newMachine.isApk || newMachine.isKX || newMachine.isC1C2;
      if (is10) {
          if ((hasAst && newMachine.isKX) || (hasKX && newMachine.isAst)) return false;
      } else {
          if (hasAst && mIsAnyApk) return false;
          if (hasAnyApk && newMachine.isAst) return false;
      }
      return true;
  }
};

/* --- DISTANCE ENGINE --- */
const DistanceEngine = {
  getDistance(r1, c1, r2, c2) { return Math.abs(r1 - r2) + Math.abs(c1 - c2); },
  getRoutedDistance(machine, cqi, getWsKeyFn) {
    let explicitWs = machine.ws || (machine.id && String(machine.id).includes('-') ? String(machine.id).split('-')[1] : null);
    let wsKey = machine.wsKey || explicitWs || getWsKeyFn(machine.name || machine.id);
    let cqiMatch = String(cqi.name || cqi.id).match(/\d+/); let cqiNum = cqiMatch ? cqiMatch[0] : null;
    let isWWorOT = (cqiNum === '24' || cqiNum === '19' || wsKey === 'WW' || wsKey === 'OT');

    let mZone = (wsKey && wsKey.endsWith('C')) ? 'C' : 'AB'; if (!wsKey && machine.col >= 32) mZone = 'C'; 
    let cZone = (cqi.col >= 32) ? 'C' : 'AB';
    let currentStartRow = parseInt(machine.row) || 0; let currentStartCol = parseInt(machine.col) || 0;
    let currentEndRow = parseInt(cqi.row) || 0; let currentEndCol = parseInt(cqi.col) || 0;
    let distTotal = 0;

    if (wsKey && WORKSTATION_GATES[wsKey]) {
      let gate = WORKSTATION_GATES[wsKey];
      distTotal += this.getDistance(currentStartRow, currentStartCol, gate.row, gate.col);
      currentStartRow = gate.row; currentStartCol = gate.col;
    }

    if (!isWWorOT && mZone === 'AB' && cZone === 'C') {
      distTotal += this.getDistance(currentStartRow, currentStartCol, 10, 31);
      distTotal += this.getDistance(10, 31, 12, 31);
      distTotal += this.getDistance(12, 31, currentEndRow, currentEndCol);
    } else if (!isWWorOT && mZone === 'C' && cZone === 'AB') {
      distTotal += this.getDistance(currentStartRow, currentStartCol, 12, 31);
      distTotal += this.getDistance(12, 31, 10, 31);
      distTotal += this.getDistance(10, 31, currentEndRow, currentEndCol);
    } else {
      distTotal += this.getDistance(currentStartRow, currentStartCol, currentEndRow, currentEndCol);
    }
    return distTotal;
  }
};

const HistoryEngine = {
  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId]; return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50;
  },
  recordHistory(machineId, cqiId, success = true, meta = {}) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (!hist[machineId]) hist[machineId] = {};
    if (!hist[machineId][cqiId]) hist[machineId][cqiId] = { count: 0, success: 0, lastDistance: meta.dist || null, lastUsed: null };
    hist[machineId][cqiId].count++;
    if (success) hist[machineId][cqiId].success++;
    hist[machineId][cqiId].lastUsed = new Date().toISOString();
    if (meta.dist) hist[machineId][cqiId].lastDistance = meta.dist;
    localStorage.setItem('planning_history', JSON.stringify(hist));
  }
};

/* --- MAIN BRAIN AI --- */
const BrainAI = {
  WORKSTATIONS: WORKSTATIONS,
  internalLogs: [],

  addLog(msg) {
    const timestamp = new Date().toLocaleTimeString('id-ID');
    this.internalLogs.push(`[${timestamp}] ${msg}`);
  },

  normalizeName(str) { return str ? String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : ''; },
  getWorkstationKey(machineName) {
    if (!machineName) return null; let norm = this.normalizeName(machineName);
    for (let wsKey in WORKSTATIONS) { if (WORKSTATIONS[wsKey].some(item => this.normalizeName(item) === norm)) return wsKey; }
    return null;
  },
  getRoutedDistance(machine, cqi) { return DistanceEngine.getRoutedDistance(machine, cqi, this.getWorkstationKey.bind(this)); },
  getHistory(machineId, cqiId) { return HistoryEngine.getHistory(machineId, cqiId); },

  _calculateSpread(m, slot) {
    if (!slot || slot.machines.length === 0) return { colSpread: 0, rowSpread: 0, total: 0 };
    let minCol = m.col, maxCol = m.col; let minRow = m.row, maxRow = m.row;
    slot.machines.forEach(sm => {
        if (sm.col < minCol) minCol = sm.col; if (sm.col > maxCol) maxCol = sm.col;
        if (sm.row < minRow) minRow = sm.row; if (sm.row > maxRow) maxRow = sm.row;
    });
    return { colSpread: maxCol - minCol, rowSpread: maxRow - minRow, total: (maxCol - minCol) + (maxRow - minRow) };
  },

  _getRequiredNonCore(slot, astCount, apkCount, hasSosoft = false) {
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    if (cqiIdStr === '19') return 0;
    let is24 = cqiIdStr === '24';
    let hasC1C2 = slot.machines.some(m => m.isC1C2);
    let total = astCount + apkCount;
    if (is24 && hasC1C2) { return total <= 2 ? 0 : 1; }
    if (hasSosoft) return total <= 6 ? 1 : 2;
    if (total <= 4) return 0;
    let isAstDominant = astCount > 0;
    if (isAstDominant) return (total <= 6) ? 1 : 2;
    return (total <= 5) ? 0 : (total <= 7) ? 1 : 2;
  },

  _canAcceptMachine(slot, m, availableTotalNC, config = {}) {
    if (slot.isExclusive) return { can: false, reason: "exclusive_slot" };

    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let is24 = cqiIdStr === '24';

    let hasC1C2 = slot.machines.some(sm => sm.isC1C2) || m.isC1C2;
    let absoluteHardLimit = (is24 && hasC1C2) ? 4 : 8;
    if (slot.machines.length >= absoluteHardLimit) return { can: false, reason: "strict_max_8" };

    if (m.isC1C2 && !is24) return { can: false, reason: "ww_exclusive_cqi24" };
    if (!m.isC1C2 && is24) return { can: false, reason: "cqi24_only_ww" };

    if (!StrictRules.isMixingValid(slot.machines, m, cqiIdStr)) return { can: false, reason: "strict_mix" };
    if (!StrictRules.isClusterCompatible(slot.machines, m, cqiIdStr)) return { can: false, reason: "cluster_clash" };

    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isAnyApk).length + ((m.isApk || m.isKX || m.isC1C2) ? 1 : 0);
    let isSosoft = slot.machines.some(sm => sm.clusterName?.includes('sosoft')) || m.clusterName?.includes('sosoft');
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount, isSosoft);
    let currentNC = slot.nonCore.length + (slot.longshift ? slot.longshift.length : 0);
    let neededNC = reqNC - currentNC;
    
    let optimalMax = absoluteHardLimit;
    if (isSosoft) optimalMax = (reqNC <= 1) ? 6 : 8;
    else optimalMax = (is24 && hasC1C2) ? 4 : (astCount > 0 ? (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8) : (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8));
    
    if (astCount + apkCount > optimalMax) return { can: false, reason: "capacity" }; 
    if (neededNC > availableTotalNC) return { can: false, reason: "no_nc" }; 
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: optimalMax };
  },

  _scoreSlot(m, slot, slots, availableTotalNC, planMode = 'ai', config = {}) {
    let acceptStatus = this._canAcceptMachine(slot, m, availableTotalNC, config);
    if (!acceptStatus.can) return -Infinity;

    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let sameWsCount = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
    let dist = this.getRoutedDistance(m, slot.cqi);
    let totalMachines = slot.machines.length + 1;
    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getRoutedDistance(sm, slot.cqi), 0);

    // MODE MODIFIER (Dinamis Berdasarkan Tombol Mode)
    let aiMode = config.machineMode || 'FULL';
    let distMultiplier = 20; let capMultiplier = 20; let penaltySpreadMultiplier = 200;
    
    if (aiMode === '<60') { distMultiplier = 40; capMultiplier = 5; penaltySpreadMultiplier = 400; } // Sangat ketat jarak
    else if (aiMode === '<80') { distMultiplier = 25; capMultiplier = 15; } // Balance
    else if (aiMode === 'FULL') { distMultiplier = 10; capMultiplier = 40; penaltySpreadMultiplier = 100; } // Push kepadatan per CQI
    
    let priorityList = slot.cqi.priority ? (Array.isArray(slot.cqi.priority) ? slot.cqi.priority : slot.cqi.priority.split(',').map(s=>s.trim())) : (CQI_PRIORITY_MAP[cqiIdStr] || []);
    let priorityBonus = (m.wsKey && priorityList.includes(m.wsKey)) ? 10000 : 0; 
    let wsBonus = (m.wsKey && sameWsCount > 0) ? (3000 + (sameWsCount * 500)) : 0; 
    let distScore = Math.max(0, 2000 - (dist * distMultiplier)); 
    
    let spreadPenalty = 0;
    if (slot.machines.length > 0) {
        let spread = this._calculateSpread(m, slot);
        if (spread.total > 2) spreadPenalty = -(Math.pow(spread.total, 2) * penaltySpreadMultiplier); 
        let uniqueWS = new Set(slot.machines.map(sm => sm.wsKey).filter(w => w));
        if (m.wsKey) uniqueWS.add(m.wsKey);
        if (uniqueWS.size > 2) spreadPenalty -= (uniqueWS.size * 1500); 
    }
    
    let clusterBonus = 0;
    if (m.clusterName && slot.machines.length > 0) {
        let mFamily = StrictRules.getClusterFamily(m.clusterName);
        let sameFamilyCount = slot.machines.filter(sm => StrictRules.getClusterFamily(sm.clusterName) === mFamily).length;
        if (sameFamilyCount > 0 && mFamily !== 'NEUTRAL') clusterBonus = sameFamilyCount * 3000;
    }

    let histScore = this.getHistory(m.id, slot.cqi.id) * (planMode === 'history' ? 2.0 : 0.5); 
    let capScore = ((acceptStatus.absoluteMax - totalMachines) * capMultiplier); 
    let workloadPenalty = -((slot.machines.length * 50) + (slotDistSum * 2)); 
    let ncPenalty = acceptStatus.neededNC > 0 ? -5000 : 0; 

    return priorityBonus + wsBonus + distScore + clusterBonus + histScore + capScore + workloadPenalty + ncPenalty + spreadPenalty;
  },

  detectUnassignedMachine(machines, slots) {
      let assignedIds = new Set(); slots.forEach(s => s.machines.forEach(m => assignedIds.add(m.id))); return machines.filter(m => !assignedIds.has(m.id));
  },
  finalCoverageCheck(machines, slots) { return this.detectUnassignedMachine(machines, slots).length === 0; },

  repairUnassignedMachine(unassigned, slots, poolSize, applyNcFn, logger, config = {}) {
      let remaining = [...unassigned]; let iterations = 0;
      while (remaining.length > 0 && iterations < (unassigned.length * 5)) {
          let m = remaining.shift();
          let bestSlot = null; let maxScore = -Infinity;
          
          slots.forEach(slot => {
              let accept = this._canAcceptMachine(slot, m, poolSize, config);
              if (accept.can) {
                  let score = this._scoreSlot(m, slot, slots, poolSize, 'ai', config);
                  if (score > maxScore) { maxScore = score; bestSlot = slot; }
              }
          });

          if (bestSlot && maxScore > -10000) {
              bestSlot.machines.push(m); applyNcFn(bestSlot);
          } else {
              let forcedSlot = [...slots].filter(s => {
                  let cqiIdStr = String(s.cqi.name || s.cqi.id).match(/\d+/)?.[0];
                  if (s.machines.length >= 8) return false;
                  return StrictRules.isMixingValid(s.machines, m, cqiIdStr) && StrictRules.isClusterCompatible(s.machines, m, cqiIdStr);
              }).sort((a, b) => {
                  let aCap = a.machines.length; let bCap = b.machines.length;
                  if (aCap === 0 && bCap > 0) return -1; if (bCap === 0 && aCap > 0) return 1;
                  let spreadA = this._calculateSpread(m, a).total; let spreadB = this._calculateSpread(m, b).total;
                  if (spreadA !== spreadB) return spreadA - spreadB;
                  return this.getRoutedDistance(m, a.cqi) - this.getRoutedDistance(m, b.cqi);
              })[0];
              
              if (forcedSlot) { forcedSlot.machines.push(m); applyNcFn(forcedSlot); }
          }
          iterations++;
      }
  },

  runFinalValidationAndRepair(slots, allMachines, poolSize, applyNcFn, logger, config = {}) {
      let maxRetries = 5; let currentRetry = 0;
      let isFullyCovered = this.finalCoverageCheck(allMachines, slots);
      while (!isFullyCovered && currentRetry < maxRetries) {
          let unassigned = this.detectUnassignedMachine(allMachines, slots);
          if (unassigned.length > 0) this.repairUnassignedMachine(unassigned, slots, poolSize, applyNcFn, logger, config);
          slots.forEach(slot => {
              let hardLimit = slot.machines.some(m => m.isC1C2) ? 4 : 8;
              if (slot.machines.length > hardLimit) {
                  let excess = slot.machines.pop();
                  this.repairUnassignedMachine([excess], slots, poolSize, applyNcFn, logger, config);
              }
          });
          isFullyCovered = this.finalCoverageCheck(allMachines, slots);
          currentRetry++;
      }
  },

  generatePlan(machines, cqis, config = {}) {
    this.internalLogs = [];
    this.addLog(`=== AI GENERATE [Mode: ${config.machineMode || 'FULL'}] ===`);

    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    let availableCores = []; let rawCores = config.coreData || config.coreNames || [];
    for (let i = 0; i < coreLimit; i++) {
        if (rawCores[i]) {
            if (typeof rawCores[i] === 'object') availableCores.push({ id: rawCores[i].id || null, name: rawCores[i].name || `CORE ${i+1}`, cqi_priority: rawCores[i].cqi_priority || null });
            else availableCores.push({ id: null, name: rawCores[i], cqi_priority: null });
        } else availableCores.push({ id: null, name: `CORE ${i+1}`, cqi_priority: null });
    }

    let nonCorePool = []; let rawNonCores = config.nonCoreData || config.nonCoreNames || [];
    for (let i = 0; i < nonCoreCount; i++) nonCorePool.push((typeof rawNonCores[i] === 'object' && rawNonCores[i]) ? rawNonCores[i].name || `NON CORE ${i+1}` : rawNonCores[i] || `NON CORE ${i+1}`);

    let lsPool = []; let rawLS = config.longshiftData || config.longshiftNames || [];
    let lsCount = parseInt(config.longshift) || rawLS.length || 0;
    for (let i = 0; i < lsCount; i++) lsPool.push((typeof rawLS[i] === 'object' && rawLS[i]) ? rawLS[i].name || `(LS)` : rawLS[i] || `(LS)`);

    let allOriginalMachines = machines.map(m => {
      let nm = { ...m }; let upName = (nm.name || nm.id).toUpperCase();
      let explicitWs = nm.ws || (nm.id && String(nm.id).includes('-') ? String(nm.id).split('-')[1] : null);
      nm.wsKey = explicitWs || this.getWorkstationKey(upName) || null;
      nm.clusterName = nm.cluster ? String(nm.cluster).toLowerCase().trim() : null;
      nm.row = parseInt(nm.row) || 0; nm.col = parseInt(nm.col) || 0;
      nm.isAst = upName.startsWith('AST'); nm.isApk = upName.startsWith('APK');
      nm.isKX = upName.startsWith('K') || upName.startsWith('X');
      nm.isM2M3 = ['M2', 'M3'].includes(upName); nm.isC1C2 = ['C1', 'C2'].includes(upName);
      nm.isAnyApk = nm.isApk || nm.isKX || nm.isC1C2;
      return nm;
    });

    let unassigned = [...allOriginalMachines];
    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || '') || (a.name || '').localeCompare(b.name || ''));

    let activeCQIs = cqis.slice(0, coreLimit).sort((a,b) => (parseInt(String(a.name || a.id).match(/\d+/)?.[0]) || 0) - (parseInt(String(b.name || b.id).match(/\d+/)?.[0]) || 0));
    let slots = activeCQIs.map((cqi, i) => ({ slotId: 'SLOT-' + i, cqi: cqi, core: null, nonCore: [], longshift: [], machines: [], isExclusive: false }));

    let slot19 = slots.find(s => String(s.cqi.name || s.cqi.id).match(/\d+/)?.[0] === '19');
    let slot24 = slots.find(s => String(s.cqi.name || s.cqi.id).match(/\d+/)?.[0] === '24');

    const assignCoreToCQI = (cqiStr) => {
        if (availableCores.length === 0) return "UNKNOWN CORE";
        let match = String(cqiStr).match(/\d+/); let targetCqi = match ? match[0] : null;
        const isOTCore = (c) => ['COT1', 'CORE2'].includes(String(c.id).toUpperCase()) || ['COT2', 'CORE4'].includes(String(c.id).toUpperCase()) || String(c.name).toUpperCase().includes('FARHAN') || String(c.name).toUpperCase().includes('DINI');
        const isWWCore = (c) => ['CWW1', 'C1', 'CORE1'].includes(String(c.id).toUpperCase()) || ['CWW2'].includes(String(c.id).toUpperCase()) || String(c.name).toUpperCase().includes('JIDDAN') || String(c.name).toUpperCase().includes('MIA');

        if (targetCqi === '19' && (slot19 && unassigned.some(m => m.isM2M3))) {
            let idx = availableCores.findIndex(c => isOTCore(c));
            if (idx !== -1) return availableCores.splice(idx, 1)[0].name;
            return "NO VALID OT CORE";
        }
        if (targetCqi === '24' && (slot24 && unassigned.some(m => m.isC1C2))) {
            let idx = availableCores.findIndex(c => isWWCore(c));
            if (idx !== -1) return availableCores.splice(idx, 1)[0].name;
            return "NO VALID WW CORE";
        }
        let candidates = availableCores.filter(c => {
            let prioMatch = false;
            if (c.cqi_priority) { let prioNum = String(c.cqi_priority).match(/\d+/); prioMatch = prioNum && prioNum[0] === targetCqi; }
            return prioMatch && !isOTCore(c) && !isWWCore(c);
        });
        if (candidates.length > 0) return availableCores.splice(availableCores.indexOf(candidates[0]), 1)[0].name;
        let fallbackIndex = availableCores.findIndex(c => !isOTCore(c) && !isWWCore(c));
        if (fallbackIndex !== -1) return availableCores.splice(fallbackIndex, 1)[0].name;
        return availableCores.shift()?.name || "UNKNOWN CORE";
    };

    if (slot19) slot19.core = assignCoreToCQI('19');
    if (slot24) slot24.core = assignCoreToCQI('24');
    slots.forEach(slot => { if (!slot.core) slot.core = assignCoreToCQI(slot.cqi.name || slot.cqi.id); });

    const applyNonCoreIfNeeded = (slot) => {
      let astCount = slot.machines.filter(sm => sm.isAst).length; let apkCount = slot.machines.filter(sm => sm.isAnyApk).length;
      let isSosoft = slot.machines.some(sm => sm.clusterName?.includes('sosoft'));
      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount, isSosoft);
      let currentTotalNC = slot.nonCore.length + slot.longshift.length;
      while (currentTotalNC < reqNC) {
        if (nonCorePool.length > 0) { slot.nonCore.push(nonCorePool.shift()); currentTotalNC++; }
        else if (lsPool.length > 0) { slot.longshift.push(lsPool.shift()); currentTotalNC++; }
        else break;
      }
    };

    let m2m3Machines = unassigned.filter(m => m.isM2M3);
    if (slot19 && m2m3Machines.length > 0) {
      slot19.machines.push(...m2m3Machines); slot19.isExclusive = true; 
      unassigned = unassigned.filter(m => !m.isM2M3); applyNonCoreIfNeeded(slot19);
    }
    let c1c2Machines = unassigned.filter(m => m.isC1C2);
    if (slot24 && c1c2Machines.length > 0) {
      slot24.machines.push(...c1c2Machines); slot24.isExclusive = true; 
      unassigned = unassigned.filter(m => !m.isC1C2); applyNonCoreIfNeeded(slot24);
    }

    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null; let bestScore = -Infinity;
      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length + lsPool.length, config.planMode || 'ai', config);
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });
      if (bestSlot && bestScore > -10000) { 
          bestSlot.machines.push(m); applyNonCoreIfNeeded(bestSlot);
      } else { 
          remainingUnassigned.push(m);
      }
    });

    if (slot24 && slot24.machines.some(m => m.isC1C2)) slot24.isExclusive = false;
    
    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 5; 
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift(); let placed = false;
        let fallbackSlots = [...slots].filter(s => !s.isExclusive).sort((a, b) => this._scoreSlot(u, b, slots, nonCorePool.length + lsPool.length, config.planMode, config) - this._scoreSlot(u, a, slots, nonCorePool.length + lsPool.length, config.planMode, config));

        for (let target of fallbackSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length, config);
          if (accept.can) {
            target.machines.push(u); applyNonCoreIfNeeded(target); placed = true; break;
          } else if (accept.reason === "capacity" || accept.reason === "no_nc") {
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i];
              target.machines.splice(i, 1); 
              let acceptU = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length, config);
              if (acceptU.can) {
                let newHomes = [...slots].filter(s => s !== target && !s.isExclusive).sort((a, b) => this._scoreSlot(occupant, b, slots, nonCorePool.length + lsPool.length, config.planMode, config) - this._scoreSlot(occupant, a, slots, nonCorePool.length + lsPool.length, config.planMode, config));
                let foundHome = false;
                for(let home of newHomes) {
                  let acceptOcc = this._canAcceptMachine(home, occupant, Math.max(0, (nonCorePool.length + lsPool.length) - acceptU.neededNC), config);
                  if(acceptOcc.can) {
                     target.machines.push(u); applyNonCoreIfNeeded(target);
                     home.machines.push(occupant); applyNonCoreIfNeeded(home);
                     placed = true; foundHome = true; break;
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

    if (remainingUnassigned.length > 0) {
        let tempUnassigned = [...remainingUnassigned]; remainingUnassigned = [];
        while(tempUnassigned.length > 0) {
            let u = tempUnassigned.shift();
            let possibleSlots = slots.filter(s => {
                let cqiIdStr = String(s.cqi.name || s.cqi.id).match(/\d+/)?.[0];
                let is19 = cqiIdStr === '19'; let is24 = cqiIdStr === '24';
                if ((is19 && !u.isM2M3) || (!is19 && u.isM2M3) || (u.isC1C2 && !is24)) return false;
                if (!StrictRules.isMixingValid(s.machines, u, cqiIdStr)) return false;
                if (!StrictRules.isClusterCompatible(s.machines, u, cqiIdStr)) return false;
                return s.machines.length < 8;
            });
            if (possibleSlots.length > 0) {
                let forcedTarget = possibleSlots.sort((a, b) => this.getRoutedDistance(u, a.cqi) - this.getRoutedDistance(u, b.cqi))[0];
                forcedTarget.machines.push(u); applyNonCoreIfNeeded(forcedTarget);
            } else { remainingUnassigned.push(u); }
        }
    }

    this.runFinalValidationAndRepair(slots, allOriginalMachines, nonCorePool.length + lsPool.length, applyNonCoreIfNeeded, this.addLog.bind(this), config);
    slots.forEach(slot => applyNonCoreIfNeeded(slot));

    slots.leftoverNonCores = nonCorePool; slots.leftoverLongshifts = lsPool;
    slots.sort((a,b) => (parseInt(String(a.cqi.name || a.cqi.id).match(/\d+/)?.[0]) || 0) - (parseInt(String(b.cqi.name || b.cqi.id).match(/\d+/)?.[0]) || 0));
    slots.reasonLog = this.internalLogs.join('\n');
    return slots;
  },

  // FITUR BARU: ENGINE PENCARIAN SARAN SWAP AI (Pop-up Card Engine)
  getSwapSuggestions(plan, slotIndex, machineId, config = {}) {
      let targetSlot = plan[slotIndex];
      if (!targetSlot) return [];
      let targetMachine = targetSlot.machines.find(m => m.id === machineId);
      if (!targetMachine) return [];

      let candidates = [];
      let totalNCAvailable = plan.leftoverNonCores ? plan.leftoverNonCores.length : 0; 
      // Kita asumsikan ketersediaan NC pool cukup untuk pertukaran 1-to-1 yang tidak menambah total

      plan.forEach((otherSlot, otherIndex) => {
          if (otherIndex === slotIndex) return;
          
          otherSlot.machines.forEach(candMachine => {
              // Simulasikan slot asal tanpa targetMachine, tapi ditambah candMachine
              let simTargetMachines = targetSlot.machines.filter(m => m.id !== machineId);
              let acceptTarget = this._canAcceptMachine({ ...targetSlot, machines: simTargetMachines }, candMachine, 99, config);
              
              // Simulasikan slot lain tanpa candMachine, tapi ditambah targetMachine
              let simOtherMachines = otherSlot.machines.filter(m => m.id !== candMachine.id);
              let acceptOther = this._canAcceptMachine({ ...otherSlot, machines: simOtherMachines }, targetMachine, 99, config);

              if (acceptTarget.can && acceptOther.can) {
                  let s1 = this._scoreSlot(candMachine, { ...targetSlot, machines: simTargetMachines }, plan, 99, 'ai', config);
                  let s2 = this._scoreSlot(targetMachine, { ...otherSlot, machines: simOtherMachines }, plan, 99, 'ai', config);
                  
                  let totalScore = s1 + s2;
                  
                  // Hitung persentase kecocokan (Normalisasi -10K to 10K menjadi 0-100%)
                  let percentage = Math.max(0, Math.min(100, Math.round((totalScore + 5000) / 100)));
                  if (totalScore > 2000) percentage = Math.min(99, percentage + 10); // Bonus boost jika sangat cocok

                  candidates.push({
                      machine: candMachine,
                      fromSlot: otherSlot,
                      fromSlotIndex: otherIndex,
                      score: totalScore,
                      percentage: percentage
                  });
              }
          });
      });

      // Sortir berdasarkan skor terbaik
      candidates.sort((a,b) => b.score - a.score);
      return candidates.slice(0, 5); // Kembalikan top 5
  },

  applySwap(plan, slotIndex1, machineId1, slotIndex2, machineId2) {
      let s1 = plan[slotIndex1];
      let s2 = plan[slotIndex2];
      
      let m1Idx = s1.machines.findIndex(m => m.id === machineId1);
      let m2Idx = s2.machines.findIndex(m => m.id === machineId2);
      
      if(m1Idx !== -1 && m2Idx !== -1) {
          let m1 = s1.machines[m1Idx];
          let m2 = s2.machines[m2Idx];
          
          s1.machines.splice(m1Idx, 1, m2);
          s2.machines.splice(m2Idx, 1, m1);
      }
      return plan;
  },

  validate(plan, machinesData) {
    let isMachinesArray = Array.isArray(machinesData);
    let totalMachinesCount = isMachinesArray ? machinesData.length : machinesData;
    let report = { valid: true, coveragePercent: 0, totalMachines: totalMachinesCount, assignedCount: 0, unassignedMachines: [], duplicateMachines: [], violations: [], info: [], totalDistance: 0, avgDistance: 0, score: 100 };
    let coveredIds = new Set();
    let isNonCoreShortageDetected = false;

    plan.forEach(slot => {
      if (slot.machines.length === 0) { report.violations.push(`[FATAL] CQI ${slot.cqi.name} KOSONG.`); report.valid = false; }
      
      let cqiIdStr = String(slot.cqi.name || slot.cqi.id).match(/\d+/)?.[0];
      let astCount = 0; let kxCount = 0; let anyApkCount = 0;

      slot.machines.forEach(sm => {
          let u = (sm.name||sm.id).toUpperCase();
          if(u.startsWith('AST')) astCount++;
          else if(u.startsWith('K') || u.startsWith('X')) { kxCount++; anyApkCount++; }
          else if(u.startsWith('APK') || ['C1','C2'].includes(u)) anyApkCount++;
      });
      
      let is10 = cqiIdStr === '10'; let is24 = cqiIdStr === '24';
      if (astCount > 0 && anyApkCount > 0) {
          if (is10 && kxCount > 0) { report.violations.push(`[FATAL] CQI ${slot.cqi.name} (CQI 10) mencampur AST dan K/X.`); report.valid = false; } 
          else if (!is10) { report.violations.push(`[FATAL] CQI ${slot.cqi.name} mencampur AST dan APK/K/X di luar CQI 10.`); report.valid = false; }
      }

      let checkFamilies = new Set();
      slot.machines.forEach(m => {
          let fam = StrictRules.getClusterFamily(m.clusterName);
          if (fam !== 'NEUTRAL') checkFamilies.add(fam);
      });
      if (checkFamilies.size > 1) {
          let hasSklsct = checkFamilies.has('SKLSCT'); let hasPouch = checkFamilies.has('POUCH');
          if (!(hasSklsct && hasPouch && is10 && checkFamilies.size === 2)) {
              report.violations.push(`[FATAL] CQI ${slot.cqi.name} mengalami bentrok produk (Misal Botol vs Sosoft).`);
              report.valid = false;
          }
      }

      let isSosoft = slot.machines.some(sm => sm.clusterName?.includes('sosoft'));
      let reqNC = this._getRequiredNonCore(slot, astCount, anyApkCount, isSosoft);
      let totalNC = slot.nonCore.length + slot.longshift.length;
      let hasC1C2 = slot.machines.some(sm => ['C1','C2'].includes((sm.name||sm.id).toUpperCase()));
      let hardLimit = (is24 && hasC1C2) ? 4 : 8; 

      if (totalNC > 2) { report.violations.push(`[FATAL] CQI ${slot.cqi.name} memiliki ${totalNC} pekerja (Maks 2).`); report.valid = false; }
      if (totalNC < reqNC && slot.machines.length > 0) { report.violations.push(`[OVERLOAD] CQI ${slot.cqi.name} menampung ${slot.machines.length} mesin, butuh ${reqNC} pekerja tapi ada ${totalNC}.`); report.score -= 20; isNonCoreShortageDetected = true; }
      if (slot.machines.length > hardLimit) { report.violations.push(`[FATAL OVERLOAD] CQI ${slot.cqi.name} melampaui limit mutlak (${slot.machines.length}/${hardLimit}).`); report.valid = false; }
      
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()));
      if (hasM2M3 && !slot.machines.every(m => ['M2', 'M3'].includes((m.name||m.id).toUpperCase()))) { report.violations.push(`[RULE] CQI ${slot.cqi.name} mencampur M2/M3.`); report.score -= 30; }

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
    if (isNonCoreShortageDetected) report.info.push(`🚨 [PERINGATAN] KEKURANGAN MANPOWER! AI memaksa beroperasi tanpa pekerja standar.`);
    if (report.coveragePercent < 100) { report.valid = false; report.violations.push(`[COVERAGE] Gagal menyusun ${report.totalMachines - report.assignedCount} mesin.`); report.score -= (100 - report.coveragePercent); }
    if (report.violations.length > 0) report.valid = false;
    
    return report;
  },

  formatMachineList(machines) {
    if (!machines || machines.length === 0) return '-';
    let wsGroups = {}; let unGrouped = [];
    machines.forEach(m => {
      let mName = m.name || m.id; let wsKey = this.getWorkstationKey(mName);
      if (wsKey && WORKSTATIONS[wsKey]) { if (!wsGroups[wsKey]) wsGroups[wsKey] = []; wsGroups[wsKey].push(mName); } 
      else unGrouped.push(mName);
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
    let date = new Date(); const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
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