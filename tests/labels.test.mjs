import test from "node:test";
import assert from "node:assert/strict";
import {fitSegmentLabel,segmentDetails} from "../scripts/core/labels.js";
const measure=(text,size)=>Array.from(text).length*size*.58;
function corners(l){const u={x:Math.cos(l.angle),y:Math.sin(l.angle)},v={x:-u.y,y:u.x};return [-1,1].flatMap(a=>[-1,1].map(b=>({x:l.anchor.x+a*l.width/2*u.x+b*l.height/2*v.x,y:l.anchor.y+a*l.width/2*u.y+b*l.height/2*v.y})));}
test("complete long labels, percentages and live stock fit all wedge orientations",()=>{
 for(const count of [2,3,6,12,24])for(let i=0;i<count;i++)for(const direction of ["radial","horizontal","vertical"]){
  const label="Ein außergewöhnlich langer Kürbiszauber";
  const l=fitSegmentLabel({label,chance:.2,remaining:5,textDirection:direction,fontSize:60},i,count,476,measure);
  assert.ok(l.lines.length>0,`${count}/${i}/${direction}`);
  assert.equal(l.lines.join("").replaceAll(" ",""),label.replaceAll(" ",""));
  assert.ok(l.fontSize<=60);assert.deepEqual(l.details,["20 %","Noch 5"]);
  for(const line of l.lines)assert.ok(measure(line,l.fontSize)<=l.width);
  for(const point of corners(l)){
   assert.ok(Math.hypot(point.x,point.y)<476);
   const angle=(Math.atan2(point.y,point.x)+Math.PI/2+Math.PI*2)%(Math.PI*2);
   assert.ok(angle>=i*2*Math.PI/count-1e-8&&angle<=(i+1)*2*Math.PI/count+1e-8);
  }
 }
});
test("short labels honor individual font sizes without fixed truncation",()=>{
 const small=fitSegmentLabel({label:"Gold",fontSize:20,textDirection:"horizontal"},0,6,476,measure);
 const large=fitSegmentLabel({label:"Gold",fontSize:64,textDirection:"horizontal"},0,6,476,measure);
 assert.equal(small.fontSize,20);assert.equal(large.fontSize,64);assert.deepEqual(large.lines,["Gold"]);
});
test("unlimited, zero and hidden metadata remain distinct",()=>{
 assert.deepEqual(segmentDetails({}),[]);
 assert.deepEqual(segmentDetails({chance:0,remaining:0}),["0 %","Noch 0"]);
 assert.deepEqual(segmentDetails({remaining:null}),["Vorrat ∞"]);
});
test("all one hundred sectors keep even overlong Unicode names inside their paint clip",()=>{
 for(let i=0;i<100;i++){
  const l=fitSegmentLabel({label:"👻 Kürbis".repeat(20),fontSize:96,textDirection:"vertical",chance:.01,remaining:1000000},i,100,476,measure);
  assert.ok(Number.isFinite(l.angle));assert.ok(l.width>=0);assert.ok(l.height>=0);
 }
});
