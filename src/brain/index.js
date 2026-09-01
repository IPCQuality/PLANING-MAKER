import utils from './utils.js';
import core from './core.js';
import validator from './validator.js';
import formatter from './formatter.js';
import history from './history.js';
import heatmap from './heatmap.js';

const BrainAI = {
  ...utils,
  ...core,
  ...validator,
  ...formatter,
  ...history,
  ...heatmap
};

// Dukungan Export CommonJS / Browser / Module Node
if (typeof globalThis !== "undefined") {
  globalThis.BrainAI = BrainAI;
}
if (typeof window !== "undefined") {
  window.BrainAI = BrainAI;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BrainAI;
}

export default BrainAI;
