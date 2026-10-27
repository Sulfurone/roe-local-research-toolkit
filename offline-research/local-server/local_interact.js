'use strict';
// Exact-build local interaction. Everything runs on the client's frame thread.
//
// The client's own interact action is the interned key at Europa_Client.exe+
// 0x309b810 ("INTERACT"), polled through the same input manager as fire/reload
// (RVA 0xA4C160, see qs.QueryInteract at RVA 0x18B0550). We reuse that channel, so
// a real F key press travels the engine's own path; the local build adds a target
// registry, a distance test against the player position and the effect the online
// server would otherwise confirm.
function installLocalInteract(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const registry=new NativeFunction(b.add(0x4982c0),'pointer',[])();
 const lookupKey=new NativeFunction(b.add(0x4984f0),'pointer',['pointer','pointer']);
 const interactKey=lookupKey(registry,Memory.allocUtf8String('INTERACT'));
 const RANGE=400;                     // world units; the player walks ~100 units a metre
 const MAX_LOOT=64;
 const names=new Map();
 const itemInfo=new NativeFunction(b.add(0xfd2250),'pointer',['int']);
 let serial=0,targets=[],prompt=null,lastFrame=0,previousDown=false;
 function position(){
  const man=getMan();if(man.isNull()||man.add(0x30).readPointer().isNull())throw Error('Player is not ready');
  const p=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);
  return [p.readFloat(),p.add(4).readFloat(),p.add(8).readFloat()];
 }
 function label(itemId){
  if(!names.has(itemId)){
   let text='物品 '+itemId;
   try{
    const ui=globalThis.LocalRoamUI;
    if(ui){const name=ui.evalLua('(function() local item=qs.GetItemInfo('+itemId+');return item and item.name or "" end)()');if(name&&!name.startsWith('ERR:')&&name!=='unreadable')text=name;}
   }catch(_){}
   names.set(itemId,text);
  }
  return names.get(itemId);
 }
 function add(target){targets.push(target);send({event:'local_interact_registered',kind:target.kind,key:target.key,label:target.label,position:target.position});return target;}
 function hint(value){prompt=value;if(globalThis.LocalRoamUI)globalThis.LocalRoamUI.prompt(value?value.label:null);}
 function remove(key){const before=targets.length;targets=targets.filter(t=>t.key!==key);if(prompt&&prompt.key===key)hint(null);return before-targets.length;}
 function clear(){const count=targets.filter(t=>t.kind==='loot').length;targets=[];hint(null);previousDown=false;if(globalThis.LocalRoamDoors)globalThis.LocalRoamDoors.reset();send({event:'local_interact_cleared',loot_count:count});}
 function inputAllowed(){return b.add(0x304071a).readU8()===0;}
 function nearest(origin){
  let best=null,bestDistance=Infinity;
  for(const t of targets){
   if(globalThis.LocalRoamGlider&&globalThis.LocalRoamGlider.active()&&t.kind!=='glider_fold')continue;
   if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding()&&t.kind!=='leave')continue;
   const dx=t.position[0]-origin[0],dy=t.position[1]-origin[1],dz=t.position[2]-origin[2];
   const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
   if(d<bestDistance){bestDistance=d;best=t;}
  }
  return best&&bestDistance<=RANGE?{target:best,distance:bestDistance}:null;
 }
 // Local pickups currently have a native HUD hint, but no world model. Do not
 // call the lobby graphic factory: an unknown archetype dereferences null.
 function dropLoot(itemId,count){
  if(!Number.isSafeInteger(itemId)||itemId<=0)throw Error('Invalid item ID');
  const info=itemInfo(itemId);if(info.isNull())throw Error('Unknown item '+itemId);
  const type=info.add(0x10).readS32();
  const consumable=globalThis.LocalRoamConsumables&&globalThis.LocalRoamConsumables.supports(itemId);
  if(![1,2,3,4].includes(type)&&!consumable)throw Error('Unsupported local pickup');
  count=count===undefined?1:count;
  if(!Number.isSafeInteger(count)||count<1||count>999)throw Error('Pickup count must be an integer from 1 to 999');
  if(type!==3&&!consumable&&count!==1)throw Error('Weapons and accessories must be dropped one at a time');
  if(targets.filter(t=>t.kind==='loot').length>=MAX_LOOT)throw Error('Local pickup limit reached (64)');
  const p=position(),offset=[(Math.random()-0.5)*300,(Math.random()-0.5)*300,60];
  const positionHere=[p[0]+offset[0],p[1]+offset[1],p[2]+offset[2]];
  const target=add({key:'loot:'+(++serial),kind:'loot',item_id:itemId,count,position:positionHere,label:'拾取 '+label(itemId)+(count>1?' ×'+count:'')});
  send({event:'local_loot_dropped',item_id:itemId,count:target.count,key:target.key,position:positionHere,visual:'not-implemented',hint:'InteractHintListPanel'});
  return target;
 }
 function take(target){
  try{
   if(!target||!targets.includes(target))throw Error('Pickup is no longer available');
   const p=position();if(Math.hypot(...target.position.map((v,i)=>v-p[i]))>RANGE)throw Error('Target is out of interaction range');
   if(target.kind==='vehicle'){globalThis.LocalRoamVehicles.board(target.rid,target.seat||1);remove(target.key);send({event:'local_interact_taken',kind:target.kind,rid:String(target.rid),remaining:targets.length});return true;}
   if(target.kind==='leave'){globalThis.LocalRoamVehicles.leave();remove(target.key);send({event:'local_interact_taken',kind:target.kind,remaining:targets.length});return true;}
   if(target.kind==='glider_fold'){const applied=globalThis.LocalRoamGlider.fold();if(applied)remove(target.key);return applied;}
   if(target.kind==='door'){const queued=globalThis.LocalRoamDoors.toggle(target.door_id);if(queued)send({event:'local_interact_taken',kind:'door',id:target.door_id});return queued;}
   const applied=globalThis.LocalRoamWeapons.grant(target.item_id,target.count);
   remove(target.key);
   send({event:'local_interact_taken',kind:target.kind,item_id:target.item_id,count:target.count,applied:applied,remaining:targets.length});
   return true;
  }catch(e){send({event:'local_interact_error',key:target&&target.key,error:String(e)});return false;}
 }
 function execute(){
  if(globalThis.LocalRoamConsumables&&globalThis.LocalRoamConsumables.cancel('interact'))return true;
  const found=nearest(position());
  if(!found){send({event:'local_interact_no_target'});return false;}
  return take(found.target);
 }
 function spawnVehicleTargets(){
  // Refresh the vehicle targets from the live registry so boarding prompts follow
  // the cars actually standing in the world.
  targets=targets.filter(t=>t.kind!=='vehicle');
  const list=globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.instances?globalThis.LocalRoamVehicles.instances():[];
  if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())return;
  for(const v of list)targets.push({key:'veh:'+v.rid,kind:'vehicle',rid:v.rid,seat:1,position:v.position,label:'驾驶 '+v.label});
 }
 function refreshDoors(origin){
  targets=targets.filter(t=>t.kind!=='door');
  if(!globalThis.LocalRoamDoors)return;
  for(const door of globalThis.LocalRoamDoors.nearby(origin,RANGE))targets.push({key:'door:'+door.id,kind:'door',door_id:door.id,position:door.position,label:door.label});
 }
 Interceptor.attach(b.add(0xa4c160),{onEnter(a){this.matches=false;try{this.matches=a[1].readPointer().equals(interactKey);}catch(_){}},
  onLeave(result){
   if(!this.matches||result.isNull())return;
   const down=result.add(2).readU8()!==0&&result.add(4).readU32()===b.add(0x3029b58).readU32();
   if(down&&!previousDown&&inputAllowed()){
    // Let the engine keep its own interact handling; the local registry only fills
    // in targets the online server would have confirmed.
    if(!execute())send({event:'local_interact_key_ignored'});
   }
   previousDown=down;
  }});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<lastFrame)return;lastFrame=Date.now()+250;
  try{
   const world=b.add(0x302a870).readPointer(),man=getMan();
   if(world.isNull()||world.add(0x6c).readU32()!==4||man.isNull()||man.add(0x30).readPointer().isNull())return;
   const riding=!!(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding());
   spawnVehicleTargets();
   refreshDoors(position());
   if(riding){
    const p=position();
    const exit=targets.find(t=>t.kind==='leave');
    if(exit)exit.position=p;
    else add({key:'veh:leave',kind:'leave',position:p,label:'下车'});
   }
   if(!riding)remove('veh:leave');
   targets=targets.filter(t=>t.kind!=='glider_fold');
   if(globalThis.LocalRoamGlider&&globalThis.LocalRoamGlider.active())targets.push({key:'mobility:glider_fold',kind:'glider_fold',position:position(),label:globalThis.LocalRoamGlider.label()});
   const found=inputAllowed()?nearest(position()):null;
   const key=found?found.target.key:null;
   if(key!==(prompt&&prompt.key)||(found&&prompt&&found.target.label!==prompt.label)){
    hint(found?found.target:null);
    send({event:'local_interact_prompt',label:prompt?prompt.label:null,distance:found?Math.round(found.distance):null});
   }
  }catch(e){send({event:'local_interact_frame_error',error:String(e)});}
 }});
 globalThis.LocalRoamInteract={
  drop:dropLoot,execute,take,clear,
  list(){return targets.map(t=>({kind:t.kind,key:t.key,label:t.label,item_id:t.item_id,count:t.count,door_id:t.door_id,position:t.position}));},
  promptTarget(){const found=nearest(position());return found?{label:found.target.label,distance:Math.round(found.distance)}:null;},
  dropKit(){
   // A field kit the player can walk over and pick up with F.
   if(targets.filter(t=>t.kind==='loot').length>MAX_LOOT-3)throw Error('Not enough space for the local field kit');
   for(const item of [[10201,1],[40303,1],[30001,30]])dropLoot(item[0],item[1]);
   send({event:'local_interact_kit_dropped'});
  }
 };
 send({event:'local_interact_ready',range:RANGE});
}
let liInstalled=false;
const liObserver=Process.attachModuleObserver({onAdded(m){if(liInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;liInstalled=true;installLocalInteract();}});
