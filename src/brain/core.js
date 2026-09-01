export default {
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
    if (
      !Array.isArray(machines) ||
      machines.length === 0 ||
      !Array.isArray(cqis) ||
      cqis.length === 0
    ) {
      return [];
    }

    const mode = parseInt(config.mode || 1, 10) === 2 ? 2 : 1;
    const maxNcPerCqi = mode === 1 ? 2 : 1;
    const maxSlotCapacity = mode === 1 ? 10 : 8;
    const labels = mapData.labels || [];
    
    // Parse total Non-Core + LS resources for dynamic slot limits
    let ncCount = 0;
    if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
       ncCount = config.nonCoreData.length;
    } else if (Array.isArray(config.nonCoreNames)) {
       ncCount = config.nonCoreNames.length;
    }
    const lsCount = parseInt(config.longshift || 0, 10);
    const totalNcPool = ncCount + lsCount;

    // --- TAHAP 1: FILTER KATEGORI MESIN & HITUNG KAPASITAS CORE ---
    const runningMachines = [...machines];
    const wwMachines = runningMachines.filter((m) => this.isWwMachine(m));
    const otMachines = runningMachines.filter((m) => this.isOtMachine(m));
    const generalMachines = runningMachines.filter(
      (m) => !this.isWwMachine(m) && !this.isOtMachine(m),
    );

    const readyCQIs = cqis.filter((c) => c.status === "READY");
    const availableCqis = readyCQIs.length > 0 ? readyCQIs : [...cqis];

    // Hitung total Core yang tersedia
    let coreList = [];
    if (Array.isArray(config.coreData) && config.coreData.length > 0) {
      coreList = config.coreData.map((c) =>
        typeof c === "object" ? c : { name: c, cqi_priority: "" },
      );
    } else if (Array.isArray(config.coreNames) && config.coreNames.length > 0) {
      coreList = config.coreNames.map((name) => ({ name, cqi_priority: "" }));
    }
    let maxCoreSlots = availableCqis.length;
    if (coreList.length > 0) {
      maxCoreSlots = coreList.length;
    } else if (config.core !== undefined && config.core !== null) {
      maxCoreSlots = parseInt(config.core, 10);
      if (isNaN(maxCoreSlots)) maxCoreSlots = availableCqis.length;
    }

    // Kelompokkan mesin umum running menjadi Workstation Blocks (Zonasi Alami Lapangan)
    // Diperbarui: Pengelompokan berdasarkan Workstation + Cluster agar tidak terjadi block mixing failure
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
          line: ws.endsWith("A")
            ? "LINE A"
            : ws.endsWith("B")
              ? "LINE B"
              : ws.endsWith("C")
                ? "LINE C"
                : "OTHER",
          col: 99,
          row: 99,
        };

        const lbl = labels.find(
          (l) =>
            l.name === ws ||
            this.normalizeName(l.name) === this.normalizeName(ws),
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

    // --- TAHAP 2: SELEKSI CQI AKTIF SECARA STRATEGIS BERDASARKAN ZONA AKTIF LAPANGAN ---
    let selectedCQIs = [];
    const cqi19Obj = availableCqis.find((c) => this.getCqiNumber(c) === "19");
    const cqi24Obj = availableCqis.find((c) => this.getCqiNumber(c) === "24");

    // Prioritas 1: Sertakan CQI 19 jika ada mesin OT running
    if (otMachines.length > 0 && cqi19Obj) {
      selectedCQIs.push(cqi19Obj);
    }

    // Prioritas 2: Sertakan CQI 24 jika ada mesin WW running
    if (wwMachines.length > 0 && cqi24Obj && !selectedCQIs.includes(cqi24Obj)) {
      selectedCQIs.push(cqi24Obj);
    }

    // Prioritas 3: Deteksi Mesin Running di Line C -> Utamakan CQI 18 dan CQI 20 (serta CQI Line C)
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

    // Jika ada mesin running di Line C, seleksi CQI Line C (khususnya CQI 18 & CQI 20) terlebih dahulu
    if (lineCMachines.length > 0) {
      const lineCCandidates = candidateCqis.filter((c) => {
        const line = this.getCqiPrimaryLine(c);
        const num = this.getCqiNumber(c);
        return (
          line === "LINE C" || num === "18" || num === "20" || num === "17"
        );
      });

      // Urutkan CQI Line C: CQI 18 & CQI 20 diprioritaskan terlebih dahulu
      lineCCandidates.sort((a, b) => {
        const numA = this.getCqiNumber(a);
        const numB = this.getCqiNumber(b);
        const prioRank = { 18: 1, 20: 2, 17: 3 };
        const rA = prioRank[numA] || 9;
        const rB = prioRank[numB] || 9;
        return rA - rB;
      });

      // Hitung jumlah CQI Line C yang ideal untuk menampung mesin Line C (maks 8 mesin/CQI)
      const neededLineCSlots = Math.min(
        lineCCandidates.length,
        Math.ceil(lineCMachines.length / (mode === 1 ? 7 : 5)),
      );
      let lineCSlotsAdded = 0;
      while (
        selectedCQIs.length < maxCoreSlots &&
        lineCCandidates.length > 0 &&
        lineCSlotsAdded < neededLineCSlots
      ) {
        const cqiToPick = lineCCandidates.shift();
        selectedCQIs.push(cqiToPick);
        lineCSlotsAdded++;
      }
    }

    // Prioritas 4: Seleksi Dinamis & Adaptif (Dynamic Demand-Coverage Facility Location)
    // Menyesuaikan pemilihan CQI secara otomatis sesuai sebaran mesin RUNNING nyata di lapangan:
    // - Jika mesin running terkonsentrasi di pojok (kiri/kanan), CQI pojok otomatis terpilih.
    // - Jika mesin running terkonsentrasi di tengah, CQI tengah otomatis terpilih.
    // - Jika Line A dominan running, alokasi slot CQI Line A diperbanyak; jika Line B dominan, alokasi Line B diperbanyak.
    // - Jika Line C dominan running, CQI Line C diutamakan.
    const remainingCandidateCqis = candidateCqis.filter(
      (c) => !selectedCQIs.includes(c),
    );

    // Inisialisasi bobot kebutuhan (demand) tiap mesin running umum
    const machineDemand = generalMachines.map((m) => {
      const ws = this.getWorkstationKey(m, labels);
      return {
        machine: m,
        ws,
        line: ws.slice(-1),
        weight: 1.0,
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
          (w) => String(w).toUpperCase(),
        );

        // Hitung utilitas cakupan terhadap mesin-mesin running yang belum tercover
        const unservedMachines = machineDemand
          .filter((md) => md.weight > 0.1)
          .map((md) => {
            let effDist = this.calculateDistance(md.machine, c, labels);
            const mLineCode = md.line;
            const cLineCode =
              cqiLine === "LINE A"
                ? "A"
                : cqiLine === "LINE B"
                  ? "B"
                  : cqiLine === "LINE C"
                    ? "C"
                    : "";

            if (cLineCode && mLineCode && cLineCode !== mLineCode) {
              effDist += 16; // Penalti jarak menyeberang line agar memprioritaskan CQI satu line
            }

            // Prioritas kedekatan workstation utama
            const prioIdx = prioList.indexOf(md.ws);
            if (prioIdx === 0) effDist = Math.max(1, effDist - 4);
            else if (prioIdx === 1) effDist = Math.max(1, effDist - 2);

            const utility = md.weight * (10000 / (4 + effDist));
            return { md, effDist, utility };
          });

        unservedMachines.sort((a, b) => b.utility - a.utility);
        const topK = unservedMachines.slice(0, maxSlotCapacity);
        let totalUtility = topK.reduce((sum, item) => sum + item.utility, 0);

        // Preferensi Core jika ada nama pekerja yang memilih nomor CQI ini
        const hasCorePref = coreList.some((core) => {
          const p = String(core.cqi_priority || "").trim();
          return p === cqiNum || this.getCqiNumber(p) === cqiNum;
        });
        if (hasCorePref) totalUtility += 5000;

        if (totalUtility > bestScore) {
          bestScore = totalUtility;
          bestCqi = c;
          bestIndex = i;
        }
      }

      if (bestCqi && bestIndex >= 0) {
        selectedCQIs.push(bestCqi);
        activePool.splice(bestIndex, 1);

        // Kurangi bobot demand mesin-mesin yang paling dekat dengan CQI terpilih
        const cqiLine = this.getCqiPrimaryLine(bestCqi);
        const dists = machineDemand
          .filter((md) => md.weight > 0.1)
          .map((md) => {
            let d = this.calculateDistance(md.machine, bestCqi, labels);
            const mLineCode = md.line;
            const cLineCode =
              cqiLine === "LINE A"
                ? "A"
                : cqiLine === "LINE B"
                  ? "B"
                  : cqiLine === "LINE C"
                    ? "C"
                    : "";
            if (cLineCode && mLineCode && cLineCode !== mLineCode) d += 16;
            return { md, d };
          });
        dists.sort((a, b) => a.d - b.d);
        dists.slice(0, maxSlotCapacity).forEach((item) => {
          item.md.weight = Math.max(0, item.md.weight - 1.0);
        });
      } else {
        break;
      }
    }

    // Buat objek Slot Penampung
    const slots = selectedCQIs.map((c) => ({
      cqi: c,
      cqiNum: this.getCqiNumber(c),
      machines: [],
      core: 0,
      coreNames: [],
      nonCore: [],
      longshift: [],
      pouchAddedToWw: false,
      maxAllowedMachines: maxSlotCapacity,
    }));

    const slot24 = slots.find((s) => s.cqiNum === "24");
    const slot19 = slots.find((s) => s.cqiNum === "19");
    if (slot19) {
      slot19.maxAllowedMachines = 2;
    }

    // --- TAHAP 3: ALOKASI MESIN RUNNING KE CQI ---

    // PASS 1: MESIN OT (M2 & M3) -> STRICTLY CQI 19 ONLY
    if (otMachines.length > 0 && slot19) {
      otMachines.slice(0, 2).forEach((m) => {
        if (
          !slot19.machines.some((sm) => sm.id === m.id || sm.name === m.name)
        ) {
          slot19.machines.push(m);
        }
      });
    }

    // PASS 2: MESIN WW -> STRICTLY CQI 24 ONLY
    if (wwMachines.length > 0 && slot24) {
      wwMachines.forEach((m) => {
        if (
          slot24.machines.length < slot24.maxAllowedMachines &&
          !slot24.machines.some((sm) => sm.id === m.id || sm.name === m.name)
        ) {
          slot24.machines.push(m);
        }
      });
    }

    // PASS 3: ALOKASI MESIN UMUM PER WORKSTATION SECARA KONTIGU & ALAMI
    const excludedCqiNums = new Set(["19", "24"]);
    const generalSlots = slots.filter((s) => {
      const num = String(s.cqiNum || this.getCqiNumber(s.cqi) || "").trim();
      return !excludedCqiNums.has(num);
    });

    // Urutkan Workstation Blocks secara sekuensial denah: Line C -> Line A -> Line B -> Other (Kiri ke Kanan)
    const lineOrder = { "LINE C": 1, "LINE A": 2, "LINE B": 3, OTHER: 4 };
    const sortedWsBlocks = Object.values(wsBlocks).sort((a, b) => {
      const ordA = lineOrder[a.line] || 9;
      const ordB = lineOrder[b.line] || 9;
      if (ordA !== ordB) return ordA - ordB;
      return a.col - b.col;
    });

    // Helper evaluasi keselarasan slot terhadap satu blok workstation
    const evaluateBlockAffinity = (block, slot) => {
      const cqiNum = slot.cqiNum;
      const prioKey = "cqi " + cqiNum;
      const wsPrioList = (this.CQI_PRIORITY_MAP[prioKey] || []).map((w) =>
        String(w).toUpperCase(),
      );
      const wsKey = block.ws;
      const slotPrimaryLine = this.getCqiPrimaryLine(slot.cqi);

      let score = 0;

      // 1. CQI Priority Map Rank (Pertimbangan Utama dari Peta Prioritas CQI)
      const prioIdx = wsPrioList.indexOf(wsKey);
      if (prioIdx === 0)
        score -= 1800; // Prioritas utama primer di peta
      else if (prioIdx === 1)
        score -= 1100; // Prioritas sekunder
      else if (prioIdx >= 2) score -= Math.max(300, 750 - prioIdx * 80);

      // 2. Keselarasan Line & Rekomendasi Pengurangan Cross-Line Walking
      if (cqiNum === "15") {
        // Aturan Khusus CQI 15:
        // Prioritaskan mengambil mesin di Line B.
        // Jika mengambil mesin Line C, hanya ambil yang terdekat seperti 1C/2C (C1/C2) dan hindari Line C yang jauh.
        if (block.line === "LINE B") {
          score -= 2800; // Prioritas utama: Line B
        } else if (block.line === "LINE C") {
          const wsUpper = wsKey.toUpperCase();
          if (wsUpper === "1C" || wsUpper === "2C") {
            score += 600; // Toleransi jika terpaksa mengambil Line C terdekat
          } else {
            score += 4800; // Penalti berat untuk Line C yang jauh (3C-10C)
          }
        } else {
          score += 3200; // Penalti untuk Line A
        }
      } else if (block.line === "LINE C") {
        if (slotPrimaryLine === "LINE C") {
          score -= 4000; // Prioritas mutlak: Mesin Line C ke CQI Line C
        } else {
          score += 3500; // Penalti: Cegah mesin Line C keluar line
        }
      } else {
        if (slotPrimaryLine === "LINE C") {
          score += 3500; // Penalti: Cegah mesin Line A / Line B masuk Line C
        } else if (slotPrimaryLine === block.line) {
          score -= 1800; // Rekomendasi kuat: Tetap dalam line yang sama
        } else {
          score += 3000; // Penalti saran: Mengurangi cross-line walking antara Line A dan Line B
        }
      }

      // 3. Jarak langkah fisik dari workstation ke CQI (Rute Lorong)
      const sampleMachine = block.machines[0];
      const dist = this.calculateDistance(sampleMachine, slot.cqi, labels);
      score += dist * 15;

      // 4. Integritas Workstation: Jika slot sudah memiliki mesin dari WS yang sama
      const sameWsCount = slot.machines.filter(
        (sm) => this.getWorkstationKey(sm, labels) === wsKey,
      ).length;
      if (sameWsCount > 0) {
        score -= 750; // Pertahankan keutuhan satu workstation
      }

      // 5. Kontinuitas & Penggabungan Workstation Bersebelahan dalam 1 Line (misal 8A + 9A di CQI 8)
      const slotWsKeys = slot.machines.map((sm) =>
        this.getWorkstationKey(sm, labels),
      );
      const currentWsNums = slotWsKeys
        .map((w) => parseInt(w.replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
      const blockWsNum = parseInt(wsKey.replace(/\D/g, ""), 10);
      const isAdjacent = currentWsNums.some(
        (n) => Math.abs(n - blockWsNum) === 1,
      );
      const sameLine = slotWsKeys.some((w) => w.slice(-1) === wsKey.slice(-1));

      if (
        sameLine &&
        isAdjacent &&
        slot.machines.length + block.machines.length <= slot.maxAllowedMachines
      ) {
        score -= 1500; // Kuatkan penggabungan blok bersebelahan agar 1 slot penuh di 1 line tanpa cross-line
      } else if (sameLine) {
        score -= 400;
      }

      // 6. Beban seimbang secara manusiawi & Intra-Line Load Awareness
      const lineSlots = generalSlots.filter(
        (s) => this.getCqiPrimaryLine(s.cqi) === block.line,
      );
      const lineTotalMachines = sortedWsBlocks
        .filter((b) => b.line === block.line)
        .reduce((acc, b) => acc + b.machines.length, 0);
      const targetQuota =
        lineSlots.length > 0
          ? Math.ceil(lineTotalMachines / lineSlots.length)
          : maxSlotCapacity;

      if (slot.machines.length >= targetQuota) {
        score += (slot.machines.length - targetQuota + 1) * 850;
      } else {
        score += slot.machines.length * 60;
      }

      // 7. Pengaruh Pembelajaran AI / Riwayat Historis Mesin ke CQI (History Affinity Bonus)
      let blockHistoryBonus = 0;
      block.machines.forEach((m) => {
        blockHistoryBonus += this.getHistoryBonus(m, slot.cqi);
      });
      score -= blockHistoryBonus * 25; // Prioritaskan slot dengan riwayat penugasan historis tinggi

      return score;
    };

    // Alokasikan setiap blok workstation utuh ke slot paling ideal
    sortedWsBlocks.forEach((block) => {
      const blockMachines = [...block.machines];

      // Saring slot yang valid berdasarkan aturan cluster mixing
      let validSlots = generalSlots.filter((s) => {
        return blockMachines.every((m) =>
          this.canAddMachineToSlotCluster(m, s),
        );
      });

      if (validSlots.length === 0) {
        validSlots = generalSlots;
      }

      // Urutkan slot berdasarkan kecocokan operasional terbaik
      validSlots.sort(
        (a, b) =>
          evaluateBlockAffinity(block, a) - evaluateBlockAffinity(block, b),
      );

      let remainingInBlock = [...blockMachines];

      for (const targetSlot of validSlots) {
        if (remainingInBlock.length === 0) break;
        const availableSpace =
          this.getDynamicSlotLimit(targetSlot, mode, totalNcPool, slots) - targetSlot.machines.length;
        if (availableSpace <= 0) continue;

        const validToInsert = remainingInBlock.filter((m) =>
          this.canAddMachineToSlotCluster(m, targetSlot),
        );
        const canTake = Math.min(availableSpace, validToInsert.length);
        if (canTake > 0) {
          const taken = validToInsert.slice(0, canTake);
          targetSlot.machines.push(...taken);
          remainingInBlock = remainingInBlock.filter((m) => !taken.includes(m));
        }
      }

      // Jika masih ada sisa karena slot penuh, tempatkan ke slot umum yang kompatibel dengan ruang tersisa
      if (remainingInBlock.length > 0) {
        let stillRemaining = [...remainingInBlock];
        const compatibleSlots = generalSlots.filter((s) =>
          stillRemaining.some((m) => this.canAddMachineToSlotCluster(m, s)),
        );
        let fallbacks = (
          compatibleSlots.length > 0 ? compatibleSlots : generalSlots
        ).sort((a, b) => a.machines.length - b.machines.length);

        for (const fb of fallbacks) {
          if (stillRemaining.length === 0) break;
          const available = this.getDynamicSlotLimit(fb, mode, totalNcPool, slots) - fb.machines.length;
          if (available <= 0) continue;

          const validToInsert = stillRemaining.filter((m) =>
            this.canAddMachineToSlotCluster(m, fb),
          );
          const toPush = validToInsert.slice(0, available);
          if (toPush.length > 0) {
            fb.machines.push(...toPush);
            stillRemaining = stillRemaining.filter((m) => !toPush.includes(m));
          }
        }
      }
    });

    // --- TAHAP 3.5: INTRA-LINE LOAD BALANCING (PERATAAN BEBAN MERATA ANTAR-CQI DALAM 1 LINE) ---
    // Memastikan beban mesin terbagi adil dan proporsional antar-CQI pada line yang sama (Line C, Line A, Line B),
    // terutama saat kondisi mesin longgar/berlebih agar tidak ada CQI yang kelebihan beban sementara CQI pasangannya kosong/sedikit.
    const linesToBalance = ["LINE C", "LINE A", "LINE B"];
    linesToBalance.forEach((lineName) => {
      const lineSlots = generalSlots.filter(
        (s) => this.getCqiPrimaryLine(s.cqi) === lineName,
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
          if (
            maxSlot.machines.length - groupSize <
            minSlot.machines.length + groupSize - 1
          ) {
            if (
              groupSize > 1 &&
              maxSlot.machines.length - groupSize < minSlot.machines.length
            )
              continue;
          }

          const clusterValid = group.every((m) =>
            this.canAddMachineToSlotCluster(m, minSlot),
          );
          if (!clusterValid) continue;

          const sampleM = group[0];
          const distToMin = this.calculateDistance(
            sampleM,
            minSlot.cqi,
            labels,
          );
          const distToMax = this.calculateDistance(
            sampleM,
            maxSlot.cqi,
            labels,
          );

          const prioKeyMin = "cqi " + minSlot.cqiNum;
          const prioListMin = (this.CQI_PRIORITY_MAP[prioKeyMin] || []).map(
            (w) => String(w).toUpperCase(),
          );
          const prioIdxMin = prioListMin.indexOf(wsKey);

          let transferScore =
            1000 - distToMin + (distToMax >= distToMin ? 500 : 0);
          if (prioIdxMin >= 0) transferScore += (10 - prioIdxMin) * 200;

          if (transferScore > bestTransferScore) {
            bestTransferScore = transferScore;
            bestWsCandidate = { wsKey, machines: group };
          }
        }

        if (bestWsCandidate) {
          const movingIds = new Set(
            bestWsCandidate.machines.map((m) => m.id || m.name),
          );
          maxSlot.machines = maxSlot.machines.filter(
            (m) => !movingIds.has(m.id || m.name),
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
                (sm) => (sm.id || sm.name) !== (m.id || m.name),
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

    // Pengecekan Khusus CQI 24 (WW) APK Line C Overflow & Tambahan Mesin:
    // ATURAN: Mesin Line A dan Line B tidak boleh masuk ke CQI 24, hanya mesin APK Line C saja yang diperbolehkan.
    if (slot24) {
      let apkCandidates = [];
      const overloadThreshold = mode === 1 ? 6 : 4;
      // Jangan ambil mesin dari slot Line C (CQI 18/20) jika slot Line C masih normal (<= 8 mesin)
      const overloadedSlots = generalSlots.filter((s) => {
        const isLineC = this.getCqiPrimaryLine(s.cqi) === "LINE C";
        return isLineC
          ? s.machines.length > 8
          : s.machines.length > overloadThreshold;
      });

      if (overloadedSlots.length > 0) {
        overloadedSlots.forEach((os) => {
          // HANYA ambil mesin APK Line C (Mesin Line A dan Line B DILARANG masuk CQI 24)
          const apkLineCMachines = os.machines.filter((m) => {
            if (!this.isMachineLineC(m, labels)) return false;
            const line = String(m.line || "").toUpperCase();
            const ws = String(m.workstation || m.ws || "").toUpperCase();
            if (
              line.includes("LINE A") ||
              line.includes("LINE B") ||
              line === "A" ||
              line === "B" ||
              ws.endsWith("A") ||
              ws.endsWith("B")
            ) {
              return false;
            }
            return (
              this.isPouchMachine(m) ||
              String(m.name || m.id || "")
                .toUpperCase()
                .startsWith("APK")
            );
          });

          apkLineCMachines.forEach((pm) => {
            if (apkCandidates.length < 4) {
              apkCandidates.push(pm);
              os.machines = os.machines.filter(
                (m) => (m.id || m.name) !== (pm.id || pm.name),
              );
            }
          });
        });
      }

      if (apkCandidates.length > 0) {
        // Prioritaskan jarak terdekat ke WW
        apkCandidates.sort((a, b) => {
          return (
            this.calculateDistance(a, slot24.cqi, labels) -
            this.calculateDistance(b, slot24.cqi, labels)
          );
        });
        const available = slot24.maxAllowedMachines - slot24.machines.length;
        if (available > 0) {
          const addedApk = apkCandidates.slice(0, Math.min(4, available));
          addedApk.forEach((pm) => slot24.machines.push(pm));
          slot24.pouchAddedToWw = true;
        }
      }
    }

    // Saring slot aktif yang memiliki mesin
    const activeSlots = slots.filter((s) => s.machines.length > 0);

    // --- TAHAP 4: PEMASANGAN CORE MANPOWER SESUAI HIERARKI PRIORITAS CQI ---
    const availableCores = [...coreList];

    // Helper pencarian Core berdasarkan kriteria ID / Nama
    const pickCoreByQuery = (predicate) => {
      const idx = availableCores.findIndex(predicate);
      if (idx !== -1) {
        return availableCores.splice(idx, 1)[0];
      }
      return null;
    };

    // 1. Prioritas Khusus CQI 19:
    // "1. prioritas cqi 19 adalah C14 jika C14 tidak ada maka gunakan C7"
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

    // 2. Prioritas Khusus CQI 24 (WW):
    // "2. prioritas cqi 24 adalah C9 jika C9 tidak ada maka gunakan C8"
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

    // 3. Pasangkan Core yang memiliki "cqi_priority" cocok dengan nomor CQI lainnya
    activeSlots.forEach((slot) => {
      if (slot.core > 0) return;
      const matchedCore = pickCoreByQuery((c) => {
        if (!c || !c.cqi_priority) return false;
        const prioNum = String(c.cqi_priority).trim();
        return (
          prioNum === slot.cqiNum ||
          this.getCqiNumber(c.cqi_priority) === slot.cqiNum
        );
      });

      if (matchedCore) {
        slot.core = 1;
        slot.coreNames = [matchedCore.name];
      }
    });

    // 4. Pasangkan sisa Core sesuai urutan ke slot aktif yang belum terisi
    activeSlots.forEach((slot) => {
      if (slot.core === 0 && availableCores.length > 0) {
        const nextCore = availableCores.shift();
        slot.core = 1;
        slot.coreNames = [nextCore.name];
      }
    });

    // --- TAHAP 5 & 6: DISTRIBUSI NON-CORE & LONGSHIFT SESUAI ATURAN MODE 1 / MODE 2 ---
    let nonCoreNames = [];
    if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
      nonCoreNames = config.nonCoreData
        .map((nc) =>
          typeof nc === "object" ? nc.name || "" : String(nc || ""),
        )
        .filter((n) => n.trim() !== "");
    } else if (Array.isArray(config.nonCoreNames)) {
      nonCoreNames = config.nonCoreNames
        .map((nc) =>
          typeof nc === "object" ? nc.name || "" : String(nc || ""),
        )
        .filter((n) => n.trim() !== "");
    }
    const nonCorePool = [...nonCoreNames];

    const lsPool = Array.from({ length: lsCount }, () => "(LS)");

    // Aturan Khusus CQI 24: Jika ada tambahan Pouch, wajib diberi 1 Non-Core / (LS)
    if (slot24 && slot24.pouchAddedToWw) {
      if (nonCorePool.length > 0) {
        slot24.nonCore.push(nonCorePool.shift());
      } else if (lsPool.length > 0) {
        slot24.longshift.push(lsPool.shift());
      }
    }

    // Hitung kebutuhan Non-Core berdasarkan beban mesin per slot sesuai Mode 1 / Mode 2 & Aturan Cluster:
    activeSlots.forEach((slot) => {
      const count = slot.machines.length;
      const rule = this.getClusterCapacityRule(slot);
      const neededNc = rule.getNeededNc(count, mode);

      while (
        slot.nonCore.length + slot.longshift.length < neededNc &&
        slot.nonCore.length + slot.longshift.length < maxNcPerCqi
      ) {
        if (nonCorePool.length > 0) {
          slot.nonCore.push(nonCorePool.shift());
        } else if (lsPool.length > 0) {
          slot.longshift.push(lsPool.shift());
        } else {
          break;
        }
      }
    });

    // Distribusikan sisa Non-Core / LS ke slot yang masih bisa menerima (berdasarkan aturan cluster):
    const getDynamicMaxNc = (slot, mode) => {
      const rule = this.getClusterCapacityRule(slot);
      const count = slot.machines.length;
      if (mode === 1) {
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
        (s) =>
          s.nonCore.length + s.longshift.length <
            getDynamicMaxNc(s, mode) &&
          s.nonCore.length + s.longshift.length < maxNcPerCqi,
      );
      if (eligibleSlots.length === 0) break;

      eligibleSlots.sort((a, b) => {
        const loadA =
          a.machines.length /
          (a.core + a.nonCore.length + a.longshift.length + 0.1);
        const loadB =
          b.machines.length /
          (b.core + b.nonCore.length + b.longshift.length + 0.1);
        return loadB - loadA;
      });

      eligibleSlots[0].nonCore.push(nonCorePool.shift());
    }

    while (lsPool.length > 0) {
      const eligibleSlots = activeSlots.filter(
        (s) =>
          s.nonCore.length + s.longshift.length <
            getDynamicMaxNc(s, mode) &&
          s.nonCore.length + s.longshift.length < maxNcPerCqi,
      );
      if (eligibleSlots.length === 0) break;

      eligibleSlots.sort((a, b) => {
        const loadA =
          a.machines.length /
          (a.core + a.nonCore.length + a.longshift.length + 0.1);
        const loadB =
          b.machines.length /
          (b.core + b.nonCore.length + b.longshift.length + 0.1);
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

    // Hitung mesin running yang belum teralokasi (unassigned/uncovered)
    const assignedIds = new Set();
    activeSlots.forEach((s) =>
      s.machines.forEach((m) => assignedIds.add(m.id || m.name)),
    );

    const unassigned = runningMachines.filter(
      (m) => !assignedIds.has(m.id || m.name),
    );
    activeSlots.unassignedMachines = unassigned;
    activeSlots.uncoveredMachines = unassigned;

    // Hitung Sisa LS yang belum terpakai di planning
    const totalLsInput = parseInt(config.longshift || 0, 10);
    const assignedLsCount = activeSlots.reduce(
      (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
      0,
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
  forceFitUnassignedMachines(
    slots,
    unassignedMachines = null,
    config = {},
    mapData = {},
  ) {
    if (!Array.isArray(slots) || slots.length === 0) return slots;

    let remaining = Array.isArray(unassignedMachines)
      ? [...unassignedMachines]
      : slots.unassignedMachines
        ? [...slots.unassignedMachines]
        : [];

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

    // Filter CQI calon (kecuali CQI 19 OT & CQI 24 WW)
    const candidates = slots.filter(
      (s) => s.cqiNum !== "19" && s.cqiNum !== "24",
    );

    // Urutkan slot calon: Line C -> Line A -> Line B
    candidates.sort((a, b) => {
      const lineA = this.getCqiPrimaryLine(a.cqi);
      const lineB = this.getCqiPrimaryLine(b.cqi);
      const ordA = lineOrder[lineA] || 9;
      const ordB = lineOrder[lineB] || 9;
      if (ordA !== ordB) return ordA - ordB;
      return (parseInt(a.cqiNum, 10) || 99) - (parseInt(b.cqiNum, 10) || 99);
    });

    // STEP 1: Direct insertion ke CQI yang belum mencapai batas kapasitas cluster dan kompatibel
    for (const slot of candidates) {
      if (remaining.length === 0) break;
      const slotLimit = this.getDynamicSlotLimit(slot, mode, totalNcPool, slots);
      slot.maxAllowedMachines = slotLimit;

      let progress = true;
      while (slot.machines.length < slotLimit && remaining.length > 0 && progress) {
        progress = false;
        for (let i = 0; i < remaining.length; i++) {
          const m = remaining[i];
          // Khusus CQI 15: Jika mengambil mesin Line C, prioritaskan Line B dan hanya boleh 1C/2C untuk Line C
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

    // STEP 2: Smart Shift/Swap jika masih ada sisa
    if (remaining.length > 0) {
      for (const targetSlot of candidates) {
        if (remaining.length === 0) break;
        const targetLimit = this.getDynamicSlotLimit(targetSlot, mode, totalNcPool, slots);
        targetSlot.maxAllowedMachines = targetLimit;
        if (targetSlot.machines.length >= targetLimit) continue;

        const unassignedM = remaining[0];

        if (
          targetSlot.cqiNum === "15" &&
          this.isMachineLineC(unassignedM, labels)
        ) {
          const ws = this.getWorkstationKey(unassignedM, labels).toUpperCase();
          if (ws !== "1C" && ws !== "2C") continue;
        }

        // Cari slot pendukung (donorSlot) yang mau menerima salah satu mesin dari targetSlot
        for (const donorSlot of candidates) {
          const donorLimit = this.getDynamicSlotLimit(donorSlot, mode, totalNcPool, slots);
          if (donorSlot === targetSlot || donorSlot.machines.length >= donorLimit)
            continue;

          for (let i = 0; i < targetSlot.machines.length; i++) {
            const mToMove = targetSlot.machines[i];
            if (this.canAddMachineToSlotCluster(mToMove, donorSlot)) {
              // Uji coba pindah mToMove dari targetSlot ke donorSlot
              targetSlot.machines.splice(i, 1);
              donorSlot.machines.push(mToMove);

              if (this.canAddMachineToSlotCluster(unassignedM, targetSlot)) {
                // Sukses! Masukkan unassignedM ke targetSlot
                targetSlot.machines.push(remaining.shift());
                break;
              } else {
                // Gagal, kembalikan posisi semula
                donorSlot.machines.pop();
                targetSlot.machines.splice(i, 0, mToMove);
              }
            }
          }
          if (remaining.length === 0) break;
        }
      }
    }

    // Perbarui penanda sisa mesin & LS
    slots.unassignedMachines = remaining;
    slots.uncoveredMachines = remaining;

    const totalLsInput = parseInt(config.longshift || 0, 10);
    const assignedLsCount = slots.reduce(
      (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
      0,
    );
    slots.remainingLs = Math.max(0, totalLsInput - assignedLsCount);
    // Persist remainingNonCore from initial generation
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
  },

};
