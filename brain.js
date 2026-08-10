const BrainAI = {
  getDistance(r1, c1, r2, c2) {
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(c1 - c2, 2));
  },

  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50; // Skor tengah jika blm ada history
  },

  recordHistory(machineId, cqiId, success = true) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (!hist[machineId]) hist[machineId] = {};
    if (!hist[machineId][cqiId]) hist[machineId][cqiId] = { count: 0, success: 0 };
    hist[machineId][cqiId].count++;
    if (success) hist[machineId][cqiId].success++;
    localStorage.setItem('planning_history', JSON.stringify(hist));
  },

  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    
    // 1 CQI = 1 CORE. 
    let activeCQIs = cqis.slice(0, coreLimit); 
    
    let slots = activeCQIs.map((cqi, i) => {
      return {
        slotId: 'SLOT-' + i,
        cqi: cqi,
        core: `CORE ${i+1}`,
        nonCore: [],
        machines: [],
        capacity: 6 // Rule jika hanya CORE
      };
    });

    // Distribusi NON CORE
    let ncIdx = 0;
    for (let i = 0; i < nonCoreCount; i++) {
      if (slots.length === 0) break;
      let slot = slots[ncIdx % slots.length];
      if (slot.nonCore.length < 2) { // Maksimal 2 Non Core per CQI
        slot.nonCore.push(`NON CORE ${i+1}`);
        slot.capacity = 8; // Rule kapasitas jika ada Non Core
      }
      ncIdx++;
    }

    // AI SCORING ASSIGNMENT
    let unassigned = [...machines];
    
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        if (slot.machines.length >= slot.capacity) return; // Skip jika melanggar Rule
        
        let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
        let distScore = Math.max(0, 100 - dist); // Dinormalisasi
        
        let histScore = this.getHistory(m.id, slot.cqi.id);
        let lineScore = (m.line === slot.cqi.line) ? 100 : 0;
        let loadScore = ((slot.capacity - slot.machines.length) / slot.capacity) * 100;
        
        // BOBOT AI: History 45%, Distance 25%, Line 10%, Load Balance 10%, Avail 10%
        let totalScore = (histScore * 0.45) + (distScore * 0.25) + (lineScore * 0.10) + (loadScore * 0.10) + (100 * 0.10);

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestSlot = slot;
        }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
      }
    });

    return slots;
  },

  validate(plan, totalMachinesCount) {
    let errors = [];
    let coveredIds = new Set();
    
    plan.forEach(slot => {
      if (slot.nonCore.length > 2) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melebihi maksimal 2 NON CORE.`);
      let maxCap = slot.nonCore.length > 0 ? 8 : 6;
      if (slot.machines.length > maxCap) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melampaui batas kapasitas (${maxCap} mesin).`);
      
      slot.machines.forEach(m => {
        if (coveredIds.has(m.id)) errors.push(`Validasi: Mesin ${m.name} masuk ke 2 CQI sekaligus.`);
        coveredIds.add(m.id);
      });
    });

    if (coveredIds.size < totalMachinesCount) {
      errors.push(`Masih ada ${totalMachinesCount - coveredIds.size} mesin running yang terabaikan karena kapasitas.`);
    }
    
    return errors;
  },

  formatText(plan, config) {
    let date = new Date();
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    
    let txt = `PLANNING LIQUID 3\nTanggal ${dateStr}\n\n`;
    
    plan.forEach((slot, i) => {
      txt += `${i + 1}.\n`;
      txt += `MESIN : ${slot.machines.map(m => m.name).join(', ')}\n`;
      txt += `NON CORE : ${slot.nonCore.join(', ') || '-'}\n`;
      txt += `CORE : ${slot.core}\n`;
      txt += `CQI : ${slot.cqi.name}\n\n`;
    });

    txt += `QC PASSED\n`;
    let qcArr = config.qcPassed.split('\n').filter(x => x.trim() !== '');
    for(let i=0; i<5; i++) {
      txt += `${i+1}. ${qcArr[i] || ''}\n`;
    }

    txt += `\nMIL-STD: ${config.milStd || '-'}\n`;
    txt += `Standby OT: ${config.standbyOt || '-'}\n`;
    txt += `Support FG: ${config.supportFg || '-'}\n`;
    
    return txt;
  }
};