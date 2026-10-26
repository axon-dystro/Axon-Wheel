const sq=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
function pointSegment(p,a,b) {
  const length=sq(a,b);if(!length)return Math.sqrt(sq(p,a));
  const t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/length));
  return Math.hypot(p.x-a.x-t*(b.x-a.x),p.y-a.y-t*(b.y-a.y));
}
function inside(p,polygon) {
  let positive=false,negative=false;
  for(let i=0;i<polygon.length;i++) {
    const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
    if(cross>1e-7)positive=true;if(cross< -1e-7)negative=true;
  }
  return !(positive&&negative);
}
function intersect(a,b,c,d) {
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  if(ab1*ab2<0 && cd1*cd2<0)return true;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b))<1e-7;
}
export function polygonDistance(a,b) {
  if(inside(a[0],b)||inside(b[0],a))return 0;
  let min=Infinity;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++) {
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(intersect(p,q,r,s))return 0;
    min=Math.min(min,pointSegment(p,r,s),pointSegment(q,r,s),pointSegment(r,p,q),pointSegment(s,p,q));
  }
  return min;
}
export function rectangle(x,y,width,height,rotation=0) {
  const c={x:x+width/2,y:y+height/2},angle=rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:c.x+a*width/2*cos-b*height/2*sin,y:c.y+a*width/2*sin+b*height/2*cos}));
}
