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
          targetSlot.maxAllowedMachines - targetSlot.machines.length;
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
          const available = fb.maxAllowedMachines - fb.machines.length;
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

          if (minSlot.machines.length + groupSize > minSlot.maxAllowedMachines)
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
