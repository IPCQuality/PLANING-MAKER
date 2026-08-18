/**
 * PLANNER CQI LIQUID 3 - BRAIN AI (DYNAMIC WORKSTATION ROUTING)
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

const CQI_PRIORITY_MAP = {
  "1": ["0A", "1A"], "2": ["2A", "2B"], "3": ["3A", "4A"], "4": ["3A", "4A", "5B"],
  "5": ["5A", "6A"], "6": ["5A", "6A"], "7": ["7A", "8A"], "8": ["8A", "9A", "10B"],
  "9": ["9A", "10A"], "10": ["10A", "1C", "2C"], "11": ["1B", "2B"], "13": ["3B", "5B"],
  "14": ["0B", "6B", "7A", "10B"], "15": ["7B", "8B", "9B"], "17": ["3C", "4C", "5C", "8C"],
  "18": ["2C", "3C", "4C", "5C"], "19": ["OT"], "20": ["6C", "7C", "8C", "9C", "10C"], "24": ["WW"]
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
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  },

  // PERBAIKAN UTAMA: Perhitungan jarak dari Label Workstation ke CQI tujuan
  getRoutedDistance(machine, cqi, labels = []) {
    let wsKey = machine.wsKey || this.getWorkstationKey(machine.name || machine.id);
    
    if (wsKey && Array.isArray(labels) && labels.length > 0) {
      // Cari label workstation yang sesuai di dalam data map
      let matchedLabel = labels.find(l => this.normalizeName(l.name) === this.normalizeName(wsKey));
      if (matchedLabel && matchedLabel.row != null && matchedLabel.col != null) {
        // Hitung jarak Manhattan: dari koordinat Label Workstation ke koordinat CQI
        return this.getDistance(matchedLabel.row, matchedLabel.col, cqi.row, cqi.col);
      }
    }
    // Fallback jika label tidak ditemukan di map data
    return this.getDistance(machine.row, machine.col, cqi.row, cqi.col);
  },

  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50;
  },

  _getRequiredNonCore(slot, astCount, apkCount) {
    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    if (cqiIdStr === '19') return 0;

    let is24 = cqiIdStr === '24';
    let hasC1C2 = slot.machines.some(m => m.isC1C2);
    let total = astCount + apkCount;
    
    if (is24 && hasC1C2) {
       if (total <= 2) return 0; 
       return 1; 
    }
    if (total <= 4) return 0;
    
    return astCount > 0 ? (total <= 6 ? 1 : 2) : (total <= 5 ? 0 : total <= 7 ? 1 : 2);
  },

  _canAcceptMachine(slot, m, availableTotalNC) {
    if (slot.isExclusive) return { can: false };

    let hasAst = slot.machines.some(sm => sm.isAst);
    let hasKX = slot.machines.some(sm => sm.isKX);
    let mIsAnyApk = m.isApk || m.isKX || m.isC1C2;

    let match = String(slot.cqi.name || slot.cqi.id).match(/\d+/);
    let cqiIdStr = match ? match[0] : String(slot.cqi.id);
    let is24 = cqiIdStr === '24';
    let is10 = cqiIdStr === '10';

    if (is10) {
        if ((hasAst && m.isKX) || (hasKX && m.isAst)) return { can: false, reason: "strict_mix_cqi10" };
    } else {
        if (hasAst && mIsAnyApk) return { can: false, reason: "strict_mix" };
        if (slot.machines.some(sm => sm.isAnyApk) && m.isAst) return { can: false, reason: "strict_mix" };
    }

    let astCount = slot.machines.filter(sm => sm.isAst).length + (m.isAst ? 1 : 0);
    let apkCount = slot.machines.filter(sm => sm.isAnyApk).length + (mIsAnyApk ? 1 : 0);
    
    let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
    let currentNC = slot.nonCore.length + (slot.longshift ? slot.longshift.length : 0);
    let neededNC = reqNC - currentNC;
    
    let absoluteMax = (is24 && (slot.machines.some(sm => sm.isC1C2) || m.isC1C2)) ? 4 : (astCount > 0 ? (reqNC === 0 ? 4 : reqNC === 1 ? 6 : 8) : (reqNC === 0 ? 5 : reqNC === 1 ? 7 : 8));
    
    if (astCount + apkCount > absoluteMax) return { can: false, reason: "capacity" }; 
    if (neededNC > availableTotalNC) return { can: false, reason: "no_nc" }; 
    
    return { can: true, neededNC: Math.max(0, neededNC), reqNC: reqNC, absoluteMax: absoluteMax };
  },

  _scoreSlot(m, slot, slots, availableTotalNC, planMode = 'ai', labels = []) {
    let acceptStatus = this._canAcceptMachine(slot, m, availableTotalNC);
    if (!acceptStatus.can) return -Infinity;

    let dist = this.getRoutedDistance(m, slot.cqi, labels);
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

    let slotDistSum = slot.machines.reduce((sum, sm) => sum + this.getRoutedDistance(sm, slot.cqi, labels), 0);
    let workloadPenalty = (slot.machines.length * 25) + (slotDistSum * 2);

    return distScore + histScore + wsBonus + priorityBonus + capScore + ncPenalty - workloadPenalty;
  },

  generatePlan(machines, cqis, config, labels = []) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;

    let availableCores = [];
    let rawCores = config.coreData || config.coreNames || [];
    for (let i = 0; i < coreLimit; i++) {
        if (rawCores[i]) {
            availableCores.push(typeof rawCores[i] === 'object' ? { name: rawCores[i].name || `CORE ${i+1}`, cqi_priority: rawCores[i].cqi_priority || null } : { name: rawCores[i], cqi_priority: null });
        } else {
            availableCores.push({ name: `CORE ${i+1}`, cqi_priority: null });
        }
    }

    let nonCorePool = [];
    let rawNonCores = config.nonCoreData || config.nonCoreNames || [];
    for (let i = 0; i < nonCoreCount; i++) {
        nonCorePool.push(rawNonCores[i] ? (typeof rawNonCores[i] === 'object' ? rawNonCores[i].name || `NON CORE ${i+1}` : rawNonCores[i]) : `NON CORE ${i+1}`);
    }

    let lsPool = [];
    let rawLS = config.longshiftData || config.longshiftNames || [];
    let lsCount = parseInt(config.longshift) || rawLS.length || 0;
    for (let i = 0; i < lsCount; i++) {
        lsPool.push(rawLS[i] ? (typeof rawLS[i] === 'object' ? rawLS[i].name || `(LS)` : rawLS[i]) : `(LS)`);
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
            let dist = this.getRoutedDistance(m, cqi, labels);
            if (dist < 15) score += 200;
            else if (dist < 30) score += 100;
            else if (dist < 50) score += 50;
            
            score += this.getHistory(m.id, cqi.id) * (config.planMode === 'history' ? 2.0 : 0.1);
            if (is19 && m.isM2M3) score += 10000;
            if (is24 && m.isC1C2) score += 10000;
        });
        return { cqi, score };
    });

    cqiScores.sort((a, b) => b.score - a.score);
    let activeCQIs = cqiScores.slice(0, coreLimit).map(cs => cs.cqi);

    let slots = activeCQIs.map((cqi, i) => ({
        slotId: 'SLOT-' + i, cqi, core: null, nonCore: [], longshift: [], machines: [], isExclusive: false
    }));

    const assignCoreToCQI = (cqiStr) => {
        if (availableCores.length === 0) return "UNKNOWN CORE";
        let match = String(cqiStr).match(/\d+/);
        let targetCqi = match ? match[0] : null;
        let candidates = availableCores.filter(c => String(c.cqi_priority) === targetCqi);

        if (targetCqi === '24') {
            let cot1 = candidates.find(c => c.name.toUpperCase().includes('COT1')) || availableCores.find(c => c.name.toUpperCase().includes('C2'));
            if (cot1) { availableCores.splice(availableCores.indexOf(cot1), 1); return cot1.name; }
        }
        if (candidates.length > 0) {
            let selected = candidates[0]; availableCores.splice(availableCores.indexOf(selected), 1); return selected.name;
        }
        return availableCores.shift().name;
    };

    let slot19 = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '19'; });
    if (slot19) slot19.core = assignCoreToCQI('19');
    slots.forEach(slot => { if (!slot.core) slot.core = assignCoreToCQI(slot.cqi.name || slot.cqi.id); });

    const applyNonCoreIfNeeded = (slot) => {
      let astCount = slot.machines.filter(sm => sm.isAst).length;
      let apkCount = slot.machines.filter(sm => sm.isAnyApk).length;
      let reqNC = this._getRequiredNonCore(slot, astCount, apkCount);
      let currentTotalNC = slot.nonCore.length + slot.longshift.length;
      
      while (currentTotalNC < reqNC) {
        if (nonCorePool.length > 0) { slot.nonCore.push(nonCorePool.shift()); currentTotalNC++; }
        else if (lsPool.length > 0) { slot.longshift.push(lsPool.shift()); currentTotalNC++; }
        else break;
      }
    };

    let m2m3Machines = unassigned.filter(m => m.isM2M3);
    if (slot19 && m2m3Machines.length > 0) {
      slot19.machines.push(...m2m3Machines); slot19.isExclusive = true; unassigned = unassigned.filter(m => !m.isM2M3);
      applyNonCoreIfNeeded(slot19);
    }

    let slot24 = slots.find(s => { let m = String(s.cqi.name || s.cqi.id).match(/\d+/); return m && m[0] === '24'; });
    let c1c2Machines = unassigned.filter(m => m.isC1C2);
    if (slot24 && c1c2Machines.length > 0) {
      slot24.machines.push(...c1c2Machines); slot24.isExclusive = true; unassigned = unassigned.filter(m => !m.isC1C2);
      applyNonCoreIfNeeded(slot24);
    }

    slots.forEach(slot => {
      if (slot.machines.length === 0 && unassigned.length > 0) {
        unassigned.sort((a, b) => this.getRoutedDistance(a, slot.cqi, labels) - this.getRoutedDistance(b, slot.cqi, labels));
        slot.machines.push(unassigned.shift()); applyNonCoreIfNeeded(slot);
      }
    });

    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));
    
    let remainingUnassigned = [];
    unassigned.forEach(m => {
      let bestSlot = null; let bestScore = -Infinity;
      slots.forEach(slot => {
        let score = this._scoreSlot(m, slot, slots, nonCorePool.length + lsPool.length, config.planMode || 'ai', labels);
        if (score > bestScore) { bestScore = score; bestSlot = slot; }
      });
      if (bestSlot) { bestSlot.machines.push(m); applyNonCoreIfNeeded(bestSlot); } 
      else { remainingUnassigned.push(m); }
    });

    if (slot24 && slot24.machines.some(m => m.isC1C2)) slot24.isExclusive = false;
    
    if (remainingUnassigned.length > 0) {
      let iterations = remainingUnassigned.length * 5; 
      while (remainingUnassigned.length > 0 && iterations > 0) {
        let u = remainingUnassigned.shift(); let placed = false;
        let fallbackSlots = [...slots].filter(s => !s.isExclusive).sort((a, b) => this.getRoutedDistance(u, a.cqi, labels) - this.getRoutedDistance(u, b.cqi, labels));

        for (let target of fallbackSlots) {
          let accept = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length);
          if (accept.can) { target.machines.push(u); applyNonCoreIfNeeded(target); placed = true; break; } 
          else if (accept.reason === "capacity" || accept.reason === "no_nc") {
            for (let i = 0; i < target.machines.length; i++) {
              let occupant = target.machines[i]; target.machines.splice(i, 1); 
              let acceptU = this._canAcceptMachine(target, u, nonCorePool.length + lsPool.length);
              if (acceptU.can) {
                let newHomes = [...slots].filter(s => s !== target && !s.isExclusive).sort((a, b) => this.getRoutedDistance(occupant, a.cqi, labels) - this.getRoutedDistance(occupant, b.cqi, labels));
                let foundHome = false;
                for(let home of newHomes) {
                  if(this._canAcceptMachine(home, occupant, Math.max(0, (nonCorePool.length + lsPool.length) - acceptU.neededNC)).can) {
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

    // Swapping optimization
    let optIter = 0; let improved = true;
    while(improved && optIter < 10) {
      improved = false;
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          let sA = slots[i], sB = slots[j]; if (sA.isExclusive || sB.isExclusive) continue;
          for (let m = 0; m < sA.machines.length; m++) {
            for (let n = 0; n < sB.machines.length; n++) {
              let mA = sA.machines[m], mB = sB.machines[n];
              let distBefore = this.getRoutedDistance(mA, sA.cqi, labels) + this.getRoutedDistance(mB, sB.cqi, labels);
              let distAfter = this.getRoutedDistance(mA, sB.cqi, labels) + this.getRoutedDistance(mB, sA.cqi, labels);
              
              if (distAfter < distBefore - 3) {
                sA.machines.splice(m, 1); sA.machines.push(mB); sB.machines.splice(n, 1); sB.machines.push(mA);
                let cqiA = String(sA.cqi.name || sA.cqi.id).match(/\d+/), is10A = cqiA && cqiA[0] === '10';
                let cqiB = String(sB.cqi.name || sB.cqi.id).match(/\d+/), is10B = cqiB && cqiB[0] === '10';
                let astA = sA.machines.filter(sm => sm.isAst).length, anyApkA = sA.machines.filter(sm => sm.isAnyApk).length;
                let astB = sB.machines.filter(sm => sm.isAst).length, anyApkB = sB.machines.filter(sm => sm.isAnyApk).length;

                if ((is10A ? (astA > 0 && sA.machines.some(sm=>sm.isKX)) : (astA > 0 && anyApkA > 0)) ||
                    (is10B ? (astB > 0 && sB.machines.some(sm=>sm.isKX)) : (astB > 0 && anyApkB > 0)) ||
                    this._getRequiredNonCore(sA, astA, anyApkA) > (sA.nonCore.length + sA.longshift.length) ||
                    this._getRequiredNonCore(sB, astB, anyApkB) > (sB.nonCore.length + sB.longshift.length)) {
                   sA.machines.splice(sA.machines.length-1, 1); sA.machines.splice(m, 0, mA);
                   sB.machines.splice(sB.machines.length-1, 1); sB.machines.splice(n, 0, mB);
                } else { improved = true; }
              }
            }
          }
        }
      }
      optIter++;
    }

    slots.leftoverNonCores = nonCorePool; slots.leftoverLongshifts = lsPool;
    slots.sort((a,b) => {
        let mA = String(a.cqi.name || a.cqi.id).match(/\d+/), mB = String(b.cqi.name || b.cqi.id).match(/\d+/);
        return (mA ? parseInt(mA[0]) : 0) - (mB ? parseInt(mB[0]) : 0);
    });
    return slots;
  },

  validate(plan, machinesData, labels = []) {
    let isMachinesArray = Array.isArray(machinesData);
    let totalMachinesCount = isMachinesArray ? machinesData.length : machinesData;

    let report = {
      valid: true, coveragePercent: 0, totalMachines: totalMachinesCount, assignedCount: 0,
      unassignedMachines: [], duplicateMachines: [], violations: [], info: [], totalDistance: 0, avgDistance: 0, score: 100
    };

    let coveredIds = new Set();
    plan.forEach(slot => {
      let astCount = 0, anyApkCount = 0;
      slot.machines.forEach(sm => {
          let u = (sm.name||sm.id).toUpperCase();
          if(u.startsWith('AST')) astCount++; else anyApkCount++;
          if (coveredIds.has(sm.id)) report.valid = false;
          coveredIds.add(sm.id);
          report.totalDistance += this.getRoutedDistance(sm, slot.cqi, labels);
      });
    });

    report.assignedCount = coveredIds.size;
    report.coveragePercent = Math.round((report.assignedCount / report.totalMachines) * 100) || 0;
    if (report.coveragePercent < 100 && isMachinesArray) {
      report.unassignedMachines = machinesData.filter(m => !coveredIds.has(m.id));
    }
    return report;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = BrainAI;
