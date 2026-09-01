var BrainAIGlobal = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/brain/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/brain/utils.js
  var utils_default = {
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
      return String(name).trim().toUpperCase().replace(/[\s\-_]+/g, "");
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
      "cqi 17": ["3C", "9B", "10B", "11B", "1C", "2C"],
      "cqi 18": ["6C", "5C", "4C", "3C", "2C", "1C", "7C"],
      "cqi 19": ["OT"],
      "cqi 20": ["10C", "9C", "8C", "7C", "6C", "5C"],
      "cqi 21": [],
      "cqi 22": [],
      "cqi 23": [],
      "cqi 24": ["WW", "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C"],
      "cqi 25": ["7B", "8B", "9B", "6B", "10B", "8A"]
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
      if (num >= 11 && num <= 16 || num === 21 || num === 22 || num === 23 || num === 25)
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
      if (typeof cqi === "object" && Array.isArray(cqi.priority)) {
        const prioList = cqi.priority.map((p) => this.normalizeName(p));
        if (prioList.includes(mName) || prioList.includes(this.normalizeName(mWs))) {
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
      const str = typeof cqi === "object" ? cqi.name || cqi.id || "" : String(cqi);
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
      const cluster = String(m.cluster || "").toUpperCase().trim();
      const ws = String(m.workstation || m.ws || "").toUpperCase().trim();
      const name = String(m.name || m.id || "").toUpperCase().trim();
      if (cluster.includes("SOSOFT")) return "SOSOFT";
      if (cluster.includes("SKLSCT") || cluster.includes("SKL")) return "SKLSCT";
      if (cluster.includes("12LJUMBO") || cluster.includes("JUMBO") || cluster.includes("12L"))
        return "12LJUMBO";
      if (cluster.includes("POUCH") || name.startsWith("APK")) return "POUCH";
      if (cluster.includes("BOTOL") || name.startsWith("BTL") || ws.includes("BTL"))
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
    isClusterMixingAllowed(clusterA, clusterB, cqiNumber = "", machineA = null, machineB = null) {
      if (!clusterA || !clusterB || clusterA === clusterB) return true;
      const group1 = ["SOSOFT", "SKLSCT", "12LJUMBO"];
      const group2 = ["POUCH", "BOTOL"];
      if (group1.includes(clusterA) && group1.includes(clusterB)) {
        return true;
      }
      if (group2.includes(clusterA) && group2.includes(clusterB)) {
        return true;
      }
      if (String(cqiNumber) === "10") {
        const isSklAndPouch = clusterA === "SKLSCT" && clusterB === "POUCH" || clusterA === "POUCH" && clusterB === "SKLSCT";
        if (isSklAndPouch) {
          if (machineA && machineB) {
            const pouchM = clusterA === "POUCH" ? machineA : machineB;
            return this.isPouchLineCAnd8B(pouchM);
          }
          return true;
        }
      }
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
      return line.includes("LINE C") || line === "C" || ws.includes("C") || ws === "8B" || ws.includes("8B");
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
      if (isOt && cqiNum !== "19") return false;
      if (!isOt && cqiNum === "19") return false;
      if (cqiNum === "19") {
        const line = String(m.line || "").toUpperCase();
        const ws = String(m.workstation || m.ws || "").toUpperCase();
        if (line.includes("LINE A") || line.includes("LINE B") || line.includes("LINE C") || line.includes("WW") || ws.endsWith("A") || ws.endsWith("B") || ws.endsWith("C") || ws === "WW") {
          return false;
        }
        return isOt;
      }
      const isWw = this.isWwMachine(m);
      if (isWw && cqiNum !== "24") return false;
      if (cqiNum === "24") {
        if (isWw) return true;
        const isLineC = this.isMachineLineC(m);
        const isApk = this.isPouchMachine(m) || String(m.name || m.id || "").toUpperCase().startsWith("APK");
        const line = String(m.line || "").toUpperCase();
        const ws = String(m.workstation || m.ws || "").toUpperCase();
        const isLineAOrB = line.includes("LINE A") || line.includes("LINE B") || line === "A" || line === "B" || ws.endsWith("A") || ws.endsWith("B");
        if (isLineAOrB || !isLineC || !isApk) {
          return false;
        }
      }
      if (!slot.machines || slot.machines.length === 0) return true;
      const mCluster = this.getMachineClusterGroup(m);
      for (const existingMachine of slot.machines) {
        const existCluster = this.getMachineClusterGroup(existingMachine);
        if (!this.isClusterMixingAllowed(
          mCluster,
          existCluster,
          cqiNum,
          m,
          existingMachine
        )) {
          return false;
        }
      }
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
      const machines = Array.isArray(slotOrMachines) ? slotOrMachines : slotOrMachines && slotOrMachines.machines || [];
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
          }
        };
      }
      const clusters = /* @__PURE__ */ new Set();
      machines.forEach((m) => clusters.add(this.getMachineClusterGroup(m)));
      const hasSosoft = clusters.has("SOSOFT");
      const hasSklsct = clusters.has("SKLSCT");
      const has12L = clusters.has("12LJUMBO");
      const hasPouch = clusters.has("POUCH");
      const hasBotol = clusters.has("BOTOL");
      const hasWw = clusters.has("WW");
      const hasOt = clusters.has("OT");
      if (hasOt) {
        return {
          type: "ot",
          name: "OT",
          maxCoreOnly: 2,
          max1Nc: 2,
          max2Nc: 2,
          absoluteMax: 2,
          getNeededNc: () => 0,
          getMaxAllowed: () => 2
        };
      }
      if (hasWw) {
        return {
          type: "ww",
          name: "WW + APK Line C",
          maxCoreOnly: 4,
          max1Nc: 8,
          max2Nc: 8,
          absoluteMax: 8,
          getNeededNc: (count) => count > 4 ? 1 : 0,
          getMaxAllowed: (ncCount) => ncCount >= 1 ? 8 : 4
        };
      }
      if (hasSosoft && hasSklsct || !hasSosoft && hasSklsct && !hasPouch && !hasBotol) {
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
          }
        };
      }
      if (hasSosoft && has12L || !hasSosoft && has12L && !hasPouch && !hasBotol) {
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
          }
        };
      }
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
          }
        };
      }
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
          }
        };
      }
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
        }
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
      if (slot.cqiNum === "19") return 2;
      if (slot.cqiNum === "24") return 8;
      const currentCount = slot.machines.length;
      let limit = rule.maxCoreOnly;
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
      if (availableNc <= 0) return Math.max(currentCount, limit);
      const currentSlotNeeded = rule.getNeededNc(currentCount, mode);
      const neededForMax1 = rule.getNeededNc(rule.max1Nc, mode) - currentSlotNeeded;
      if (neededForMax1 > 0 && availableNc >= neededForMax1) {
        limit = rule.max1Nc;
        const neededForMax2 = rule.getNeededNc(rule.max2Nc, mode) - currentSlotNeeded - neededForMax1;
        if (neededForMax2 > 0 && availableNc - neededForMax1 >= neededForMax2) {
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
      return line === "WW" || ws === "WW" || cluster.includes("WW") || /^C\d+/.test(name);
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
      const isClusterOt = cluster === "OT" || /\bOT\b/.test(cluster);
      return name === "M2" || name === "M3" || id === "M2" || id === "M3" || line === "OT" || ws === "OT" || isClusterOt || /^M\d+/.test(name) || /^M\d+/.test(id);
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
      return line.includes("LINE C") || line === "C" || ws.endsWith("C") || ws.includes("C") || col >= 32;
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
      if ((mCol === 33 || mCol === 32) && mRow <= 5 && cCol >= 32 && cRow <= 5) {
        return [
          { row: mRow, col: mCol },
          { row: cRow, col: mCol },
          { row: cRow, col: cCol }
        ];
      }
      if ((mCol === 33 || mCol === 32) && mRow >= 7 && mRow <= 10 && cCol >= 32 && cRow >= 7 && cRow <= 10) {
        return [
          { row: mRow, col: mCol },
          { row: cRow, col: mCol },
          { row: cRow, col: cCol }
        ];
      }
      let wsName = m.workstation || m.ws || "";
      let labelObj = null;
      if (Array.isArray(labels) && labels.length > 0) {
        if (wsName) {
          labelObj = labels.find(
            (l) => l.name === wsName || this.normalizeName(l.name) === this.normalizeName(wsName)
          );
        }
        if (!labelObj) {
          const wsKey = this.getWorkstationKey(m, labels);
          if (wsKey && wsKey !== "LAINNYA") {
            labelObj = labels.find(
              (l) => l.name === wsKey || this.normalizeName(l.name) === this.normalizeName(wsKey)
            );
          }
        }
      }
      let lRow = labelObj ? labelObj.row : mRow <= 9 ? 9 : mCol >= 32 ? 13 : 11;
      let lCol = labelObj ? labelObj.col : mCol;
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
      addPt(mRow, mCol);
      addPt(lRow, mCol);
      if (lCol !== mCol) {
        addPt(lRow, lCol);
      }
      const isMachineLineC = mCol >= 32 || lRow === 13;
      const isCqiLineC = cCol >= 32 || cLRow === 13;
      if (isMachineLineC && !isCqiLineC) {
        addPt(13, 31);
        addPt(cLRow, 31);
        addPt(cLRow, cCol);
      } else if (!isMachineLineC && isCqiLineC) {
        addPt(lRow, 31);
        addPt(13, 31);
        addPt(13, cCol);
      } else if (lRow === cLRow) {
        addPt(lRow, cCol);
      } else {
        addPt(lRow, cCol);
        addPt(cLRow, cCol);
      }
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
        totalDist += Math.abs(pts[i].row - pts[i - 1].row) + Math.abs(pts[i].col - pts[i - 1].col);
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
      if (this._historyAffinityMap && this._historyAffinityMap[mName] && this._historyAffinityMap[mName][cqiNum]) {
        const freq = this._historyAffinityMap[mName][cqiNum];
        return Math.min(freq * 10, 30);
      }
      if (!historyList) {
        if (Array.isArray(this._historyRecords) && this._historyRecords.length > 0) {
          historyList = this._historyRecords;
        } else {
          try {
            const raw = typeof localStorage !== "undefined" ? localStorage.getItem("planning_history") : null;
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
      if (!Array.isArray(slotMachines) || slotMachines.length === 0) return "-";
      const allRunning = Array.isArray(allRunningMachines) && allRunningMachines.length > 0 ? allRunningMachines : slotMachines;
      const totalRunningPerWs = {};
      allRunning.forEach((m) => {
        const ws = this.getWorkstationKey(m, labels);
        if (ws && ws !== "LAINNYA") {
          totalRunningPerWs[ws] = (totalRunningPerWs[ws] || 0) + 1;
        }
      });
      const slotWsGroups = {};
      slotMachines.forEach((m) => {
        const ws = this.getWorkstationKey(m, labels);
        if (!slotWsGroups[ws]) slotWsGroups[ws] = [];
        slotWsGroups[ws].push(m);
      });
      const resultParts = [];
      const processedWs = /* @__PURE__ */ new Set();
      slotMachines.forEach((m) => {
        const ws = this.getWorkstationKey(m, labels);
        if (processedWs.has(m.id || m.name)) return;
        const group = slotWsGroups[ws] || [];
        const totalInShift = totalRunningPerWs[ws] || 0;
        if (ws && ws !== "LAINNYA" && group.length >= 2 && group.length === totalInShift) {
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
    }
  };

  // src/brain/core.js
  var core_default = {
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
     * 4. Mendistribusikan Non-Core secara merata ke CQI yang paling membutuhkan sesuai Aturan Kapasitas Cluster:
     *    * Cluster pouch + botol: 1 Core = 5 mesin, 1 Core + 1 NC = 6-8 mesin, 1 Core + 2 NC = 8-10 mesin
     *    * Cluster sosoft (murni): 1 Core = 4 mesin, 1 Core + 1 NC = 6-7 mesin, 1 Core + 2 NC = 8-10 mesin
     *    * Cluster sosoft + SKLsct: 1 Core = 4 mesin, 1 Core + 1 NC = 6 mesin, 1 Core + 2 NC = 8 mesin
     *    * Cluster sosoft + 12Ljumbo: 1 Core = 4 mesin, 1 Core + 1 NC = 6 mesin, 1 Core + 2 NC = 8 mesin
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
      const maxSlotCapacity = mode === 1 ? 10 : 8;
      const labels = mapData.labels || [];
      let ncCount = 0;
      if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
        ncCount = config.nonCoreData.length;
      } else if (Array.isArray(config.nonCoreNames)) {
        ncCount = config.nonCoreNames.length;
      }
      const lsCount = parseInt(config.longshift || 0, 10);
      const totalNcPool = ncCount + lsCount;
      const runningMachines = [...machines];
      const wwMachines = runningMachines.filter((m) => this.isWwMachine(m));
      const otMachines = runningMachines.filter((m) => this.isOtMachine(m));
      const generalMachines = runningMachines.filter(
        (m) => !this.isWwMachine(m) && !this.isOtMachine(m)
      );
      const readyCQIs = cqis.filter((c) => c.status === "READY");
      const availableCqis = readyCQIs.length > 0 ? readyCQIs : [...cqis];
      let coreList = [];
      if (Array.isArray(config.coreData) && config.coreData.length > 0) {
        coreList = config.coreData.map(
          (c) => typeof c === "object" ? c : { name: c, cqi_priority: "" }
        );
      } else if (Array.isArray(config.coreNames) && config.coreNames.length > 0) {
        coreList = config.coreNames.map((name) => ({ name, cqi_priority: "" }));
      }
      let maxCoreSlots = availableCqis.length;
      if (coreList.length > 0) {
        maxCoreSlots = coreList.length;
      } else if (config.core !== void 0 && config.core !== null) {
        maxCoreSlots = parseInt(config.core, 10);
        if (isNaN(maxCoreSlots)) maxCoreSlots = availableCqis.length;
      }
      const wsBlocks = {};
      generalMachines.forEach((m) => {
        const ws = this.getWorkstationKey(m, labels);
        const clusterGroup = this.getMachineClusterGroup(m);
        const wsClusterKey = `${ws}_${clusterGroup}`;
        if (!wsBlocks[wsClusterKey]) {
          wsBlocks[wsClusterKey] = {
            ws,
            wsClusterKey,
            machines: [],
            cluster: clusterGroup,
            line: ws.endsWith("A") ? "LINE A" : ws.endsWith("B") ? "LINE B" : ws.endsWith("C") ? "LINE C" : "OTHER",
            col: 99,
            row: 99
          };
          const lbl = labels.find(
            (l) => l.name === ws || this.normalizeName(l.name) === this.normalizeName(ws)
          );
          if (lbl) {
            wsBlocks[wsClusterKey].col = lbl.col;
            wsBlocks[wsClusterKey].row = lbl.row;
          } else if (m.position) {
            wsBlocks[wsClusterKey].col = m.position.col || 99;
            wsBlocks[wsClusterKey].row = m.position.row || 99;
          } else if (m.col) {
            wsBlocks[wsClusterKey].col = m.col;
            wsBlocks[wsClusterKey].row = m.row || 99;
          }
        }
        wsBlocks[wsClusterKey].machines.push(m);
      });
      const activeWsKeys = Object.keys(wsBlocks);
      let selectedCQIs = [];
      const cqi19Obj = availableCqis.find((c) => this.getCqiNumber(c) === "19");
      const cqi24Obj = availableCqis.find((c) => this.getCqiNumber(c) === "24");
      if (otMachines.length > 0 && cqi19Obj) {
        selectedCQIs.push(cqi19Obj);
      }
      if (wwMachines.length > 0 && cqi24Obj && !selectedCQIs.includes(cqi24Obj)) {
        selectedCQIs.push(cqi24Obj);
      }
      const lineCMachines = generalMachines.filter((m) => {
        const ws = this.getWorkstationKey(m, labels);
        return ws.endsWith("C") || ws.includes("C");
      });
      const candidateCqis = availableCqis.filter((c) => {
        const num = this.getCqiNumber(c);
        if (selectedCQIs.includes(c)) return false;
        if (num === "19" || num === "24") return false;
        return true;
      });
      if (lineCMachines.length > 0) {
        const lineCCandidates = candidateCqis.filter((c) => {
          const line = this.getCqiPrimaryLine(c);
          const num = this.getCqiNumber(c);
          return line === "LINE C" || num === "18" || num === "20" || num === "17";
        });
        lineCCandidates.sort((a, b) => {
          const numA = this.getCqiNumber(a);
          const numB = this.getCqiNumber(b);
          const prioRank = { 18: 1, 20: 2, 17: 3 };
          const rA = prioRank[numA] || 9;
          const rB = prioRank[numB] || 9;
          return rA - rB;
        });
        const neededLineCSlots = Math.min(
          lineCCandidates.length,
          Math.ceil(lineCMachines.length / (mode === 1 ? 7 : 5))
        );
        let lineCSlotsAdded = 0;
        while (selectedCQIs.length < maxCoreSlots && lineCCandidates.length > 0 && lineCSlotsAdded < neededLineCSlots) {
          const cqiToPick = lineCCandidates.shift();
          selectedCQIs.push(cqiToPick);
          lineCSlotsAdded++;
        }
      }
      const remainingCandidateCqis = candidateCqis.filter(
        (c) => !selectedCQIs.includes(c)
      );
      const machineDemand = generalMachines.map((m) => {
        const ws = this.getWorkstationKey(m, labels);
        return {
          machine: m,
          ws,
          line: ws.slice(-1),
          weight: 1
        };
      });
      const activePool = [...remainingCandidateCqis];
      while (selectedCQIs.length < maxCoreSlots && activePool.length > 0) {
        let bestCqi = null;
        let bestScore = -Infinity;
        let bestIndex = -1;
        for (let i = 0; i < activePool.length; i++) {
          const c = activePool[i];
          const cqiNum = this.getCqiNumber(c);
          const cqiLine = this.getCqiPrimaryLine(c);
          const prioList = (this.CQI_PRIORITY_MAP["cqi " + cqiNum] || []).map(
            (w) => String(w).toUpperCase()
          );
          const unservedMachines = machineDemand.filter((md) => md.weight > 0.1).map((md) => {
            let effDist = this.calculateDistance(md.machine, c, labels);
            const mLineCode = md.line;
            const cLineCode = cqiLine === "LINE A" ? "A" : cqiLine === "LINE B" ? "B" : cqiLine === "LINE C" ? "C" : "";
            if (cLineCode && mLineCode && cLineCode !== mLineCode) {
              effDist += 16;
            }
            const prioIdx = prioList.indexOf(md.ws);
            if (prioIdx === 0) effDist = Math.max(1, effDist - 4);
            else if (prioIdx === 1) effDist = Math.max(1, effDist - 2);
            const utility = md.weight * (1e4 / (4 + effDist));
            return { md, effDist, utility };
          });
          unservedMachines.sort((a, b) => b.utility - a.utility);
          const topK = unservedMachines.slice(0, maxSlotCapacity);
          let totalUtility = topK.reduce((sum, item) => sum + item.utility, 0);
          const hasCorePref = coreList.some((core) => {
            const p = String(core.cqi_priority || "").trim();
            return p === cqiNum || this.getCqiNumber(p) === cqiNum;
          });
          if (hasCorePref) totalUtility += 5e3;
          if (totalUtility > bestScore) {
            bestScore = totalUtility;
            bestCqi = c;
            bestIndex = i;
          }
        }
        if (bestCqi && bestIndex >= 0) {
          selectedCQIs.push(bestCqi);
          activePool.splice(bestIndex, 1);
          const cqiLine = this.getCqiPrimaryLine(bestCqi);
          const dists = machineDemand.filter((md) => md.weight > 0.1).map((md) => {
            let d = this.calculateDistance(md.machine, bestCqi, labels);
            const mLineCode = md.line;
            const cLineCode = cqiLine === "LINE A" ? "A" : cqiLine === "LINE B" ? "B" : cqiLine === "LINE C" ? "C" : "";
            if (cLineCode && mLineCode && cLineCode !== mLineCode) d += 16;
            return { md, d };
          });
          dists.sort((a, b) => a.d - b.d);
          dists.slice(0, maxSlotCapacity).forEach((item) => {
            item.md.weight = Math.max(0, item.md.weight - 1);
          });
        } else {
          break;
        }
      }
      const slots = selectedCQIs.map((c) => ({
        cqi: c,
        cqiNum: this.getCqiNumber(c),
        machines: [],
        core: 0,
        coreNames: [],
        nonCore: [],
        longshift: [],
        pouchAddedToWw: false,
        maxAllowedMachines: maxSlotCapacity
      }));
      const slot24 = slots.find((s) => s.cqiNum === "24");
      const slot19 = slots.find((s) => s.cqiNum === "19");
      if (slot19) {
        slot19.maxAllowedMachines = 2;
      }
      if (otMachines.length > 0 && slot19) {
        otMachines.slice(0, 2).forEach((m) => {
          if (!slot19.machines.some((sm) => sm.id === m.id || sm.name === m.name)) {
            slot19.machines.push(m);
          }
        });
      }
      if (wwMachines.length > 0 && slot24) {
        wwMachines.forEach((m) => {
          if (slot24.machines.length < slot24.maxAllowedMachines && !slot24.machines.some((sm) => sm.id === m.id || sm.name === m.name)) {
            slot24.machines.push(m);
          }
        });
      }
      const excludedCqiNums = /* @__PURE__ */ new Set(["19", "24"]);
      const generalSlots = slots.filter((s) => {
        const num = String(s.cqiNum || this.getCqiNumber(s.cqi) || "").trim();
        return !excludedCqiNums.has(num);
      });
      const lineOrder = { "LINE C": 1, "LINE A": 2, "LINE B": 3, OTHER: 4 };
      const sortedWsBlocks = Object.values(wsBlocks).sort((a, b) => {
        const ordA = lineOrder[a.line] || 9;
        const ordB = lineOrder[b.line] || 9;
        if (ordA !== ordB) return ordA - ordB;
        return a.col - b.col;
      });
      const evaluateBlockAffinity = (block, slot) => {
        const cqiNum = slot.cqiNum;
        const prioKey = "cqi " + cqiNum;
        const wsPrioList = (this.CQI_PRIORITY_MAP[prioKey] || []).map(
          (w) => String(w).toUpperCase()
        );
        const wsKey = block.ws;
        const slotPrimaryLine = this.getCqiPrimaryLine(slot.cqi);
        let score = 0;
        const prioIdx = wsPrioList.indexOf(wsKey);
        if (prioIdx === 0)
          score -= 1800;
        else if (prioIdx === 1)
          score -= 1100;
        else if (prioIdx >= 2) score -= Math.max(300, 750 - prioIdx * 80);
        if (cqiNum === "15") {
          if (block.line === "LINE B") {
            score -= 2800;
          } else if (block.line === "LINE C") {
            const wsUpper = wsKey.toUpperCase();
            if (wsUpper === "1C" || wsUpper === "2C") {
              score += 600;
            } else {
              score += 4800;
            }
          } else {
            score += 3200;
          }
        } else if (block.line === "LINE C") {
          if (slotPrimaryLine === "LINE C") {
            score -= 4e3;
          } else {
            score += 3500;
          }
        } else {
          if (slotPrimaryLine === "LINE C") {
            score += 3500;
          } else if (slotPrimaryLine === block.line) {
            score -= 1800;
          } else {
            score += 3e3;
          }
        }
        const sampleMachine = block.machines[0];
        const dist = this.calculateDistance(sampleMachine, slot.cqi, labels);
        score += dist * 15;
        const sameWsCount = slot.machines.filter(
          (sm) => this.getWorkstationKey(sm, labels) === wsKey
        ).length;
        if (sameWsCount > 0) {
          score -= 750;
        }
        const slotWsKeys = slot.machines.map(
          (sm) => this.getWorkstationKey(sm, labels)
        );
        const currentWsNums = slotWsKeys.map((w) => parseInt(w.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
        const blockWsNum = parseInt(wsKey.replace(/\D/g, ""), 10);
        const isAdjacent = currentWsNums.some(
          (n) => Math.abs(n - blockWsNum) === 1
        );
        const sameLine = slotWsKeys.some((w) => w.slice(-1) === wsKey.slice(-1));
        if (sameLine && isAdjacent && slot.machines.length + block.machines.length <= slot.maxAllowedMachines) {
          score -= 1500;
        } else if (sameLine) {
          score -= 400;
        }
        const lineSlots = generalSlots.filter(
          (s) => this.getCqiPrimaryLine(s.cqi) === block.line
        );
        const lineTotalMachines = sortedWsBlocks.filter((b) => b.line === block.line).reduce((acc, b) => acc + b.machines.length, 0);
        const targetQuota = lineSlots.length > 0 ? Math.ceil(lineTotalMachines / lineSlots.length) : maxSlotCapacity;
        if (slot.machines.length >= targetQuota) {
          score += (slot.machines.length - targetQuota + 1) * 850;
        } else {
          score += slot.machines.length * 60;
        }
        let blockHistoryBonus = 0;
        block.machines.forEach((m) => {
          blockHistoryBonus += this.getHistoryBonus(m, slot.cqi);
        });
        score -= blockHistoryBonus * 25;
        return score;
      };
      sortedWsBlocks.forEach((block) => {
        const blockMachines = [...block.machines];
        let validSlots = generalSlots.filter((s) => {
          return blockMachines.every(
            (m) => this.canAddMachineToSlotCluster(m, s)
          );
        });
        if (validSlots.length === 0) {
          validSlots = generalSlots;
        }
        validSlots.sort(
          (a, b) => evaluateBlockAffinity(block, a) - evaluateBlockAffinity(block, b)
        );
        let remainingInBlock = [...blockMachines];
        for (const targetSlot of validSlots) {
          if (remainingInBlock.length === 0) break;
          const availableSpace = this.getDynamicSlotLimit(targetSlot, mode, totalNcPool, slots) - targetSlot.machines.length;
          if (availableSpace <= 0) continue;
          const validToInsert = remainingInBlock.filter(
            (m) => this.canAddMachineToSlotCluster(m, targetSlot)
          );
          const canTake = Math.min(availableSpace, validToInsert.length);
          if (canTake > 0) {
            const taken = validToInsert.slice(0, canTake);
            targetSlot.machines.push(...taken);
            remainingInBlock = remainingInBlock.filter((m) => !taken.includes(m));
          }
        }
        if (remainingInBlock.length > 0) {
          let stillRemaining = [...remainingInBlock];
          const compatibleSlots = generalSlots.filter(
            (s) => stillRemaining.some((m) => this.canAddMachineToSlotCluster(m, s))
          );
          let fallbacks = (compatibleSlots.length > 0 ? compatibleSlots : generalSlots).sort((a, b) => a.machines.length - b.machines.length);
          for (const fb of fallbacks) {
            if (stillRemaining.length === 0) break;
            const available = this.getDynamicSlotLimit(fb, mode, totalNcPool, slots) - fb.machines.length;
            if (available <= 0) continue;
            const validToInsert = stillRemaining.filter(
              (m) => this.canAddMachineToSlotCluster(m, fb)
            );
            const toPush = validToInsert.slice(0, available);
            if (toPush.length > 0) {
              fb.machines.push(...toPush);
              stillRemaining = stillRemaining.filter((m) => !toPush.includes(m));
            }
          }
        }
      });
      const linesToBalance = ["LINE C", "LINE A", "LINE B"];
      linesToBalance.forEach((lineName) => {
        const lineSlots = generalSlots.filter(
          (s) => this.getCqiPrimaryLine(s.cqi) === lineName
        );
        if (lineSlots.length < 2) return;
        let improved = true;
        let iterations = 0;
        while (improved && iterations < 20) {
          improved = false;
          iterations++;
          lineSlots.sort((a, b) => b.machines.length - a.machines.length);
          const maxSlot = lineSlots[0];
          const minSlot = lineSlots[lineSlots.length - 1];
          const diff = maxSlot.machines.length - minSlot.machines.length;
          if (diff <= 1) break;
          const wsMapInMax = {};
          maxSlot.machines.forEach((m) => {
            const ws = this.getWorkstationKey(m, labels);
            if (!wsMapInMax[ws]) wsMapInMax[ws] = [];
            wsMapInMax[ws].push(m);
          });
          const wsKeysInMax = Object.keys(wsMapInMax);
          if (wsKeysInMax.length === 0) break;
          let bestWsCandidate = null;
          let bestTransferScore = -Infinity;
          for (const wsKey of wsKeysInMax) {
            const group = wsMapInMax[wsKey];
            const groupSize = group.length;
            if (minSlot.machines.length + groupSize > this.getDynamicSlotLimit(minSlot, mode, totalNcPool, slots))
              continue;
            if (maxSlot.machines.length - groupSize < minSlot.machines.length + groupSize - 1) {
              if (groupSize > 1 && maxSlot.machines.length - groupSize < minSlot.machines.length)
                continue;
            }
            const clusterValid = group.every(
              (m) => this.canAddMachineToSlotCluster(m, minSlot)
            );
            if (!clusterValid) continue;
            const sampleM = group[0];
            const distToMin = this.calculateDistance(
              sampleM,
              minSlot.cqi,
              labels
            );
            const distToMax = this.calculateDistance(
              sampleM,
              maxSlot.cqi,
              labels
            );
            const prioKeyMin = "cqi " + minSlot.cqiNum;
            const prioListMin = (this.CQI_PRIORITY_MAP[prioKeyMin] || []).map(
              (w) => String(w).toUpperCase()
            );
            const prioIdxMin = prioListMin.indexOf(wsKey);
            let transferScore = 1e3 - distToMin + (distToMax >= distToMin ? 500 : 0);
            if (prioIdxMin >= 0) transferScore += (10 - prioIdxMin) * 200;
            if (transferScore > bestTransferScore) {
              bestTransferScore = transferScore;
              bestWsCandidate = { wsKey, machines: group };
            }
          }
          if (bestWsCandidate) {
            const movingIds = new Set(
              bestWsCandidate.machines.map((m) => m.id || m.name)
            );
            maxSlot.machines = maxSlot.machines.filter(
              (m) => !movingIds.has(m.id || m.name)
            );
            minSlot.machines.push(...bestWsCandidate.machines);
            improved = true;
            continue;
          }
          for (const wsKey of wsKeysInMax) {
            const group = wsMapInMax[wsKey];
            for (const m of group) {
              if (minSlot.machines.length >= this.getDynamicSlotLimit(minSlot, mode, totalNcPool, slots)) break;
              if (maxSlot.machines.length - 1 < minSlot.machines.length + 1)
                break;
              if (this.canAddMachineToSlotCluster(m, minSlot)) {
                maxSlot.machines = maxSlot.machines.filter(
                  (sm) => (sm.id || sm.name) !== (m.id || m.name)
                );
                minSlot.machines.push(m);
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
        }
      });
      if (slot24) {
        let apkCandidates = [];
        const overloadThreshold = mode === 1 ? 6 : 4;
        const overloadedSlots = generalSlots.filter((s) => {
          const isLineC = this.getCqiPrimaryLine(s.cqi) === "LINE C";
          return isLineC ? s.machines.length > 8 : s.machines.length > overloadThreshold;
        });
        if (overloadedSlots.length > 0) {
          overloadedSlots.forEach((os) => {
            const apkLineCMachines = os.machines.filter((m) => {
              if (!this.isMachineLineC(m, labels)) return false;
              const line = String(m.line || "").toUpperCase();
              const ws = String(m.workstation || m.ws || "").toUpperCase();
              if (line.includes("LINE A") || line.includes("LINE B") || line === "A" || line === "B" || ws.endsWith("A") || ws.endsWith("B")) {
                return false;
              }
              return this.isPouchMachine(m) || String(m.name || m.id || "").toUpperCase().startsWith("APK");
            });
            apkLineCMachines.forEach((pm) => {
              if (apkCandidates.length < 4) {
                apkCandidates.push(pm);
                os.machines = os.machines.filter(
                  (m) => (m.id || m.name) !== (pm.id || pm.name)
                );
              }
            });
          });
        }
        if (apkCandidates.length > 0) {
          apkCandidates.sort((a, b) => {
            return this.calculateDistance(a, slot24.cqi, labels) - this.calculateDistance(b, slot24.cqi, labels);
          });
          const available = slot24.maxAllowedMachines - slot24.machines.length;
          if (available > 0) {
            const addedApk = apkCandidates.slice(0, Math.min(4, available));
            addedApk.forEach((pm) => slot24.machines.push(pm));
            slot24.pouchAddedToWw = true;
          }
        }
      }
      const activeSlots = slots.filter((s) => s.machines.length > 0);
      const availableCores = [...coreList];
      const pickCoreByQuery = (predicate) => {
        const idx = availableCores.findIndex(predicate);
        if (idx !== -1) {
          return availableCores.splice(idx, 1)[0];
        }
        return null;
      };
      const slot19Active = activeSlots.find((s) => s.cqiNum === "19");
      if (slot19Active && slot19Active.core === 0) {
        let chosenCore = pickCoreByQuery((c) => {
          const id = String(c.id || "").toUpperCase();
          const name = this.normalizeName(c.name || "");
          return id === "C14" || name === "FARHAN";
        });
        if (!chosenCore) {
          chosenCore = pickCoreByQuery((c) => {
            const id = String(c.id || "").toUpperCase();
            const name = this.normalizeName(c.name || "");
            return id === "C7" || name === "DINI";
          });
        }
        if (!chosenCore) {
          chosenCore = pickCoreByQuery((c) => {
            const p = String(c.cqi_priority || "").trim();
            return p === "19" || this.getCqiNumber(p) === "19";
          });
        }
        if (chosenCore) {
          slot19Active.core = 1;
          slot19Active.coreNames = [chosenCore.name];
        }
      }
      const slot24Active = activeSlots.find((s) => s.cqiNum === "24");
      if (slot24Active && slot24Active.core === 0) {
        let chosenCore = pickCoreByQuery((c) => {
          const id = String(c.id || "").toUpperCase();
          const name = this.normalizeName(c.name || "");
          return id === "C9" || name === "JIDDAN";
        });
        if (!chosenCore) {
          chosenCore = pickCoreByQuery((c) => {
            const id = String(c.id || "").toUpperCase();
            const name = this.normalizeName(c.name || "");
            return id === "C8" || name === "MIA";
          });
        }
        if (!chosenCore) {
          chosenCore = pickCoreByQuery((c) => {
            const p = String(c.cqi_priority || "").trim();
            return p === "24" || this.getCqiNumber(p) === "24";
          });
        }
        if (chosenCore) {
          slot24Active.core = 1;
          slot24Active.coreNames = [chosenCore.name];
        }
      }
      activeSlots.forEach((slot) => {
        if (slot.core > 0) return;
        const matchedCore = pickCoreByQuery((c) => {
          if (!c || !c.cqi_priority) return false;
          const prioNum = String(c.cqi_priority).trim();
          return prioNum === slot.cqiNum || this.getCqiNumber(c.cqi_priority) === slot.cqiNum;
        });
        if (matchedCore) {
          slot.core = 1;
          slot.coreNames = [matchedCore.name];
        }
      });
      activeSlots.forEach((slot) => {
        if (slot.core === 0 && availableCores.length > 0) {
          const nextCore = availableCores.shift();
          slot.core = 1;
          slot.coreNames = [nextCore.name];
        }
      });
      let nonCoreNames = [];
      if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
        nonCoreNames = config.nonCoreData.map(
          (nc) => typeof nc === "object" ? nc.name || "" : String(nc || "")
        ).filter((n) => n.trim() !== "");
      } else if (Array.isArray(config.nonCoreNames)) {
        nonCoreNames = config.nonCoreNames.map(
          (nc) => typeof nc === "object" ? nc.name || "" : String(nc || "")
        ).filter((n) => n.trim() !== "");
      }
      const nonCorePool = [...nonCoreNames];
      const lsPool = Array.from({ length: lsCount }, () => "(LS)");
      if (slot24 && slot24.pouchAddedToWw) {
        if (nonCorePool.length > 0) {
          slot24.nonCore.push(nonCorePool.shift());
        } else if (lsPool.length > 0) {
          slot24.longshift.push(lsPool.shift());
        }
      }
      activeSlots.forEach((slot) => {
        const count = slot.machines.length;
        const rule = this.getClusterCapacityRule(slot);
        const neededNc = rule.getNeededNc(count, mode);
        while (slot.nonCore.length + slot.longshift.length < neededNc && slot.nonCore.length + slot.longshift.length < maxNcPerCqi) {
          if (nonCorePool.length > 0) {
            slot.nonCore.push(nonCorePool.shift());
          } else if (lsPool.length > 0) {
            slot.longshift.push(lsPool.shift());
          } else {
            break;
          }
        }
      });
      const getDynamicMaxNc = (slot, mode2) => {
        const rule = this.getClusterCapacityRule(slot);
        const count = slot.machines.length;
        if (mode2 === 1) {
          if (count > rule.max1Nc) return 2;
          if (count > rule.maxCoreOnly) return 1;
          if (count === rule.maxCoreOnly && rule.max1Nc > rule.maxCoreOnly) return 1;
          return 0;
        } else {
          if (count > rule.maxCoreOnly) return 1;
          return 0;
        }
      };
      while (nonCorePool.length > 0) {
        const eligibleSlots = activeSlots.filter(
          (s) => s.nonCore.length + s.longshift.length < getDynamicMaxNc(s, mode) && s.nonCore.length + s.longshift.length < maxNcPerCqi
        );
        if (eligibleSlots.length === 0) break;
        eligibleSlots.sort((a, b) => {
          const loadA = a.machines.length / (a.core + a.nonCore.length + a.longshift.length + 0.1);
          const loadB = b.machines.length / (b.core + b.nonCore.length + b.longshift.length + 0.1);
          return loadB - loadA;
        });
        eligibleSlots[0].nonCore.push(nonCorePool.shift());
      }
      while (lsPool.length > 0) {
        const eligibleSlots = activeSlots.filter(
          (s) => s.nonCore.length + s.longshift.length < getDynamicMaxNc(s, mode) && s.nonCore.length + s.longshift.length < maxNcPerCqi
        );
        if (eligibleSlots.length === 0) break;
        eligibleSlots.sort((a, b) => {
          const loadA = a.machines.length / (a.core + a.nonCore.length + a.longshift.length + 0.1);
          const loadB = b.machines.length / (b.core + b.nonCore.length + b.longshift.length + 0.1);
          return loadB - loadA;
        });
        eligibleSlots[0].longshift.push(lsPool.shift());
      }
      activeSlots.sort((a, b) => {
        const numA = parseInt(a.cqiNum, 10) || 999;
        const numB = parseInt(b.cqiNum, 10) || 999;
        return numA - numB;
      });
      const assignedIds = /* @__PURE__ */ new Set();
      activeSlots.forEach(
        (s) => s.machines.forEach((m) => assignedIds.add(m.id || m.name))
      );
      const unassigned = runningMachines.filter(
        (m) => !assignedIds.has(m.id || m.name)
      );
      activeSlots.unassignedMachines = unassigned;
      activeSlots.uncoveredMachines = unassigned;
      const totalLsInput = parseInt(config.longshift || 0, 10);
      const assignedLsCount = activeSlots.reduce(
        (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
        0
      );
      activeSlots.remainingLs = Math.max(0, totalLsInput - assignedLsCount);
      activeSlots.remainingNonCore = nonCorePool;
      return activeSlots;
    },
    /**
     * Memaksa mengalokasikan mesin sisa yang belum tercover ke CQI yang belum maksimal (maks 8 mesin).
     * Otomatis mencari CQI yang belum maks, menggeser mesin yang boleh dicampur/ada di history/ada di CQI priority
     * untuk memaksimalkan hingga 8 mesin per CQI, dimulai dari Line C, kemudian Line A, lalu Line B.
     *
     * @param {Array} slots - Slot perencanaan yang ada
     * @param {Array} unassignedMachines - Daftar mesin yang belum tercover
     * @param {Object} config - Konfigurasi perencanaan
     * @param {Object} mapData - Map data
     * @returns {Array} Slots hasil penyesuaian paksa
     */
    forceFitUnassignedMachines(slots, unassignedMachines = null, config = {}, mapData = {}) {
      if (!Array.isArray(slots) || slots.length === 0) return slots;
      let remaining = Array.isArray(unassignedMachines) ? [...unassignedMachines] : slots.unassignedMachines ? [...slots.unassignedMachines] : [];
      if (remaining.length === 0) {
        slots.unassignedMachines = [];
        slots.uncoveredMachines = [];
        return slots;
      }
      const labels = mapData.labels || [];
      const lineOrder = { "LINE C": 1, "LINE A": 2, "LINE B": 3, OTHER: 4 };
      const mode = parseInt(config.mode || 1, 10) === 2 ? 2 : 1;
      let ncCount = 0;
      if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
        ncCount = config.nonCoreData.length;
      } else if (Array.isArray(config.nonCoreNames)) {
        ncCount = config.nonCoreNames.length;
      }
      const lsCount = parseInt(config.longshift || 0, 10);
      const totalNcPool = ncCount + lsCount;
      const candidates = slots.filter(
        (s) => s.cqiNum !== "19" && s.cqiNum !== "24"
      );
      candidates.sort((a, b) => {
        const lineA = this.getCqiPrimaryLine(a.cqi);
        const lineB = this.getCqiPrimaryLine(b.cqi);
        const ordA = lineOrder[lineA] || 9;
        const ordB = lineOrder[lineB] || 9;
        if (ordA !== ordB) return ordA - ordB;
        return (parseInt(a.cqiNum, 10) || 99) - (parseInt(b.cqiNum, 10) || 99);
      });
      for (const slot of candidates) {
        if (remaining.length === 0) break;
        const slotLimit = this.getDynamicSlotLimit(slot, mode, totalNcPool, slots);
        slot.maxAllowedMachines = slotLimit;
        let progress = true;
        while (slot.machines.length < slotLimit && remaining.length > 0 && progress) {
          progress = false;
          for (let i = 0; i < remaining.length; i++) {
            const m = remaining[i];
            if (slot.cqiNum === "15" && this.isMachineLineC(m, labels)) {
              const ws = this.getWorkstationKey(m, labels).toUpperCase();
              if (ws !== "1C" && ws !== "2C") {
                continue;
              }
            }
            if (this.canAddMachineToSlotCluster(m, slot)) {
              slot.machines.push(m);
              remaining.splice(i, 1);
              progress = true;
              break;
            }
          }
        }
      }
      if (remaining.length > 0) {
        for (const targetSlot of candidates) {
          if (remaining.length === 0) break;
          const targetLimit = this.getDynamicSlotLimit(targetSlot, mode, totalNcPool, slots);
          targetSlot.maxAllowedMachines = targetLimit;
          if (targetSlot.machines.length >= targetLimit) continue;
          const unassignedM = remaining[0];
          if (targetSlot.cqiNum === "15" && this.isMachineLineC(unassignedM, labels)) {
            const ws = this.getWorkstationKey(unassignedM, labels).toUpperCase();
            if (ws !== "1C" && ws !== "2C") continue;
          }
          for (const donorSlot of candidates) {
            const donorLimit = this.getDynamicSlotLimit(donorSlot, mode, totalNcPool, slots);
            if (donorSlot === targetSlot || donorSlot.machines.length >= donorLimit)
              continue;
            for (let i = 0; i < targetSlot.machines.length; i++) {
              const mToMove = targetSlot.machines[i];
              if (this.canAddMachineToSlotCluster(mToMove, donorSlot)) {
                targetSlot.machines.splice(i, 1);
                donorSlot.machines.push(mToMove);
                if (this.canAddMachineToSlotCluster(unassignedM, targetSlot)) {
                  targetSlot.machines.push(remaining.shift());
                  break;
                } else {
                  donorSlot.machines.pop();
                  targetSlot.machines.splice(i, 0, mToMove);
                }
              }
            }
            if (remaining.length === 0) break;
          }
        }
      }
      slots.unassignedMachines = remaining;
      slots.uncoveredMachines = remaining;
      const totalLsInput = parseInt(config.longshift || 0, 10);
      const assignedLsCount = slots.reduce(
        (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
        0
      );
      slots.remainingLs = Math.max(0, totalLsInput - assignedLsCount);
      if (!slots.remainingNonCore) slots.remainingNonCore = [];
      return slots;
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
      slots.forEach((s) => {
        const d = this.calculateDistance(machine, s.cqi);
        if (d < minDist) {
          minDist = d;
          nearest = s;
        }
      });
      return nearest;
    }
  };

  // src/brain/validator.js
  var validator_default = {
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
      info.push(
        `INFO: Beroperasi pada MODE ${mode} (Maks ${maxNcPerCqi} Non-Core/LS per CQI).`
      );
      const assignedMachineIds = /* @__PURE__ */ new Set();
      slots.forEach(
        (s) => s.machines.forEach((m) => assignedMachineIds.add(m.id || m.name))
      );
      const unassigned = machines.filter(
        (m) => !assignedMachineIds.has(m.id || m.name)
      );
      if (unassigned.length > 0) {
        violations.push(
          `${unassigned.length} Mesin Running belum teralokasi: ${this.formatMachineList(unassigned)}.`
        );
      } else {
        info.push(
          `SUCCESS: 100% Mesin Running (${assignedMachineIds.size} Mesin) berhasil tercover.`
        );
      }
      slots.forEach((s) => {
        const cqiNum = this.getCqiNumber(s.cqi);
        const clusters = /* @__PURE__ */ new Set();
        s.machines.forEach((m) => clusters.add(this.getMachineClusterGroup(m)));
        const clusterArr = Array.from(clusters);
        if (s.machines.length > 1) {
          for (let i = 0; i < s.machines.length; i++) {
            for (let j = i + 1; j < s.machines.length; j++) {
              const mA = s.machines[i];
              const mB = s.machines[j];
              const clusterA = this.getMachineClusterGroup(mA);
              const clusterB = this.getMachineClusterGroup(mB);
              if (!this.isClusterMixingAllowed(clusterA, clusterB, cqiNum, mA, mB)) {
                violations.push(
                  `CQI ${cqiNum} melanggar aturan mixing cluster: mencampur [${clusterA} - ${mA.name || mA.id}] dengan [${clusterB} - ${mB.name || mB.id}].`
                );
              }
            }
          }
        }
      });
      slots.forEach((s) => {
        const cqiNum = this.getCqiNumber(s.cqi);
        const mCount = s.machines.length;
        const totalNc = s.nonCore.length + s.longshift.length;
        const rule = this.getClusterCapacityRule(s);
        if (mode === 1) {
          if (totalNc === 0 && mCount > rule.maxCoreOnly) {
            violations.push(
              `CQI ${cqiNum} (Cluster: ${rule.name}) memuat ${mCount} mesin dengan 0 Non-Core (Maksimal ${rule.maxCoreOnly} mesin untuk 1 Core).`
            );
          } else if (totalNc === 1 && mCount > rule.max1Nc) {
            violations.push(
              `CQI ${cqiNum} (Cluster: ${rule.name}) memuat ${mCount} mesin dengan 1 Non-Core (Maksimal ${rule.max1Nc} mesin untuk 1 Core + 1 Non-Core).`
            );
          } else if (totalNc >= 2 && mCount > rule.max2Nc) {
            violations.push(
              `CQI ${cqiNum} (Cluster: ${rule.name}) memuat ${mCount} mesin (Maksimal ${rule.max2Nc} mesin untuk 1 Core + 2 Non-Core).`
            );
          }
          if (totalNc > 2) {
            violations.push(
              `CQI ${cqiNum} melebihi batas maksimal 2 Non-Core/LS di Mode 1.`
            );
          }
        } else {
          if (totalNc === 0 && mCount > rule.maxCoreOnly) {
            violations.push(
              `CQI ${cqiNum} (Cluster: ${rule.name}) memuat ${mCount} mesin dengan 0 Non-Core (Maksimal ${rule.maxCoreOnly} mesin untuk 1 Core di Mode 2).`
            );
          } else if (totalNc === 1 && mCount > rule.max1Nc) {
            violations.push(
              `CQI ${cqiNum} (Cluster: ${rule.name}) memuat ${mCount} mesin dengan 1 Non-Core (Maksimal ${rule.max1Nc} mesin untuk 1 Core + 1 Non-Core di Mode 2).`
            );
          }
          if (totalNc > 1) {
            violations.push(
              `CQI ${cqiNum} melebihi batas maksimal 1 Non-Core/LS di Mode 2.`
            );
          }
        }
      });
      const slot24 = slots.find((s) => this.getCqiNumber(s.cqi) === "24");
      if (slot24) {
        const nonWwIn24 = slot24.machines.filter((m) => !this.isWwMachine(m));
        if (nonWwIn24.length > 0) {
          const invalidIn24 = nonWwIn24.filter((m) => {
            const isLineC = this.isMachineLineC(m);
            const line = String(m.line || "").toUpperCase();
            const ws = String(m.workstation || m.ws || "").toUpperCase();
            const isLineAOrB = line.includes("LINE A") || line.includes("LINE B") || line === "A" || line === "B" || ws.endsWith("A") || ws.endsWith("B");
            const isApk = this.isPouchMachine(m) || String(m.name || m.id || "").toUpperCase().startsWith("APK");
            return isLineAOrB || !isLineC || !isApk;
          });
          if (invalidIn24.length > 0) {
            violations.push(
              `CQI 24 memuat mesin tidak diizinkan: ${this.formatMachineList(invalidIn24)} (Mesin Line A dan Line B dilarang masuk CQI 24, hanya mesin WW & APK Line C saja yang diperbolehkan).`
            );
          } else if (nonWwIn24.length > 4) {
            violations.push(
              `CQI 24 memuat lebih dari 4 mesin APK Line C (${nonWwIn24.length} mesin).`
            );
          } else {
            const totalManpower = slot24.core + slot24.nonCore.length + slot24.longshift.length;
            if (totalManpower < 2) {
              violations.push(
                `CQI 24 mendapat tambahan mesin APK Line C tetapi belum memiliki minimal 1 Non-Core / (LS).`
              );
            } else {
              info.push(
                `INFO: CQI 24 mengcover ${slot24.machines.length} Mesin (WW + ${nonWwIn24.length} APK Line C) dengan dukungan Non-Core/(LS).`
              );
            }
          }
        }
      }
      const slot19 = slots.find((s) => this.getCqiNumber(s.cqi) === "19");
      if (slot19) {
        const nonOtIn19 = slot19.machines.filter((m) => !this.isOtMachine(m));
        if (nonOtIn19.length > 0) {
          violations.push(
            `CQI 19 memuat mesin selain OT: ${this.formatMachineList(nonOtIn19)} (CQI 19 strictly OT saja).`
          );
        } else if (slot19.machines.length > 2) {
          violations.push(
            `CQI 19 melebihi batas maksimal 2 mesin OT (terisi ${slot19.machines.length} mesin).`
          );
        } else {
          info.push(
            `INFO: CQI 19 strictly mengcover ${slot19.machines.length} Mesin OT (Maksimal 2 Mesin).`
          );
        }
      }
      const emptyCoreSlots = slots.filter(
        (s) => s.machines.length > 0 && s.core === 0
      );
      if (emptyCoreSlots.length > 0) {
        violations.push(
          `${emptyCoreSlots.length} CQI aktif tidak memiliki Manpower Core.`
        );
      }
      return { valid: violations.length === 0, violations, info };
    }
  };

  // src/brain/formatter.js
  var formatter_default = {
    // ==========================================================================
    // 4. MODUL FORMATTER & EXPORTER
    // ==========================================================================
    /**
     * Menyusun Teks Output Final untuk dibagikan via WhatsApp / Clipboard
     * @param {Array} slots - Slot hasil alokasi
     * @param {Object} config - Konfigurasi tambahan (qcPassed, milStd, supportFg, mode)
     * @returns {string} String teks berformat rapi
     */
    formatText(slots, config = {}) {
      if (!Array.isArray(slots) || slots.length === 0) return "";
      let out = `*PLANNING SHIFT LIQUID 3*
`;
      out += `Tanggal: ${(/* @__PURE__ */ new Date()).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
`;
      const totalLsInput = parseInt(config.longshift || 0, 10);
      const assignedLsCount = slots.reduce(
        (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
        0
      );
      const remainingLs = slots.remainingLs !== void 0 ? slots.remainingLs : Math.max(0, totalLsInput - assignedLsCount);
      if (totalLsInput > 0 || remainingLs > 0) {
        out += `Sisa LS       : ${remainingLs} Belum Terpakai
`;
      }
      if (slots.remainingNonCore && slots.remainingNonCore.length > 0) {
        out += `Sisa Non-Core : ${slots.remainingNonCore.join(", ")} Belum Terpakai
`;
      }
      out += `
`;
      const allRunningInSlots = [];
      slots.forEach((s) => {
        if (Array.isArray(s.machines)) {
          allRunningInSlots.push(...s.machines);
        }
      });
      slots.forEach((s, i) => {
        if (s.machines.length === 0) return;
        const cqiName = s.cqi.name || `CQI-${i + 1}`;
        const coreStr = s.coreNames.length > 0 ? s.coreNames.join(", ") : `${s.core} Core`;
        let combinedNcAndLs = [];
        if (s.nonCore && s.nonCore.length > 0) combinedNcAndLs.push(...s.nonCore);
        if (s.longshift && s.longshift.length > 0)
          combinedNcAndLs.push(...s.longshift);
        const nonCoreStr = combinedNcAndLs.length > 0 ? combinedNcAndLs.join(", ") : "-";
        const macList = this.formatMachineList(s.machines, allRunningInSlots);
        out += `${i + 1}. *${cqiName}*
`;
        out += `   - Core     : ${coreStr}
`;
        out += `   - Non-Core : ${nonCoreStr}
`;
        out += `   - Mesin    : ${macList}

`;
      });
      if (config.qcPassed) {
        if (config.qcPassed.includes("\n")) {
          out += `- QC Passed  :
${config.qcPassed}
`;
        } else {
          out += `- QC Passed  : ${config.qcPassed}
`;
        }
      }
      if (config.milStd) out += `- Mil-Std    : ${config.milStd}
`;
      if (config.supportFg) out += `- Support FG : ${config.supportFg}
`;
      const unassigned = slots.unassignedMachines || slots.uncoveredMachines || [];
      if (unassigned.length > 0) {
        out += `
*MESIN BELUM TERCOVER (${unassigned.length} Mesin):*
`;
        unassigned.forEach((m, idx) => {
          const ws = this.getWorkstationKey(m);
          const cluster = this.getMachineClusterGroup(m);
          out += `${idx + 1}. ${m.name || m.id} (${ws}) - Cluster: ${cluster}
`;
        });
      }
      return out;
    }
  };

  // src/brain/history.js
  var history_default = {
    // ==========================================================================
    // 5. MODUL PERSISTENSI & PEMBELAJARAN DATA HISTORY (AI LEARNING ENGINE)
    // ==========================================================================
    _historyRecords: [],
    _historyAffinityMap: {},
    /**
     * Parser Universal: Mengonversi format history JSON apapun menjadi pasangan machine-CQI terstandar
     * Mendukung: GitHub export planning-*.json, legacy 01-01-2026.json, learning_data.json, atau array slot
     * @param {Object|Array} rawData - Data JSON mentah
     * @returns {Array} Array of { machineId, machineName, cqiId, cqiName, cqiNum, timestamp }
     */
    parseHistoryData(rawData) {
      if (!rawData) return [];
      const pairs = [];
      if (Array.isArray(rawData)) {
        rawData.forEach((item) => {
          if (!item) return;
          if (item.machineId || item.machine || item.m) {
            const mName = item.machineName || item.machine || item.machineId || item.m;
            const cqi = item.cqiName || item.cqi || item.cqiId || item.c;
            pairs.push({
              machineId: item.machineId || mName,
              machineName: mName,
              cqiId: item.cqiId || cqi,
              cqiName: cqi,
              cqiNum: String(this.getCqiNumber(cqi) || "").trim(),
              timestamp: item.timestamp || item.date || (/* @__PURE__ */ new Date()).toISOString()
            });
          } else if (item.cqi && item.machines) {
            const cqiName = item.cqi.name || item.cqi.id || item.cqi;
            const cqiNum = String(this.getCqiNumber(cqiName) || "").trim();
            (item.machines || []).forEach((m) => {
              const mName = typeof m === "object" ? m.name || m.id : String(m);
              pairs.push({
                machineId: typeof m === "object" ? m.id || mName : mName,
                machineName: mName,
                cqiId: typeof item.cqi === "object" ? item.cqi.id || cqiName : cqiName,
                cqiName,
                cqiNum,
                timestamp: item.timestamp || (/* @__PURE__ */ new Date()).toISOString()
              });
            });
          }
        });
        return pairs;
      }
      if (Array.isArray(rawData.pairs) && rawData.pairs.length > 0) {
        return this.parseHistoryData(rawData.pairs);
      }
      if (Array.isArray(rawData.planning) && rawData.planning.length > 0) {
        rawData.planning.forEach((slot) => {
          const cqiName = slot.cqi || slot.nama || "CQI";
          const cqiNum = String(this.getCqiNumber(cqiName) || "").trim();
          (slot.machines || []).forEach((m) => {
            const mName = typeof m === "object" ? m.name || m.id : String(m);
            pairs.push({
              machineId: typeof m === "object" ? m.id || mName : mName,
              machineName: mName,
              cqiId: cqiName,
              cqiName,
              cqiNum,
              timestamp: rawData.meta ? rawData.meta.date_iso || rawData.meta.date : (/* @__PURE__ */ new Date()).toISOString()
            });
          });
        });
        return pairs;
      }
      if (Array.isArray(rawData.planning_history) && rawData.planning_history.length > 0) {
        rawData.planning_history.forEach((session) => {
          (session.cqi || []).forEach((cqiBlock) => {
            const cqiName = cqiBlock.nama || cqiBlock.name || "CQI";
            const cqiNum = String(this.getCqiNumber(cqiName) || "").trim();
            (cqiBlock.mesin || []).forEach((m) => {
              const mName = typeof m === "object" ? m.name || m.id : String(m);
              pairs.push({
                machineId: typeof m === "object" ? m.id || mName : mName,
                machineName: mName,
                cqiId: cqiName,
                cqiName,
                cqiNum,
                timestamp: session.tanggal || (/* @__PURE__ */ new Date()).toISOString()
              });
            });
          });
        });
        return pairs;
      }
      return pairs;
    },
    /**
     * Inisialisasi memori AI dari koleksi pasangan history
     * Membangun fast lookup Map untuk O(1) evaluasi skor afinitas
     * @param {Array} records - Array of pairs
     * @param {boolean} persistToLocalStorage - Apakah disimpan ke local storage
     */
    initHistoryMemory(records, persistToLocalStorage = false) {
      if (!Array.isArray(records)) return;
      this._historyRecords = records;
      this._historyAffinityMap = {};
      records.forEach((r) => {
        const mName = this.normalizeName(r.machineName || r.machineId || r.name);
        const cqiNum = String(this.getCqiNumber(r.cqiNum || r.cqiName || r.cqiId) || "").trim();
        if (!mName || !cqiNum) return;
        if (!this._historyAffinityMap[mName]) {
          this._historyAffinityMap[mName] = {};
        }
        this._historyAffinityMap[mName][cqiNum] = (this._historyAffinityMap[mName][cqiNum] || 0) + 1;
      });
      if (persistToLocalStorage && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("planning_history", JSON.stringify(records));
        } catch (e) {
          console.warn("Gagal menyimpan history ke localStorage:", e);
        }
      }
    },
    /**
     * Memuat semua data history yang tersedia dari Server API, File Static, atau LocalStorage
     * @param {Object} [customData] - Data riwayat opsional untuk langsung dimuat
     */
    async loadAllHistory(customData = null) {
      if (customData) {
        const parsed = this.parseHistoryData(customData);
        this.initHistoryMemory(parsed, true);
        return parsed;
      }
      let allPairs = [];
      if (typeof fetch !== "undefined") {
        try {
          const resp = await fetch("/api/history");
          if (resp.ok) {
            const json = await resp.json();
            if (json && json.learningData && Array.isArray(json.learningData)) {
              const parsed = this.parseHistoryData(json.learningData);
              allPairs.push(...parsed);
            }
          }
        } catch (e) {
        }
      }
      if (allPairs.length === 0 && typeof fetch !== "undefined") {
        try {
          const resp = await fetch("history/learning_data.json");
          if (resp.ok) {
            const json = await resp.json();
            const parsed = this.parseHistoryData(json);
            allPairs.push(...parsed);
          }
        } catch (e) {
        }
      }
      if (typeof localStorage !== "undefined") {
        try {
          const raw = localStorage.getItem("planning_history");
          if (raw) {
            const parsedLocal = this.parseHistoryData(JSON.parse(raw));
            allPairs.push(...parsedLocal);
          }
        } catch (e) {
        }
      }
      const seen = /* @__PURE__ */ new Set();
      const uniquePairs = allPairs.filter((p) => {
        const key = `${p.machineId}_${p.cqiNum}_${p.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      this.initHistoryMemory(uniquePairs, true);
      return uniquePairs;
    },
    /**
     * Mengembalikan ringkasan statistik pembelajaran AI
     */
    getHistoryStats() {
      const totalRecords = this._historyRecords ? this._historyRecords.length : 0;
      const machinesCount = Object.keys(this._historyAffinityMap || {}).length;
      const topAffinities = [];
      Object.entries(this._historyAffinityMap || {}).forEach(([mName, cqiMap]) => {
        Object.entries(cqiMap).forEach(([cqiNum, count]) => {
          topAffinities.push({
            machine: mName,
            cqi: `CQI ${cqiNum}`,
            cqiNum,
            frequency: count,
            bonus: Math.min(count * 10, 30)
          });
        });
      });
      topAffinities.sort((a, b) => b.frequency - a.frequency);
      return {
        totalRecords,
        uniqueMachines: machinesCount,
        topAffinities: topAffinities.slice(0, 20)
      };
    },
    /**
     * Mencatat log riwayat alokasi ke local storage dan memori AI aktif
     * @param {string} machineId - ID Mesin
     * @param {string} cqiId - ID CQI
     */
    recordHistory(machineId, cqiId) {
      try {
        const mName = this.normalizeName(machineId);
        const cqiNum = String(this.getCqiNumber(cqiId) || "").trim();
        const newRecord = {
          machineId,
          machineName: machineId,
          cqiId,
          cqiName: cqiId,
          cqiNum,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (!this._historyRecords) this._historyRecords = [];
        this._historyRecords.push(newRecord);
        if (this._historyRecords.length > 2e3) this._historyRecords.shift();
        if (!this._historyAffinityMap) this._historyAffinityMap = {};
        if (!this._historyAffinityMap[mName]) this._historyAffinityMap[mName] = {};
        this._historyAffinityMap[mName][cqiNum] = (this._historyAffinityMap[mName][cqiNum] || 0) + 1;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("planning_history", JSON.stringify(this._historyRecords));
        }
      } catch (e) {
        console.warn("Gagal mencatat history alokasi:", e);
      }
    }
  };

  // src/brain/heatmap.js
  var heatmap_default = {
    // ==========================================================================
    // 6. MODUL HEATMAP & DENSITAS BEBAN LINE (BOTTLE-NECK IDENTIFICATION)
    // ==========================================================================
    /**
     * Menghitung status heatmap, densitas beban per line, dan alokasi warna berintensitas tinggi
     * dengan resolusi konflik warna tetangga (Neighbor Swap) agar tidak ada dua CQI berdekatan
     * yang memiliki warna mirip atau membingungkan.
     */
    calculateHeatmapState(slots, mapData) {
      if (!slots || !Array.isArray(slots) || slots.length === 0 || !mapData) {
        return {
          lineWorkloadMap: {},
          cqiColorMap: {},
          bottleneckLine: null,
          slotDetails: []
        };
      }
      const HEATMAP_PALETTES = [
        // Level 1: Hot / Crimson / Deep Red (Beban Tertinggi / Bottleneck)
        {
          id: "crimson_dark",
          hex: "#be123c",
          darkHex: "#881337",
          hue: 345,
          family: "red",
          heatRank: 1
        },
        {
          id: "scarlet_red",
          hex: "#dc2626",
          darkHex: "#991b1b",
          hue: 0,
          family: "red",
          heatRank: 1
        },
        {
          id: "deep_red",
          hex: "#b91c1c",
          darkHex: "#7f1d1d",
          hue: 355,
          family: "red",
          heatRank: 1
        },
        {
          id: "ruby_red",
          hex: "#e11d48",
          darkHex: "#9f1239",
          hue: 340,
          family: "red",
          heatRank: 1
        },
        // Level 2: Fire Orange / Dark Amber / Warm Coral (Beban Tinggi)
        {
          id: "fire_orange",
          hex: "#ea580c",
          darkHex: "#9a3412",
          hue: 25,
          family: "orange",
          heatRank: 2
        },
        {
          id: "amber_dark",
          hex: "#d97706",
          darkHex: "#92400e",
          hue: 42,
          family: "amber",
          heatRank: 2
        },
        {
          id: "coral_warm",
          hex: "#f97316",
          darkHex: "#c2410c",
          hue: 20,
          family: "orange",
          heatRank: 2
        },
        {
          id: "magenta_deep",
          hex: "#c026d3",
          darkHex: "#86198f",
          hue: 295,
          family: "magenta",
          heatRank: 2
        },
        // Level 3: Royal Indigo / Deep Violet / Vibrant Blue (Beban Sedang)
        {
          id: "indigo_deep",
          hex: "#4338ca",
          darkHex: "#312e81",
          hue: 240,
          family: "indigo",
          heatRank: 3
        },
        {
          id: "violet_royal",
          hex: "#7c3aed",
          darkHex: "#5b21b6",
          hue: 265,
          family: "violet",
          heatRank: 3
        },
        {
          id: "blue_royal",
          hex: "#2563eb",
          darkHex: "#1e40af",
          hue: 220,
          family: "blue",
          heatRank: 3
        },
        {
          id: "purple_vibrant",
          hex: "#9333ea",
          darkHex: "#6b21a8",
          hue: 275,
          family: "purple",
          heatRank: 3
        },
        // Level 4: Deep Teal / Cyan / Emerald / Forest Green (Beban Normal / Cool)
        {
          id: "teal_deep",
          hex: "#0f766e",
          darkHex: "#134e4a",
          hue: 175,
          family: "teal",
          heatRank: 4
        },
        {
          id: "cyan_rich",
          hex: "#0284c7",
          darkHex: "#075985",
          hue: 198,
          family: "cyan",
          heatRank: 4
        },
        {
          id: "emerald_deep",
          hex: "#047857",
          darkHex: "#064e3b",
          hue: 155,
          family: "green",
          heatRank: 4
        },
        {
          id: "forest_green",
          hex: "#15803d",
          darkHex: "#14532d",
          hue: 135,
          family: "green",
          heatRank: 4
        }
      ];
      const getHueDistance = (h1, h2) => {
        const d = Math.abs(h1 - h2) % 360;
        return d > 180 ? 360 - d : d;
      };
      const lineStats = {};
      (mapData.lines || []).forEach((l) => {
        lineStats[l.name] = {
          line: l,
          name: l.name,
          runningMachines: 0,
          totalMachines: 0,
          activeSlots: 0,
          density: 0,
          workloadScore: 0
        };
      });
      (mapData.machines || []).forEach((m) => {
        const ws = this.getWorkstationKey(m, mapData.labels);
        let lineName = m.line;
        if (!lineName) {
          if (ws.endsWith("A")) lineName = "LINE A";
          else if (ws.endsWith("B")) lineName = "LINE B";
          else if (ws.endsWith("C")) lineName = "LINE C";
          else if (ws === "WW") lineName = "WW";
          else if (ws === "OT") lineName = "OT";
          else lineName = "LAINNYA";
        }
        if (!lineStats[lineName]) {
          lineStats[lineName] = {
            line: {
              name: lineName,
              id: lineName.toLowerCase().replace(/\s+/g, "-")
            },
            name: lineName,
            runningMachines: 0,
            totalMachines: 0,
            activeSlots: 0,
            density: 0,
            workloadScore: 0
          };
        }
        lineStats[lineName].totalMachines++;
        if (m.status === "RUNNING") {
          lineStats[lineName].runningMachines++;
        }
      });
      const runningFromSlots = /* @__PURE__ */ new Set();
      slots.forEach((s) => {
        if (!s) return;
        if (s.cqi) {
          const primaryLine = this.getCqiPrimaryLine(s.cqi);
          if (lineStats[primaryLine]) {
            lineStats[primaryLine].activeSlots++;
          }
        }
        if (Array.isArray(s.machines)) {
          s.machines.forEach((m) => {
            const mKey = String(m.id || m.name).trim();
            if (!runningFromSlots.has(mKey)) {
              runningFromSlots.add(mKey);
              const ws = this.getWorkstationKey(m, mapData.labels);
              let lineName = m.line;
              if (!lineName) {
                if (ws.endsWith("A")) lineName = "LINE A";
                else if (ws.endsWith("B")) lineName = "LINE B";
                else if (ws.endsWith("C")) lineName = "LINE C";
                else if (ws === "WW") lineName = "WW";
                else if (ws === "OT") lineName = "OT";
                else lineName = "LAINNYA";
              }
              if (lineStats[lineName] && lineStats[lineName].runningMachines < runningFromSlots.size) {
                lineStats[lineName].slotMachineCount = (lineStats[lineName].slotMachineCount || 0) + 1;
              }
            }
          });
        }
      });
      Object.values(lineStats).forEach((st) => {
        if (st.slotMachineCount && st.slotMachineCount > st.runningMachines) {
          st.runningMachines = st.slotMachineCount;
        }
      });
      Object.values(lineStats).forEach((st) => {
        st.density = st.totalMachines > 0 ? st.runningMachines / st.totalMachines : 0;
        st.workloadScore = st.runningMachines * 10 + st.density * 50 + st.activeSlots * 6;
      });
      const sortedLines = Object.values(lineStats).sort(
        (a, b) => b.workloadScore - a.workloadScore
      );
      const maxLineScore = sortedLines.length > 0 ? Math.max(1, sortedLines[0].workloadScore) : 1;
      const lineWorkloadMap = {};
      let bottleneckLine = null;
      sortedLines.forEach((st, idx) => {
        const isBottleneck = idx === 0 && st.runningMachines > 0;
        if (isBottleneck) bottleneckLine = st.name;
        let tier = "normal";
        if (st.runningMachines === 0) {
          tier = "idle";
        } else if (isBottleneck) {
          tier = "bottleneck";
        } else if (idx === 1 || st.workloadScore / maxLineScore >= 0.6) {
          tier = "high";
        } else if (st.workloadScore / maxLineScore >= 0.35) {
          tier = "medium";
        }
        lineWorkloadMap[st.name] = {
          name: st.name,
          rank: idx + 1,
          isBottleneck,
          tier,
          score: st.workloadScore,
          relativeLoad: st.workloadScore / maxLineScore,
          runningMachines: st.runningMachines,
          totalMachines: st.totalMachines,
          activeSlots: st.activeSlots,
          density: st.density,
          densityPercent: Math.round(st.density * 100)
        };
      });
      const slotDetails = slots.map((s, idx) => {
        const primaryLine = this.getCqiPrimaryLine(s.cqi);
        const lineInfo = lineWorkloadMap[primaryLine] || {
          rank: 99,
          relativeLoad: 0.5,
          tier: "normal"
        };
        let sumR = 0, sumC = 0, count = 0;
        (s.machines || []).forEach((m) => {
          const pos = m.position || { row: m.row || 0, col: m.col || 0 };
          sumR += pos.row;
          sumC += pos.col;
          count++;
        });
        const cqiNode = (mapData.cqis || []).find(
          (c) => (c.id || c.name) === (s.cqi.id || s.cqi.name)
        );
        if (cqiNode) {
          sumR += (cqiNode.row || 0) * 2;
          sumC += (cqiNode.col || 0) * 2;
          count += 2;
        }
        const centerRow = count > 0 ? sumR / count : 10;
        const centerCol = count > 0 ? sumC / count : 10;
        return {
          slot: s,
          idx,
          cqiId: s.cqi.id || s.cqi.name,
          cqiName: s.cqi.name,
          primaryLine,
          lineRank: lineInfo.rank,
          lineTier: lineInfo.tier,
          lineRelativeLoad: lineInfo.relativeLoad,
          machineCount: (s.machines || []).length,
          centerRow,
          centerCol,
          assignedColor: null
        };
      });
      slotDetails.sort((a, b) => {
        if (a.lineRank !== b.lineRank) return a.lineRank - b.lineRank;
        return a.centerCol - b.centerCol;
      });
      slotDetails.forEach((slotInfo, sIdx) => {
        let targetHeatRank = 3;
        if (slotInfo.lineTier === "bottleneck") {
          targetHeatRank = 1;
        } else if (slotInfo.lineTier === "high") {
          targetHeatRank = slotInfo.machineCount >= 5 ? 1 : 2;
        } else if (slotInfo.lineTier === "medium") {
          targetHeatRank = 2;
        } else {
          targetHeatRank = 3;
        }
        const neighborColors = slotDetails.filter((other) => other.assignedColor && other !== slotInfo).filter((other) => {
          const d = Math.hypot(
            other.centerRow - slotInfo.centerRow,
            other.centerCol - slotInfo.centerCol
          );
          return d < 12 || other.primaryLine === slotInfo.primaryLine;
        }).map((other) => other.assignedColor);
        let bestCandidate = null;
        let bestScore = -Infinity;
        HEATMAP_PALETTES.forEach((col) => {
          let score = 0;
          const heatDiff = Math.abs(col.heatRank - targetHeatRank);
          score -= heatDiff * 45;
          for (const nCol of neighborColors) {
            const hueDist = getHueDistance(col.hue, nCol.hue);
            if (hueDist < 40) {
              score -= 600;
            } else if (hueDist < 65) {
              score -= 220;
            } else {
              score += hueDist * 1.5;
            }
            if (col.family === nCol.family) {
              score -= 350;
            }
          }
          const totalUsed = slotDetails.filter(
            (o) => o.assignedColor && o.assignedColor.id === col.id
          ).length;
          score -= totalUsed * 250;
          if (score > bestScore) {
            bestScore = score;
            bestCandidate = col;
          }
        });
        slotInfo.assignedColor = bestCandidate || HEATMAP_PALETTES[sIdx % HEATMAP_PALETTES.length];
      });
      for (let pass = 0; pass < 5; pass++) {
        let swapped = false;
        for (let i = 0; i < slotDetails.length; i++) {
          for (let j = i + 1; j < slotDetails.length; j++) {
            const a = slotDetails[i];
            const b = slotDetails[j];
            const dist = Math.hypot(
              a.centerRow - b.centerRow,
              a.centerCol - b.centerCol
            );
            const isNeighbor = dist < 11 || a.primaryLine === b.primaryLine;
            if (isNeighbor && a.assignedColor && b.assignedColor) {
              const hueDist = getHueDistance(
                a.assignedColor.hue,
                b.assignedColor.hue
              );
              if (hueDist < 45 || a.assignedColor.family === b.assignedColor.family) {
                let bestK = -1;
                for (let k = 0; k < slotDetails.length; k++) {
                  if (k === i || k === j) continue;
                  const cand = slotDetails[k];
                  if (!cand.assignedColor) continue;
                  const distToA = Math.hypot(
                    a.centerRow - cand.centerRow,
                    a.centerCol - cand.centerCol
                  );
                  if (distToA > 14 || cand.primaryLine !== a.primaryLine) {
                    const newHueDist = getHueDistance(
                      a.assignedColor.hue,
                      cand.assignedColor.hue
                    );
                    if (newHueDist > 70 && cand.assignedColor.family !== a.assignedColor.family) {
                      bestK = k;
                      break;
                    }
                  }
                }
                if (bestK !== -1) {
                  const temp = b.assignedColor;
                  b.assignedColor = slotDetails[bestK].assignedColor;
                  slotDetails[bestK].assignedColor = temp;
                  swapped = true;
                }
              }
            }
          }
        }
        if (!swapped) break;
      }
      const cqiColorMap = {};
      slotDetails.forEach((si) => {
        if (si.assignedColor) {
          cqiColorMap[si.cqiId] = si.assignedColor.hex;
        }
      });
      return { lineWorkloadMap, cqiColorMap, bottleneckLine, slotDetails };
    }
  };
  if (typeof globalThis !== "undefined") {
  }

  // src/brain/index.js
  var BrainAI = {
    ...utils_default,
    ...core_default,
    ...validator_default,
    ...formatter_default,
    ...history_default,
    ...heatmap_default
  };
  if (typeof globalThis !== "undefined") {
    globalThis.BrainAI = BrainAI;
  }
  if (typeof window !== "undefined") {
    window.BrainAI = BrainAI;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = BrainAI;
  }
  var index_default = BrainAI;
  return __toCommonJS(index_exports);
})();
