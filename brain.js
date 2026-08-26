const BrainAI = {
  /**
   * Mensejajarkan format string nama mesin, CQI, atau personel untuk mencegah mismatch
   */
  normalizeName(name) {
    if (!name) return '';
    return String(name).trim().toUpperCase().replace(/[\s\-_]+/g, '');
  },

  /**
   * Mengambil identitas workstation secara dinamis dari data map.json (labels/node)
   */
  getWorkstationKey(machineName, labels = []) {
    const normM = this.normalizeName(machineName);
    
    if (Array.isArray(labels)) {
      for (const l of labels) {
        const normL = this.normalizeName(l.name);
        if (normM.includes(normL) || normL.includes(normM)) {
          return l.name;
        }
      }
    }
    
    const match = normM.match(/(\d+[A-Z]|WW|OT)/);
    return match ? match[0] : 'LAINNYA';
  },

  /**
   * Format daftar array mesin menjadi teks terpisah koma
   */
  formatMachineList(machines) {
    if (!Array.isArray(machines) || machines.length === 0) return '-';
    return machines.map(m => m.name || m.id).join(', ');
  },

  /**
   * Menhitung jarak lintasan grid (Manhattan Distance) berdasarkan posisi Row & Col pada map.json
   */
  calculateDistance(m, cqi) {
    const mRow = m.row || (m.position ? m.position.row : 0);
    const mCol = m.col || (m.position ? m.position.col : 0);
    const cRow = cqi.row || (cqi.position ? cqi.position.row : 0);
    const cCol = cqi.col || (cqi.position ? cqi.position.col : 0);
    return Math.abs(mRow - cRow) + Math.abs(mCol - cCol);
  },

  /**
   * Engine Utama Perencanaan
   */
  generatePlan(machines, cqis, config = {}, mapData = {}) {
    if (!Array.isArray(machines) || machines.length === 0 || !Array.isArray(cqis) || cqis.length === 0) {
      return [];
    }

    const slots = cqis.map(c => ({
      cqi: c,
      machines: [],
      core: 0,
      coreNames: [],
      nonCore: [],
      longshift: [],
      totalCapacity: parseInt(c.qtytimbang || 8, 10)
    }));

    const sortedMachines = [...machines].sort((a, b) => {
      const qtyA = parseInt(a.qtytimbang || 8, 10);
      const qtyB = parseInt(b.qtytimbang || 8, 10);
      return qtyB - qtyA;
    });

    sortedMachines.forEach(m => {
      let bestSlot = null;
      let minScore = Infinity;

      slots.forEach(slot => {
        const currentLoad = slot.machines.length;
        const distance = this.calculateDistance(m, slot.cqi);

        const prioList = Array.isArray(slot.cqi.priority) ? slot.cqi.priority.map(p => this.normalizeName(p)) : [];
        const isPriority = prioList.includes(this.normalizeName(m.name));
        
        let score = distance + (currentLoad * 10);
        if (isPriority) score -= 50; 

        if (score < minScore) {
          minScore = score;
          bestSlot = slot;
        }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
      }
    });

    const coreNames = config.coreNames || [];
    slots.forEach((slot, idx) => {
      if (slot.machines.length > 0) {
        slot.core = 1;
        if (coreNames[idx]) {
          slot.coreNames.push(coreNames[idx]);
        }
      }
    });

    const nonCoreNames = [...(config.nonCoreNames || [])];
    const lsCount = config.longshift || 0;
    let lsPool = Array.from({ length: lsCount }, () => "(LS)");

    const activeSlots = slots.filter(s => s.machines.length > 0)
      .sort((a, b) => b.machines.length - a.machines.length);

    let ncIndex = 0;
    while (ncIndex < nonCoreNames.length && activeSlots.length > 0) {
      for (const slot of activeSlots) {
        if (ncIndex < nonCoreNames.length) {
          slot.nonCore.push(nonCoreNames[ncIndex++]);
        }
      }
    }

    let lsIndex = 0;
    while (lsIndex < lsPool.length && activeSlots.length > 0) {
      for (const slot of activeSlots) {
        if (lsIndex < lsPool.length) {
          slot.longshift.push(lsPool[lsIndex++]);
        }
      }
    }

    return slots;
  },

  /**
   * Engine Validasi Aturan
   */
  validate(slots, machines = []) {
    const violations = [];
    const info = [];

    if (!Array.isArray(slots) || slots.length === 0) {
      violations.push("Tidak ada slot perencanaan yang tergenerasi.");
      return { valid: false, violations, info };
    }

    const assignedMachineIds = new Set();
    slots.forEach(s => s.machines.forEach(m => assignedMachineIds.add(m.id || m.name)));

    const unassigned = machines.filter(m => !assignedMachineIds.has(m.id || m.name));
    if (unassigned.length > 0) {
      violations.push(`${unassigned.length} Mesin Running belum teralokasi ke CQI: ${this.formatMachineList(unassigned)}.`);
    } else {
      info.push(`SUCCESS: 100% Mesin Running (${assignedMachineIds.size} Mesin) berhasil teralokasi.`);
    }

    const emptyCoreSlots = slots.filter(s => s.machines.length > 0 && s.core === 0);
    if (emptyCoreSlots.length > 0) {
      violations.push(`${emptyCoreSlots.length} CQI aktif tidak memiliki Manpower Core.`);
    }

    return { valid: violations.length === 0, violations, info };
  },

  /**
   * Mencatat log riwayat alokasi
   */
  recordHistory(machineId, cqiId) {
    try {
      const raw = localStorage.getItem('planning_history') || '[]';
      const history = JSON.parse(raw);
      history.push({ machineId, cqiId, timestamp: new Date().toISOString() });
      if (history.length > 100) history.shift();
      localStorage.setItem('planning_history', JSON.stringify(history));
    } catch (e) {
      console.warn("Gagal mencatat history alokasi:", e);
    }
  },

  /**
   * Menyusun Teks Output Final (Sesuai Aturan Baru)
   */
  formatText(slots, config = {}) {
    if (!Array.isArray(slots) || slots.length === 0) return '';

    let out = `*PLANNING SHIFT LIQUID 3*\n`;
    out += `Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;

    slots.forEach((s, i) => {
      if (s.machines.length === 0) return;
      const cqiName = s.cqi.name || `CQI-${i+1}`;
      const coreStr = s.coreNames.length > 0 ? s.coreNames.join(', ') : `${s.core} Core`;
      
      // PERBAIKAN 1: Gabungkan array Non-Core dan (LS) ke dalam satu variabel
      let combinedNcAndLs = [];
      if (s.nonCore && s.nonCore.length > 0) combinedNcAndLs.push(...s.nonCore);
      if (s.longshift && s.longshift.length > 0) combinedNcAndLs.push(...s.longshift);
      
      const nonCoreStr = combinedNcAndLs.length > 0 ? combinedNcAndLs.join(', ') : '-';
      const macList = this.formatMachineList(s.machines);

      out += `${i+1}. *${cqiName}*\n`;
      out += `   - Core     : ${coreStr}\n`;
      // Baris "LS: (LS)" sudah dihapus karena (LS) sudah menempel ke samping teks Non-Core
      out += `   - Non-Core : ${nonCoreStr}\n`;
      out += `   - Mesin    : ${macList}\n\n`;
    });

    // PERBAIKAN 2: Dihapusnya garis putus-putus dan header "TUGAS KHUSUS & PARAMETER SHIFT"
    
    // PERBAIKAN 3: Formatting QC Passed untuk membuat Enter jika terdapat penomoran ganda
    if (config.qcPassed) {
      if (config.qcPassed.includes('\n')) {
        out += `- QC Passed  :\n${config.qcPassed}\n`;
      } else {
        out += `- QC Passed  : ${config.qcPassed}\n`;
      }
    }
    
    if (config.milStd) out += `- Mil-Std    : ${config.milStd}\n`;
    if (config.standbyOt) out += `- Standby OT : ${config.standbyOt}\n`;
    if (config.supportFg) out += `- Support FG : ${config.supportFg}\n`;

    return out;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrainAI;
}
