import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

import BrainAI from '../src/brain/index.js';

const mapData = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/map.json'), 'utf8'));

console.log("Total CQIs in map:", mapData.cqis.length);
mapData.cqis.forEach(c => {
  const num = BrainAI.getCqiNumber(c);
  const line = BrainAI.getCqiPrimaryLine(c);
  console.log(`- CQI ${num} (${c.name}): Line = ${line}, Status = ${c.status}, (Row: ${c.row}, Col: ${c.col})`);
});
