'use strict';
// Exact-build local loadout. Invoked only on the game's frame thread.
function installLocalWeapons(){
 const m=Process.getModuleByName('Europa_Client.exe'),b=m.base;
 const config=new NativeFunction(b.add(0xf683f0),'pointer',['int']);
 const itemInfo=new NativeFunction(b.add(0xfd2250),'pointer',['int']);
 // This factory chooses rifle/shotgun/pistol subclasses, copies a real
 // stItemInfo, installs the item ID and registers engine object ownership.
 const create=new NativeFunction(b.add(0xfd1df0),'pointer',['int','int']);
 const init=new NativeFunction(b.add(0xd043f0),'void',['pointer','pointer','int','int']);
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const insert=new NativeFunction(b.add(0x4713c0),'void',['pointer','pointer','pointer']);
 const selectManWeapon=new NativeFunction(b.add(0xd923f0),'uint8',['pointer','int']);
 const activate=new NativeFunction(b.add(0xfb3c30),'void',['pointer','int']);
 const assignMount=new NativeFunction(b.add(0xd8f4d0),'void',['pointer','pointer','int','uint8']);
 const getSlot=new NativeFunction(b.add(0xfb38f0),'pointer',['pointer','int']);
 const growPointers=new NativeFunction(b.add(0x472670),'void',['pointer','pointer','pointer']);
 const roots=b.add(0x30528f0),pinned=new Set();
 const managed=new Set(),profilePath='offline-research/local-server/local-loadout.json';
 const canInstall=new NativeFunction(b.add(0xd07b90),'uint8',['pointer','int','uint8']);
 const mount=new NativeFunction(b.add(0xd07860),'void',['pointer','int','pointer']);
 const unmount=new NativeFunction(b.add(0xd07b10),'void',['pointer','int']);
 const restoreDefault=new NativeFunction(b.add(0xd077d0),'void',['pointer','int']);
 const recalculate=new NativeFunction(b.add(0xd07ca0),'void',['pointer']);
 let profile={version:1,slots:{1:10201,2:10401,3:20001},attachments:{},reserve:{}};
 try{const saved=JSON.parse(File.readAllText(profilePath));if(saved.version===1&&saved.slots&&saved.attachments&&saved.reserve)profile=saved;}catch(_){}
 let pendingReload=null,pendingAction=null,inputKeys=null,previousInput={},lastSaved=0,slotRequest=null;
 // The engine answers "how many rounds are left in the bag" by walking real item
 // records inside the holder inventory table (0xFB43A0 sums record+0x38 over the
 // bucket chain). Locally created firearms have no server inventory entry, so the
 // answer was 0 and the native reload was rejected — no animation, no refill.
 // Injecting fake records into that table corrupted it and killed the client, so
 // instead the query itself is answered locally. Nothing is mutated, therefore
 // nothing can be corrupted, and the engine still drives the whole reload.
 const weaponBullet=new Map();
 function rememberWeapon(w,bullet){
  try{weaponBullet.set(w.add(0x28).readS32(),bullet);}catch(_){}
 }
 Interceptor.attach(b.add(0xfb43a0),{
  onEnter(a){try{this.weaponId=a[1].toInt32();}catch(_){this.weaponId=-1;}},
  onLeave(r){
   if(this.weaponId<0||!managed.size)return;
   const bullet=weaponBullet.get(this.weaponId);
   if(bullet===undefined)return;
   const value=Number(profile.reserve[bullet]);
   if(!Number.isFinite(value)||value<0)return;
   if(r.toInt32()!==value)r.replace(ptr(value));
  }
 });
 function save(){try{File.writeAllText(profilePath,JSON.stringify(profile,null,2));}catch(e){send({event:'local_inventory_save_error',error:String(e)});}}
 function release(object){
  if(object.isNull()||!pinned.delete(object.toString()))return;
  const begin=roots.readPointer(),end=roots.add(8).readPointer();
  for(let p=begin;p.compare(end)<0;p=p.add(8))if(p.readPointer().equals(object)){
   for(let q=p.add(8);q.compare(end)<0;q=q.add(8))q.sub(8).writePointer(q.readPointer());
   roots.add(8).writePointer(end.sub(8));break;
  }
 }
 function retain(object){
  if(object.isNull()||pinned.has(object.toString()))return;
  // The GC's mark phase (48BD30) visits this native root vector. The slot
  // table stores raw pointers and is not, by itself, a GC root.
  const end=roots.add(8).readPointer(),cap=roots.add(16).readPointer();
  if(end.compare(cap)<0){end.writePointer(object);roots.add(8).writePointer(end.add(8));}
  else{const value=Memory.alloc(8);value.writePointer(object);growPointers(roots,end,value);}
  pinned.add(object.toString());
 }
 let ownerKey='',cache=new Map(),serial=50000;
 function magazineCapacity(w){
  const info=w.add(0x50).readPointer(),base=info.add(0x1f8).readS32(),extended=info.add(0x1fc).readS32();
  const parts=w.add(0xe30).readPointer(),mag=parts.isNull()?NULL:parts.add(3*8).readPointer(),id=mag.isNull()?0:mag.add(0x28).readS32();
  return id>40400&&id<40450&&extended>base?extended:base;
 }
 Interceptor.attach(b.add(0xd08afd),{onEnter(){
  const w=this.context.rsi;if(!managed.has(w.toString()))return;
  if(w.add(0x2c).readS32()===5)return;
  // Preserve the magazine capacity calculated by the original accessory code.
  // The online client otherwise overwrites it with its separate server value.
  const capacity=magazineCapacity(w);if(capacity>0&&capacity<=500)w.add(0xe94).writeS32(capacity);
 }});
 function call(w,offset,ret,args,...values){return new NativeFunction(w.readPointer().add(offset).readPointer(),ret,['pointer',...args])(w,...values);}
 function bulletType(w){
  const bridge=w.add(0x58),type=new NativeFunction(bridge.readPointer().add(0x50).readPointer(),'int',['pointer'])(bridge);
  for(let id=30001;id<=30100;id++){const info=itemInfo(id);if(!info.isNull()&&info.add(0x10).readS32()===3&&info.add(0x14).readS32()===type)return id;}
  throw Error('Invalid ammunition subtype '+type);
 }
 function context(){const man=getMan();if(man.isNull())throw Error('Player is not ready');const holder=man.add(0x130).readPointer();if(holder.isNull())throw Error('Weapon holder is missing');return {man,holder};}
 function current(slot){const {holder}=context();return getSlot(holder,slot||holder.add(0x220).readS32());}
 function select(slot){
  if(!Number.isInteger(slot)||slot<1||slot>3)throw Error('Invalid slot');
  const {man,holder}=context(),w=getSlot(holder,slot);if(w.isNull())return;
  if(holder.add(0x224).readU8()){const old=getSlot(holder,holder.add(0x220).readS32());if(!old.isNull())call(old,0x1a0,'void',[]);}
  pendingReload=null;activate(holder,0);if(!selectManWeapon(man,slot))throw Error('Native character weapon selection failed');
  send({event:'local_weapon_selected',slot,weapon_id:w.add(0x28).readS32()});
 }
 function equip(id,slot=1){
  const throwable=[50001,50002,50003].includes(id)&&slot===5;
  if(!Number.isInteger(id)||!Number.isInteger(slot)||(!throwable&&(slot<1||slot>3)))throw Error('Invalid firearm or slot (1–3)');
  const cfg=config(id),info=itemInfo(id);
  if(cfg.isNull()||info.isNull()||(!throwable&&(![1,2].includes(info.add(0x10).readS32())||[7,8].includes(info.add(0x14).readS32()))))throw Error('Unsupported firearm '+id);
  const man=getMan();if(man.isNull()||man.add(0x30).readPointer().isNull())throw Error('Player is not ready');
  const key=man.toString()+':'+man.add(0x30).readPointer().toString();
  if(key!==ownerKey){cache=new Map();ownerKey=key;}
  const holder=man.add(0x130).readPointer();if(holder.isNull())throw Error('Weapon holder is missing');
  const cacheKey=slot+':'+id;
  let w=cache.get(cacheKey);
  if(!w){
   w=create(id,1);if(w.isNull())throw Error('Native firearm factory failed');
   managed.add(w.toString());
   retain(w);
   // Network-created weapons normally receive this 28-byte block separately.
   // The constructor leaves its magazine override (+E94) uninitialized.
   const runtime=Memory.alloc(28);runtime.writeByteArray(new Uint8Array(28));
   runtime.add(0x10).writeS32(Math.round(cfg.add(0x50).readFloat()));
   runtime.add(0x14).writeS32(throwable?1:cfg.add(0x48).readS32());
   new NativeFunction(b.add(0xd02e60),'void',['pointer','pointer'])(w,runtime);
   init(w,man,cfg.add(0x79c).readS32(),++serial);
   const parts=w.add(0xe30).readPointer(),partsEnd=w.add(0xe38).readPointer();
   for(let p=parts;!p.isNull()&&p.compare(partsEnd)<0;p=p.add(8))retain(p.readPointer());
   const actual=new NativeFunction(w.add(0x58).readPointer().add(0x28).readPointer(),'pointer',['pointer'])(w.add(0x58));
   if(!actual.equals(man)||!w.add(0xeac).readU8())throw Error('Native firearm initialization failed');
   cache.set(cacheKey,w);
  }
  if(holder.add(0x224).readU8()){
   const previous=getSlot(holder,holder.add(0x220).readS32());
   if(!previous.isNull())call(previous,0x1a0,'void',[]);
  }
  activate(holder,0);
  const keyBuffer=Memory.alloc(16),out=Memory.alloc(16);keyBuffer.writeByteArray(new Uint8Array(16));keyBuffer.writeS32(slot);
  insert(holder.add(0xb0),out,keyBuffer);const node=out.readPointer();if(node.isNull())throw Error('Weapon slot insert failed');
  node.add(8).writePointer(w);
  assignMount(man,w,slot,1);
  const capacity=w.add(0x810).readS32();if(capacity<1||capacity>500)throw Error('Invalid magazine capacity');
  call(w,0x1d8,'void',['int'],capacity);if(!selectManWeapon(man,slot))throw Error('Native character weapon selection failed');
  if(throwable){initializeInput();send({event:'local_throwable_equipped',item_id:id,slot,weapon:w.toString(),native_class:w.readPointer().sub(b).toString()});return w;}
  profile.slots[slot]=id;profile.attachments[slot]={};
  const existing=w.add(0xe30).readPointer();
  for(let index=0;index<6;index++){const part=existing.add(index*8).readPointer();if(!part.isNull()){const partId=part.add(0x28).readS32();if(partId%100<50&&canInstall(w,partId,1))profile.attachments[slot][index]=partId;}}
  const bullet=bulletType(w);w.add(0x94).writeS32(itemInfo(bullet).add(0x14).readS32());if(!Number.isInteger(profile.reserve[bullet]))profile.reserve[bullet]=300;
  rememberWeapon(w,bullet);
  for(const key of Object.keys(profile.reserve))if(Number(key)<30001||Number(key)>30100)delete profile.reserve[key];
  save();initializeInput();
  send({event:'local_weapon_equipped',weapon_id:id,slot,weapon:w.toString(),ammo:w.add(0x90).readS32(),capacity,native_class:w.readPointer().sub(b).toString()});
  return w;
 }
 function accessory(id,slot=1,removeSlot=null){
  const w=current(slot);if(w.isNull())throw Error('Equip a firearm in this slot first');
  let index=removeSlot;
  if(index===null){const info=itemInfo(id);if(info.isNull()||info.add(0x10).readS32()!==4)throw Error('Invalid attachment');index=info.add(0x14).readS32();if(index<0||index>5||!canInstall(w,id,1))throw Error('Attachment is not compatible with this firearm');}
  if(!Number.isInteger(index)||index<0||index>5)throw Error('Invalid attachment slot');
  const parts=w.add(0xe30).readPointer(),old=parts.add(index*8).readPointer();
  if(removeSlot!==null){unmount(w,index);release(old);restoreDefault(w,index);retain(parts.add(index*8).readPointer());}
  else{const part=create(id,1);if(part.isNull())throw Error('Attachment factory failed');retain(part);mount(w,index,part);release(old);}
  recalculate(w);
  const capacity=magazineCapacity(w);if(capacity<1||capacity>500)throw Error('Invalid magazine capacity');
  w.add(0xe94).writeS32(capacity);w.add(0x810).writeS32(capacity);
  if(w.add(0x90).readS32()>capacity){const bullet=bulletType(w),extra=w.add(0x90).readS32()-capacity;call(w,0x1d8,'void',['int'],capacity);profile.reserve[bullet]=(profile.reserve[bullet]||0)+extra;}
  const saved=profile.attachments[slot]||{};if(removeSlot!==null)delete saved[index];else saved[index]=id;profile.attachments[slot]=saved;save();
  send({event:'local_attachment_changed',slot,index,accessory_id:removeSlot===null?id:0,capacity:w.add(0x810).readS32()});
 }
function reload(){
 if(pendingReload){send({event:'local_reload_skipped',reason:'already'});return;}
 const w=current();if(w.isNull()){send({event:'local_reload_skipped',reason:'no weapon'});return;}
  if(w.add(0x2c).readS32()===5){send({event:'local_reload_skipped',reason:'throwable'});return;}
 const capacity=w.add(0x810).readS32(),ammo=w.add(0x90).readS32(),bullet=bulletType(w);
 if(ammo>=capacity){send({event:'local_reload_skipped',reason:'magazine full',ammo,capacity});return;}
 if(!(profile.reserve[bullet]>0)){send({event:'local_reload_skipped',reason:'no reserve',bullet,ammo,capacity});return;}
 rememberWeapon(w,bullet);
 call(w,0x1b8,'void',[]);
 // The engine may now run the reload on its own. Give it well over the longest
 // reload length before topping the magazine up by hand, otherwise the manual
 // fill would cut the animation short.
 pendingReload={w,bullet,before:ammo,finish:Date.now()+4000};
 send({event:'local_reload_started',weapon_id:w.add(0x28).readS32(),duration_ms:4000});
}
 function supply(){for(let id=30001;id<=30008;id++)profile.reserve[id]=600;save();send({event:'local_ammo_supplied'});}
 // Item routing for the local interaction system: a picked-up item has to land in
 // the same places the online inventory would have put it.
 function grant(itemId,count){
  if(globalThis.LocalRoamConsumables&&globalThis.LocalRoamConsumables.supports(itemId))return globalThis.LocalRoamConsumables.grant(itemId,count);
  const info=itemInfo(itemId);if(info.isNull())throw Error('Unknown item '+itemId);
  const type=info.add(0x10).readS32(),subType=info.add(0x14).readS32(),total=Math.max(Number(count)||1,1);
  if(type===1||type===2){
   const slot=itemId>=20000&&itemId<30000?3:(itemId>=10400&&itemId<10500)||(itemId>=10600&&itemId<10700)?2:1;
   equip(itemId,slot);
   return {kind:'weapon',slot,item_id:itemId};
  }
  if(type===3){profile.reserve[itemId]=(profile.reserve[itemId]||0)+total;save();return {kind:'ammo',item_id:itemId,added:total,reserve:profile.reserve[itemId]};}
  if(type===4){
   const {holder}=context(),active=holder.add(0x220).readS32();
   for(const slot of [...new Set([active,1,2,3])]){
    if(slot<1||slot>3)continue;
    const w=current(slot);
    if(!w.isNull()&&canInstall(w,itemId,1)){
     accessory(itemId,slot);return {kind:'attachment',slot,index:subType,item_id:itemId};
    }
   }
   throw Error('No carried weapon accepts accessory '+itemId);
  }
  profile.other=profile.other||{};profile.other[itemId]=(profile.other[itemId]||0)+total;save();
  return {kind:'consumable',item_id:itemId,count:profile.other[itemId]};
 }
 // Every attachment the build knows, grouped by the six native slots, with the
 // compatibility answer taken from the engine itself.
 function accessoryReport(slot){
  const w=current(slot);if(w.isNull())throw Error('Equip a firearm in this slot first');
  const groups=[[],[],[],[],[],[]],parts=w.add(0xe30).readPointer();
  for(let id=40001;id<=40999;id++){
   const info=itemInfo(id);if(info.isNull()||info.add(0x10).readS32()!==4)continue;
   const index=info.add(0x14).readS32();if(index<0||index>5)continue;
   if(canInstall(w,id,1))groups[index].push(id);
  }
  const installed=[];
  for(let index=0;index<6;index++){const part=parts.add(index*8).readPointer();installed.push(part.isNull()?0:part.add(0x28).readS32());}
  return {weapon_id:w.add(0x28).readS32(),capacity:w.add(0x810).readS32(),installed,compatible:groups.map(g=>g.length),ids:groups};
 }
 function installBest(slot){
  const report=accessoryReport(slot||1),w=current(slot||1);
  const base=new NativeFunction(b.add(0xf683f0),'pointer',['int']);
  const changes=[];
  for(let index=0;index<6;index++){
   if(report.installed[index])continue;
   // Prefer the accessory that actually changes the weapon parameters.
   const before=w.add(0x810).readS32();
   for(const id of report.ids[index]){
    try{accessory(id,slot||1);}catch(e){continue;}
    changes.push({index,slot:index,item_id:id,capacity:w.add(0x810).readS32()-before});
    break;
   }
  }
  send({event:'local_attachment_best',slot:slot||1,changes:changes.length,installed:report.installed,compatible:report.compatible});
  return changes;
 }
 function status(){
  const slots=[];
  for(let slot=1;slot<=3;slot++){const w=current(slot);if(w.isNull())continue;const bullet=bulletType(w),parts=w.add(0xe30).readPointer(),attachments=[];rememberWeapon(w,bullet);for(let i=0;i<6;i++){const part=parts.add(i*8).readPointer();attachments.push(part.isNull()?0:part.add(0x28).readS32());}slots.push({slot,id:w.add(0x28).readS32(),ammo:w.add(0x90).readS32(),capacity:w.add(0x810).readS32(),bullet,reserve:profile.reserve[bullet]||0,attachments});}
  return {slots,reserve:profile.reserve,reloading:!!pendingReload};
 }
 function restore(){
  const desired={...profile.slots},attachments=JSON.parse(JSON.stringify(profile.attachments));
  for(let slot=1;slot<=3;slot++){try{equip(Number(desired[slot])||[10201,10401,20001][slot-1],slot);for(const id of Object.values(attachments[slot]||{}))try{accessory(Number(id),slot);}catch(e){send({event:'local_attachment_restore_skipped',id,error:String(e)});}}catch(e){send({event:'local_loadout_restore_error',slot,error:String(e)});}}
  select(1);
 }
 function reset(){
  pendingReload=null;pendingAction=null;
  try{const {holder}=context();for(const slot of [1,2,3,5]){const w=getSlot(holder,slot);if(!w.isNull())call(w,0x1a0,'void',[]);const key=Memory.alloc(16),out=Memory.alloc(16);key.writeByteArray(new Uint8Array(16));key.writeS32(slot);insert(holder.add(0xb0),out,key);out.readPointer().add(8).writePointer(NULL);}activate(holder,0);}catch(_){}
  for(const object of [...pinned])release(ptr(object));cache=new Map();managed.clear();weaponBullet.clear();ownerKey='';
 }
 function initializeInput(){
  if(inputKeys)return;const registry=new NativeFunction(b.add(0x4982c0),'pointer',[])(),lookup=new NativeFunction(b.add(0x4984f0),'pointer',['pointer','pointer']);inputKeys=new Map();
  for(const name of ['WEAPON_RELOAD','ACTIVE_WEAPON_PRIMARY','ACTIVE_WEAPON_SECONDARY','ACTIVE_WEAPON_SIDEARM','TOGGLE_INVENOTRY','FIRE']){const key=lookup(registry,Memory.allocUtf8String(name)),keyPointer=Memory.alloc(8);keyPointer.writePointer(key);inputKeys.set(key.toString(),{name,keyPointer,buffer:Memory.alloc(0x40)});}
 }
 Interceptor.attach(b.add(0xa4c160),{onEnter(a){this.input=null;if(!inputKeys||!globalThis.LocalRoamCharacter||!globalThis.LocalRoamCharacter.ready())return;try{this.input=inputKeys.get(a[1].readPointer().toString());}catch(_){}},onLeave(r){
  const entry=this.input;if(!entry||r.isNull())return;const name=entry.name;
  if(name==='FIRE'&&!pendingReload)return;
  const down=r.add(2).readU8()!==0&&r.add(4).readU32()===b.add(0x3029b58).readU32();
  if(name!=='FIRE'&&down&&!previousInput[name]){pendingAction=name;send({event:'local_input_action',action:name});}previousInput[name]=down;
  // Reload and slot switching are left to the engine so it can play its own
  // animations; the local handlers below still run as a safety net.
  if(name==='WEAPON_RELOAD'||name.startsWith('ACTIVE_WEAPON_'))return;
  const buffer=entry.buffer;buffer.writeByteArray(r.readByteArray(0x28));buffer.add(2).writeU8(0);r.replace(buffer);
 }});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){try{
  if(pendingAction){const action=pendingAction;pendingAction=null;if(action==='WEAPON_RELOAD')reload();else if(action==='TOGGLE_INVENOTRY'){if(globalThis.LocalRoamUI)globalThis.LocalRoamUI.inventoryToggle();}else{const requested=['','ACTIVE_WEAPON_PRIMARY','ACTIVE_WEAPON_SECONDARY','ACTIVE_WEAPON_SIDEARM'].indexOf(action);if(requested>0){try{const {holder}=context();if(holder.add(0x220).readS32()!==requested)slotRequest={slot:requested,at:Date.now()+250};}catch(_){}}}}
  if(slotRequest&&Date.now()>=slotRequest.at){const requested=slotRequest.slot;slotRequest=null;try{const {holder}=context();if(holder.add(0x220).readS32()!==requested)select(requested);}catch(_){}}
  if(pendingReload&&Date.now()>=pendingReload.finish){
   const {w,bullet,before}=pendingReload,ammo=w.add(0x90).readS32(),gained=ammo-before;
   let native=false;
   if(gained>0){
    // The engine reloaded by itself — just mirror its ammunition accounting.
    native=true;profile.reserve[bullet]=Math.max(0,(profile.reserve[bullet]||0)-gained);
   }else{
    const need=Math.max(0,w.add(0x810).readS32()-ammo),count=Math.min(need,profile.reserve[bullet]||0);
    call(w,0x1d8,'void',['int'],ammo+count);profile.reserve[bullet]=(profile.reserve[bullet]||0)-count;
   }
   pendingReload=null;save();
   send({event:'local_reload_complete',ammo:w.add(0x90).readS32(),reserve:profile.reserve[bullet],native});
  }
 }catch(e){pendingReload=null;send({event:'local_weapon_input_error',error:String(e)});}}});
 globalThis.LocalRoamWeapons={equip,select,accessory,reload,supply,status,restore,reset,grant,accessoryReport,installBest,preferences(){return {weapon_id:Number(profile.slots[1])||10201,slot:1};},canInstall(slot,id){const w=current(slot);return !w.isNull()&&canInstall(w,id,1)!==0;}};
 send({event:'local_weapons_ready'});
}
let lwInstalled=false;
const lwObserver=Process.attachModuleObserver({onAdded(m){if(lwInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;lwInstalled=true;installLocalWeapons();}});
