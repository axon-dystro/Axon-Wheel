import {readdir,readFile,access} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import path from "node:path";
const manifest=JSON.parse(await readFile("module.json","utf8"));
const pkg=JSON.parse(await readFile("package.json","utf8"));
if(manifest.id!=="arcane-wheels" || manifest.version!==pkg.version || manifest.compatibility.minimum!=="14.367") throw new Error("Invalid manifest");
for(const asset of [...manifest.esmodules,...manifest.styles,...manifest.languages.map(l=>l.path)]) await access(asset);
const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
let count=0;
for(const file of [...await walk("scripts"),...await walk("tests"),...await walk("tools")]) {
  if(!/\.(?:mjs|js)$/.test(file))continue;
  const r=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(r.status!==0)throw new Error(`${file}\n${r.stderr}`);
  const source=await readFile(file,"utf8");
  if(file.startsWith("scripts/")) {
    for(const match of source.matchAll(/(?:from\s+|import\s*\()(["'])(\.[^"']+)\1/g)) await access(path.resolve(path.dirname(file),match[2]));
    if(/\beval\s*\(|new\s+Function\b|\bFormApplication\b|\bApplication\.extend\b/.test(source))throw new Error(`Forbidden legacy/executable API: ${file}`);
  }count++;
}
for(const file of await walk("lang")) JSON.parse(await readFile(file,"utf8"));
console.log(`Manifest, resources, local imports, JSON and syntax checked (${count} JavaScript files).`);
