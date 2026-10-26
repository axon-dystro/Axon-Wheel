export const THEMES = [
  {id:"pumpkins",label:"Kürbiszauber",color:"#b15a25"},
  {id:"ghosts",label:"Freundliche Geister",color:"#297e89"},
  {id:"bats",label:"Fledermausnacht",color:"#634293"},
  {id:"moon",label:"Mondmagie",color:"#354f8a"},
  {id:"candles",label:"Hexenkerzen",color:"#a75667"},
  {id:"webs",label:"Verzauberte Spinnweben",color:"#436b62"}
];
export function themeImage(segment) {
  if(segment.theme === "custom") return segment.image ?? "";
  const theme=THEMES.find(t=>t.id===segment.theme) ?? THEMES[0];
  return `modules/arcane-wheels/assets/themes/${theme.id}.svg`;
}
export function percentages(values,total=10000) {
  if(!values.length)return [];
  const positive=values.map(x=>Math.max(0,Number(x)||0)),sum=positive.reduce((n,x)=>n+x,0);
  const exact=positive.map(v=>sum ? v/sum*total : total/values.length);
  const whole=exact.map(Math.floor);let left=total-whole.reduce((n,x)=>n+x,0);
  const order=exact.map((x,i)=>({i,remainder:x-whole[i]})).sort((a,b)=>b.remainder-a.remainder || a.i-b.i);
  for(let i=0;i<left;i++) whole[order[i%order.length].i]++;
  return whole.map(x=>x/100);
}
export function balanceChances(segments) {
  const active=segments.filter(s=>s.enabled),values=percentages(active.map(s=>s.chance ?? s.weight ?? 1));
  active.forEach((s,i)=>{s.chance=values[i];});return segments;
}
export function chanceTotal(segments) {return segments.filter(s=>s.enabled).reduce((n,s)=>n+Math.round(s.chance*100),0)/100;}
export function allocateRemaining(segments,index) {
  const fixed=segments[index];
  if(!fixed?.enabled || !Number.isFinite(fixed.chance) || fixed.chance<0 || fixed.chance>100)throw new Error("Zuerst eine gültige Gewinnchance zwischen 0 und 100 % eingeben.");
  const others=segments.filter(s=>s.enabled&&s!==fixed),remaining=10000-Math.round(fixed.chance*100);
  if(!others.length&&remaining!==0)throw new Error("Ein einzelnes aktives Segment muss 100 % erhalten.");
  const values=percentages(others.map(s=>s.chance),remaining);others.forEach((s,i)=>{s.chance=values[i];});
  return segments;
}
export function migrateConfig(original) {
  const w=structuredClone(original);
  if(w.schema === 1) {
    for(const [i,s] of w.segments.entries()) {
      s.chance=s.enabled ? s.weight ?? 1 : 0;delete s.weight;
      s.theme=THEMES[i%THEMES.length].id;s.image="";
    }
    balanceChances(w.segments);w.schema=2;
    if(w.rules.cost.label === "GM-konfigurierte Währung") w.rules.cost.label="Goldstücke";
  }
  if(w.schema === 2) {
    w.appearance={textDirection:"radial",fontSize:38,dim:65,glow:true,decorations:true};w.showStock=false;
    for(const s of w.segments)Object.assign(s,{showChance:!!w.showOdds,showStock:false,textDirection:"inherit",fontSize:null});
    w.schema=3;
  }
  return w;
}
export function currencyChoices() {
  if(globalThis.game?.system?.id!=="dnd5e") return [];
  return [["cp","Kupferstücke"],["sp","Silberstücke"],["ep","Elektrumstücke"],["gp","Goldstücke"],["pp","Platinstücke"]]
    .map(([key,label])=>({path:`system.currency.${key}`,label}));
}
