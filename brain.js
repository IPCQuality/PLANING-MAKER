/**
 * ============================================================================
 * ENGINE LOGIKA PERENCANAAN SHIFT & ALOKASI MESIN (BrainAI)
 * ============================================================================
 * 
 * File ini mengorganisir seluruh logika cerdas sistem ke dalam 5 modul terstruktur:
 * 1. UTILITY & NORMALISASI DATA (String, Workstation Key, Manhattan Distance, Helper Cluster/Mesin/CQI)
 * 2. CORE ALGORITHM (Engine Alokasi Mesin ke CQI & Distribusi Manpower: Mode 1 & Mode 2, Cluster Mixing Rules)
 * 3. VALIDATOR SISTEM (Pengecekan Rule, Constraint, Cluster Mixing, & Alert Operasional)
 * 4. FORMATTER & EXPORTER (Penyusunan Teks WhatsApp, Excel, dan GitHub JSON)
 * 5. PERSISTENSI & LOG HISTORY (Local Storage Tracking)
 */

const BrainAI = {

  // ==========================================================================
  // 1. MODUL UTILITY & NORMALISASI DATA
  // ==========================================================================

  /**
   * Mensejajarkan format string nama mesin, CQI, atau personel untuk mencegah mismatch
   * @param {string} name - Nama input mentah
   * @returns {string} String yang sudah dibersihkan (Uppercase, tanpa spasi/simbol)
   */
  normalizeName(name) {
    if (!name) return '';
    return String(name).trim().toUpperCase().replace(/[\s\-_]+/g, '');
  },

  /**
   * Mengambil angka identifikasi dari CQI (misal: "CQI-24", "CQI 24", "24" -> "24")
   * @param {Object|string} cqi - Objek CQI atau string nama/id
   * @returns {string} Angka ID CQI
   */
  getCqiNumber(cqi) {
    if (!cqi) return '';
    const str = typeof cqi === 'object' ? (cqi.name || cqi.id || '') : String(cqi);
    const match = str.match(/\d+/);
    return match ? match[0] : str.trim().toUpperCase();
  },

  /**
   * Mengidentifikasi kelompok cluster mesin secara terstandarisasi
   * Output: 'WW', 'OT', 'SOSOFT', 'SKLSCT', '12LJUMBO', 'POUCH', 'BOTOL', atau 'LAINNYA'
   * @param {Object} m - Objek Mesin
   * @returns {string}
   */
  getMachineClusterGroup(m) {
    if (!m) return 'LAINNYA';
    if (this.isWwMachine(m)) return 'WW';
    if (this.isOtMachine(m)) return 'OT';

    const cluster = String(m.cluster || '').toUpperCase().trim();
    const ws = String(m.workstation || m.ws || '').toUpperCase().trim();
    const name = String(m.name || m.id || '').toUpperCase().trim();

    if (cluster.includes('SOSOFT')) return 'SOSOFT';
    if (cluster.includes('SKLSCT') || cluster.includes('SKL')) return 'SKLSCT';
    if (cluster.includes('12LJUMBO') || cluster.includes('JUMBO') || cluster.includes('12L')) return '12LJUMBO';
    if (cluster.includes('POUCH') || name.startsWith('APK')) return 'POUCH';
    if (cluster.includes('BOTOL') || name.startsWith('BTL') || ws.includes('BTL')) return 'BOTOL';

    return cluster || 'LAINNYA';
  },

  /**
   * Cek apakah dua cluster diperbolehkan dicampur di 1 CQI berdasarkan aturan:
   * 1. (sosoft, sklsct, 12ljumbo) -> Boleh dicampur.
   * 2. (pouch, botol) -> Boleh dicampur.
   * 3. CQI 10 -> Khusus boleh mencampur (sklsct, pouch line C dan 8B), selain CQI 10 dilarang.
   * 4. (ww, pouch) -> Boleh dicampur hanya di CQI 24.
   * 5. Cluster lain tidak boleh dicampur.
   * 
   * @param {string} clusterA - Cluster mesin A
   * @param {string} clusterB - Cluster mesin B
   * @param {string} cqiNumber - Nomor CQI (misal: '10', '24', dll.)
   * @param {Object} machineA - Objek mesin A (opsional untuk verifikasi line/ws)
   * @param {Object} machineB - Objek mesin B (opsional untuk verifikasi line/ws)
   * @returns {boolean}
   */
  isClusterMixingAllowed(clusterA, clusterB, cqiNumber = '', machineA = null, machineB = null) {
    if (!clusterA || !clusterB || clusterA === clusterB) return true;
    
    const group1 = ['SOSOFT', 'SKLSCT', '12LJUMBO'];
    const group2 = ['POUCH', 'BOTOL'];

    // Aturan 1: sosoft, sklsct, 12ljumbo boleh dicampur
    if (group1.includes(clusterA) && group1.includes(clusterB)) {
      return true;
    }

    // Aturan 2: pouch, botol boleh dicampur
    if (group2.includes(clusterA) && group2.includes(clusterB)) {
      return true;
    }

    // Aturan 3: CQI 10 khusus boleh mencampur (sklsct, pouch line C dan 8B)
    if (String(cqiNumber) === '10') {
      const isSklAndPouch = (clusterA === 'SKLSCT' && clusterB === 'POUCH') || (clusterA === 'POUCH' && clusterB === 'SKLSCT');
      if (isSklAndPouch) {
        if (machineA && machineB) {
          const pouchM = clusterA === 'POUCH' ? machineA : machineB;
          return this.isPouchLineCAnd8B(pouchM);
        }
        return true;
      }
    }

    // Aturan 4: CQI 24 khusus boleh mencampur (WW, pouch)
    if (String(cqiNumber) === '24') {
      const allowedPair = ['WW', 'POUCH'];
      if (allowedPair.includes(clusterA) && allowedPair.includes(clusterB)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Cek apakah mesin merupakan kategori Pouch dari Line C atau Workstation 8B
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isPouchLineCAnd8B(m) {
    if (!m || !this.isPouchMachine(m)) return false;
    const line = String(m.line || '').toUpperCase();
    const ws = String(m.workstation || m.ws || '').toUpperCase();
    return line.includes('LINE C') || line === 'C' || ws.includes('C') || ws === '8B' || ws.includes('8B');
  },

  /**
   * Cek apakah sebuah mesin dapat dimasukkan ke CQI tanpa melanggar aturan mixing cluster
   * @param {Object} m - Objek Mesin
   * @param {Object} slot - Objek Slot CQI
   * @returns {boolean}
   */
  canAddMachineToSlotCluster(m, slot) {
    const cqiNum = String(slot.cqiNum || this.getCqiNumber(slot.cqi));
    const isOt = this.isOtMachine(m);
    
    // ATURAN MUTLAK: Mesin M2 & M3 (OT) TIDAK BISA dicek oleh CQI lain, HARUS CQI 19.
    // CQI 19 HANYA BOLEH MENGECEK MESIN OT (Dilarang keras mengecek Line A, Line B, Line C, ataupun WW).
    if (isOt && cqiNum !== '19') return false;
    if (!isOt && cqiNum === '19') return false;
    if (cqiNum === '19') {
      const line = String(m.line || '').toUpperCase();
      const ws = String(m.workstation || m.ws || '').toUpperCase();
      if (line.includes('LINE A') || line.includes('LINE B') || line.includes('LINE C') || line.includes('WW') ||
          ws.endsWith('A') || ws.endsWith('B') || ws.endsWith('C') || ws === 'WW') {
        return false;
      }
      return isOt;
    }

    // CQI 24 khusus WW & Pouch
    const isWw = this.isWwMachine(m);
    if (isWw && cqiNum !== '24') return false;
    if (!isWw && !this.isPouchMachine(m) && cqiNum === '24') return false;

    if (!slot.machines || slot.machines.length === 0) return true;
    const mCluster = this.getMachineClusterGroup(m);

    for (const existingMachine of slot.machines) {
      const existCluster = this.getMachineClusterGroup(existingMachine);
      if (!this.isClusterMixingAllowed(mCluster, existCluster, cqiNum, m, existingMachine)) {
        return false;
      }
    }
    return true;
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Wet Wipes (WW)
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isWwMachine(m) {
    if (!m) return false;
    const line = String(m.line || '').toUpperCase();
    const ws = String(m.workstation || m.ws || '').toUpperCase();
    const name = String(m.name || m.id || '').toUpperCase();
    const cluster = String(m.cluster || '').toUpperCase();
    return line === 'WW' || ws === 'WW' || cluster.includes('WW') || /^C\d+/.test(name);
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Oral & Tube / Other (OT - yaitu mesin M2 dan M3)
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isOtMachine(m) {
    if (!m) return false;
    const line = String(m.line || '').toUpperCase();
    const ws = String(m.workstation || m.ws || '').toUpperCase();
    const name = String(m.name || m.id || '').toUpperCase();
    const id = String(m.id || '').toUpperCase();
    const cluster = String(m.cluster || '').toUpperCase();
    
    // PERBAIKAN: Gunakan exact match (===) atau regex kata utuh (\b)
    // Jangan gunakan .includes('OT') karena akan mendeteksi string 'BOTOL'
    const isClusterOt = cluster === 'OT' || /\bOT\b/.test(cluster);

    return name === 'M2' || name === 'M3' || 
           id === 'M2' || id === 'M3' || 
           line === 'OT' || 
           ws === 'OT' || 
           isClusterOt || 
           /^M\d+/.test(name) || 
           /^M\d+/.test(id);
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Pouch
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isPouchMachine(m) {
    if (!m) return false;
    const cluster = String(m.cluster || '').toUpperCase();
    const name = String(m.name || m.id || '').toUpperCase();
    return cluster.includes('POUCH') || name.startsWith('APK');
  },

  /**
   * Mengambil identitas workstation secara dinamis dari properti objek mesin, label, atau nama string
   * @param {Object|string} machineInput - Objek mesin atau string nama mesin
   * @param {Array} labels - Daftar label area dari map.json
   * @returns {string} Kode Workstation (misal: '0A', '1A', 'WW', 'OT', dll.)
   */
  getWorkstationKey(machineInput, labels = []) {
    if (typeof machineInput === 'object' && machineInput !== null) {
      if (machineInput.workstation) {
        return String(machineInput.workstation).trim().toUpperCase();
      }
      if (machineInput.ws) {
        return String(machineInput.ws).trim().toUpperCase();
      }
      machineInput = machineInput.name || machineInput.id || '';
    }

    const normM = this.normalizeName(machineInput);
    
    if (Array.isArray(labels)) {
      for (const l of labels) {
        const normL = this.normalizeName(l.name);
        if (normL && (normM.includes(normL) || normL.includes(normM))) {
          return l.name;
        }
      }
    }
    
    const match = normM.match(/(\d+[A-Z]|WW|OT)/);
    return match ? match[0] : 'LAINNYA';
  },

  /**
   * Menghitung jarak lintasan grid (Manhattan Distance) berdasarkan koordinat Row & Col
   * @param {Object} m - Objek Mesin (dengan row, col atau position)
   * @param {Object} cqi - Objek CQI (dengan row, col atau position)
   * @returns {number} Jarak Manhattan (integer)
   */
  calculateDistance(m, cqi) {
    const mRow = m.row || (m.position ? m.position.row : 0);
    const mCol = m.col || (m.position ? m.position.col : 0);
    const cRow = cqi.row || (cqi.position ? cqi.position.row : 0);
    const cCol = cqi.col || (cqi.position ? cqi.position.col : 0);
    return Math.abs(mRow - cRow) + Math.abs(mCol - cCol);
  },

  /**
   * Menghitung nilai bonus afinitas riwayat penugasan mesin ke CQI
   * @param {Object} machine - Objek Mesin
   * @param {Object} cqi - Objek CQI
   * @param {Array} historyList - Daftar riwayat penugasan (opsional)
   * @returns {number} Nilai bonus (0 - 30)
   */
  getHistoryBonus(machine, cqi, historyList = null) {
    if (!historyList) {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('planning_history') : null;
        historyList = raw ? JSON.parse(raw) : [];
      } catch (e) {
        historyList = [];
      }
    }
    if (!Array.isArray(historyList) || historyList.length === 0) return 0;
    
    const mName = this.normalizeName(machine.name || machine.id);
    const cqiNum = this.getCqiNumber(cqi);

    let matchCount = 0;
    for (const h of historyList) {
      const hM = this.normalizeName(h.machineId || h.machine || h.name);
      const hCqi = this.getCqiNumber(h.cqiId || h.cqi || h.nama);
      if (hM && (hM === mName || mName.includes(hM) || hM.includes(mName)) && hCqi === cqiNum) {
        matchCount++;
      }
    }
    return Math.min(matchCount * 10, 30);
  },

  /**
   * Mengubah daftar array objek mesin menjadi teks terpisah koma yang rapi.
   * ATURAN: Jika seluruh mesin running dalam satu workstation (WS) dicek oleh 1 CQI yang sama,
   * maka tuliskan format ringkas WS dan jumlah mesin running-nya (misal: "0A (2)", "1A (3)").
   * Mesin individual yang tidak mengcover seluruh running mesin di WS-nya tetap ditulis nama mesinnya.
   * 
   * @param {Array} slotMachines - Daftar mesin pada slot CQI ini
   * @param {Array} allRunningMachines - Daftar seluruh mesin running di shift ini (opsional)
   * @param {Array} labels - Label map (opsional)
   * @returns {string} Daftar nama mesin terpisah koma
   */
  formatMachineList(slotMachines, allRunningMachines = null, labels = []) {
    if (!Array.isArray(slotMachines) || slotMachines.length === 0) return '-';

    // Jika daftar seluruh mesin running diberikan, kita bisa menghitung total mesin running per workstation
    // Jika tidak diberikan, kita anggap referensi dari slotMachines
    const allRunning = Array.isArray(allRunningMachines) && allRunningMachines.length > 0
      ? allRunningMachines
      : slotMachines;

    // 1. Hitung total mesin running per WS di seluruh pabrik
    const totalRunningPerWs = {};
    allRunning.forEach(m => {
      const ws = this.getWorkstationKey(m, labels);
      if (ws && ws !== 'LAINNYA') {
        totalRunningPerWs[ws] = (totalRunningPerWs[ws] || 0) + 1;
      }
    });

    // 2. Kelompokkan mesin yang ada di slot CQI ini berdasarkan WS
    const slotWsGroups = {};
    slotMachines.forEach(m => {
      const ws = this.getWorkstationKey(m, labels);
      if (!slotWsGroups[ws]) slotWsGroups[ws] = [];
      slotWsGroups[ws].push(m);
    });

    // 3. Susun output: Jika jumlah mesin di slot untuk WS tersebut == total mesin running WS tersebut (dan > 1),
    // tulis "WS (count)". Jika hanya 1 mesin atau belum mengcover 100% running mesin di WS tersebut,
    // tampilkan nama masing-masing mesin.
    const resultParts = [];
    const processedWs = new Set();

    // Urutkan workstation grup agar konsisten sesuai urutan mesin di slot
    slotMachines.forEach(m => {
      const ws = this.getWorkstationKey(m, labels);
      if (processedWs.has(m.id || m.name)) return;

      const group = slotWsGroups[ws] || [];
      const totalInShift = totalRunningPerWs[ws] || 0;

      // Jika seluruh mesin running di WS tersebut berada di 1 CQI ini dan jumlahnya >= 2 (atau totalInShift == group.length)
      if (ws && ws !== 'LAINNYA' && group.length >= 2 && group.length === totalInShift) {
        if (!resultParts.includes(`${ws} (${group.length})`)) {
          resultParts.push(`${ws} (${group.length})`);
          group.forEach(gm => processedWs.add(gm.id || gm.name));
        }
      } else {
        resultParts.push(m.name || m.id);
        processedWs.add(m.id || m.name);
      }
    });

    return resultParts.join(', ');
  },


  // ==========================================================================
  // 2. MODUL CORE ALGORITHM (Engine Alokasi & Distribusi Manpower)
  // ==========================================================================

  /**
   * Engine Utama Perencanaan:
   * 
   * 1. Menginisialisasi slot CQI aktif:
   *    - Jika CQI aktif (READY) lebih banyak dari jumlah Core yang tersedia, pilih CQI yang akan
   *      ditempati Core (pilih CQI yang paling strategis/memungkinkan untuk cover semua mesin).
   * 
   * 2. Mengalokasikan setiap mesin RUNNING ke CQI terbaik berdasarkan:
   *    - Aturan Khusus:
   *      * WW harus dicek di CQI 24 (dilarang menambah mesin apapun kecuali jika masih ada mesin pouch
   *        yang belum tercoverage -> tambahkan mesin cluster pouch terdekat maks 4 mesin & wajib diberi 1 Non-Core/(LS)).
   *      * OT harus dicek di CQI 19 (dilarang menambah mesin apapun, strictly mesin OT saja).
   *    - Aturan Cluster Mixing (Aturan 7):
   *      * (sosoft, sklsct, 12ljumbo) boleh dicampur (prioritas terdekat & jika memungkinkan 1 workstation).
   *      * (pouch, botol) boleh dicampur (prioritas terdekat & jika memungkinkan 1 workstation).
   *      * CQI 10 khusus boleh mencampur (sklsct, pouch), selain CQI 10 dilarang.
   *      * Dilarang mencampur cluster selain yang diizinkan di atas.
   *    - Cluster + Workstation Affinity + Jarak + Prioritas.
   * 
   * 3. Memasangkan Core sesuai "cqi_priority", lalu sesuai urutan ke CQI yang mendapatkan mesin.
   * 
   * 4. Mendistribusikan Non-Core secara merata ke CQI yang paling membutuhkan sesuai Mode Beban (Aturan 6):
   *    * MODE 1 (Mesin Banyak, Manpower Cukup/Mendekati):
   *      - 1 Core, 0 Non-Core = maks 4 mesin
   *      - 1 Core, 1 Non-Core = maks 6 mesin
   *      - 1 Core, 2 Non-Core = maks 8 mesin
   *      - Maksimal 2 Non-Core per CQI
   *    * MODE 2 (Mesin Sedikit, Manpower Minim):
   *      - 1 Core, 0 Non-Core = maks 4 mesin
   *      - 1 Core, 1 Non-Core = maks 6 mesin
   *      - Maksimal 1 Non-Core per CQI
   * 
   * 5. Mendistribusikan kuota Longshift (LS) sesuai batas kapasitas mode.
   * 
   * @param {Array} machines - Daftar mesin berstatus RUNNING
   * @param {Array} cqis - Daftar CQI berstatus READY
   * @param {Object} config - Konfigurasi manpower & mode (mode: 1|2, coreData, nonCoreData, longshift, dll.)
   * @param {Object} mapData - Referensi data denah (opsional)
   * @returns {Array} Array slots perencanaan lengkap
   */
  generatePlan(machines, cqis, config = {}, mapData = {}) {
    if (!Array.isArray(machines) || machines.length === 0 || !Array.isArray(cqis) || cqis.length === 0) {
      return [];
    }

    const mode = parseInt(config.mode || 1, 10) === 2 ? 2 : 1;
    const maxNcPerCqi = mode === 1 ? 2 : 1;

    // --- TAHAP 1: FILTER KATEGORI MESIN & HITUNG KAPASITAS CORE ---
    const runningMachines = [...machines];
    const wwMachines = runningMachines.filter(m => this.isWwMachine(m));
    const otMachines = runningMachines.filter(m => this.isOtMachine(m));
    const generalMachines = runningMachines.filter(m => !this.isWwMachine(m) && !this.isOtMachine(m));

    const readyCQIs = cqis.filter(c => c.status === 'READY');
    const availableCqis = readyCQIs.length > 0 ? readyCQIs : [...cqis];

    // Hitung total Core yang tersedia
    let coreList = [];
    if (Array.isArray(config.coreData) && config.coreData.length > 0) {
      coreList = config.coreData.map(c => typeof c === 'object' ? c : { name: c, cqi_priority: '' });
    } else if (Array.isArray(config.coreNames) && config.coreNames.length > 0) {
      coreList = config.coreNames.map(name => ({ name, cqi_priority: '' }));
    }
    const maxCoreSlots = coreList.length > 0 ? coreList.length : (config.core || availableCqis.length);

    // --- TAHAP 2: SELEKSI CQI AKTIF JIKA CQI READY > JUMLAH CORE ---
    let selectedCQIs = [];
    const cqi19Obj = availableCqis.find(c => this.getCqiNumber(c) === '19');
    const cqi24Obj = availableCqis.find(c => this.getCqiNumber(c) === '24');

    // Prioritas 1: Sertakan CQI 19 jika ada mesin M2 & M3 (OT) running (Wajib di awal)
    if (otMachines.length > 0 && cqi19Obj) {
      selectedCQIs.push(cqi19Obj);
    }

    // Prioritas 2: Sertakan CQI 24 jika ada mesin WW running
    if (wwMachines.length > 0 && cqi24Obj && !selectedCQIs.includes(cqi24Obj)) {
      selectedCQIs.push(cqi24Obj);
    }

    // Prioritas 3: Pilih sisa CQI yang paling strategis untuk cover generalMachines
    // CQI 19 dan CQI 24 dieksklusi secara ketat dari kandidat umum
    const remainingCandidates = availableCqis.filter(c => {
      const num = this.getCqiNumber(c);
      if (selectedCQIs.includes(c)) return false;
      if (num === '19' || num === '24') return false;
      return true;
    });
      
    const scoredCandidates = remainingCandidates.map(c => {
      let totalDist = 0;
      generalMachines.forEach(m => {
        totalDist += this.calculateDistance(m, c);
      });
      const avgDist = generalMachines.length > 0 ? (totalDist / generalMachines.length) : 0;
      return { cqi: c, avgDist };
    });

    scoredCandidates.sort((a, b) => a.avgDist - b.avgDist);

    while (selectedCQIs.length < maxCoreSlots && scoredCandidates.length > 0) {
      selectedCQIs.push(scoredCandidates.shift().cqi);
    }

    // Buat objek Slot Penampung
    const maxCapacityPerSlot = mode === 1 ? 8 : 6;
    const slots = selectedCQIs.map(c => ({
      cqi: c,
      cqiNum: this.getCqiNumber(c),
      machines: [],
      core: 0,
      coreNames: [],
      nonCore: [],
      longshift: [],
      pouchAddedToWw: false,
      maxAllowedMachines: maxCapacityPerSlot
    }));

    const slot24 = slots.find(s => s.cqiNum === '24');
    const slot19 = slots.find(s => s.cqiNum === '19');
    if (slot19) {
      slot19.maxAllowedMachines = 2;
    }

    // --- TAHAP 3: ALOKASI MESIN RUNNING KE CQI ---

    // =========================================================================
    // PASS 1 (DEDICATED & ISOLATED): MESIN OT (M2 & M3) -> STRICTLY CQI 19 ONLY
    // Mesin M2 & M3 jika running, HANYA BISA dialokasikan ke CQI 19 (maks 2 mesin).
    // Selesai tuntas di pass ini, terisolasi 100% dari alokasi mesin umum & slot non-19.
    // =========================================================================
    if (otMachines.length > 0) {
      if (slot19) {
        otMachines.slice(0, 2).forEach(m => {
          if (!slot19.machines.some(sm => sm.id === m.id || sm.name === m.name)) {
            slot19.machines.push(m);
          }
        });
      }
    }

    // =========================================================================
    // PASS 2 (DEDICATED & ISOLATED): MESIN WW -> STRICTLY CQI 24 ONLY
    // Mesin WW jika running dialokasikan secara dedicated ke CQI 24.
    // =========================================================================
    if (wwMachines.length > 0) {
      if (slot24) {
        wwMachines.forEach(m => {
          if (!slot24.machines.some(sm => sm.id === m.id || sm.name === m.name)) {
            slot24.machines.push(m);
          }
        });
      }
    }

    // =========================================================================
    // PASS 3: ALOKASI MESIN UMUM (Line A, B, C / Sosoft, 12Ljumbo, SKLsct, Pouch, Botol)
    // Slot yang diperbolehkan: Secara EKSPLISIT & MUTLAK hanya generalSlots (Non-19 & Non-24)
    // Mesin OT/WW yang sudah selesai di Pass 1 & 2 dijamin tidak akan masuk ke generalSlots.
    // =========================================================================
    const excludedCqiNums = new Set(['19', '24']);
    const generalSlots = slots.filter(s => {
      const num = String(s.cqiNum || this.getCqiNumber(s.cqi) || '').trim();
      return !excludedCqiNums.has(num);
    });

    // Kelompokkan dan urutkan mesin umum (hanya memproses generalMachines, OT dan WW sudah dipisahkan)
    const unallocatedGeneralMachines = [];
    const sortedGeneralMachines = [...generalMachines].sort((a, b) => {
      const clusterA = this.getMachineClusterGroup(a);
      const clusterB = this.getMachineClusterGroup(b);
      if (clusterA !== clusterB) return clusterA.localeCompare(clusterB);
      const wsA = String(a.workstation || a.ws || '');
      const wsB = String(b.workstation || b.ws || '');
      if (wsA !== wsB) return wsA.localeCompare(wsB);
      return (parseInt(b.qtytimbang || 8, 10)) - (parseInt(a.qtytimbang || 8, 10));
    });

    sortedGeneralMachines.forEach(m => {
      let bestSlot = null;
      let minScore = Infinity;
      const mCluster = this.getMachineClusterGroup(m);
      const mWs = String(m.workstation || m.ws || '').toUpperCase();

      generalSlots.forEach(slot => {
        // Cek kapasitas maksimum per slot
        if (slot.machines.length >= slot.maxAllowedMachines) return;

        // Cek ATURAN CLUSTER MIXING (Aturan 7)
        if (!this.canAddMachineToSlotCluster(m, slot)) {
          return; // Skip slot jika mencampur cluster yang dilarang
        }

        const currentLoad = slot.machines.length;
        const distance = this.calculateDistance(m, slot.cqi);

        // Bonus jika 1 cluster sama persis
        const sameClusterCount = slot.machines.filter(sm => this.getMachineClusterGroup(sm) === mCluster).length;
        const clusterBonus = sameClusterCount * 25;

        // Bonus jika 1 workstation sama
        const sameWsCount = slot.machines.filter(sm => String(sm.workstation || sm.ws || '').toUpperCase() === mWs).length;
        const wsBonus = sameWsCount * 20;

        // Bonus riwayat penugasan (History Affinity)
        const historyBonus = this.getHistoryBonus(m, slot.cqi, config.history || mapData.history);

        // Cek prioritas CQI dari data map
        const prioList = Array.isArray(slot.cqi.priority) 
          ? slot.cqi.priority.map(p => this.normalizeName(p)) 
          : [];
        const isPriority = prioList.includes(this.normalizeName(m.name || m.id));
        const priorityBonus = isPriority ? 45 : 0;

        // Evaluasi skor komprehensif: Jarak + Beban - Riwayat - Cluster - Workstation - Prioritas
        const score = distance + (currentLoad * 10) - historyBonus - clusterBonus - wsBonus - priorityBonus;

        if (score < minScore) {
          minScore = score;
          bestSlot = slot;
        }
      });

      if (bestSlot) {
        bestSlot.machines.push(m);
      } else {
        unallocatedGeneralMachines.push(m);
      }
    });

    // Fallback untuk mesin umum yang belum teralokasi karena restriksi cluster ketat
    // STRICT: Hanya boleh ke generalSlots yang mematuhi cluster & isolasi CQI 19/24
    if (unallocatedGeneralMachines.length > 0 && generalSlots.length > 0) {
      unallocatedGeneralMachines.forEach(m => {
        let fallbackSlot = null;
        let minScore = Infinity;

        generalSlots.forEach(slot => {
          if (slot.machines.length < slot.maxAllowedMachines && this.canAddMachineToSlotCluster(m, slot)) {
            const score = this.calculateDistance(m, slot.cqi) + (slot.machines.length * 15);
            if (score < minScore) {
              minScore = score;
              fallbackSlot = slot;
            }
          }
        });

        if (fallbackSlot) {
          fallbackSlot.machines.push(m);
        } else {
          // Jika seluruh general slot penuh, alokasikan ke general slot yang valid dengan load terendah
          const lowestSlot = [...generalSlots].filter(s => this.canAddMachineToSlotCluster(m, s)).sort((a,b) => a.machines.length - b.machines.length)[0];
          if (lowestSlot) lowestSlot.machines.push(m);
        }
      });
    }

    // D. Pengecekan Khusus CQI 24 (WW):
    // "dilarang menambahkan mesin apapun kecuali masih ada mesin yang belum tercoverage,
    // maka tambahkan mesin cluster pouch terdekat maks 4 mesin dan harus diberi 1 noncore/(ls)"
    if (slot24) {
      let pouchCandidates = [];
      
      // Cek apakah ada general slot yang overload (> 4 mesin di mode 2, atau > 6 mesin di mode 1)
      const overloadThreshold = mode === 1 ? 6 : 4;
      const overloadedSlots = generalSlots.filter(s => s.machines.length > overloadThreshold);

      if (overloadedSlots.length > 0) {
        overloadedSlots.forEach(os => {
          const pouches = os.machines.filter(m => this.isPouchMachine(m));
          pouches.forEach(pm => {
            if (pouchCandidates.length < 4) {
              pouchCandidates.push(pm);
              os.machines = os.machines.filter(m => m.id !== pm.id);
            }
          });
        });
      }

      if (pouchCandidates.length > 0) {
        pouchCandidates.sort((a, b) => this.calculateDistance(a, slot24.cqi) - this.calculateDistance(b, slot24.cqi));
        const addedPouches = pouchCandidates.slice(0, 4);
        addedPouches.forEach(pm => slot24.machines.push(pm));
        slot24.pouchAddedToWw = true;
      }
    }

    // Saring slot aktif yang memiliki mesin
    const activeSlots = slots.filter(s => s.machines.length > 0);

    // --- TAHAP 4: PEMASANGAN CORE MANPOWER SESUAI "cqi_priority" & URUTAN ---
    const availableCores = [...coreList];

    // Prioritas 1: Pasangkan Core yang memiliki "cqi_priority" cocok dengan nomor CQI
    activeSlots.forEach(slot => {
      const matchedCoreIdx = availableCores.findIndex(c => {
        if (!c || !c.cqi_priority) return false;
        const prioNum = String(c.cqi_priority).trim();
        return prioNum === slot.cqiNum || this.getCqiNumber(c.cqi_priority) === slot.cqiNum;
      });

      if (matchedCoreIdx !== -1) {
        const matchedCore = availableCores.splice(matchedCoreIdx, 1)[0];
        slot.core = 1;
        slot.coreNames = [matchedCore.name];
      }
    });

    // Prioritas 2: Pasangkan sisa Core sesuai urutan ke slot aktif yang belum terisi
    activeSlots.forEach(slot => {
      if (slot.core === 0 && availableCores.length > 0) {
        const nextCore = availableCores.shift();
        slot.core = 1;
        slot.coreNames = [nextCore.name];
      }
    });

    // --- TAHAP 5 & 6: DISTRIBUSI NON-CORE & LONGSHIFT SESUAI ATURAN MODE 1 / MODE 2 ---
    let nonCoreNames = [];
    if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
      nonCoreNames = config.nonCoreData.map(nc => typeof nc === 'object' ? nc.name : nc).filter(n => n && n.trim() !== '');
    } else if (Array.isArray(config.nonCoreNames)) {
      nonCoreNames = config.nonCoreNames.filter(n => n && n.trim() !== '');
    }
    const nonCorePool = [...nonCoreNames];

    const lsCount = parseInt(config.longshift || 0, 10);
    const lsPool = Array.from({ length: lsCount }, () => "(LS)");

    // Aturan Khusus CQI 24: Jika ada tambahan Pouch, wajib diberi 1 Non-Core / (LS)
    if (slot24 && slot24.pouchAddedToWw) {
      if (nonCorePool.length > 0) {
        slot24.nonCore.push(nonCorePool.shift());
      } else if (lsPool.length > 0) {
        slot24.longshift.push(lsPool.shift());
      }
    }

    // Hitung kebutuhan Non-Core berdasarkan beban mesin per slot sesuai Mode 1 / Mode 2:
    // Mode 1: <=4 mesin (0 NC), 5-6 mesin (1 NC), 7-8 mesin (2 NC). Maks 2 NC.
    // Mode 2: <=4 mesin (0 NC), 5-6 mesin (1 NC). Maks 1 NC.
    activeSlots.forEach(slot => {
      const count = slot.machines.length;
      let neededNc = 0;

      if (mode === 1) {
        if (count > 6) neededNc = 2;
        else if (count > 4) neededNc = 1;
      } else {
        // Mode 2
        if (count > 4) neededNc = 1;
      }

      // Alokasikan Non-Core sesuai kebutuhan beban
      while ((slot.nonCore.length + slot.longshift.length) < neededNc && (slot.nonCore.length + slot.longshift.length) < maxNcPerCqi) {
        if (nonCorePool.length > 0) {
          slot.nonCore.push(nonCorePool.shift());
        } else if (lsPool.length > 0) {
          slot.longshift.push(lsPool.shift());
        } else {
          break;
        }
      }
    });

    // Jika masih ada sisa Non-Core / LS, distribusikan ke slot yang beban mesinnya terbesar (selama belum mencapai maxNcPerCqi)
    while (nonCorePool.length > 0) {
      const eligibleSlots = activeSlots.filter(s => (s.nonCore.length + s.longshift.length) < maxNcPerCqi);
      if (eligibleSlots.length === 0) break;

      eligibleSlots.sort((a, b) => {
        const loadA = a.machines.length / (a.core + a.nonCore.length + a.longshift.length + 0.1);
        const loadB = b.machines.length / (b.core + b.nonCore.length + b.longshift.length + 0.1);
        return loadB - loadA;
      });

      eligibleSlots[0].nonCore.push(nonCorePool.shift());
    }

    while (lsPool.length > 0) {
      const eligibleSlots = activeSlots.filter(s => (s.nonCore.length + s.longshift.length) < maxNcPerCqi);
      if (eligibleSlots.length === 0) break;

      eligibleSlots.sort((a, b) => {
        const loadA = a.machines.length / (a.core + a.nonCore.length + a.longshift.length + 0.1);
        const loadB = b.machines.length / (b.core + b.nonCore.length + b.longshift.length + 0.1);
        return loadB - loadA;
      });

      eligibleSlots[0].longshift.push(lsPool.shift());
    }

    // Urutkan slot berdasarkan nomor CQI
    activeSlots.sort((a, b) => {
      const numA = parseInt(a.cqiNum, 10) || 999;
      const numB = parseInt(b.cqiNum, 10) || 999;
      return numA - numB;
    });

    return activeSlots;
  },

  /**
   * Helper mencari slot CQI terdekat untuk fallback
   * @param {Object} machine - Objek mesin
   * @param {Array} slots - Daftar slot CQI
   * @returns {Object|null}
   */
  findNearestSlot(machine, slots) {
    if (!slots || slots.length === 0) return null;
    let nearest = null;
    let minDist = Infinity;
    slots.forEach(s => {
      const d = this.calculateDistance(machine, s.cqi);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });
    return nearest;
  },


  // ==========================================================================
  // 3. MODUL VALIDATOR SISTEM & ATURAN
  // ==========================================================================

  /**
   * Validasi hasil perencanaan terhadap batasan operasional pabrik, mode alokasi, dan mixing cluster
   * @param {Array} slots - Slot hasil generatePlan
   * @param {Array} machines - Daftar mesin running input
   * @param {number} mode - Mode perencanaan (1 atau 2)
   * @returns {Object} { valid: boolean, violations: string[], info: string[] }
   */
  validate(slots, machines = [], mode = 1) {
    const violations = [];
    const info = [];

    if (!Array.isArray(slots) || slots.length === 0) {
      violations.push("Tidak ada slot perencanaan yang tergenerasi.");
      return { valid: false, violations, info };
    }

    const maxNcPerCqi = mode === 2 ? 1 : 2;
    info.push(`INFO: Beroperasi pada MODE ${mode} (Maks ${maxNcPerCqi} Non-Core/LS per CQI).`);

    // 1. Verifikasi kelengkapan alokasi mesin
    const assignedMachineIds = new Set();
    slots.forEach(s => s.machines.forEach(m => assignedMachineIds.add(m.id || m.name)));

    const unassigned = machines.filter(m => !assignedMachineIds.has(m.id || m.name));
    if (unassigned.length > 0) {
      violations.push(`${unassigned.length} Mesin Running belum teralokasi: ${this.formatMachineList(unassigned)}.`);
    } else {
      info.push(`SUCCESS: 100% Mesin Running (${assignedMachineIds.size} Mesin) berhasil tercover.`);
    }

    // 2. Verifikasi aturan cluster mixing di setiap CQI
    slots.forEach(s => {
      const cqiNum = this.getCqiNumber(s.cqi);
      const clusters = new Set();
      s.machines.forEach(m => clusters.add(this.getMachineClusterGroup(m)));
      const clusterArr = Array.from(clusters);

      if (s.machines.length > 1) {
        for (let i = 0; i < s.machines.length; i++) {
          for (let j = i + 1; j < s.machines.length; j++) {
            const mA = s.machines[i];
            const mB = s.machines[j];
            const clusterA = this.getMachineClusterGroup(mA);
            const clusterB = this.getMachineClusterGroup(mB);
            if (!this.isClusterMixingAllowed(clusterA, clusterB, cqiNum, mA, mB)) {
              violations.push(`CQI ${cqiNum} melanggar aturan mixing cluster: mencampur [${clusterA} - ${mA.name || mA.id}] dengan [${clusterB} - ${mB.name || mB.id}].`);
            }
          }
        }
      }
    });

    // 3. Verifikasi rasio Manpower vs Beban Mesin sesuai Mode 1 / Mode 2
    slots.forEach(s => {
      const cqiNum = this.getCqiNumber(s.cqi);
      const mCount = s.machines.length;
      const totalNc = s.nonCore.length + s.longshift.length;

      if (mode === 1) {
        if (totalNc === 0 && mCount > 4) {
          violations.push(`CQI ${cqiNum} memuat ${mCount} mesin dengan 0 Non-Core (Maksimal 4 mesin untuk 1 Core).`);
        } else if (totalNc === 1 && mCount > 6) {
          violations.push(`CQI ${cqiNum} memuat ${mCount} mesin dengan 1 Non-Core (Maksimal 6 mesin untuk 1 Core + 1 Non-Core).`);
        } else if (totalNc >= 2 && mCount > 8) {
          violations.push(`CQI ${cqiNum} memuat ${mCount} mesin (Maksimal 8 mesin untuk 1 Core + 2 Non-Core).`);
        }
        if (totalNc > 2) {
          violations.push(`CQI ${cqiNum} melebihi batas maksimal 2 Non-Core/LS di Mode 1.`);
        }
      } else {
        // Mode 2
        if (totalNc === 0 && mCount > 4) {
          violations.push(`CQI ${cqiNum} memuat ${mCount} mesin dengan 0 Non-Core (Maksimal 4 mesin untuk 1 Core di Mode 2).`);
        } else if (totalNc === 1 && mCount > 6) {
          violations.push(`CQI ${cqiNum} memuat ${mCount} mesin dengan 1 Non-Core (Maksimal 6 mesin untuk 1 Core + 1 Non-Core di Mode 2).`);
        }
        if (totalNc > 1) {
          violations.push(`CQI ${cqiNum} melebihi batas maksimal 1 Non-Core/LS di Mode 2.`);
        }
      }
    });

    // 4. Verifikasi aturan khusus WW & CQI 24
    const slot24 = slots.find(s => this.getCqiNumber(s.cqi) === '24');
    if (slot24) {
      const nonWwIn24 = slot24.machines.filter(m => !this.isWwMachine(m));
      if (nonWwIn24.length > 0) {
        const nonPouch = nonWwIn24.filter(m => !this.isPouchMachine(m));
        if (nonPouch.length > 0) {
          violations.push(`CQI 24 memuat mesin non-WW / non-Pouch: ${this.formatMachineList(nonPouch)} (Hanya diizinkan WW & maks 4 Pouch).`);
        } else if (nonWwIn24.length > 4) {
          violations.push(`CQI 24 memuat lebih dari 4 mesin Pouch (${nonWwIn24.length} mesin).`);
        } else {
          const totalManpower = slot24.core + slot24.nonCore.length + slot24.longshift.length;
          if (totalManpower < 2) {
            violations.push(`CQI 24 mendapat tambahan mesin Pouch tetapi belum memiliki minimal 1 Non-Core / (LS).`);
          } else {
            info.push(`INFO: CQI 24 mengcover ${slot24.machines.length} Mesin (WW + ${nonWwIn24.length} Pouch) dengan dukungan Non-Core/(LS).`);
          }
        }
      }
    }

    // 5. Verifikasi aturan khusus OT & CQI 19 (strictly OT saja, maksimal 2 mesin)
    const slot19 = slots.find(s => this.getCqiNumber(s.cqi) === '19');
    if (slot19) {
      const nonOtIn19 = slot19.machines.filter(m => !this.isOtMachine(m));
      if (nonOtIn19.length > 0) {
        violations.push(`CQI 19 memuat mesin selain OT: ${this.formatMachineList(nonOtIn19)} (CQI 19 strictly OT saja).`);
      } else if (slot19.machines.length > 2) {
        violations.push(`CQI 19 melebihi batas maksimal 2 mesin OT (terisi ${slot19.machines.length} mesin).`);
      } else {
        info.push(`INFO: CQI 19 strictly mengcover ${slot19.machines.length} Mesin OT (Maksimal 2 Mesin).`);
      }
    }

    // 6. Verifikasi ketersediaan Manpower Core
    const emptyCoreSlots = slots.filter(s => s.machines.length > 0 && s.core === 0);
    if (emptyCoreSlots.length > 0) {
      violations.push(`${emptyCoreSlots.length} CQI aktif tidak memiliki Manpower Core.`);
    }

    return { valid: violations.length === 0, violations, info };
  },


  // ==========================================================================
  // 4. MODUL FORMATTER & EXPORTER
  // ==========================================================================

  /**
   * Menyusun Teks Output Final untuk dibagikan via WhatsApp / Clipboard
   * @param {Array} slots - Slot hasil alokasi
   * @param {Object} config - Konfigurasi tambahan (qcPassed, milStd, standbyOt, supportFg, mode)
   * @returns {string} String teks berformat rapi
   */
  formatText(slots, config = {}) {
    if (!Array.isArray(slots) || slots.length === 0) return '';

    let out = `*PLANNING SHIFT LIQUID 3*\n`;
    out += `Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    out += `Mode   : Mode ${config.mode || 1} (${config.mode === 2 ? 'Mesin Sedikit / Manpower Minim' : 'Mesin Banyak / Manpower Cukup'})\n\n`;

    // Kumpulkan seluruh mesin running yang ada di semua slot untuk referensi total per WS
    const allRunningInSlots = [];
    slots.forEach(s => {
      if (Array.isArray(s.machines)) {
        allRunningInSlots.push(...s.machines);
      }
    });

    // A. Daftar CQI & Alokasi Mesin
    slots.forEach((s, i) => {
      if (s.machines.length === 0) return;
      const cqiName = s.cqi.name || `CQI-${i+1}`;
      const coreStr = s.coreNames.length > 0 ? s.coreNames.join(', ') : `${s.core} Core`;
      
      let combinedNcAndLs = [];
      if (s.nonCore && s.nonCore.length > 0) combinedNcAndLs.push(...s.nonCore);
      if (s.longshift && s.longshift.length > 0) combinedNcAndLs.push(...s.longshift);
      
      const nonCoreStr = combinedNcAndLs.length > 0 ? combinedNcAndLs.join(', ') : '-';
      const macList = this.formatMachineList(s.machines, allRunningInSlots);

      out += `${i+1}. *${cqiName}*\n`;
      out += `   - Core     : ${coreStr}\n`;
      out += `   - Non-Core : ${nonCoreStr}\n`;
      out += `   - Mesin    : ${macList}\n\n`;
    });

    // B. Bagian Tugas Khusus & QC Passed
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
  },


  // ==========================================================================
  // 5. MODUL PERSISTENSI & LOG HISTORY
  // ==========================================================================

  /**
   * Mencatat log riwayat alokasi ke local storage
   * @param {string} machineId - ID Mesin
   * @param {string} cqiId - ID CQI
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
  }

};

// Dukungan Export CommonJS / Module Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrainAI;
}
