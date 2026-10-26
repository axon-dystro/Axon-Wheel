import {spinAngle,escapeHTML} from "../core/model.js";
import {availability} from "../core/availability.js";
import {themeImage} from "../core/presentation.js";
import {fitSegmentLabel,segmentDetails} from "../core/labels.js";
import {ArcaneApplication} from "./base.js";
import {readableDelivery} from "../foundry/actions.js";

const images=new Map();
export async function loadThemeImages(segments) {
  const paths=[...new Set(segments.map(themeImage).filter(Boolean))];
  const loaded=await Promise.all(paths.map(path=>{
    if(!images.has(path))images.set(path,new Promise(resolve=>{
      const img=new Image();let timer;
      const done=image=>{clearTimeout(timer);img.onload=null;img.onerror=null;if(!image){images.delete(path);globalThis.ui?.notifications.warn("Axon Wheel: Ein Segmentbild konnte nicht geladen werden. Bitte den Bildpfad prüfen.");}resolve(image);};
      img.onload=()=>done(img);img.onerror=()=>done(null);timer=setTimeout(()=>done(null),10000);img.src=path;
    }));
    return images.get(path).then(image=>[path,image]);
  }));
  return new Map(loaded);
}
export function drawWheel(canvas,segments,art=new Map()) {
  const ctx=canvas.getContext("2d"),size=canvas.width,c=size/2,r=c-36,count=segments.length;
  ctx.clearRect(0,0,size,size);
  for(let i=0;i<count;i++) {
    const start=-Math.PI/2+i*Math.PI*2/count,end=start+Math.PI*2/count,mid=(start+end)/2,s=segments[i];
    ctx.save();ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,start,end);ctx.closePath();ctx.clip();
    ctx.globalAlpha=s.available===false ? .35 : 1;ctx.fillStyle=s.color;ctx.fillRect(0,0,size,size);
    const image=art.get(themeImage(s));
    if(image){ctx.translate(c,c);ctx.rotate(mid+Math.PI/2);ctx.drawImage(image,-r*.60,-r*1.1,r*1.2,r*1.2);ctx.rotate(-mid-Math.PI/2);ctx.translate(-c,-c);}
    const shade=ctx.createRadialGradient(c,c,r*.1,c,c,r);
    shade.addColorStop(0,"#191023dd");shade.addColorStop(.35,"#120e1722");shade.addColorStop(1,"#090a1655");
    ctx.fillStyle=shade;ctx.fillRect(0,0,size,size);ctx.restore();
    ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,start,end);ctx.closePath();ctx.strokeStyle="#e3bb7466";ctx.lineWidth=3;ctx.stroke();
    const layout=fitSegmentLabel(s,i,count,r,(text,size)=>{ctx.font=`bold ${size}px Georgia`;return ctx.measureText(text).width;});
    ctx.save();ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,start,end);ctx.closePath();ctx.clip();
    ctx.translate(c+layout.anchor.x,c+layout.anchor.y);ctx.rotate(layout.angle);
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.strokeStyle="#170d27";ctx.lineWidth=5;ctx.lineJoin="round";
    ctx.fillStyle="#fff8e5";ctx.shadowColor="#10081c";ctx.shadowBlur=7;
    let y=-layout.actualHeight/2+layout.lineHeight/2;
    ctx.font=`bold ${layout.fontSize}px Georgia`;
    for(const line of layout.lines){ctx.strokeText(line,0,y);ctx.fillText(line,0,y);y+=layout.lineHeight;}
    if(layout.details.length)y+=6-layout.lineHeight/2+layout.detailHeight/2;
    ctx.font=`bold ${layout.detailSize}px Georgia`;ctx.fillStyle="#ffe3a2";ctx.lineWidth=4;
    for(const line of layout.details){ctx.strokeText(line,0,y);ctx.fillText(line,0,y);y+=layout.detailHeight;}
    ctx.restore();
  }
  ctx.beginPath();ctx.arc(c,c,r+4,0,Math.PI*2);ctx.strokeStyle="#271b38";ctx.lineWidth=26;ctx.stroke();
  ctx.beginPath();ctx.arc(c,c,r+5,0,Math.PI*2);ctx.strokeStyle="#dfbf79";ctx.lineWidth=7;ctx.stroke();
  ctx.beginPath();ctx.arc(c,c,r+17,0,Math.PI*2);ctx.strokeStyle="#ac85da";ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<36;i++){const a=i*Math.PI/18;ctx.beginPath();ctx.arc(c+Math.cos(a)*(r+5),c+Math.sin(a)*(r+5),3.3,0,Math.PI*2);ctx.fillStyle=i%3 ? "#ffdf9b" : "#bbfff0";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.fill();}
  ctx.shadowBlur=0;ctx.beginPath();ctx.arc(c,c,49,0,Math.PI*2);ctx.fillStyle="#2c1b3e";ctx.fill();ctx.strokeStyle="#e8c675";ctx.lineWidth=4;ctx.stroke();
  ctx.beginPath();ctx.arc(c,c,38,0,Math.PI*2);ctx.strokeStyle="#9670b9";ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.moveTo(c,c-29);ctx.lineTo(c+8,c-8);ctx.lineTo(c+29,c);ctx.lineTo(c+8,c+8);ctx.lineTo(c,c+29);ctx.lineTo(c-8,c+8);ctx.lineTo(c-29,c);ctx.lineTo(c-8,c-8);ctx.closePath();ctx.fillStyle="#b5ffeb";ctx.fill();
}
export class PlayerWheel extends ArcaneApplication {
  static DEFAULT_OPTIONS={id:"arcane-wheels-player",classes:["arcane-wheels","aw-overlay"],window:{title:"Axon Wheel",frame:false,positioned:false,resizable:false}};
  constructor({view,placementId,tokenUuid,transport}){super();this.view=view;this.placementId=placementId;this.tokenUuid=tokenUuid;this.transport=transport;this.busy=false;this.outcome=null;this.animation=null;this.seenSpins=new Set();this.zoom=1;this.finalAngle=0;}
  async html(){
    const appearance=this.view.appearance ?? {dim:65,glow:true,decorations:true};
    return `<div class="aw-backdrop" aria-hidden="true" style="--aw-dim:${appearance.dim/100}"></div><div class="aw-floating ${appearance.glow ? "aw-lit" : ""}" role="dialog" aria-label="Axon Wheel"><button type="button" class="aw-overlay-close" title="Schließen (Escape)" aria-label="Schließen">✕</button>
      <header class="aw-floating-title"><div class="aw-eyebrow">AXON´S GLÜCKSRAD · MAGICAL HALLOWEEN</div><h1>${escapeHTML(this.view.name)}</h1><p>${escapeHTML(this.view.description)}</p></header>
      <img data-easter="ghost" role="button" tabindex="0" aria-label="Geist ansprechen" class="aw-floating-ghost aw-floating-ghost-left" src="modules/arcane-wheels/assets/ghost.svg" alt=""><img data-easter="ghost" role="button" tabindex="0" aria-label="Geist ansprechen" class="aw-floating-ghost aw-floating-ghost-right" src="modules/arcane-wheels/assets/ghost.svg" alt=""><img data-easter="credit" role="button" tabindex="0" aria-label="Kleinen Geist ansprechen" class="aw-floating-ghost aw-floating-ghost-small" src="modules/arcane-wheels/assets/ghost.svg" alt="">
      ${appearance.decorations ? `<div class="aw-ground-decor"><img data-easter="pumpkin" role="button" tabindex="0" aria-label="Kürbis ansprechen" class="aw-ground-left" src="modules/arcane-wheels/assets/pumpkin-cluster.svg" alt=""><img data-easter="pumpkin" role="button" tabindex="0" aria-label="Kürbis ansprechen" class="aw-ground-right" src="modules/arcane-wheels/assets/pumpkin-cluster.svg" alt=""></div>` : ""}
      <div class="aw-speech" role="status" aria-live="polite" hidden></div><div class="aw-wheel-viewport"><div class="aw-wheel-stage" style="--aw-zoom:${this.zoom}"><div class="aw-pointer" aria-hidden="true"></div><canvas width="1024" height="1024" aria-label="Glücksrad mit Halloween-Motiven" role="img"></canvas></div></div>
      <div class="aw-floating-actions"><p class="aw-result" role="status" aria-live="polite">${escapeHTML(this.outcome ?? "Die Runen warten auf dich.")}</p>
      <button type="button" class="aw-spin" ${this.busy ? "disabled" : ""}>${this.busy ? "Das Rad dreht sich …" : "✦ Rad drehen"}</button>
      <p class="aw-price">${this.view.cost.amount ? `${escapeHTML(this.view.cost.amount)} ${escapeHTML(this.view.cost.label)} pro Drehung` : "Kostenlose Drehung"}</p>
      <div class="aw-zoom"><button type="button" data-zoom="-0.1" aria-label="Rad verkleinern">−</button><span>Radgröße</span><button type="button" data-zoom="0.1" aria-label="Rad vergrößern">＋</button></div>
      ${this.view.limit?.max ? `<p class="aw-overlay-limit">${this.view.limit.count} / ${this.view.limit.max} Drehungen verbraucht</p>` : ""}
      <details class="aw-prizes"><summary>Gewinne ansehen</summary><ul>${this.view.segments.map(s=>`<li>${escapeHTML(s.label)}${!s.available ? " · nicht verfügbar" : ""}${segmentDetails(s).map(t=>` · ${escapeHTML(t)}`).join("")}</li>`).join("")}</ul></details></div></div>`;
  }
  async bind(){
    clearInterval(this.availabilityTimer);
    this.availabilityTimer=setInterval(()=>this.refreshAvailability(),250);
    for(const decoration of this.element.querySelectorAll("[data-easter]")) {
      const speak=()=>{
        const bubble=this.element.querySelector(".aw-speech"),rect=decoration.getBoundingClientRect();
        const messages={ghost:"Buh!",pumpkin:"S… Su… SUPPE?! Lieber nicht!",credit:"Made by Axon · Discord: @AxonCS"};
        bubble.textContent=messages[decoration.dataset.easter];bubble.hidden=false;
        bubble.style.left=`${Math.max(120,Math.min(innerWidth-120,rect.left+rect.width/2))}px`;
        bubble.style.top=`${Math.max(16,rect.top-65)}px`;
        clearTimeout(this.speechTimer);this.speechTimer=setTimeout(()=>{bubble.hidden=true;},4500);
      };
      decoration.addEventListener("click",speak);
      decoration.addEventListener("keydown",event=>{if(["Enter"," "].includes(event.key)){event.preventDefault();speak();}});
    }
    this.refreshAvailability();
    const canvas=this.element.querySelector("canvas"),loading=loadThemeImages(this.view.segments);
    this.element.querySelector(".aw-spin").addEventListener("click",()=>this.spin());this.element.querySelector(".aw-overlay-close").addEventListener("click",()=>this.close());
    for(const b of this.element.querySelectorAll("[data-zoom]"))b.addEventListener("click",()=>{this.zoom=Math.max(.65,Math.min(1.35,this.zoom+Number(b.dataset.zoom)));this.element.querySelector(".aw-wheel-stage").style.setProperty("--aw-zoom",this.zoom);});
    this.listeners?.abort();this.listeners=new AbortController();
    this.element.addEventListener("keydown",event=>{
      if(event.key==="Escape"){event.preventDefault();event.stopPropagation();void this.close();}
      if(event.key==="Tab"){const focus=[...this.element.querySelectorAll("button:not(:disabled),summary")],first=focus[0],last=focus.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    },{signal:this.listeners.signal});this.element.querySelector(".aw-spin").focus();
    this.element.classList.toggle("aw-motion-off",game.settings.get("arcane-wheels","reducedMotion"));
    const art=await loading;if(canvas.isConnected){drawWheel(canvas,this.view.segments,art);if(!this.busy)canvas.style.transform=`rotate(${this.finalAngle}deg)`;}
  }
  refreshAvailability(){
    if(this.busy)return;
    const state=availability(this.view),button=this.element?.querySelector(".aw-spin");
    if(button){button.disabled=!state.allowed;button.textContent=state.allowed ? "✦ Rad drehen" : "Zurzeit nicht verfügbar";}
    if(!state.allowed){this.availabilityBlocked=true;this.setStatus(state.text);}
    else if(this.availabilityBlocked){this.availabilityBlocked=false;this.setStatus("Du kannst wieder drehen.");}
  }
  async spin(){if(this.busy)return;if(!availability(this.view).allowed){this.refreshAvailability();return;}this.busy=true;this.setStatus("Die Runen werden geprüft …");this.setButton(true);try{await this.transport.request({op:"spin",wheelId:this.view.id,placementId:this.placementId,tokenUuid:this.tokenUuid});}catch(error){this.busy=false;this.setButton(false);this.setStatus(error.message);ui.notifications.warn(error.message);}}
  setStatus(value){this.outcome=value;const el=this.element?.querySelector(".aw-result");if(el)el.textContent=value;}
  setButton(busy){const b=this.element?.querySelector(".aw-spin");if(b){b.disabled=busy;b.textContent=busy ? "Das Rad dreht sich …" : "✦ Rad drehen";}}
  async play(packet,timestamp){
    if(this.seenSpins.has(packet.spinId))return;this.seenSpins.add(packet.spinId);this.view=packet.view;this.busy=true;this.finalAngle=0;
    await this.render({force:true});this.setButton(true);this.setStatus("Magie liegt in der Luft …");
    const canvas=this.element.querySelector("canvas"),index=this.view.segments.findIndex(s=>s.id===packet.segmentId);if(index<0)return;
    const reduced=game.settings.get("arcane-wheels","reducedMotion")||matchMedia("(prefers-reduced-motion: reduce)").matches;
    const angle=spinAngle(index,this.view.segments.length),elapsed=Math.max(0,Date.now()-timestamp);this.animation?.cancel();canvas.style.transform="";
    if(!reduced&&elapsed<this.view.duration){this.animation=canvas.animate([{transform:"rotate(0deg)"},{transform:`rotate(${angle}deg)`}],{duration:this.view.duration,easing:"cubic-bezier(.12,.63,.08,1)",fill:"forwards"});this.animation.currentTime=elapsed;this.animation.finished.then(()=>{if(this.busy)this.setStatus("Gewinn gezogen · Vergabe wird geprüft …");}).catch(()=>{});}else canvas.style.transform=`rotate(${angle}deg)`;
  }
  async result(packet){
    this.busy=false;this.animation?.cancel();this.view=packet.view ?? this.view;
    const index=this.view.segments.findIndex(s=>s.id===packet.segmentId);this.finalAngle=index<0 ? 0 : spinAngle(index,this.view.segments.length);
    this.outcome=`${packet.label} · ${readableDelivery(packet.delivery)}`;
    await this.render({force:true});
  }
  async _onClose(options){clearInterval(this.availabilityTimer);clearTimeout(this.speechTimer);this.animation?.cancel();this.listeners?.abort();this.busy=false;await super._onClose(options);}
}
