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

  /**
   * Mengamankan pembandingan string nama mesin
   */
  normalizeName(str) {
    return str ? String(str).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
  },

  /**
   * Mencari Workstation Key (0A, 1A, dst) dari nama mesin
   */
  getWorkstationKey(machineName) {
    if (!machineName) return null;
    let norm = this.normalizeName(machineName);
    for (let wsKey in WORKSTATIONS) {
      let list = WORKSTATIONS[wsKey];
      for (let item of list) {
        if (this.normalizeName(item) === norm) {
          return wsKey;
        }
      }
    }
    return null;
  },

  /**
   * Menghitung jarak Euclidean antara dua titik (mesin dan CQI)
   */
  getDistance(r1, c1, r2, c2) {
    return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(c1 - c2, 2));
  },

  /**
   * Mengambil persentase keberhasilan hubungan mesin & CQI dari Local Storage
   */
  getHistory(machineId, cqiId) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (hist[machineId] && hist[machineId][cqiId]) {
      let h = hist[machineId][cqiId];
      return h.count > 0 ? (h.success / h.count) * 100 : 50;
    }
    return 50;
  },

  /**
   * Mencatat riwayat manual mesin & CQI ke Local Storage
   */
  recordHistory(machineId, cqiId, success = true) {
    let hist = JSON.parse(localStorage.getItem('planning_history') || '{}');
    if (!hist[machineId]) hist[machineId] = {};
    if (!hist[machineId][cqiId]) hist[machineId][cqiId] = { count: 0, success: 0 };
    hist[machineId][cqiId].count++;
    if (success) hist[machineId][cqiId].success++;
    localStorage.setItem('planning_history', JSON.stringify(hist));
  },

  /**
   * Mengatur & membuat alokasi mesin ke slot CQI berdasarkan skor AI & aturan khusus
   */
  generatePlan(machines, cqis, config) {
    let coreLimit = parseInt(config.core) || 1;
    let nonCoreCount = parseInt(config.nonCore) || 0;
    
    let activeCQIs = cqis.slice(0, coreLimit); 
    
    let slots = activeCQIs.map((cqi, i) => {
      return {
        slotId: 'SLOT-' + i,
        cqi: cqi,
        core: (config.coreNames && config.coreNames[i]) ? config.coreNames[i] : `CORE ${i+1}`,
        nonCore: [],
        machines: [],
        capacity: 6
      };
    });

    // Distribusi NON CORE (Maksimal 2 Non Core per CQI)
    let ncIdx = 0;
    for (let i = 0; i < nonCoreCount; i++) {
      if (slots.length === 0) break;
      let slot = slots[ncIdx % slots.length];
      if (slot.nonCore.length < 2) {
        let ncName = (config.nonCoreNames && config.nonCoreNames[i]) ? config.nonCoreNames[i] : `NON CORE ${i+1}`;
        slot.nonCore.push(ncName);
        slot.capacity = 8;
      }
      ncIdx++;
    }

    // Identifikasi workstation tiap mesin
    machines.forEach(m => {
      m.wsKey = this.getWorkstationKey(m.name || m.id) || m.ws || null;
    });

    let unassigned = [...machines];

    // Pemetaan Prioritas Line A ke CQI (0A & 1A di CQI 1, 2A & 3A di CQI 2/3, dst)
    const lineACqiPriority = {
      "0A": 0, "1A": 0,
      "2A": 1, "3A": 1,
      "4A": 2, "5A": 2,
      "6A": 3, "7A": 3,
      "8A": 4, "9A": 4, "10A": 4
    };

    // --- ATURAN 1: MESIN M2 & M3 EKSKLUSIF DI CQI 19 ---
    let m2m3Machines = unassigned.filter(m => 
      ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes((m.name || '').toUpperCase())
    );
    let slot19 = slots.find(s => 
      String(s.cqi.id) === '19' || String(s.cqi.name) === '19' || String(s.cqi.name).includes('19')
    );
    
    if (m2m3Machines.length > 0 && slot19) {
      m2m3Machines.forEach(m => {
        slot19.machines.push(m);
        unassigned = unassigned.filter(x => x.id !== m.id);
      });
      slot19.capacity = Math.max(slot19.machines.length, slot19.capacity);
    }

    // --- ATURAN 2: MESIN C1 & C2 DI CQI 24 + MAKS 2-3 MESIN APK TERDEKAT ---
    let c1c2Machines = unassigned.filter(m => 
      ['C1', 'C2'].includes(m.id.toUpperCase()) || ['C1', 'C2'].includes((m.name || '').toUpperCase())
    );
    let slot24 = slots.find(s => 
      String(s.cqi.id) === '24' || String(s.cqi.name) === '24' || String(s.cqi.name).includes('24')
    );
    
    if (c1c2Machines.length > 0 && slot24) {
      c1c2Machines.forEach(m => {
        slot24.machines.push(m);
        unassigned = unassigned.filter(x => x.id !== m.id);
      });
      
      let apkCandidates = unassigned.filter(m => 
        (m.name || '').toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK')
      );
      
      apkCandidates.sort((a, b) => {
        let distA = this.getDistance(a.row, a.col, slot24.cqi.row, slot24.cqi.col);
        let distB = this.getDistance(b.row, b.col, slot24.cqi.row, slot24.cqi.col);
        return distA - distB;
      });

      let addedApk = apkCandidates.slice(0, 3);
      addedApk.forEach(m => {
        if (slot24.machines.length < slot24.capacity) {
          slot24.machines.push(m);
          unassigned = unassigned.filter(x => x.id !== m.id);
        }
      });
    }

    // Urutkan mesin agar yang satu workstation diproses berurutan
    unassigned.sort((a, b) => (a.wsKey || '').localeCompare(b.wsKey || ''));

    // --- ASSIGNMENT MESIN LAINNYA DENGAN AI SCORING ---
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach((slot, slotIdx) => {
        if (slot.machines.length >= slot.capacity) return;
        
        let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
        let distScore = Math.max(0, 100 - dist);
        
        let histScore = this.getHistory(m.id, slot.cqi.id);
        let lineScore = (m.line === slot.cqi.line) ? 100 : 0;
        let loadScore = ((slot.capacity - slot.machines.length) / slot.capacity) * 100;

        // PRIORITAS UNTUK MENJAGA MESIN DALAM 1 WORKSTATION TETAP BERSAMA
        let wsClusteringBonus = 0;
        if (m.wsKey) {
          let sameWsCountInSlot = slot.machines.filter(sm => sm.wsKey === m.wsKey).length;
          if (sameWsCountInSlot > 0) {
            wsClusteringBonus = 350; // Bonus besar agar 1 workstation bersatu di 1 CQI
          }
        }

        // PRIORITAS LINE A KE CQI TERPILIH (0A, 1A -> CQI 1; 2A, 3A -> CQI 2/3, dst)
        let lineAPriorityBonus = 0;
        if (m.wsKey && lineACqiPriority.hasOwnProperty(m.wsKey)) {
          let targetSlotIdx = lineACqiPriority[m.wsKey];
          if (slotIdx === targetSlotIdx || slotIdx === (targetSlotIdx % slots.length)) {
            lineAPriorityBonus = 250;
          }
        }

        // PENGECEKAN CAMPURAN MESIN APK DAN AST
        let apkCompatibilityPenalty = 0;
        let isApk = (m.name || '').toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK');
        if (isApk) {
          let hasAst = slot.machines.some(sm => 
            (sm.name || '').toUpperCase().startsWith('AST') || sm.id.toUpperCase().startsWith('AST')
          );
          if (hasAst) apkCompatibilityPenalty = -150;
        } else if ((m.name || '').toUpperCase().startsWith('AST') || m.id.toUpperCase().startsWith('AST')) {
          let hasApk = slot.machines.some(sm => 
            (sm.name || '').toUpperCase().startsWith('APK') || sm.id.toUpperCase().startsWith('APK')
          );
          if (hasApk) apkCompatibilityPenalty = -150;
        }

        let totalScore = (histScore * 0.35) + 
                         (distScore * 0.20) + 
                         (lineScore * 0.10) + 
                         (loadScore * 0.10) + 
                         wsClusteringBonus + 
                         lineAPriorityBonus + 
                         apkCompatibilityPenalty;

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

  /**
   * Validasi hasil planning
   */
  validate(plan, totalMachinesCount) {
    let errors = [];
    let coveredIds = new Set();
    
    plan.forEach(slot => {
      if (slot.nonCore.length > 2) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melebihi maksimal 2 NON CORE.`);
      let maxCap = slot.nonCore.length > 0 ? 8 : 6;
      if (slot.machines.length > maxCap) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melampaui batas kapasitas (${maxCap} mesin).`);
      
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes((m.name || '').toUpperCase()));
      if (hasM2M3) {
        let isOnlyM2M3 = slot.machines.every(m => ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes((m.name || '').toUpperCase()));
        if (!isOnlyM2M3) {
          errors.push(`Rule Gagal: CQI ${slot.cqi.name} memuat M2/M3 dan tidak boleh dicampur mesin lain.`);
        }
      }

      let hasApk = slot.machines.some(m => (m.name || '').toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK'));
      let hasAst = slot.machines.some(m => (m.name || '').toUpperCase().startsWith('AST') || m.id.toUpperCase().startsWith('AST'));
      if (hasApk && hasAst) {
        errors.push(`Rule Peringatan: CQI ${slot.cqi.name} mencampur mesin APK dan AST.`);
      }

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

  /**
   * Format daftar mesin: Jika semua mesin dalam workstation running, ringkas jadi 0A (3), dst.
   */
  formatMachineList(machines) {
    if (!machines || machines.length === 0) return '-';
    
    let wsGroups = {};
    let unGrouped = [];

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
      let totalInWs = WORKSTATIONS[wsKey].length;
      if (group.length === totalInWs) {
        // Jika seluruh mesin workstation running dalam 1 CQI slot -> tampilkan format ringkas e.g. 0A (3)
        parts.push(`${wsKey} (${group.length})`);
      } else {
        // Jika hanya sebagian mesin workstation yang running -> tampilkan nama mesin
        group.forEach(name => parts.push(name));
      }
    }

    unGrouped.forEach(name => parts.push(name));
    return parts.join(', ');
  },

  /**
   * Mengubah data objek plan menjadi teks laporan
   */
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

    txt += `QC PASSED :\n`;
    let qcArr = config.qcPassed ? config.qcPassed.split('\n').filter(x => x.trim() !== '') : [];
    if (qcArr.length === 1) {
      txt += `${qcArr[0]}\n`;
    } else {
      for(let i=0; i<qcArr.length; i++) {
        txt += `${qcArr[i]}\n`;
      }
    }

    txt += `\nMIL-STD : ${config.milStd || '-'}\n`;
    txt += `Standby OT : ${config.standbyOt || '-'}\n`;
    txt += `Support FG : ${config.supportFg || '-'}\n`;
    
    return txt;
  },

  /**
   * Sinkronisasi riwayat
   */
  async initHistory(githubRawUrl) {
    try {
      const response = await fetch(githubRawUrl);
      if (!response.ok) throw new Error("Gagal mengambil file history dari GitHub");
      const githubHistory = await response.json();

      let localHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');

      for (let machineId in githubHistory) {
        if (!localHistory[machineId]) {
          localHistory[machineId] = {};
        }
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
      console.log("✅ History AI berhasil disinkronisasi dengan GitHub!");
    } catch (error) {
      console.warn("⚠️ Menggunakan history internal storage. (Sync GitHub gagal/dilewati):", error.message);
    }
  },

  /**
   * Ekstrak teks manual untuk dipelajari AI
   */
  parseAndLearn(planningText) {
    const lines = planningText.split('\n');
    let currentHistory = JSON.parse(localStorage.getItem('planning_history') || '{}');

    lines.forEach(line => {
      let match = line.match(/^\d+\.\s+(.*?)\s+:\s+(.*)$/);
      
      if (match) {
        let machinePart = match[1]; 
        let personnelPart = match[2];

        let cqiId = personnelPart.split('->').pop().trim();
        let rawMachines = machinePart.split(/[\+,]/).map(m => m.trim());

        rawMachines.forEach(machineStr => {
          let machineId = machineStr.replace(/\s*\d+\s*mesin/gi, '').trim();
          
          if (!machineId) return;

          if (!currentHistory[machineId]) currentHistory[machineId] = {};
          if (!currentHistory[machineId][cqiId]) currentHistory[machineId][cqiId] = { count: 0, success: 0 };

          currentHistory[machineId][cqiId].count += 1;
          currentHistory[machineId][cqiId].success += 1;
        });
      }
    });

    localStorage.setItem('planning_history', JSON.stringify(currentHistory));
    
    const jsonOutput = JSON.stringify(currentHistory, null, 2);
    console.log("📋 Hasil Ekspor history.json (Salin ke GitHub):");
    console.log(jsonOutput);
    
    return jsonOutput;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrainAI;
}