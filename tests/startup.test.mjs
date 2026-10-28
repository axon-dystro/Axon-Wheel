import test from "node:test";
import assert from "node:assert/strict";
test("actual entry point registers V14 settings, menus, bindings and public API",async()=>{
  const callbacks=new Map(),settings=new Map(),bindings=new Map(),module={};
  globalThis.Hooks={on:(name,callback)=>callbacks.set(name,callback),once:(name,callback)=>callbacks.set(name,callback)};
  globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
  globalThis.CONST={KEYBINDING_PRECEDENCE:{NORMAL:1}};
  globalThis.game={release:{generation:14,build:367},system:{id:"dnd5e",version:"6.0.6"},user:{isGM:true},modules:{get:()=>module},
    settings:{register:(namespace,key,config)=>settings.set(key,config),registerMenu:(namespace,key,config)=>settings.set(`menu:${key}`,config)},
    keybindings:{register:(namespace,key,config)=>{
      for(const binding of config.editable) for(const modifier of binding.modifiers ?? []) assert.ok(["Shift","Control","Alt"].includes(modifier));
      bindings.set(key,config);
    }}};
  await import("../scripts/main.js");callbacks.get("init")();
  assert.equal(settings.get("registry").scope,"world");assert.equal(settings.get("registry").config,false);
  assert.equal(settings.get("menu:manager").restricted,true);assert.equal(bindings.get("manager").restricted,true);
  assert.deepEqual(Object.keys(module.api).sort(),["openManager","openPlacement"]);
  assert.ok(callbacks.has("createChatMessage"));assert.ok(callbacks.has("canvasReady"));assert.equal(bindings.has("open"),false);
  const controls={tokens:{order:0,tools:{}}};callbacks.get("getSceneControlButtons")(controls);
  assert.equal(controls.arcaneWheels.title,"Axon´s Glücksrad");assert.ok(controls.arcaneWheels.tools.manage.button);assert.equal(controls.arcaneWheels.tools.manage.visible,true);
  const {WheelManager}=await import("../scripts/ui/manager.js");let opens=0;
  WheelManager.prototype.render=async function(){opens++;this.rendered=true;return this;};
  const selection={name:"arcaneWheels"};globalThis.ui={controls:{control:selection,activate:async options=>{selection.name=options.control;}}};
  for(let i=0;i<3;i++){
    selection.name="arcaneWheels";await controls.arcaneWheels.onChange({},true);
    assert.equal(selection.name,"tokens");
  }
  assert.equal(opens,3);assert.ok(callbacks.has("renderChatMessageHTML"));
  game.user.isGM=false;const playerControls={tokens:{order:0,tools:{}}};callbacks.get("getSceneControlButtons")(playerControls);assert.equal(playerControls.arcaneWheels.tools.manage.visible,false);
});
