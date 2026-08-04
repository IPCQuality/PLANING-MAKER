// ==========================================================================
// 1. DATA DEFAULT AWAL (Akan tertimpa otomatis saat Anda Import Excel)
// ==========================================================================
let FACTORY_DATA = {
  cqis: [
    { id: "CQI 1", x: 8, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 2", x: 10, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 3", x: 12, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 4", x: 14, y: 5, lineBlock: "LINE-ATAS" },
    { id: "CQI 11", x: 8, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 21", x: 10, y: 30, lineBlock: "LINE-BAWAH" },
    { id: "CQI 14", x: 20, y: 30, lineBlock: "LINE-BAWAH" }
  ],
  machines: [
    { id: "61-16L", x: 8, y: 8, lineBlock: "LINE-ATAS" },
    { id: "68-16L", x: 10, y: 8, lineBlock: "LINE-ATAS" },
    { id: "60-16L", x: 12, y: 8, lineBlock: "LINE-ATAS" },
    { id: "41-16L", x: 7, y: 31, lineBlock: "LINE-BAWAH" },
    { id: "46-16L", x: 9, y: 31, lineBlock: "LINE-BAWAH" },
    { id: "ARPM 45", x: 14, y: 30, lineBlock: "LINE-BAWAH" }
  ],
  dividerRow: 24
};

// ==========================================================================
// 2. PARSER EXCEL OTOMATIS (Mendeteksi Mesin, CQI, dan Batas LINE)
// ==========================================================================
class ExcelParser {
  static async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const newLayout = {
            cqis: [],
            machines: [],
            dividerRow: 24 // Nilai default pembatas line
          };

          // Step A: Deteksi perkiraan baris tengah (Divider Row) sebagai batas Line Atas vs Line Bawah
          let maxRow = rows.length;
          newLayout.dividerRow = Math.floor(maxRow / 2);

          // Step B: Scanning seluruh sel Excel
          rows.forEach((row, rowIndex) => {
            if (!row) return;

            row.forEach((cellValue, colIndex) => {
              if (!cellValue) return;
              const text = String(cellValue).trim();

              // Tentukan blok area berdasarkan posisi baris relatif terhadap dividerRow
              const currentBlock = (rowIndex + 1 < newLayout.dividerRow) ? "LINE-ATAS" : "LINE-BAWAH";

              // 1. Deteksi CQI (Contoh: "CQI 1", "CQI 24", dll.)
              if (/^CQI\s*\d+/i.test(text)) {
                newLayout.cqis.push({
                  id: text.toUpperCase().replace(/\s+/g, " "),
                  x: colIndex + 1,
                  y: rowIndex + 1,
                  lineBlock: currentBlock
                });
                return;
              }

              // 2. Deteksi Mesin (Format: XX-XXL, ARPM XX, K1, M2, X3, dll.)
              if (/^\d+-\d+L$/i.test(text) || /^ARPM\s*\d+/i.test(text) || /^[KMX]\d+$/i.test(text)) {
                newLayout.machines.push({
                  id: text.toUpperCase(),
                  x: colIndex + 1,
                  y: rowIndex + 1,
                  lineBlock: currentBlock
                });
              }
            });
          });

          resolve(newLayout);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
}

// ==========================================================================
// 3. CORE SYSTEM: LINE-BASED PLANNER & WIZARD
// ==========================================================================
class LineBasedPlanner {
  constructor() {
    this.machineStates = {};
    this.cqiStates = {};
    this.assignments = {};
    this.cqiColors = {};
  }

  start() {
    this.initializeState();
    this.renderFloorGrid();
    this.setupListeners();
  }

  initializeState() {
    this.machineStates = {};
    this.cqiStates = {};
    this.cqiColors = {};

    FACTORY_DATA.machines.forEach(m => this.machineStates[m.id] = 'idle');
    FACTORY_DATA.cqis.forEach((c, i) => {
      this.cqiStates[c.id] = 'active';
      this.cqiColors[c.id] = `hsl(${(i * 360) / FACTORY_DATA.cqis.length}, 70%, 50%)`;
    });
  }

  renderFloorGrid() {
    const floor = document.getElementById('factory-floor');
    floor.innerHTML = '';

    // Gambar Garis Merah Pembatas Jalur Kerja
    const dividerEl = document.createElement('div');
    dividerEl.className = 'grid-node line-red-divider';
    dividerEl.style.gridRowStart = FACTORY_DATA.dividerRow;
    floor.appendChild(dividerEl);

    // Render CQI
    FACTORY_DATA.cqis.forEach(cqi => {
      const el = document.createElement('div');
      const inactive = this.cqiStates[cqi.id] === 'inactive';
      el.className = `grid-node cqi ${inactive ? 'inactive' : ''}`;
      el.style.gridColumnStart = cqi.x;
      el.style.gridRowStart = cqi.y;
      el.innerText = cqi.id;
      el.title = `${cqi.id} (${cqi.lineBlock})`;

      el.onclick = () => {
        this.cqiStates[cqi.id] = inactive ? 'active' : 'inactive';
        this.renderFloorGrid();
      };
      floor.appendChild(el);
    });

    // Render Mesin
    FACTORY_DATA.machines.forEach(m => {
      const el = document.createElement('div');
      const status = this.machineStates[m.id] || 'idle';
      el.className = `grid-node machine ${status}`;
      el.style.gridColumnStart = m.x;
      el.style.gridRowStart = m.y;
      el.innerText = m.id;
      el.title = `Mesin: ${m.id} (${m.lineBlock})`;

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
    const totalCount = FACTORY_DATA.machines.length;
    const runCount = Object.values(this.machineStates).filter(s => s === 'running').length;
    const stopCount = Object.values(this.machineStates).filter(s => s === 'stop').length;
    const activeCQI = Object.values(this.cqiStates).filter(s => s === 'active').length;

    document.getElementById('stat-m-total').innerText = totalCount;
    document.getElementById('stat-m-run').innerText = runCount;
    document.getElementById('stat-m-stop').innerText = stopCount;
    document.getElementById('stat-cqi-active').innerText = `${activeCQI} / ${FACTORY_DATA.cqis.length}`;
  }

  // ALGORITMA PLANNING TERKUNCI BERDASARKAN LINE
  executeLineAutoPlanning() {
    this.assignments = {};
    FACTORY_DATA.cqis.forEach(c => { if(this.cqiStates[c.id] === 'active') this.assignments[c.id] = []; });

    const allocatedSet = new Set();
    const blocks = ["LINE-ATAS", "LINE-BAWAH"];

    blocks.forEach(currentBlock => {
      const lineCQIs = FACTORY_DATA.cqis.filter(c => c.lineBlock === currentBlock && this.cqiStates[c.id] === 'active');
      const lineMachines = FACTORY_DATA.machines.filter(m => m.lineBlock === currentBlock && this.machineStates[m.id] === 'running');

      for (let round = 0; round < 8; round++) {
        let roundAlloc = 0;
        for (const cqi of lineCQIs) {
          if (this.assignments[cqi.id].length >= 8) continue;

          let available = lineMachines.filter(m => !allocatedSet.has(m.id));
          if (available.length === 0) break;

          // Manhattan Distance (Jarak Grid terdekat di Line yang sama)
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

      // Opsi transfer/pindahkan mesin hanya antar-CQI di Line Blok yang sama
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
    txt += `📢 _Laporan otomatis berbasis Line Block_`;
    
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
    // Tombol Cepat Mapping
    document.getElementById('btn-run-all').onclick = () => {
      FACTORY_DATA.machines.forEach(m => this.machineStates[m.id] = 'running');
      this.renderFloorGrid();
    };

    // Navigasi
    document.getElementById('btn-next-to-edit').onclick = () => {
      this.executeLineAutoPlanning();
      this.changePage(2);
    };
    document.getElementById('btn-back-to-mapping').onclick = () => this.changePage(1);
    document.getElementById('btn-next-to-share').onclick = () => this.changePage(3);
    document.getElementById('btn-back-to-editor').onclick = () => this.changePage(2);

    // Salin Teks WhatsApp
    document.getElementById('btn-copy-wa').onclick = () => {
      const copyText = document.getElementById('wa-text-preview');
      copyText.select();
      navigator.clipboard.writeText(copyText.value);
      alert("✅ Format teks WhatsApp berhasil disalin! Silakan paste di Grup WhatsApp.");
    };

    // Share Langsung ke WhatsApp
    document.getElementById('btn-share-wa').onclick = () => {
      const payload = encodeURIComponent(document.getElementById('wa-text-preview').value);
      window.open(`https://api.whatsapp.com/send?text=${payload}`, '_blank');
    };

    // Export Excel
    document.getElementById('btn-export-excel').onclick = () => {
      const dataRows = [["Line Block", "Nama CQI", "Jumlah Target Mesin", "Daftar ID Mesin"]];
      FACTORY_DATA.cqis.forEach(cqi => {
        const list = this.assignments[cqi.id] || [];
        dataRows.push([cqi.lineBlock, cqi.id, list.length, list.join(", ")]);
      });
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Planning Output");
      XLSX.writeFile(wb, `Rekap_Planning_Line_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // =========================================================================
    // EVENT LISTENER IMPORT EXCEL LIVE
    // =========================================================================
    const btnImport = document.getElementById('btn-import-excel');
    const inputExcel = document.getElementById('input-excel');

    btnImport.onclick = () => inputExcel.click();

    inputExcel.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        btnImport.innerText = "⏳ Membaca Excel...";
        const importedData = await ExcelParser.parseFile(file);

        if (importedData.machines.length === 0 && importedData.cqis.length === 0) {
          alert("❌ Data Mesin atau CQI tidak ditemukan di dalam file Excel!");
          btnImport.innerText = "📂 Import Excel Layout";
          return;
        }

        // Perbarui data master & timpa state
        FACTORY_DATA = importedData;
        this.initializeState();
        this.renderFloorGrid();
        this.updatePage1Counts();

        btnImport.innerText = "📂 Import Excel Layout";
        alert(`✅ Berhasil mengimpor layout dari Excel:\n• Total Mesin: ${importedData.machines.length} Unit\n• Total CQI: ${importedData.cqis.length} Orang\n• Pembatas Line terdeteksi di Baris ke-${importedData.dividerRow}`);
      } catch (err) {
        console.error(err);
        alert("❌ Gagal membaca file Excel. Pastikan format file sesuai (.xlsx/.xls).");
        btnImport.innerText = "📂 Import Excel Layout";
      }
    };
  }
}

// Inisialisasi saat browser selesai memuat halaman
window.addEventListener('DOMContentLoaded', () => {
  const app = new LineBasedPlanner();
  app.start();
});
