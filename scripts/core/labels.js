/** Text lives in an inscribed rectangle, with extra padding for outline and glyph overhang. */
export const TEXT_DIRECTIONS=[["radial","Entlang des Segments"],["horizontal","Links nach rechts"],["vertical","Oben nach unten (gedreht)"]];
export function segmentDetails(s) {
  const lines=[];
  if(s.chance!==undefined)lines.push(`${(s.chance*100).toLocaleString("de-DE",{maximumFractionDigits:2})} %`);
  if(s.remaining!==undefined)lines.push(s.remaining===null ? "Vorrat ∞" : `Noch ${s.remaining}`);
  return lines;
}
function wrap(text,width,size,measure) {
  const lines=[];let current="";
  for(const word of text.trim().split(/\s+/u)) {
    const candidate=current ? `${current} ${word}` : word;
    if(measure(candidate,size)<=width){current=candidate;continue;}
    if(current){lines.push(current);current="";}
    if(measure(word,size)<=width){current=word;continue;}
    for(const letter of Array.from(word)) {
      if(measure(current+letter,size)>width && current){lines.push(current);current="";}
      if(measure(letter,size)>width)return null;
      current+=letter;
    }
  }
  if(current)lines.push(current);return lines;
}
export function fitSegmentLabel(segment,index,count,radius,measure) {
  const step=2*Math.PI/count,start=-Math.PI/2+index*step,end=start+step,mid=(start+end)/2;
  const rho=radius*.65,anchor={x:Math.cos(mid)*rho,y:Math.sin(mid)*rho};
  let angle=segment.textDirection==="horizontal" ? 0 : segment.textDirection==="vertical" ? Math.PI/2 : mid;
  if(!["horizontal","vertical"].includes(segment.textDirection) && Math.cos(angle)<0)angle+=Math.PI;
  const u={x:Math.cos(angle),y:Math.sin(angle)},v={x:-Math.sin(angle),y:Math.cos(angle)};
  const dot=(a,b)=>a.x*b.x+a.y*b.y;
  const planes=[{n:{x:Math.cos(mid),y:Math.sin(mid)},min:radius*.17}];
  if(count>1)planes.push({n:{x:-Math.sin(start),y:Math.cos(start)},min:7},{n:{x:Math.sin(end),y:-Math.cos(end)},min:7});
  function widthFor(height) {
    let width=radius*2;
    for(const {n,min} of planes) {
      const room=dot(n,anchor)-min-Math.abs(dot(n,v))*height/2;
      if(room<=0)return 0;
      const across=Math.abs(dot(n,u));if(across>1e-8)width=Math.min(width,2*room/across);
    }
    for(const sign of [-1,1]) {
      const q={x:anchor.x+sign*height/2*v.x,y:anchor.y+sign*height/2*v.y};
      const along=dot(q,u),discriminant=along*along-dot(q,q)+(radius-20)**2;
      if(discriminant<0)return 0;
      width=Math.min(width,2*(Math.sqrt(discriminant)-Math.abs(along)));
    }
    return Math.max(0,width-10);
  }
  const details=segmentDetails(segment),max=segment.fontSize ?? 38;
  for(let size=max;size>=4;size-=.5) {
    const detailSize=Math.max(4,size*.65),lineHeight=size*1.22,detailHeight=detailSize*1.28;
    for(let rows=1;rows<=12;rows++) {
      const height=rows*lineHeight+details.length*detailHeight+(details.length?6:0)+8,width=widthFor(height);
      if(width<4 || details.some(t=>measure(t,detailSize)>width))continue;
      const lines=wrap(segment.label,width,size,measure);
      if(!lines || lines.length>rows)continue;
      const actualHeight=lines.length*lineHeight+details.length*detailHeight+(details.length?6:0);
      return {anchor,angle,width,height,lines,details,fontSize:size,detailSize,lineHeight,detailHeight,actualHeight};
    }
  }
  // Extremely narrow (up to 100 segments) still cannot paint across a neighbouring prize.
  return {anchor,angle,width:0,height:0,lines:[],details:[],fontSize:4,detailSize:4,lineHeight:5,detailHeight:5,actualHeight:0};
}
