const BrainAI = {
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
    return 50; // Skor tengah default jika belum ada riwayat
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
    
    // 1 CQI = 1 CORE
    let activeCQIs = cqis.slice(0, coreLimit); 
    
    let slots = activeCQIs.map((cqi, i) => {
      return {
        slotId: 'SLOT-' + i,
        cqi: cqi,
        core: `CORE ${i+1}`,
        nonCore: [],
        machines: [],
        capacity: 6 // Kapasitas default jika hanya ada CORE
      };
    });

    // Distribusi NON CORE
    let ncIdx = 0;
    for (let i = 0; i < nonCoreCount; i++) {
      if (slots.length === 0) break;
      let slot = slots[ncIdx % slots.length];
      if (slot.nonCore.length < 2) { // Maksimal 2 Non Core per CQI
        slot.nonCore.push(`NON CORE ${i+1}`);
        slot.capacity = 8; // Kapasitas jika ada Non Core
      }
      ncIdx++;
    }

    // HITUNG JUMLAH MESIN RUNNING PER LINE (Untuk aturan 0A - 10A)
    let lineCounts = {};
    machines.forEach(m => {
      if (m.line) {
        lineCounts[m.line] = (lineCounts[m.line] || 0) + 1;
      }
    });

    let unassigned = [...machines];
    
    // --- ATURAN 1: MESIN M2 & M3 EKSKLUSIF DI CQI 19 ---
    let m2m3Machines = unassigned.filter(m => 
      ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes(m.name.toUpperCase())
    );
    let slot19 = slots.find(s => 
      String(s.cqi.id) === '19' || String(s.cqi.name) === '19' || String(s.cqi.name).includes('19')
    );
    
    if (m2m3Machines.length > 0 && slot19) {
      m2m3Machines.forEach(m => {
        slot19.machines.push(m);
        unassigned = unassigned.filter(x => x.id !== m.id);
      });
      // Kunci kapasitas slot 19 agar tidak dimasuki mesin tambahan lain
      slot19.capacity = slot19.machines.length;
    }

    // --- ATURAN 2: MESIN C1 & C2 DI CQI 24 + MAKS 2-3 MESIN APK TERDEKAT ---
    let c1c2Machines = unassigned.filter(m => 
      ['C1', 'C2'].includes(m.id.toUpperCase()) || ['C1', 'C2'].includes(m.name.toUpperCase())
    );
    let slot24 = slots.find(s => 
      String(s.cqi.id) === '24' || String(s.cqi.name) === '24' || String(s.cqi.name).includes('24')
    );
    
    if (c1c2Machines.length > 0 && slot24) {
      c1c2Machines.forEach(m => {
        slot24.machines.push(m);
        unassigned = unassigned.filter(x => x.id !== m.id);
      });
      
      // Ambil mesin APK terdekat untuk dimasukkan ke CQI 24
      let apkCandidates = unassigned.filter(m => 
        m.name.toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK')
      );
      
      apkCandidates.sort((a, b) => {
        let distA = this.getDistance(a.row, a.col, slot24.cqi.row, slot24.cqi.col);
        let distB = this.getDistance(b.row, b.col, slot24.cqi.row, slot24.cqi.col);
        return distA - distB;
      });

      let addedApk = apkCandidates.slice(0, 3); // Ambil maks 2-3 mesin APK terdekat
      addedApk.forEach(m => {
        if (slot24.machines.length < slot24.capacity) {
          slot24.machines.push(m);
          unassigned = unassigned.filter(x => x.id !== m.id);
        }
      });
    }

    // --- ASSIGNMENT MESIN LAINNYA DENGAN AI SCORING ---
    unassigned.forEach(m => {
      let bestSlot = null;
      let bestScore = -Infinity;

      slots.forEach(slot => {
        if (slot.machines.length >= slot.capacity) return; // Skip jika slot penuh
        
        let dist = this.getDistance(m.row, m.col, slot.cqi.row, slot.cqi.col);
        let distScore = Math.max(0, 100 - dist); // Normalisasi
        
        let histScore = this.getHistory(m.id, slot.cqi.id);
        let lineScore = (m.line === slot.cqi.line) ? 100 : 0;
        let loadScore = ((slot.capacity - slot.machines.length) / slot.capacity) * 100;

        // PRIORITAS LINE 0A - 10A (Jika running 2, 3, atau 4 mesin)
        let sameLineBonus = 0;
        if (m.line && lineCounts[m.line] >= 2 && lineCounts[m.line] <= 4) {
          let isSameLineCQI = (slot.cqi.line === m.line) || (slot.cqi.name && slot.cqi.name.includes(m.line));
          if (isSameLineCQI) {
            sameLineBonus = 200; // Prioritas utama ke CQI line tersebut
          }
        }

        // PENGECEKAN CAMPURAN MESIN APK (Tidak boleh campur AST, hanya APK/KH/X)
        let apkCompatibilityPenalty = 0;
        let isApk = m.name.toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK');
        if (isApk) {
          let hasAst = slot.machines.some(sm => 
            sm.name.toUpperCase().startsWith('AST') || sm.id.toUpperCase().startsWith('AST')
          );
          if (hasAst) {
            apkCompatibilityPenalty = -150; // Penalti jika dicampur dengan AST
          }
        } else if (m.name.toUpperCase().startsWith('AST') || m.id.toUpperCase().startsWith('AST')) {
          let hasApk = slot.machines.some(sm => 
            sm.name.toUpperCase().startsWith('APK') || sm.id.toUpperCase().startsWith('APK')
          );
          if (hasApk) {
            apkCompatibilityPenalty = -150; // Penalti jika AST masuk ke slot yang sudah ada APK
          }
        }

        // AKUMULASI SKOR BOBOT AI
        let totalScore = (histScore * 0.40) + 
                         (distScore * 0.25) + 
                         (lineScore * 0.15) + 
                         (loadScore * 0.10) + 
                         (100 * 0.10) + 
                         sameLineBonus + 
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
   * Validasi hasil planning sesuai rule yang ditentukan
   */
  validate(plan, totalMachinesCount) {
    let errors = [];
    let coveredIds = new Set();
    
    plan.forEach(slot => {
      if (slot.nonCore.length > 2) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melebihi maksimal 2 NON CORE.`);
      let maxCap = slot.nonCore.length > 0 ? 8 : 6;
      if (slot.machines.length > maxCap) errors.push(`Rule Gagal: CQI ${slot.cqi.name} melampaui batas kapasitas (${maxCap} mesin).`);
      
      // Validasi M2 / M3
      let hasM2M3 = slot.machines.some(m => ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes(m.name.toUpperCase()));
      if (hasM2M3) {
        let isOnlyM2M3 = slot.machines.every(m => ['M2', 'M3'].includes(m.id.toUpperCase()) || ['M2', 'M3'].includes(m.name.toUpperCase()));
        if (!isOnlyM2M3) {
          errors.push(`Rule Gagal: CQI ${slot.cqi.name} memuat M2/M3 dan tidak boleh dicampur mesin lain.`);
        }
      }

      // Validasi Pencampuran APK dan AST
      let hasApk = slot.machines.some(m => m.name.toUpperCase().startsWith('APK') || m.id.toUpperCase().startsWith('APK'));
      let hasAst = slot.machines.some(m => m.name.toUpperCase().startsWith('AST') || m.id.toUpperCase().startsWith('AST'));
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
   * Mengubah data objek plan menjadi teks laporan
   */
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
    let qcArr = config.qcPassed ? config.qcPassed.split('\n').filter(x => x.trim() !== '') : [];
    for(let i=0; i<5; i++) {
      txt += `${i+1}. ${qcArr[i] || ''}\n`;
    }

    txt += `\nMIL-STD: ${config.milStd || '-'}\n`;
    txt += `Standby OT: ${config.standbyOt || '-'}\n`;
    txt += `Support FG: ${config.supportFg || '-'}\n`;
    
    return txt;
  },

  /**
   * Menyingkronkan riwayat dari GitHub Raw URL saat aplikasi pertama kali dibuka,
   * lalu menggabungkannya dengan Local Storage secara akumulatif.
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
   * Mempelajari teks planning manual, mengekstrak relasi Mesin -> CQI,
   * memperbarui Local Storage, serta mengembalikan string JSON untuk disimpan ke GitHub.
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

// Export modul jika dijalankan di Node.js / Module Bundler
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrainAI;
}