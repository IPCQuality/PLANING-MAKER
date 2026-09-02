/**
 * Modul Unassigned Fitter
 * Bertanggung jawab memaksa alokasi mesin sisa (unassigned/uncovered)
 * ke CQI yang paling memungkinkan dengan perpindahan pintar (smart shift/swap).
 */

export default {
  /**
   * Menghitung skor kelayakan slot CQI terhadap mesin sisa
   */
  getSlotProximityScore(m, slot, engine, labels) {
    const cqiNum = String(slot.cqiNum || engine.getCqiNumber(slot.cqi));
    const prioKey = "cqi " + cqiNum;
    const wsPrioList = (engine.CQI_PRIORITY_MAP[prioKey] || []).map((w) =>
      String(w).toUpperCase(),
    );
    const wsKey = engine.getWorkstationKey(m, labels).toUpperCase();
    const mLine = engine.getMachineLine(m, labels);
    const slotPrimaryLine = engine.getCqiPrimaryLine(slot.cqi);

    let score = 0;

    // 1. Peta Prioritas CQI
    const prioIdx = wsPrioList.indexOf(wsKey);
    if (prioIdx === 0) score -= 22000;
    else if (prioIdx === 1) score -= 15000;
    else if (prioIdx === 2) score -= 9000;
    else if (prioIdx > 2) score -= Math.max(2000, 5000 - prioIdx * 1000);
    else score += 3500;

    // 2. Keselarasan Line (Utamakan tetap di Line yang sama)
    if (cqiNum === "15") {
      if (mLine === "LINE B") {
        score -= 3200;
      } else if (mLine === "LINE C") {
        if (wsKey === "1C" || wsKey === "2C") score += 200;
        else score += 5000;
      } else {
        score += 3500;
      }
    } else if (mLine === slotPrimaryLine) {
      score -= 3000;
    } else {
      if (mLine === "LINE C" || slotPrimaryLine === "LINE C") {
        score += 6000;
      } else {
        score += 3800;
      }
    }

    // 3. Jarak fisik
    const dist = engine.calculateDistance(m, slot.cqi, labels);
    score += dist * 25;

    // 4. Keutuhan Workstation
    const sameWsCount = slot.machines.filter(
      (sm) => engine.getWorkstationKey(sm, labels).toUpperCase() === wsKey,
    ).length;
    if (sameWsCount > 0) {
      score -= 1000;
    }

    // 5. Riwayat Pembelajaran
    const histBonus = engine.getHistoryBonus(m, slot.cqi);
    score -= histBonus * 30;

    // 6. Beban mesin terpasang
    score += slot.machines.length * 50;

    return score;
  },

  /**
   * Memaksa alokasi mesin sisa secara presisi dan terstruktur
   */
  forceFit(slots, unassignedMachines, config, mapData, engine) {
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
    const mode = parseInt(config.mode || 1, 10) === 2 ? 2 : 1;

    let ncCount = 0;
    if (Array.isArray(config.nonCoreData) && config.nonCoreData.length > 0) {
      ncCount = config.nonCoreData.length;
    } else if (Array.isArray(config.nonCoreNames)) {
      ncCount = config.nonCoreNames.length;
    }
    const lsCount = parseInt(config.longshift || 0, 10);
    const totalNcPool = ncCount + lsCount;

    const isSlotEligibleForMachine = (slot, m) => {
      if (slot.cqiNum === "19") {
        return engine.isOtMachine(m);
      }
      if (slot.cqiNum === "24") {
        if (engine.isWwMachine(m)) return true;
        if (engine.isMachineLineC(m, labels)) {
          const nonWw = slot.machines.filter((sm) => !engine.isWwMachine(sm)).length;
          return (
            nonWw < 4 &&
            (engine.isPouchMachine(m) ||
              String(m.name || m.id || "").toUpperCase().startsWith("APK"))
          );
        }
        return false;
      }
      if (slot.cqiNum === "15" && engine.isMachineLineC(m, labels)) {
        const ws = engine.getWorkstationKey(m, labels).toUpperCase();
        if (ws !== "1C" && ws !== "2C") return false;
      }
      return engine.canAddMachineToSlotCluster(m, slot);
    };

    // STEP 1: Direct insertion ke CQI TERDEKAT & PALING KOMPATIBEL
    let directProgress = true;
    while (remaining.length > 0 && directProgress) {
      directProgress = false;

      for (let i = 0; i < remaining.length; i++) {
        const m = remaining[i];

        const eligibleSlots = slots.filter((slot) => {
          const slotLimit = engine.getDynamicSlotLimit(
            slot,
            mode,
            totalNcPool,
            slots,
          );
          slot.maxAllowedMachines = slotLimit;
          if (slot.machines.length >= slotLimit) return false;

          return isSlotEligibleForMachine(slot, m);
        });

        if (eligibleSlots.length > 0) {
          eligibleSlots.sort(
            (a, b) =>
              this.getSlotProximityScore(m, a, engine, labels) -
              this.getSlotProximityScore(m, b, engine, labels),
          );

          const bestSlot = eligibleSlots[0];
          bestSlot.machines.push(m);
          remaining.splice(i, 1);
          directProgress = true;
          break;
        }
      }
    }

    // STEP 2: Smart Shift/Swap jika direct insertion gagal
    if (remaining.length > 0) {
      let shiftProgress = true;
      while (remaining.length > 0 && shiftProgress) {
        shiftProgress = false;

        for (let rIdx = 0; rIdx < remaining.length; rIdx++) {
          const unassignedM = remaining[rIdx];

          const sortedTargetSlots = [...slots].sort(
            (a, b) =>
              this.getSlotProximityScore(unassignedM, a, engine, labels) -
              this.getSlotProximityScore(unassignedM, b, engine, labels),
          );

          let placed = false;

          for (const targetSlot of sortedTargetSlots) {
            if (placed) break;
            const targetLimit = engine.getDynamicSlotLimit(
              targetSlot,
              mode,
              totalNcPool,
              slots,
            );
            targetSlot.maxAllowedMachines = targetLimit;
            if (targetSlot.machines.length >= targetLimit) continue;
            if (!isSlotEligibleForMachine(targetSlot, unassignedM)) continue;

            for (const donorSlot of slots) {
              if (placed) break;
              if (donorSlot === targetSlot) continue;

              const donorLimit = engine.getDynamicSlotLimit(
                donorSlot,
                mode,
                totalNcPool,
                slots,
              );
              if (donorSlot.machines.length >= donorLimit) continue;

              for (let i = 0; i < targetSlot.machines.length; i++) {
                const mToMove = targetSlot.machines[i];
                if (isSlotEligibleForMachine(donorSlot, mToMove)) {
                  targetSlot.machines.splice(i, 1);
                  donorSlot.machines.push(mToMove);

                  if (isSlotEligibleForMachine(targetSlot, unassignedM)) {
                    targetSlot.machines.push(unassignedM);
                    remaining.splice(rIdx, 1);
                    placed = true;
                    shiftProgress = true;
                    break;
                  } else {
                    donorSlot.machines.pop();
                    targetSlot.machines.splice(i, 0, mToMove);
                  }
                }
              }
            }
          }

          if (placed) break;
        }
      }
    }

    // STEP 3: Fallback Absolute Max Insertion
    if (remaining.length > 0) {
      for (let rIdx = remaining.length - 1; rIdx >= 0; rIdx--) {
        const unassignedM = remaining[rIdx];
        const mLine = engine.getMachineLine(unassignedM, labels);
        const wsKey = engine.getWorkstationKey(unassignedM, labels).toUpperCase();

        const eligibleSlots = slots.filter((slot) => {
          const rule = engine.getClusterCapacityRule([...slot.machines, unassignedM]);
          if (slot.machines.length >= rule.absoluteMax) return false;
          return isSlotEligibleForMachine(slot, unassignedM);
        });

        if (eligibleSlots.length > 0) {
          eligibleSlots.sort((a, b) => {
            const aLine = engine.getCqiPrimaryLine(a.cqi);
            const bLine = engine.getCqiPrimaryLine(b.cqi);
            const aSame = aLine === mLine ? 0 : 1;
            const bSame = bLine === mLine ? 0 : 1;
            if (aSame !== bSame) return aSame - bSame;

            const prioKeyA = "cqi " + a.cqiNum;
            const prioKeyB = "cqi " + b.cqiNum;
            const prioListA = (engine.CQI_PRIORITY_MAP[prioKeyA] || []).map((w) =>
              String(w).toUpperCase(),
            );
            const prioListB = (engine.CQI_PRIORITY_MAP[prioKeyB] || []).map((w) =>
              String(w).toUpperCase(),
            );
            const idxA = prioListA.indexOf(wsKey);
            const idxB = prioListB.indexOf(wsKey);
            const pA = idxA >= 0 ? idxA : 99;
            const pB = idxB >= 0 ? idxB : 99;
            if (pA !== pB) return pA - pB;

            const distA = engine.calculateDistance(unassignedM, a.cqi, labels);
            const distB = engine.calculateDistance(unassignedM, b.cqi, labels);
            if (distA !== distB) return distA - distB;

            return a.machines.length - b.machines.length;
          });

          eligibleSlots[0].machines.push(unassignedM);
          remaining.splice(rIdx, 1);
        }
      }
    }

    // STEP 4: Sinkronisasi Ulang Manpower Non-Core & Longshift
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

    slots.forEach((s) => {
      s.nonCore = [];
      s.longshift = [];
    });

    const activeSlots = slots.filter((s) => s.machines.length > 0);

    activeSlots.forEach((slot) => {
      const count = slot.machines.length;
      const rule = engine.getClusterCapacityRule(slot);
      const neededNc = rule.getNeededNc(count, mode);
      const maxNcPerCqi = mode === 2 ? 1 : 2;

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

    while (nonCorePool.length > 0) {
      const eligibleSlots = activeSlots.filter(
        (s) =>
          s.nonCore.length + s.longshift.length < (mode === 2 ? 1 : 2) &&
          s.machines.length > engine.getClusterCapacityRule(s).maxCoreOnly,
      );
      if (eligibleSlots.length === 0) break;
      eligibleSlots.sort((a, b) => b.machines.length - a.machines.length);
      eligibleSlots[0].nonCore.push(nonCorePool.shift());
    }

    while (lsPool.length > 0) {
      const eligibleSlots = activeSlots.filter(
        (s) =>
          s.nonCore.length + s.longshift.length < (mode === 2 ? 1 : 2) &&
          s.machines.length > engine.getClusterCapacityRule(s).maxCoreOnly,
      );
      if (eligibleSlots.length === 0) break;
      eligibleSlots.sort((a, b) => b.machines.length - a.machines.length);
      eligibleSlots[0].longshift.push(lsPool.shift());
    }

    slots.unassignedMachines = remaining;
    slots.uncoveredMachines = remaining;

    const totalLsInput = parseInt(config.longshift || 0, 10);
    const assignedLsCount = slots.reduce(
      (sum, s) => sum + (s.longshift ? s.longshift.length : 0),
      0,
    );
    slots.remainingLs = Math.max(0, totalLsInput - assignedLsCount);
    if (!slots.remainingNonCore) slots.remainingNonCore = [];

    return slots;
  },
};
