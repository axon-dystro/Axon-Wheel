export function availability(view,now=Date.now()) {
  const limit=view.limit;
  if(limit?.max && limit.count>=limit.max)return {allowed:false,text:`Du hast bereits ${limit.count} Mal gedreht. Erlaubt sind ${limit.max} Drehung(en) pro ${limit.identity==="user" ? "Person" : "Charakter"}.`};
  const seconds=Math.max(0,Math.ceil(((limit?.readyAt??0)-now)/1000));
  if(seconds)return {allowed:false,text:`Bitte warte noch ${seconds} Sekunden, bis du wieder drehen kannst.`};
  if(!view.segments.some(s=>s.available!==false))return {allowed:false,text:"Dieses Glücksrad hat gerade keine verfügbaren Gewinne mehr."};
  return {allowed:true,text:"Möchtest du an diesem Glücksrad drehen?"};
}
