export default {
  // ==========================================================================
  // 1. MODUL UTILITY & NORMALISASI DATA
  // ==========================================================================

  /**
   * Mensejajarkan format string nama mesin, CQI, atau personel untuk mencegah mismatch
   * @param {string} name - Nama input mentah
   * @returns {string} String yang sudah dibersihkan (Uppercase, tanpa spasi/simbol)
   */
  normalizeName(name) {
    if (!name) return "";
    return String(name)
      .trim()
      .toUpperCase()
      .replace(/[\s\-_]+/g, "");
  },

  /**
   * Peta Prioritas CQI ke Workstation (CQI Priority Map)
   * Menyediakan rekomendasi workstation prioritas untuk meminimalkan cross-line walking
   */
  CQI_PRIORITY_MAP: {
    "cqi 1": ["0A", "1A", "2A", "1B"],
    "cqi 2": ["2A", "1A", "3A", "0A"],
    "cqi 3": ["3A", "4A", "2A", "5A"],
    "cqi 4": ["4A", "3A", "5A"],
    "cqi 5": ["5A", "6A", "4A"],
    "cqi 6": ["6A", "5A", "7A"],
    "cqi 7": ["7A", "8A", "6A"],
    "cqi 8": ["8A", "7A", "9A"],
    "cqi 9": ["9A", "10A", "8A"],
    "cqi 10": ["10A", "9A", "9B", "1C", "2C"],
    "cqi 11": ["1B", "2B", "3B", "1A"],
    "cqi 12": [],
    "cqi 13": ["3B", "2B", "1B", "3A", "2A"],
    "cqi 14": ["5B", "7B", "4B", "0B", "10B", "9B"],
    "cqi 15": ["5B", "7B", "9B", "6B", "10B", "11B"],
    "cqi 16": [],
    "cqi 17": ["3C","9B", "10B", "11B", "1C", "2C"],
    "cqi 18": ["6C", "5C", "4C", "3C", "2C", "1C", "7C"],
    "cqi 19": ["OT"],
    "cqi 20": ["10C", "9C", "8C", "7C", "6C", "5C"],
    "cqi 21": [],
    "cqi 22": [],
    "cqi 23": [],
    "cqi 24": ["WW", "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C"],
    "cqi 25": ["7B", "8B", "9B", "6B", "10B", "8A"],
  },

  /**
   * Mengambil nama line utama (LINE A, LINE B, LINE C, OT, WW) dari sebuah CQI berdasarkan CQI_PRIORITY_MAP
   * @param {Object|string} cqi - Objek CQI atau ID
   * @returns {string} 'LINE A', 'LINE B', 'LINE C', 'OT', 'WW', atau 'OTHER'
   */
  getCqiPrimaryLine(cqi) {
    if (!cqi) return "OTHER";
    const cqiNum = this.getCqiNumber(cqi);
    if (cqiNum === "19") return "OT";
    if (cqiNum === "24") return "WW";
    const prioKey = "cqi " + cqiNum;
    const wsList = this.CQI_PRIORITY_MAP[prioKey] || [];
    if (wsList.length > 0) {
      const firstWs = String(wsList[0]).toUpperCase();
      if (firstWs.endsWith("A")) return "LINE A";
      if (firstWs.endsWith("B")) return "LINE B";
      if (firstWs.endsWith("C")) return "LINE C";
    }
    const num = parseInt(cqiNum, 10);
    if (num >= 1 && num <= 10) return "LINE A";
    if (
      (num >= 11 && num <= 16) ||
      num === 21 ||
      num === 22 ||
      num === 23 ||
      num === 25
    )
      return "LINE B";
    if (num === 17 || num === 18 || num === 20) return "LINE C";
    return "OTHER";
  },

  /**
   * Menghitung nilai skor bonus kesesuaian prioritas workstation & mesin untuk CQI tertentu
   * @param {Object} m - Objek Mesin
   * @param {Object|string} cqi - Objek CQI atau nomor CQI
   * @param {Array} labels - Label map
   * @returns {number} Nilai bonus prioritas
   */
  getCqiPriorityBonus(m, cqi, labels = []) {
    if (!m || !cqi) return 0;
    const cqiNum = this.getCqiNumber(cqi);
    const key = `cqi ${cqiNum}`;
    const wsList = this.CQI_PRIORITY_MAP[key] || [];

    const mWs = this.getWorkstationKey(m, labels).toUpperCase();
    const mName = this.normalizeName(m.name || m.id);

    let bonus = 0;

    // 1. Cek di CQI_PRIORITY_MAP
    if (wsList.length > 0) {
      const idx = wsList.findIndex((ws) => ws.toUpperCase() === mWs);
      if (idx === 0) {
        bonus += 120;
      } else if (idx === 1) {
        bonus += 75;
      } else if (idx > 1) {
        bonus += 35;
      }
    }

    // 2. Cek di cqi.priority array dari map.json jika ada
    if (typeof cqi === "object" && Array.isArray(cqi.priority)) {
      const prioList = cqi.priority.map((p) => this.normalizeName(p));
      if (
        prioList.includes(mName) ||
        prioList.includes(this.normalizeName(mWs))
      ) {
        bonus += 30;
      }
    }

    return bonus;
  },

  /**
   * Mengambil angka identifikasi dari CQI (misal: "CQI-24", "CQI 24", "24" -> "24")
   * @param {Object|string} cqi - Objek CQI atau string nama/id
   * @returns {string} Angka ID CQI
   */
  getCqiNumber(cqi) {
    if (!cqi) return "";
    const str =
      typeof cqi === "object" ? cqi.name || cqi.id || "" : String(cqi);
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
    if (!m) return "LAINNYA";
    if (this.isWwMachine(m)) return "WW";
    if (this.isOtMachine(m)) return "OT";

    const cluster = String(m.cluster || "")
      .toUpperCase()
      .trim();
    const ws = String(m.workstation || m.ws || "")
      .toUpperCase()
      .trim();
    const name = String(m.name || m.id || "")
      .toUpperCase()
      .trim();

    if (cluster.includes("SOSOFT")) return "SOSOFT";
    if (cluster.includes("SKLSCT") || cluster.includes("SKL")) return "SKLSCT";
    if (
      cluster.includes("12LJUMBO") ||
      cluster.includes("JUMBO") ||
      cluster.includes("12L")
    )
      return "12LJUMBO";
    if (cluster.includes("POUCH") || name.startsWith("APK")) return "POUCH";
    if (
      cluster.includes("BOTOL") ||
      name.startsWith("BTL") ||
      ws.includes("BTL")
    )
      return "BOTOL";

    return cluster || "LAINNYA";
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
  isClusterMixingAllowed(
    clusterA,
    clusterB,
    cqiNumber = "",
    machineA = null,
    machineB = null,
  ) {
    if (!clusterA || !clusterB || clusterA === clusterB) return true;

    const group1 = ["SOSOFT", "SKLSCT", "12LJUMBO"];
    const group2 = ["POUCH", "BOTOL"];

    // Aturan 1: sosoft, sklsct, 12ljumbo boleh dicampur
    if (group1.includes(clusterA) && group1.includes(clusterB)) {
      return true;
    }

    // Aturan 2: pouch, botol boleh dicampur
    if (group2.includes(clusterA) && group2.includes(clusterB)) {
      return true;
    }

    // Aturan 3: CQI 10 khusus boleh mencampur (sklsct, pouch line C dan 8B)
    if (String(cqiNumber) === "10") {
      const isSklAndPouch =
        (clusterA === "SKLSCT" && clusterB === "POUCH") ||
        (clusterA === "POUCH" && clusterB === "SKLSCT");
      if (isSklAndPouch) {
        if (machineA && machineB) {
          const pouchM = clusterA === "POUCH" ? machineA : machineB;
          return this.isPouchLineCAnd8B(pouchM);
        }
        return true;
      }
    }

    // Aturan 4: CQI 24 khusus boleh mencampur (WW, pouch)
    if (String(cqiNumber) === "24") {
      const allowedPair = ["WW", "POUCH"];
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
    const line = String(m.line || "").toUpperCase();
    const ws = String(m.workstation || m.ws || "").toUpperCase();
    return (
      line.includes("LINE C") ||
      line === "C" ||
      ws.includes("C") ||
      ws === "8B" ||
      ws.includes("8B")
    );
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
    if (isOt && cqiNum !== "19") return false;
    if (!isOt && cqiNum === "19") return false;
    if (cqiNum === "19") {
      const line = String(m.line || "").toUpperCase();
      const ws = String(m.workstation || m.ws || "").toUpperCase();
      if (
        line.includes("LINE A") ||
        line.includes("LINE B") ||
        line.includes("LINE C") ||
        line.includes("WW") ||
        ws.endsWith("A") ||
        ws.endsWith("B") ||
        ws.endsWith("C") ||
        ws === "WW"
      ) {
        return false;
      }
      return isOt;
    }

    // CQI 24: Khusus WW & Mesin APK Line C
    // ATURAN MUTLAK: Mesin Line A dan Line B TIDAK BOLEH masuk ke CQI 24, hanya mesin APK Line C saja yang diperbolehkan.
    const isWw = this.isWwMachine(m);
    if (isWw && cqiNum !== "24") return false;
    if (cqiNum === "24") {
      if (isWw) return true;
      const isLineC = this.isMachineLineC(m);
      const isApk =
        this.isPouchMachine(m) ||
        String(m.name || m.id || "")
          .toUpperCase()
          .startsWith("APK");
      const line = String(m.line || "").toUpperCase();
      const ws = String(m.workstation || m.ws || "").toUpperCase();
      const isLineAOrB =
        line.includes("LINE A") ||
        line.includes("LINE B") ||
        line === "A" ||
        line === "B" ||
        ws.endsWith("A") ||
        ws.endsWith("B");

      if (isLineAOrB || !isLineC || !isApk) {
        return false;
      }
    }

    if (!slot.machines || slot.machines.length === 0) return true;
    const mCluster = this.getMachineClusterGroup(m);

    for (const existingMachine of slot.machines) {
      const existCluster = this.getMachineClusterGroup(existingMachine);
      if (
        !this.isClusterMixingAllowed(
          mCluster,
          existCluster,
          cqiNum,
          m,
          existingMachine,
        )
      ) {
        return false;
      }
    }

    // Periksa apakah penambahan mesin melebihi kapasitas absolut dari cluster terkait
    const testMachines = [...slot.machines, m];
    const rule = this.getClusterCapacityRule(testMachines);
    if (testMachines.length > rule.absoluteMax) {
      return false;
    }

    return true;
  },

  /**
   * Mengembalikan aturan kapasitas mesin & kebutuhan manpower (Core, Non-Core)
   * berdasarkan cluster mesin yang dialokasikan di CQI:
   * 1. pouch + botol:
   *    - 1 Core = 5 mesin
   *    - 1 Core + 1 Non-Core = 6-8 mesin
   *    - 1 Core + 2 Non-Core = 8-10 mesin (maks 10)
   * 2. sosoft (murni):
   *    - 1 Core = 4 mesin
   *    - 1 Core + 1 Non-Core = 6-7 mesin
   *    - 1 Core + 2 Non-Core = 8-10 mesin (maks 10)
   * 3. sosoft + SKLsct:
   *    - 1 Core = 4 mesin
   *    - 1 Core + 1 Non-Core = 6 mesin
   *    - 1 Core + 2 Non-Core = 8 mesin (maks 8)
   * 4. sosoft + 12Ljumbo:
   *    - 1 Core = 4 mesin
   *    - 1 Core + 1 Non-Core = 6 mesin
   *    - 1 Core + 2 Non-Core = 8 mesin (maks 8)
   *
   * @param {Object|Array} slotOrMachines - Slot CQI atau Array Mesin
   * @returns {Object} Objek aturan kapasitas cluster
   */
  getClusterCapacityRule(slotOrMachines) {
    const machines = Array.isArray(slotOrMachines)
      ? slotOrMachines
      : (slotOrMachines && slotOrMachines.machines) || [];

    if (machines.length === 0) {
      return {
        type: "default",
        name: "Default",
        maxCoreOnly: 4,
        max1Nc: 6,
        max2Nc: 8,
        absoluteMax: 8,
        getNeededNc: (count, mode = 1) => {
          if (mode === 2) return count > 4 ? 1 : 0;
          if (count > 6) return 2;
          if (count > 4) return 1;
          return 0;
        },
        getMaxAllowed: (ncCount, mode = 1) => {
          if (ncCount >= 2 && mode === 1) return 8;
          if (ncCount >= 1) return 6;
          return 4;
        },
      };
    }

    const clusters = new Set();
    machines.forEach((m) => clusters.add(this.getMachineClusterGroup(m)));

    const hasSosoft = clusters.has("SOSOFT");
    const hasSklsct = clusters.has("SKLSCT");
    const has12L = clusters.has("12LJUMBO");
    const hasPouch = clusters.has("POUCH");
    const hasBotol = clusters.has("BOTOL");
    const hasWw = clusters.has("WW");
    const hasOt = clusters.has("OT");

    // Khusus Mesin OT (M2 & M3) -> Strictly 2 mesin
    if (hasOt) {
      return {
        type: "ot",
        name: "OT",
        maxCoreOnly: 2,
        max1Nc: 2,
        max2Nc: 2,
        absoluteMax: 2,
        getNeededNc: () => 0,
        getMaxAllowed: () => 2,
      };
    }

    // Khusus Mesin WW (CQI 24)
    if (hasWw) {
      return {
        type: "ww",
        name: "WW + APK Line C",
        maxCoreOnly: 4,
        max1Nc: 8,
        max2Nc: 8,
        absoluteMax: 8,
        getNeededNc: (count) => (count > 4 ? 1 : 0),
        getMaxAllowed: (ncCount) => (ncCount >= 1 ? 8 : 4),
      };
    }

    // 3. Cluster sosoft + SKLsct
    if (
      (hasSosoft && hasSklsct) ||
      (!hasSosoft && hasSklsct && !hasPouch && !hasBotol)
    ) {
      return {
        type: "sosoft_sklsct",
        name: "sosoft + SKLsct",
        maxCoreOnly: 4,
        max1Nc: 6,
        max2Nc: 8,
        absoluteMax: 8,
        getNeededNc: (count, mode = 1) => {
          if (mode === 2) return count > 4 ? 1 : 0;
          if (count > 6) return 2;
          if (count > 4) return 1;
          return 0;
        },
        getMaxAllowed: (ncCount, mode = 1) => {
          if (ncCount >= 2 && mode === 1) return 8;
          if (ncCount >= 1) return 6;
          return 4;
        },
      };
    }

    // 4. Cluster sosoft + 12Ljumbo
    if (
      (hasSosoft && has12L) ||
      (!hasSosoft && has12L && !hasPouch && !hasBotol)
    ) {
      return {
        type: "sosoft_12ljumbo",
        name: "sosoft + 12Ljumbo",
        maxCoreOnly: 4,
        max1Nc: 6,
        max2Nc: 8,
        absoluteMax: 8,
        getNeededNc: (count, mode = 1) => {
          if (mode === 2) return count > 4 ? 1 : 0;
          if (count > 6) return 2;
          if (count > 4) return 1;
          return 0;
        },
        getMaxAllowed: (ncCount, mode = 1) => {
          if (ncCount >= 2 && mode === 1) return 8;
          if (ncCount >= 1) return 6;
          return 4;
        },
      };
    }

    // 2. Cluster sosoft (murni)
    if (hasSosoft && !hasSklsct && !has12L && !hasPouch && !hasBotol) {
      return {
        type: "sosoft",
        name: "sosoft",
        maxCoreOnly: 4,
        max1Nc: 7,
        max2Nc: 10,
        absoluteMax: 10,
        getNeededNc: (count, mode = 1) => {
          if (mode === 2) return count > 4 ? 1 : 0;
          if (count > 7) return 2;
          if (count > 4) return 1;
          return 0;
        },
        getMaxAllowed: (ncCount, mode = 1) => {
          if (ncCount >= 2 && mode === 1) return 10;
          if (ncCount >= 1) return 7;
          return 4;
        },
      };
    }

    // 1. Cluster pouch + botol (atau pouch murni / botol murni)
    if ((hasPouch || hasBotol) && !hasSosoft && !hasSklsct && !has12L) {
      return {
        type: "pouch_botol",
        name: "pouch + botol",
        maxCoreOnly: 5,
        max1Nc: 8,
        max2Nc: 10,
        absoluteMax: 10,
        getNeededNc: (count, mode = 1) => {
          if (mode === 2) return count > 5 ? 1 : 0;
          if (count > 8) return 2;
          if (count > 5) return 1;
          return 0;
        },
        getMaxAllowed: (ncCount, mode = 1) => {
          if (ncCount >= 2 && mode === 1) return 10;
          if (ncCount >= 1) return 8;
          return 5;
        },
      };
    }

    // Default Fallback
    return {
      type: "default",
      name: "Default",
      maxCoreOnly: 4,
      max1Nc: 6,
      max2Nc: 8,
      absoluteMax: 8,
      getNeededNc: (count, mode = 1) => {
        if (mode === 2) return count > 4 ? 1 : 0;
        if (count > 6) return 2;
        if (count > 4) return 1;
        return 0;
      },
      getMaxAllowed: (ncCount, mode = 1) => {
        if (ncCount >= 2 && mode === 1) return 8;
        if (ncCount >= 1) return 6;
        return 4;
      },
    };
  },

  /**
   * Menghitung batas maksimal mesin yang BISA ditambahkan ke CQI secara aman,
   * mempertimbangkan ketersediaan sisa manpower Non-Core / Longshift.
   * @param {Object} slot - Slot CQI
   * @param {number} mode - Mode Beban (1 atau 2)
   * @param {number} totalNcPool - Total ketersediaan Non-Core + Longshift (angka)
   * @param {Array} allSlots - Seluruh slot aktif
   * @returns {number} Limit dinamis mesin (misal: 4, 6, 8, atau 10)
   */
  getDynamicSlotLimit(slot, mode, totalNcPool, allSlots) {
    const rule = this.getClusterCapacityRule(slot);
    // CQI Khusus punya aturan fix
    if (slot.cqiNum === "19") return 2;
    if (slot.cqiNum === "24") return 8; // WW sudah diamankan di force expansion

    const currentCount = slot.machines.length;
    let limit = rule.maxCoreOnly;

    // Hitung berapa NC yang sudah terpakai/direserve oleh SEMUA slot sejauh ini
    let globalNeeded = 0;
    allSlots.forEach((s) => {
      if (s.cqiNum === "19") return;
      if (s.cqiNum === "24") {
        globalNeeded += s.machines.length > 4 ? 1 : 0;
        return;
      }
      globalNeeded += this.getClusterCapacityRule(s).getNeededNc(s.machines.length, mode);
    });

    const availableNc = totalNcPool - globalNeeded;

    // Jika belum butuh extra NC (atau mau nambah di batas 1 Core), aman
    if (availableNc <= 0) return Math.max(currentCount, limit);

    // Hitung kebutuhan NC saat ini vs untuk batas berikutnya
    const currentSlotNeeded = rule.getNeededNc(currentCount, mode);
    const neededForMax1 = rule.getNeededNc(rule.max1Nc, mode) - currentSlotNeeded;
    
    if (neededForMax1 > 0 && availableNc >= neededForMax1) {
      limit = rule.max1Nc;
      
      const neededForMax2 = rule.getNeededNc(rule.max2Nc, mode) - currentSlotNeeded - neededForMax1;
      if (neededForMax2 > 0 && (availableNc - neededForMax1) >= neededForMax2) {
        limit = rule.max2Nc;
      }
    }
    
    return Math.max(currentCount, limit);
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Wet Wipes (WW)
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isWwMachine(m) {
    if (!m) return false;
    const line = String(m.line || "").toUpperCase();
    const ws = String(m.workstation || m.ws || "").toUpperCase();
    const name = String(m.name || m.id || "").toUpperCase();
    const cluster = String(m.cluster || "").toUpperCase();
    return (
      line === "WW" ||
      ws === "WW" ||
      cluster.includes("WW") ||
      /^C\d+/.test(name)
    );
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Oral & Tube / Other (OT - yaitu mesin M2 dan M3)
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isOtMachine(m) {
    if (!m) return false;
    const line = String(m.line || "").toUpperCase();
    const ws = String(m.workstation || m.ws || "").toUpperCase();
    const name = String(m.name || m.id || "").toUpperCase();
    const id = String(m.id || "").toUpperCase();
    const cluster = String(m.cluster || "").toUpperCase();

    // PERBAIKAN: Gunakan exact match (===) atau regex kata utuh (\b)
    // Jangan gunakan .includes('OT') karena akan mendeteksi string 'BOTOL'
    const isClusterOt = cluster === "OT" || /\bOT\b/.test(cluster);

    return (
      name === "M2" ||
      name === "M3" ||
      id === "M2" ||
      id === "M3" ||
      line === "OT" ||
      ws === "OT" ||
      isClusterOt ||
      /^M\d+/.test(name) ||
      /^M\d+/.test(id)
    );
  },

  /**
   * Cek apakah sebuah mesin merupakan kategori Pouch
   * @param {Object} m - Objek Mesin
   * @returns {boolean}
   */
  isPouchMachine(m) {
    if (!m) return false;
    const cluster = String(m.cluster || "").toUpperCase();
    const name = String(m.name || m.id || "").toUpperCase();
    return cluster.includes("POUCH") || name.startsWith("APK");
  },

  /**
   * Cek apakah sebuah mesin berada di Line C
   * @param {Object} m - Objek Mesin
   * @param {Array} labels - Label map (opsional)
   * @returns {boolean}
   */
  isMachineLineC(m, labels = []) {
    if (!m) return false;
    const line = String(m.line || "").toUpperCase();
    const ws = this.getWorkstationKey(m, labels).toUpperCase();
    const col = m.col || (m.position ? m.position.col : 0);
    return (
      line.includes("LINE C") ||
      line === "C" ||
      ws.endsWith("C") ||
      ws.includes("C") ||
      col >= 32
    );
  },

  /**
   * Mengambil identitas workstation secara dinamis dari properti objek mesin, label, atau nama string
   * @param {Object|string} machineInput - Objek mesin atau string nama mesin
   * @param {Array} labels - Daftar label area dari map.json
   * @returns {string} Kode Workstation (misal: '0A', '1A', 'WW', 'OT', dll.)
   */
  getWorkstationKey(machineInput, labels = []) {
    if (typeof machineInput === "object" && machineInput !== null) {
      if (machineInput.workstation) {
        return String(machineInput.workstation).trim().toUpperCase();
      }
      if (machineInput.ws) {
        return String(machineInput.ws).trim().toUpperCase();
      }
      machineInput = machineInput.name || machineInput.id || "";
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
    return match ? match[0] : "LAINNYA";
  },

  /**
   * Menghasilkan titik rute (waypoints) navigasi fisik melewati lorong dan node label depan workstation,
   * sehingga jalur koneksi tidak menerobos atau memotong blok mesin lain secara diagonal.
   * Rute: Mesin -> Node Label WS Depan -> Lorong Transit Sentral -> Kolom CQI -> CQI Target
   * @param {Object} m - Objek Mesin
   * @param {Object} cqi - Objek CQI Target
   * @param {Array} labels - Daftar label workstation dari map.json
   * @returns {Array<{row: number, col: number}>} Array titik koordinat grid
   */
  getAisleWaypoints(m, cqi, labels = []) {
    if (!m || !cqi) return [];
    const mRow = m.row || (m.position ? m.position.row : 0);
    const mCol = m.col || (m.position ? m.position.col : 0);
    const cRow = cqi.row || (cqi.position ? cqi.position.row : 0);
    const cCol = cqi.col || (cqi.position ? cqi.position.col : 0);

    if (mRow === 0 || mCol === 0 || cRow === 0 || cCol === 0) return [];
    if (mRow === cRow && mCol === cCol) return [{ row: mRow, col: mCol }];

    // 1. Kasus Khusus OT (row 3-4, col 33) & CQI 19 (row 3, col 34)
    if ((mCol === 33 || mCol === 32) && mRow <= 5 && cCol >= 32 && cRow <= 5) {
      return [
        { row: mRow, col: mCol },
        { row: cRow, col: mCol },
        { row: cRow, col: cCol },
      ];
    }

    // 2. Kasus Khusus WW (row 8-9, col 33) & CQI 24 (row 8, col 34)
    if (
      (mCol === 33 || mCol === 32) &&
      mRow >= 7 &&
      mRow <= 10 &&
      cCol >= 32 &&
      cRow >= 7 &&
      cRow <= 10
    ) {
      return [
        { row: mRow, col: mCol },
        { row: cRow, col: mCol },
        { row: cRow, col: cCol },
      ];
    }

    // 3. Cari Node Label depan Workstation mesin
    let wsName = m.workstation || m.ws || "";
    let labelObj = null;
    if (Array.isArray(labels) && labels.length > 0) {
      if (wsName) {
        labelObj = labels.find(
          (l) =>
            l.name === wsName ||
            this.normalizeName(l.name) === this.normalizeName(wsName),
        );
      }
      if (!labelObj) {
        const wsKey = this.getWorkstationKey(m, labels);
        if (wsKey && wsKey !== "LAINNYA") {
          labelObj = labels.find(
            (l) =>
              l.name === wsKey ||
              this.normalizeName(l.name) === this.normalizeName(wsKey),
          );
        }
      }
    }

    // Posisi baris & kolom label depan:
    // Line A (mRow <= 9) -> Label di Row 9
    // Line B (mRow >= 11, mCol <= 30) -> Label di Row 11
    // Line C (mCol >= 32) -> Label di Row 13
    let lRow = labelObj ? labelObj.row : mRow <= 9 ? 9 : mCol >= 32 ? 13 : 11;
    let lCol = labelObj ? labelObj.col : mCol;

    // Tentukan baris node label untuk target CQI (cLRow)
    const cqiLine = this.getCqiPrimaryLine(cqi);
    let cLRow = 9;
    if (cqiLine === "LINE B") cLRow = 11;
    else if (cqiLine === "LINE C" || cCol >= 32) cLRow = 13;
    else if (cqiLine === "LINE A") cLRow = 9;
    else {
      cLRow = cRow <= 10 ? 9 : cRow >= 13 ? 13 : 11;
    }

    const waypoints = [];
    function addPt(r, c) {
      if (waypoints.length === 0) {
        waypoints.push({ row: r, col: c });
      } else {
        const last = waypoints[waypoints.length - 1];
        if (last.row !== r || last.col !== c) {
          waypoints.push({ row: r, col: c });
        }
      }
    }

    // Titik Awal: Posisi Mesin
    addPt(mRow, mCol);

    // Langkah 1: Bergerak vertikal keluar dari mesin ke baris label depan mesin
    addPt(lRow, mCol);

    // Langkah 2: Masuk ke titik tengah Label Workstation jika posisi kolomnya berbeda
    if (lCol !== mCol) {
      addPt(lRow, lCol);
    }

    // Langkah 3 & 4: Penentuan rute lorong antarnode (Langsung lewat baris node label, tanpa perlu belok baris 10 dulu)
    const isMachineLineC = mCol >= 32 || lRow === 13;
    const isCqiLineC = cCol >= 32 || cLRow === 13;

    if (isMachineLineC && !isCqiLineC) {
      // Mesin di Line C -> CQI di Line A/B
      addPt(13, 31); // Bergerak di Row 13 ke titik transit Line C (Col 31)
      addPt(cLRow, 31); // Menyeberang ke baris node CQI target (Row 9 atau 11)
      addPt(cLRow, cCol); // Bergerak di baris node CQI ke kolom CQI
    } else if (!isMachineLineC && isCqiLineC) {
      // Mesin di Line A/B -> CQI di Line C
      addPt(lRow, 31); // Bergerak di baris node mesin ke titik transit (Col 31)
      addPt(13, 31); // Menyeberang ke Row 13
      addPt(13, cCol); // Bergerak di Row 13 ke kolom CQI
    } else if (lRow === cLRow) {
      // Sama-sama di Line A (Row 9), Line B (Row 11), atau Line C (Row 13)
      // Bergerak LANGSUNG sepanjang baris node label (Row 9/11/13) dari node mesin ke kolom CQI
      addPt(lRow, cCol);
    } else {
      // Beda Line A <-> Line B (Row 9 <-> Row 11)
      addPt(lRow, cCol); // Bergerak di baris node label mesin ke kolom CQI
      addPt(cLRow, cCol); // Menyeberang vertikal langsung ke baris node CQI
    }

    // Langkah 5: Bergerak vertikal dari baris label CQI menuju ke posisi CQI target
    addPt(cRow, cCol);

    return waypoints;
  },

  /**
   * Menghitung jarak lintasan lorong aktual (Aisle Manhattan Distance) melewati node label & lorong transit.
   * Jarak dihitung berdasarkan panjang langkah riil tanpa menabrak blok mesin lain.
   * @param {Object} m - Objek Mesin
   * @param {Object} cqi - Objek CQI Target
   * @param {Array} labels - Daftar label area dari map.json
   * @returns {number} Jarak langkah lintasan lorong
   */
  calculateDistance(m, cqi, labels = []) {
    const pts = this.getAisleWaypoints(m, cqi, labels);
    if (!pts || pts.length <= 1) {
      const mRow = m.row || (m.position ? m.position.row : 0);
      const mCol = m.col || (m.position ? m.position.col : 0);
      const cRow = cqi.row || (cqi.position ? cqi.position.row : 0);
      const cCol = cqi.col || (cqi.position ? cqi.position.col : 0);
      return Math.abs(mRow - cRow) + Math.abs(mCol - cCol);
    }

    let totalDist = 0;
    for (let i = 1; i < pts.length; i++) {
      totalDist +=
        Math.abs(pts[i].row - pts[i - 1].row) +
        Math.abs(pts[i].col - pts[i - 1].col);
    }
    return totalDist;
  },

  /**
   * Menghitung nilai bonus afinitas riwayat penugasan mesin ke CQI
   * @param {Object} machine - Objek Mesin
   * @param {Object} cqi - Objek CQI
   * @param {Array} historyList - Daftar riwayat penugasan (opsional)
   * @returns {number} Nilai bonus (0 - 30)
   */
  getHistoryBonus(machine, cqi, historyList = null) {
    if (!machine || !cqi) return 0;
    const mName = this.normalizeName(machine.name || machine.id);
    const cqiNum = String(this.getCqiNumber(cqi) || "").trim();
    if (!mName || !cqiNum) return 0;

    // 1. Cek dari in-memory cache lookup jika sudah siap
    if (
      this._historyAffinityMap &&
      this._historyAffinityMap[mName] &&
      this._historyAffinityMap[mName][cqiNum]
    ) {
      const freq = this._historyAffinityMap[mName][cqiNum];
      return Math.min(freq * 10, 30);
    }

    if (!historyList) {
      if (Array.isArray(this._historyRecords) && this._historyRecords.length > 0) {
        historyList = this._historyRecords;
      } else {
        try {
          const raw =
            typeof localStorage !== "undefined"
              ? localStorage.getItem("planning_history")
              : null;
          historyList = raw ? JSON.parse(raw) : [];
        } catch (e) {
          historyList = [];
        }
      }
    }
    if (!Array.isArray(historyList) || historyList.length === 0) return 0;

    let matchCount = 0;
    for (const h of historyList) {
      const hM = this.normalizeName(h.machineId || h.machine || h.name || h.machineName);
      const hCqi = String(this.getCqiNumber(h.cqiId || h.cqi || h.nama || h.cqiName) || "").trim();
      if (
        hM &&
        (hM === mName || mName.includes(hM) || hM.includes(mName)) &&
        hCqi === cqiNum
      ) {
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
    if (!Array.isArray(slotMachines) || slotMachines.length === 0) return "-";

    // Jika daftar seluruh mesin running diberikan, kita bisa menghitung total mesin running per workstation
    // Jika tidak diberikan, kita anggap referensi dari slotMachines
    const allRunning =
      Array.isArray(allRunningMachines) && allRunningMachines.length > 0
        ? allRunningMachines
        : slotMachines;

    // 1. Hitung total mesin running per WS di seluruh pabrik
    const totalRunningPerWs = {};
    allRunning.forEach((m) => {
      const ws = this.getWorkstationKey(m, labels);
      if (ws && ws !== "LAINNYA") {
        totalRunningPerWs[ws] = (totalRunningPerWs[ws] || 0) + 1;
      }
    });

    // 2. Kelompokkan mesin yang ada di slot CQI ini berdasarkan WS
    const slotWsGroups = {};
    slotMachines.forEach((m) => {
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
    slotMachines.forEach((m) => {
      const ws = this.getWorkstationKey(m, labels);
      if (processedWs.has(m.id || m.name)) return;

      const group = slotWsGroups[ws] || [];
      const totalInShift = totalRunningPerWs[ws] || 0;

      // Jika seluruh mesin running di WS tersebut berada di 1 CQI ini dan jumlahnya >= 2 (atau totalInShift == group.length)
      if (
        ws &&
        ws !== "LAINNYA" &&
        group.length >= 2 &&
        group.length === totalInShift
      ) {
        if (!resultParts.includes(`${ws} (${group.length})`)) {
          resultParts.push(`${ws} (${group.length})`);
          group.forEach((gm) => processedWs.add(gm.id || gm.name));
        }
      } else {
        resultParts.push(m.name || m.id);
        processedWs.add(m.id || m.name);
      }
    });

    return resultParts.join(", ");
  },

};
