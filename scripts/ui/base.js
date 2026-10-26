import {escapeHTML as e,requireThat} from "../core/model.js";
export {e};
export class ArcaneApplication extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {classes:["arcane-wheels"],window:{resizable:true},position:{width:900,height:760}};
  async _renderHTML() {
    const root = document.createElement("section"); root.className = "aw-root";
    root.innerHTML = await this.html(); return root;
  }
  _replaceHTML(result,content) { content.replaceChildren(result); }
  async _onRender(context,options) { await super._onRender(context,options); await this.bind(); }
  bind() {}
  async guard(task) { try {return await task();} catch(error) {console.error("Axon Wheel",error);ui.notifications.error(error.message ?? String(error));} }
}
export const field = (label,path,value,type="text",extra="") => `<label class="aw-field"><span>${e(label)}</span><input data-path="${e(path)}" type="${type}" value="${e(value ?? "")}" ${extra}></label>`;
export const checkbox = (label,path,value) => `<label class="aw-check"><input data-path="${e(path)}" type="checkbox" ${value ? "checked" : ""}><span>${e(label)}</span></label>`;
export const select = (label,path,value,choices) => `<label class="aw-field"><span>${e(label)}</span><select data-path="${e(path)}">${choices.map(([v,l])=>`<option value="${e(v)}" ${v===value ? "selected" : ""}>${e(l)}</option>`).join("")}</select></label>`;
export const area = (label,path,value) => `<label class="aw-field"><span>${e(label)}</span><textarea data-path="${e(path)}" rows="3">${e(value)}</textarea></label>`;
export const userChoices = (path,values) => `<label class="aw-field"><span>Spieler auswählen (Strg für mehrere)</span><select multiple data-path="${e(path)}">${game.users.map(u=>`<option value="${e(u.id)}" ${values.includes(u.id) ? "selected" : ""}>${e(u.name)}${u.isGM ? " · GM" : ""}</option>`).join("")}</select></label>`;
export function capture(root,target) {
  for (const element of root.querySelectorAll("[data-path]")) {
    const parts = element.dataset.path.split(".");
    requireThat(parts.every(k=>!['__proto__','prototype','constructor'].includes(k)),"FORM","Ungültiger Formularpfad.");
    let object = target;
    for (const part of parts.slice(0,-1)) object = object[part];
    const last = parts.at(-1);
    object[last] = element.type === "checkbox" ? element.checked : element.multiple ? [...element.selectedOptions].map(o=>o.value)
      : element.type === "number" ? (element.value === "" && element.dataset.nullable ? null : Number(element.value)) : element.value;
  }
}
export function downloadJSON(name,value) {
  const blob = new Blob([JSON.stringify(value,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob),a=document.createElement("a"); a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
