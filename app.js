// ==========================================================================
// DATA KOORDINAT DAN PENGELOMPOKAN BERDASARKAN LINE MERAH PADA EXCEL
// ==========================================================================
const FACTORY_DATA = {
  // Koordinat CQI
  cqis: [
    { id: "CQI 1", x: 8, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 2", x: 10, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 3", x: 12, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 4", x: 14, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 5", x: 16, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 6", x: 18, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 7", x: 20, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 8", x: 22, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 9", x: 24, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 10", x: 26, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 19", x: 42, y: 8, lineBlock: "LINE-ATAS" },
    
    // Pembatas Jalur Merah Excel berada di sekitar baris y:24-26
    { id: "CQI 11", x: 8, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 21", x: 10, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 14", x: 20, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 15", x: 24, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 16", x: 28, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 17", x: 32, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 13", x: 10, y: 34, lineBlock: "LINE-BAWAH" },
    { id: "CQI 23", x: 20, y: 42, lineBlock: "LINE-BAWAH" }
  ],

  // Koordinat Mesin terpetakan berdasarkan letak blok garis jalur merah
  machines: [
    // Blok Jalur Atas
    { id: "61-16L", x: 8, y: 8, lineBlock: "LINE-ATAS" },
    { id: "68-16L", x: 10, y: 8, lineBlock: "LINE-ATAS" },
    { id: "60-16L", x: 12, y: 8, lineBlock: "LINE-ATAS" },
    { id: "65-16L", x: 14, y: 8, lineBlock: "LINE-ATAS" },
    { id: "12-16L", x: 16, y: 8, lineBlock: "LINE-ATAS" },
    { id: "11-16L", x: 18, y: 8, lineBlock: "LINE-ATAS" },
    { id: "4-16L", x: 20, y: 8, lineBlock: "LINE-ATAS" },
    { id: "2-16L", x: 22, y: 8, lineBlock: "LINE-ATAS" },
    { id: "17-16L", x: 24, y: 8, lineBlock: "LINE-ATAS" },
    { id: "14-12L", x: 4, y: 12, lineBlock: "LINE-ATAS" },
    { id: "44-16L", x: 9, y: 12, lineBlock: "LINE-ATAS" },
    { id: "67-16L", x: 11, y: 12, lineBlock: "LINE-ATAS" },
    { id: "21-16L", x: 13, y: 12, lineBlock: "LINE-ATAS" },
    { id: "28-16L", x: 15, y: 12, lineBlock: "LINE-ATAS" },
    { id: "10-16L", x: 17, y: 12, lineBlock: "LINE-ATAS" },

    // Blok Jalur Bawah
    { id: "41-16L", x: 7, y: 31, lineBlock: "LINE-BAWAH" },
    { id: "46-16L", x: 9, y: 31, lineBlock: "LINE-BAWAH" },
    { id: "53-16L", x: 11, y: 31, lineBlock: "LINE-BAWAH" },
    { id: "47-16L", x: 7, y: 35, lineBlock: "LINE-BAWAH" },
    { id: "45-16L", x: 9, y: 35, lineBlock: "LINE-BAWAH" },
    { id: "52-16L", x: 11, y: 35, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 45", x: 14, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 46", x: 14, y: 34, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 12", x: 24, y: 34, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 40", x: 39, y: 39, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 19", x: 41, y: 39, lineBlock: "LINE-BAWAH" }
  ],

  // Penanda letak garis pemisah (merah) secara visual di baris grid ke-24
  dividerRow: 24
};

class LineBasedPlanner {
  constructor() {
    this.machineStates = {};
    this.cqiStates = {};
    this.assignments = {};
    this.cqiColors = {};
  }

  start() {
    // Set awal
    FACTORY_DATA.machines.forEach(m => this.machineStates[m.id] = 'idle');
    FACTORY_DATA.cqis.forEach((c, i) => {
      this.cqiStates[c.id] = 'active';
      this.cqiColors[c.id] = `hsl(${(i * 360) / FACTORY_DATA.cqis.length}, 70%, 50%)`;
    });

    this.renderFloorGrid();
    this.setupListeners();
  }

  renderFloorGrid() {
    const floor = document.getElementById('factory-floor');
    floor.innerHTML = '';

    // Gambar Garis Jalur Merah Pembatas Terlebih Dahulu
    const dividerEl = document.createElement('div');
    dividerEl.className = 'grid-node line-red-divider';
    dividerEl.style.gridRowStart = FACTORY_DATA.dividerRow;
    floor.appendChild(dividerEl);

    // Tampilkan CQI
    FACTORY_DATA.cqis.forEach(cqi => {
      const el = document.createElement('div');
      const inactive = this.cqiStates[cqi.id] === 'inactive';
      el.className = `grid-node cqi ${inactive ? 'inactive' : ''}`;
      el.style.gridColumnStart = cqi.x;
      el.style.gridRowStart = cqi.y;
      el.innerText = cqi.id;

      el.onclick = () => {
        this.cqiStates[cqi.id] = inactive ? 'active' : 'inactive';
        this.renderFloorGrid();
      };
      floor.appendChild(el);
    });

    // Tampilkan Mesin
    FACTORY_DATA.machines.forEach(m => {
      const el = document.createElement('div');
      const status = this.machineStates[m.id];
      el.className = `grid-node machine ${status}`;
      el.style.gridColumnStart = m.x;
      el.style.gridRowStart = m.y;
      el.innerText = m.id;

      el.onclick = () => {
        if (status === 'idle') this.machineStates[m.id] = 'running';
        else if (status === 'running') this.machineStates[m.id] = 'stop';
        else this.machineStates[m.id] = 'idle';
        this.renderFloorGrid();
      };
      floor.appendChild(el);
    });

    this.updatePage1Counts();
  }

  updatePage1Counts() {
    const runCount = Object.values(this.machineStates).filter(s => s === 'running').length;
    const stopCount = Object.values(this.machineStates).filter(s => s === 'stop').length;
    const activeCQI = Object.values(this.cqiStates).filter(s => s === 'active').length;

    document.getElementById('stat-m-run').innerText = runCount;
    document.getElementById('stat-m-stop').innerText = stopCount;
    document.getElementById('stat-cqi-active').innerText = activeCQI;
  }

  // CORE LOGIC: Auto Planning Dikunci Berdasarkan Line Kerja Masing-Masing
  executeLineAutoPlanning() {
    this.assignments = {};
    FACTORY_DATA.cqis.forEach(c => { if(this.cqiStates[c.id] === 'active') this.assignments[c.id] = []; });

    const allocatedSet = new Set();
    const blocks = ["LINE-ATAS", "LINE-BAWAH"];

    blocks.forEach(currentBlock => {
      const lineCQIs = FACTORY_DATA.cqis.filter(c => c.lineBlock === currentBlock && this.cqiStates[c.id] === 'active');
      const lineMachines = FACTORY_DATA.machines.filter(m => m.lineBlock === currentBlock && this.machineStates[m.id] === 'running');

      // Distribusi Berimbang Multi-Round Maksimal 8 Mesin Per Line
      for (let round = 0; round < 8; round++) {
        let roundAlloc = 0;
        for (const cqi of lineCQIs) {
          if (this.assignments[cqi.id].length >= 8) continue;

          let available = lineMachines.filter(m => !allocatedSet.has(m.id));
          if (available.length === 0) break;

          // Cari jarak terdekat di dalam jalur line yang sama
          available = available.map(m => ({
            machine: m,
            dist: Math.abs(cqi.x - m.x) + Math.abs(cqi.y - m.y)
          })).sort((a, b) => a.dist - b.dist || a.machine.y - b.machine.y || a.machine.x - b.machine.x);

          const pick = available[0].machine;
          this.assignments[cqi.id].push(pick.id);
          allocatedSet.add(pick.id);
          roundAlloc++;
        }
        if (roundAlloc === 0) break;
      }
    });
  }

  renderPage2Editor() {
    const grid = document.getElementById('cqi-editor-grid');
    grid.innerHTML = '';

    const activeCQIs = FACTORY_DATA.cqis.filter(c => this.cqiStates[c.id] === 'active');

    activeCQIs.forEach(cqi => {
      const card = document.createElement('div');
      card.className = 'cqi-card';
      const mList = this.assignments[cqi.id] || [];

      // Opsi pemindahan dibatasi hanya ke CQI yang berada di LINE JALUR YANG SAMA
      const peerCQIs = activeCQIs.filter(c => c.lineBlock === cqi.lineBlock);
      const optionsHTML = peerCQIs.map(p => 
        `<option value="${p.id}" ${p.id === cqi.id ? 'selected' : ''}>${p.id}</option>`
      ).join('');

      card.innerHTML = `
        <div class="cqi-card-header">
          <strong>👤 ${cqi.id}</strong>
          <span class="badge">${mList.length}/8 Msn (${cqi.lineBlock})</span>
        </div>
        <ul class="machine-list">
          ${mList.map(mId => `
            <li class="machine-item">
              <span>🤖 <strong>${mId}</strong></span>
              <div class="machine-actions">
                <select class="swap-select" data-mach="${mId}" data-origin="${cqi.id}">
                  ${optionsHTML}
                </select>
              </div>
            </li>
          `).join('')}
        </ul>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.swap-select').forEach(sel => {
      sel.onchange = (e) => {
        const mId = e.target.getAttribute('data-mach');
        const fromC = e.target.getAttribute('data-origin');
        const toC = e.target.value;
        
        this.assignments[fromC] = this.assignments[fromC].filter(id => id !== mId);
        this.assignments[toC].push(mId);
        this.renderPage2Editor();
      };
    });

    let totalAlloc = 0;
    Object.values(this.assignments).forEach(l => totalAlloc += l.length);
    const totalRun = Object.values(this.machineStates).filter(s => s === 'running').length;

    document.getElementById('stat-allocated').innerText = totalAlloc;
    document.getElementById('stat-unallocated').innerText = totalRun - totalAlloc;
  }

  generateWhatsAppReport() {
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let txt = `*📋 RESULTS PLANNING AUTOMATION CQI*\n`;
    txt += `*📅 Tanggal:* ${timeStr}\n`;
    txt += `*🚦 Status Shift:* Produksi Harian\n`;
    txt += `==================================\n\n`;

    // Kelompokkan per blok jalur untuk output laporan
    const blocks = ["LINE-ATAS", "LINE-BAWAH"];
    blocks.forEach(bl => {
      txt += `*🏢 BLOK AREA: ${bl.replace("-", " ")}*\n`;
      const lineCQIs = FACTORY_DATA.cqis.filter(c => c.lineBlock === bl && this.cqiStates[c.id] === 'active');
      
      lineCQIs.forEach(cqi => {
        const list = this.assignments[cqi.id] || [];
        if(list.length > 0) {
          txt += `• *${cqi.id}* [${list.length}/8] ➔ ${list.join(', ')}\n`;
        } else {
          txt += `• *${cqi.id}* [0/8] ➔ Standby / Idle\n`;
        }
      });
      txt += `\n`;
    });

    txt += `==================================\n`;
    txt += `📢 _Laporan terbuat otomatis berdasarkan kedekatan Line Blok Kerja_`;
    
    document.getElementById('wa-text-preview').value = txt;
  }

  changePage(stepNum) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');

    if(stepNum === 1) {
      document.getElementById('page-mapping').classList.add('active');
      this.renderFloorGrid();
    } else if(stepNum === 2) {
      document.getElementById('page-editor').classList.add('active');
      this.renderPage2Editor();
    } else if(stepNum === 3) {
      document.getElementById('page-share').classList.add('active');
      this.generateWhatsAppReport();
    }
  }

  setupListeners() {
    document.getElementById('btn-run-all').onclick = () => {
      FACTORY_DATA.machines.forEach(m => this.machineStates[m.id] = 'running');
      this.renderFloorGrid();
    };

    document.getElementById('btn-next-to-edit').onclick = () => {
      this.executeLineAutoPlanning();
      this.changePage(2);
    };

    document.getElementById('btn-back-to-mapping').onclick = () => this.changePage(1);
    document.getElementById('btn-next-to-share').onclick = () => this.changePage(3);
    document.getElementById('btn-back-to-editor').onclick = () => this.changePage(2);

    // Fitur Salin Teks ke Clipboard Handphone/PC
    document.getElementById('btn-copy-wa').onclick = () => {
      const copyText = document.getElementById('wa-text-preview');
      copyText.select();
      navigator.clipboard.writeText(copyText.value);
      alert("✅ Format teks WhatsApp berhasil disalin! Tinggal masuk ke WA dan Paste.");
    };

    // Bagikan Langsung via Web Link WhatsApp API
    document.getElementById('btn-share-wa').onclick = () => {
      const payload = encodeURIComponent(document.getElementById('wa-text-preview').value);
      window.open(`https://api.whatsapp.com/send?text=${payload}`, '_blank');
    };

    // Unduh rekap Excel instan
    document.getElementById('btn-export-excel').onclick = () => {
      const dataRows = [["Line Block", "Nama CQI", "Jumlah Target Mesin", "Daftar ID Mesin"]];
      FACTORY_DATA.cqis.forEach(cqi => {
        const list = this.assignments[cqi.id] || [];
        dataRows.push([cqi.lineBlock, cqi.id, list.length, list.join(", ")]);
      });
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Planning Output");
      XLSX.writeFile(wb, "Rekap_Planning_Line.xlsx");
    };
  }
}

window.onload = () => {
  const planner = new LineBasedPlanner();
  planner.start();
};
