export class ExcelExporter {
  static generate(assignments, layoutData, currentStates) {
    const rows = [["CQI", "Mesin", "Area", "Status", "Jarak X-Y"]];

    for (const [cqiId, machineIds] of Object.entries(assignments)) {
      const cqiNode = layoutData.cqi.find(c => c.id === cqiId);
      
      machineIds.forEach(mId => {
        const mNode = layoutData.machines.find(m => m.id === mId);
        const distance = Math.abs(cqiNode.x - mNode.x) + Math.abs(cqiNode.y - mNode.y);
        
        rows.push([
          cqiId,
          mId,
          mNode.area,
          currentStates.machine_states[mId] || 'unknown',
          `${distance} Grid Step`
        ]);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XXLSX.utils.book_append_sheet(workbook, worksheet, "CQI Daily Planning");
    XLSX.writeFile(workbook, `Planning_CQI_${new Date().toISOString().slice(0,10)}.xlsx`);
  }
}