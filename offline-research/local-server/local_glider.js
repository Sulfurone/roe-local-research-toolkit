'use strict';
// Native gliders are transportation units too, but use pose 3 rather than a
// seated vehicle pose. Restore their render proxy and their own interaction.
function installLocalGlider(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const lookup=new NativeFunction(b.add(0x131d260),'pointer',['uint64']);
 const enableRender=new NativeFunction(b.add(0x97a7c0),'void',['pointer','uint8']);
 const getoff=new NativeFunction(b.add(0x10f7d90),'void',['pointer']);
 const runLua=new NativeFunction(b.add(0x1003000),'uint8',['pointer','pointer']);
 let next=0,owned=null,lastError='',lastStatus=null;
 function ready(){const world=b.add(0x302a870).readPointer();return !world.isNull()&&world.add(0x6c).readU32()===4;}
 function active(){const man=getMan();return ready()&&!man.isNull()&&!man.add(0x30).readPointer().isNull()&&man.add(0x3a0).readU32()===3;}
 function label(){const scene=b.add(0x302a860).readPointer();return !scene.isNull()&&scene.add(0xd0).readU32()===10019?'收起滑翔伞':'收起滑翔翼';}
 function position(man){const p=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);return [0,4,8].map(o=>p.add(o).readFloat());}
 function visual(unit){
  if(unit.isNull()||!unit.readPointer().equals(b.add(0x277b0d8)))return null;
  const actor=unit.add(0x30).readPointer();if(actor.isNull())return null;
  const root=actor.add(0xc30).readPointer();if(root.isNull())return null;
  const entity=root.add(0x180).readPointer();if(entity.isNull()||!entity.add(0x7f).readU8())return null;
  const proxy=entity.add(0x60).readPointer();if(proxy.isNull()||proxy.add(0x138).readPointer().isNull())return null;
  const resource=entity.add(0x68).readPointer().readUtf8String();
  if(!/\/skin\/vehicle\/.*mesh\.xml$/i.test(resource.replace(/\\/g,'/')))return null;
  return {entity,resource,enabled:(proxy.add(0x18c).readU32()&0x1000)!==0};
 }
 function restore(){
  if(!owned)return;const previous=owned;owned=null;
  const state=visual(lookup(uint64(previous.rid)));
  if(state&&state.entity.equals(previous.entity)){enableRender(state.entity,0);send({event:'local_glider_render_folded',rid:previous.rid});}
 }
 function fold(){
  if(!active())return false;
  const man=getMan(),rid=man.add(0x3a8).readU64(),unit=lookup(rid);
  if(unit.isNull()||!unit.readPointer().equals(b.add(0x277b0d8)))throw Error('Native glider unit is not ready');
  const msg=Memory.alloc(0x40);msg.writeByteArray(new Uint8Array(0x40));
  msg.writeU32(25924);msg.add(4).writeU64(rid);msg.add(0xc).writeS32(unit.add(0x17c).readS32());msg.add(0x10).writeU64(man.add(0x28).readU64());msg.add(0x18).writeS32(1);
  position(man).forEach((n,i)=>msg.add(0x20+i*4).writeS32(Math.round(n)));
  getoff(msg);send({event:'local_glider_fold_requested',rid:rid.toString(),pose:man.add(0x3a0).readU32()});return true;
 }
 // An already running older local registry calls its vehicle leave handler for
 // pose 3. Keep its confirmation, but remove its car-exit position offset.
 Interceptor.attach(b.add(0x10f7d90),{onEnter(args){this.glider=false;try{
  if(!active())return;const man=getMan(),message=args[0];
  if(message.isNull()||message.readU32()!==25924||message.add(0x1c).readS32()!==0||message.add(0x10).readU64().compare(man.add(0x28).readU64())!==0||message.add(4).readU64().compare(man.add(0x3a8).readU64())!==0)return;
  const copy=Memory.alloc(0x40);copy.writeByteArray(new Uint8Array(0x40));Memory.copy(copy,message,0x39);
  position(man).forEach((n,i)=>copy.add(0x20+i*4).writeS32(Math.round(n)));
  this.copy=copy;this.glider=true;args[0]=copy;
 }catch(error){send({event:'local_glider_fold_error',error:String(error)});}},onLeave(){if(this.glider)send({event:'local_glider_legacy_fold_corrected',pose:getMan().add(0x3a0).readU32()});}});
 function updateHUD(gliding){
  const source='local R=LocalRoam;if R then '+
   'if not R.gliderPromptPatched then local show=R.showPrompt;R.showPrompt=function() local old=R.prompt;if R.gliding and old=="下车" then R.prompt=R.gliderPromptLabel end;show();R.prompt=old end;'+
   'local update=R.updateMatchHUD;R.updateMatchHUD=function(value) if R.gliding then local copy={};for k,v in pairs(value) do copy[k]=v end;copy.riding=false;value=copy end;return update(value) end;R.gliderPromptPatched=true end;'+
   'local active='+String(gliding)+';R.gliderPromptLabel='+JSON.stringify(label())+';if R.gliding~=active then R.gliding=active;R.showPrompt();R.updateMatchHUD(R.matchHUD or {alive=1,kills=0,riding=false}) end end';
  const text=Memory.allocUtf8String(source),length=unescape(encodeURIComponent(source)).length,value=Memory.alloc(24);
  value.writePointer(text);value.add(8).writePointer(text.add(length));value.add(16).writePointer(text.add(length+1));
  const system=b.add(0x3048d48).readPointer();if(!system.isNull())runLua(system.add(0x18),value);
 }
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<next)return;next=Date.now()+200;
  try{
   const gliding=active();updateHUD(gliding);
   if(!gliding){if(ready())restore();else owned=null;lastStatus={active:false};return;}
   const man=getMan(),rid=man.add(0x3a8).readU64().toString();
   if(owned&&owned.rid!==rid)restore();
   const state=visual(lookup(uint64(rid)));
   if(!state){lastStatus={active:true,rid,ready:false};return;}
   if(!state.enabled){
    enableRender(state.entity,1);owned={rid,entity:state.entity};
    const verified=visual(lookup(uint64(rid)));if(!verified||!verified.enabled)throw Error('Native glider render activation failed');
    send({event:'local_glider_render_enabled',rid,resource:state.resource});
   }
   lastStatus={active:true,rid,ready:true,renderEnabled:true,resource:state.resource};lastError='';
  }catch(error){const message=String(error);if(message!==lastError){lastError=message;send({event:'local_glider_error',error:message});}next=Date.now()+1000;}
 }});
 globalThis.LocalRoamGlider={active,label,fold,status(){return lastStatus;}};
 send({event:'local_glider_ready'});
}
let localGliderInstalled=false;
const localGliderObserver=Process.attachModuleObserver({onAdded(module){
 if(localGliderInstalled||module.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 localGliderInstalled=true;installLocalGlider();
}});
