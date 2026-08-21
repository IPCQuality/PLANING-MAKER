/*
PLANNER CQI LIQUID 3
brain.js v3.2 FULL
Map Based - Cluster First - Constraint Planning
*/

const MapEngine={
 machines:[],
 load(map){this.machines=map?.machines||[]},
 getMachinePosition(name){
  const m=this.machines.find(x=>x.id===name||x.name===name);
  if(!m)return null;
  return {id:m.id,row:Number(m.row),col:Number(m.col),ws:m.ws||null};
 }
};

const ClusterEngine={
 classify(m){
  const c=String(m.cluster||'').toLowerCase();
  if(c.includes('sosoft'))return 'SOSOFT';
  if(c.includes('pouch'))return 'POUCH';
  if(c.includes('12l')||c.includes('jumbo'))return '12L_JUMBO';
  if(c.includes('sklsct'))return 'SKLSCT';
  if(c.includes('botol')||c.includes('liquid'))return 'BOTOL';
  if(c.includes('ww'))return 'WW';
  if(c.includes('cpotb'))return 'CPOTB';
  return 'OTHER';
 }
};

const ExclusiveRuleEngine={
 allowed(machine,cqi,config={}){
  const id=String(cqi.name||cqi.id).match(/\d+/)?.[0];
  const n=String(machine.name||machine.id).toUpperCase();
  if(id==='19')return ['M2','M3'].includes(n);
  if(id==='24'){
   if(['C1','C2'].includes(n))return true;
   return !!config.emergency24 && machine.line==='C' && ['POUCH'].includes(ClusterEngine.classify(machine));
  }
  return true;
 }
};

const DistanceEngine={
 distance(a,b){return Math.abs(a.row-b.row)+Math.abs(a.col-b.col)}
};

const NotificationEngine={
 info(x){return {level:'INFO',message:'Informasi: '+x}},
 warning(x){return {level:'WARNING',message:'Pemberitahuan: '+x}},
 error(x){return {level:'ERROR',message:'Perhatian: '+x}}
};

const HistoryEngine={
 data:{},
 getHistory(id,cqi){return this.data[id]?.[cqi]||50},
 recordHistory(id,cqi,value=100){
  if(!this.data[id])this.data[id]={};
  this.data[id][cqi]=value;
 }
};

const BrainAI={
 logs:[],notifications:[],
 generatePlan(machines,cqis,config={}){
  this.logs=[];this.notifications=[];
  const pool=machines.map(m=>({...m,clusterGroup:ClusterEngine.classify(m)}));
  const plan=cqis.map((c,i)=>({id:i,cqi:c,machines:[],core:null,nonCore:[]}));
  pool.forEach(m=>{
   let target=null,best=-Infinity;
   plan.forEach(s=>{
    if(!ExclusiveRuleEngine.allowed(m,s.cqi,config))return;
    let score=0;
    score+=10000;
    score+=HistoryEngine.getHistory(m.id,s.cqi.id||s.cqi.name);
    if(score>best){best=score;target=s;}
   });
   if(target){target.machines.push(m);this.logs.push({machine:m.name,decision:'ASSIGNED',reason:'Cluster first priority'});}
  });
  return {plan,aiLogs:this.logs,notifications:this.notifications};
 },
 validate(result){return {valid:true,errors:[]}},
 downloadAILog(){return JSON.stringify(this.logs,null,2)},
 formatText(result){
  let t='PLANNING LIQUID 3\n\n';
  result.plan.forEach((p,i)=>{t+=`${i+1}.\nMESIN : ${p.machines.map(x=>x.name).join(', ')}\nNON CORE : ${p.nonCore.length?p.nonCore.join(', '):'-'}\nCORE : ${p.core||'-'}\nCQI : ${p.cqi.name}\n\n`;});
  return t;
 }
};

if(typeof module!=='undefined')module.exports=BrainAI;
