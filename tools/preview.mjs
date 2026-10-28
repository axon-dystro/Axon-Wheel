// Optional browser QA: npm install --no-save playwright@1.51.1; npx playwright install chromium
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
const {defaultWheel,emptyRecord}=await import('../scripts/core/model.js');
const {WheelManager}=await import('../scripts/ui/manager.js');
const draft=defaultWheel('preview');
const records=[emptyRecord(draft),emptyRecord({...structuredClone(draft),id:'second',name:'Schätze der Taverne'})];
globalThis.game={user:{isGM:true},system:{id:'dnd5e',version:'6.0.6'},users:[],scenes:{get:()=>null},
 settings:{get:()=>({ids:['a','b']})},journal:{get:id=>({getFlag:(_ns,k)=>k==='kind'?'wheel':k==='record'?JSON.stringify(records[id==='a'?0:1]):null})}};
const manager=new WheelManager({});manager.draft=draft;manager.record=records[0];
const root=process.cwd();
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){
   manager.tab=url.searchParams.get('tab')??'segments';
   const css=await Promise.all(['styles/arcane-wheels.css'].map(p=>readFile(p,'utf8')));
   const html=await manager.html();
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b1013;font-family:system-ui;padding:12px}*{box-sizing:border-box}.aw-manager{width:min(1120px,100%);height:calc(100dvh - 24px);margin:auto;display:flex;flex-direction:column}.window-content{flex:1;min-height:0}button{cursor:pointer}img{max-width:100%}${css.join('\n')}</style><section class="arcane-wheels aw-manager"><div class="window-header">Axon´s Glücksrad</div><div class="window-content"><section class="aw-root">${html}</section></div></section>`);
  }else{
   const file=path.resolve(root,'.'+url.pathname.replace('/modules/arcane-wheels',''));
   if(!file.startsWith(root+path.sep))throw new Error('Bad path');
   res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(await readFile(file));
  }
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await mkdir('dist',{recursive:true});
 for(const width of [1280,900,600]){
  await page.setViewportSize({width,height:920});
  for(const tab of ['manager','segments','design','rules','placements','operation','advanced']){
   await page.goto(`http://127.0.0.1:${server.address().port}/?tab=${tab}`);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode().catch(()=>{}))));
   const errors=await page.evaluate(()=>{
    const result=[];
    for(const e of document.querySelectorAll('.aw-editor,.aw-card,.aw-field,.aw-footer,.aw-root')){
     if(e.scrollWidth>e.clientWidth+2)result.push(`${e.className}: ${e.scrollWidth}>${e.clientWidth}`);
    }
    const footer=document.querySelector('.aw-footer').getBoundingClientRect();
    if(footer.bottom>innerHeight+1)result.push('Save bar outside viewport');
    return result;
   });
   if(errors.length)throw new Error(`${width}/${tab}: ${errors.join('; ')}`);
   if(tab==='segments'&&width===1280)await page.screenshot({path:'dist/manager-preview.png'});
  }
 }
 await writeFile('dist/visual-check.txt','21 rendered layouts: 7 panels at 1280, 900 and 600 px; no panel/field/card overflow; save bar visible. Browser fixture, not a live Foundry session.\n');
 console.log('21 browser layout checks passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
