import {ID} from "../core/model.js";
/** Keep authenticated, whispered transport documents out of the visible chat log.
 * An explicitly configured Chat FX remains a real, visible message. No other chat is touched.
 */
export function hideTransportMessage(message,html) {
  const raw=message.getFlag(ID,"packet");
  if(typeof raw!=="string" || raw.length>200000)return;
  let packet;try{packet=JSON.parse(raw);}catch{return;}
  if(!["request","reply","animation","result","notice","fx"].includes(packet?.type))return;
  if(packet.type==="fx" && packet.action?.type==="chat")return;
  html.hidden=true;html.setAttribute("aria-hidden","true");html.classList.add("aw-transport-message");
}
