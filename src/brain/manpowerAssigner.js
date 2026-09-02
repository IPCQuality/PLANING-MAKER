/**
 * Modul Manpower Assigner
 * Mengelola penugasan personel Core, Non-Core, dan Longshift (LS)
 * berdasarkan preferensi prioritas personal dan kapasitas cluster.
 */

export default {
  /**
   * Memasangkan Core personnel ke slot CQI aktif sesuai hierarki prioritas
   */
  assignCorePersonnel(activeSlots, coreList, engine) {
    const availableCores = [...coreList];

    const pickCoreByQuery = (predicate) => {
      const idx = availableCores.findIndex(predicate);
      if (idx !== -1) {
        return availableCores.splice(idx, 1)[0];
      }
      return null;
    };

    // 1. Prioritas Khusus CQI 19 (OT): C14 (Farhan) -> C7 (Dini)
    const slot19Active = activeSlots.find((s) => s.cqiNum === "19");
    if (slot19Active && slot19Active.core === 0) {
      let chosenCore = pickCoreByQuery((c) => {
        const id = String(c.id || "").toUpperCase();
        const name = engine.normalizeName(c.name || "");
        return id === "C14" || name === "FARHAN";
      });

      if (!chosenCore) {
        chosenCore = pickCoreByQuery((c) => {
          const id = String(c.id || "").toUpperCase();
          const name = engine.normalizeName(c.name || "");
          return id === "C7" || name === "DINI";
        });
      }

      if (!chosenCore) {
        chosenCore = pickCoreByQuery((c) => {
          const p = String(c.cqi_priority || "").trim();
          return p === "19" || engine.getCqiNumber(p) === "19";
        });
      }

      if (chosenCore) {
        slot19Active.core = 1;
        slot19Active.coreNames = [chosenCore.name];
      }
    }

    // 2. Prioritas Khusus CQI 24 (WW): C9 (Jiddan) -> C8 (Mia)
    const slot24Active = activeSlots.find((s) => s.cqiNum === "24");
    if (slot24Active && slot24Active.core === 0) {
      let chosenCore = pickCoreByQuery((c) => {
        const id = String(c.id || "").toUpperCase();
        const name = engine.normalizeName(c.name || "");
        return id === "C9" || name === "JIDDAN";
      });

      if (!chosenCore) {
        chosenCore = pickCoreByQuery((c) => {
          const id = String(c.id || "").toUpperCase();
          const name = engine.normalizeName(c.name || "");
          return id === "C8" || name === "MIA";
        });
      }

      if (!chosenCore) {
        chosenCore = pickCoreByQuery((c) => {
          const p = String(c.cqi_priority || "").trim();
          return p === "24" || engine.getCqiNumber(p) === "24";
        });
      }

      if (chosenCore) {
        slot24Active.core = 1;
        slot24Active.coreNames = [chosenCore.name];
      }
    }

    // 3. Pasangkan Core berdasarkan cqi_priority ke nomor CQI yang cocok
    activeSlots.forEach((slot) => {
      if (slot.core > 0) return;
      const matchedCore = pickCoreByQuery((c) => {
        if (!c || !c.cqi_priority) return false;
        const prioNum = String(c.cqi_priority).trim();
        return (
          prioNum === slot.cqiNum ||
          engine.getCqiNumber(c.cqi_priority) === slot.cqiNum
        );
      });

      if (matchedCore) {
        slot.core = 1;
        slot.coreNames = [matchedCore.name];
      }
    });

    // 4. Pasangkan sisa Core secara sekuensial ke slot aktif yang belum ber-Core
    activeSlots.forEach((slot) => {
      if (slot.core === 0 && availableCores.length > 0) {
        const nextCore = availableCores.shift();
        slot.core = 1;
        slot.coreNames = [nextCore.name];
      }
    });
  },

  /**
   * Mendistribusikan Non-Core & Longshift (LS) ke slot CQI aktif
   */
  assignNonCoreAndLongshift(activeSlots, config, mode, engine) {
    const maxNcPerCqi = mode === 1 ? 2 : 1;
    const lsCount = parseInt(config.longshift || 0, 10);

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

    // CQI 24 dengan tambahan Pouch wajib 1 NC / LS
    const slot24 = activeSlots.find((s) => s.cqiNum === "24");
    if (slot24 && slot24.pouchAddedToWw) {
      if (nonCorePool.length > 0) {
        slot24.nonCore.push(nonCorePool.shift());
      } else if (lsPool.length > 0) {
        slot24.longshift.push(lsPool.shift());
      }
    }

    // Kebutuhan dasar Non-Core per slot sesuai aturan cluster
    activeSlots.forEach((slot) => {
      const count = slot.machines.length;
      const rule = engine.getClusterCapacityRule(slot);
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

    const getDynamicMaxNc = (slot, mode) => {
      const rule = engine.getClusterCapacityRule(slot);
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

    // Distribusi sisa Non-Core Pool
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

    // Distribusi sisa Longshift Pool
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

    return { remainingNonCore: nonCorePool, remainingLs: lsPool.length };
  },
};
