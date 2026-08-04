export class CQIPlannerEngine {
  static computeManhattanDistance(nodeA, nodeB) {
    return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
  }

  static runAutoPlanning(machines, cqis, runningStates, activeCQIs) {
    // 1. Filter entitas aktif
    const activeCQIList = cqis.filter(c => activeCQIs[c.id] !== 'inactive');
    const runningMachineList = machines.filter(m => runningStates[m.id] === 'running');

    // Inisialisasi struktur assignment objek map
    const assignments = {};
    activeCQIList.forEach(c => { assignments[c.id] = []; });

    if (activeCQIList.length === 0) return assignments;

    // Kunci pelacakan alokasi unik mesin
    const allocatedMachineIds = new Set();

    // 2. Eksekusi Pembagian Putaran Bertahap (Smart Distribution Multi-Round)
    for (let round = 0; round < 8; round++) {
      let allocatedInThisRound = 0;

      for (const cqi of activeCQIList) {
        if (assignments[cqi.id].length >= 8) continue;

        // Cari daftar kandidat mesin yang belum terkunci
        let pool = runningMachineList.filter(m => !allocatedMachineIds.has(m.id));
        if (pool.length === 0) break;

        // Hitung jarak ke setiap kandidat mesin
        pool = pool.map(m => ({
          machine: m,
          dist: this.computeManhattanDistance(cqi, m)
        }));

        // 3. Urutkan berdasarkan prioritas Tie-Breaking terperinci
        pool.sort((a, b) => {
          if (a.dist !== b.dist) return a.dist - b.dist; // 1. Jarak terdekat
          if (a.machine.y !== b.machine.y) return a.machine.y - b.machine.y; // 2. Baris sama
          if (a.machine.x !== b.machine.x) return a.machine.x - b.machine.x; // 3. Kolom sama
          return a.machine.id.localeCompare(b.machine.id); // 4. ID Alfanumerik terkecil
        });

        // Alokasikan 1 mesin terdekat pada ronde ini
        const target = pool[0].machine;
        assignments[cqi.id].push(target.id);
        allocatedMachineIds.add(target.id);
        allocatedInThisRound++;
      }

      if (allocatedInThisRound === 0) break; // Keluar lebih awal jika tidak ada sisa mesin
    }

    return assignments;
  }
}