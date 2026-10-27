'use strict';
// Local clothing restoration. Native mutations are called by character readiness
// on the frame thread, before the weapon/loadout restoration.
function installLocalOutfit(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const itemInfo=new NativeFunction(b.add(0xfd2250),'pointer',['int']);
 const apply=new NativeFunction(b.add(0xce6e00),'uint8',['pointer','pointer','pointer','uint8']);
 const roleFor=new NativeFunction(b.add(0xd45f20),'pointer',['uint32','uint64']);
 const skinInfo=new NativeFunction(b.add(0x114a4b0),'pointer',['int']);
 // The native character try-on path calls this on the current full man. It
 // rebuilds the real actor and applies its shipped avatar parts, not a preview.
 const applySkin=new NativeFunction(b.add(0x114a3d0),'uint8',['pointer','int','pointer','uint8','uint8']);
 const normalSkin=new NativeFunction(b.add(0x114a570),'uint8',['pointer']);
 const path='offline-research/local-server/local-outfit.json';
 const defaults={version:1,items:[305001,308001,309001]};
 const clothingSlots=new Set([13,14,15,16,17,18,19,22]);
 let missingProfile=false;
 function profile(){
  let raw,result;missingProfile=false;
  try{raw=File.readAllText(path);}catch(e){
   // Only create the default when absent. A malformed existing profile is an
   // error, so it cannot silently replace a user's selected clothes.
   if(!/no such file|not found/i.test(String(e)))throw e;
   missingProfile=true;
  }
  result=missingProfile?defaults:JSON.parse(raw);
  if(![1,2].includes(result.version)||!Array.isArray(result.items)||result.items.length>clothingSlots.size)throw Error('Invalid outfit profile');
  const skinId=result.version===1?-1:result.skin_id;
  if(!Number.isSafeInteger(skinId)||(skinId!==-1&&skinId<=0))throw Error('Invalid character skin');
  return {version:2,skin_id:skinId,items:result.items.slice()};
 }
 function itemSlots(id){
  if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid clothing ID');
  const info=itemInfo(id);if(info.isNull())throw Error('Unknown clothing '+id);
  const start=info.add(0x118).readPointer(),end=info.add(0x120).readPointer(),size=end.sub(start).toInt32();
  if(start.isNull()||size<4||size>32||size%4)throw Error('Clothing has no supported native slots '+id);
  const result=Array.from({length:size/4},(_,i)=>start.add(i*4).readS32());
  if(result.some(slot=>!clothingSlots.has(slot)))throw Error('Not a clothing item '+id);
  return result;
 }
 function validate(outfit){
  if(outfit.skin_id!==-1&&skinInfo(outfit.skin_id).isNull())throw Error('Unknown character skin '+outfit.skin_id);
  const slots=Memory.alloc(120),used=new Set(),items=[];slots.writeByteArray(new Uint8Array(120));
  for(const id of outfit.items){
   const nativeSlots=itemSlots(id);
   for(const slot of nativeSlots){if(used.has(slot))throw Error('Duplicate clothing slot '+slot);slots.add(slot*4).writeS32(id);used.add(slot);}
   items.push({id,slot:nativeSlots[0],slots:nativeSlots});
  }
  return {slots,items};
 }
 function worldReady(){const world=b.add(0x302a870).readPointer();return !world.isNull()&&world.add(0x6c).readU32()===4;}
 function context(){
  const world=b.add(0x302a870).readPointer();
  if(world.isNull()||world.add(0x6c).readU32()!==4)throw Error('Map is not ready for clothing');
  const man=getMan();if(man.isNull())throw Error('Character is missing');
  const actor=man.add(0x30).readPointer();if(actor.isNull())throw Error('Character actor is missing');
  const role=roleFor(1,man.add(0x28).readU64());if(role.isNull())throw Error('Character role is missing');
  return {man,actor,role};
 }
 function applyProfile(outfit){
  const {slots,items}=validate(outfit),c=context();
  if(c.man.add(0x3a0).readS32()!==14)throw Error('Leave the vehicle before changing appearance');
  if(globalThis.LocalRoamAdventure){const state=globalThis.LocalRoamAdventure.check();if(state.state===25||state.state===31)throw Error('Fold the active adventure equipment before changing appearance');}
  let applied;
  if(outfit.skin_id!==-1){
   applied=applySkin(c.man,outfit.skin_id,c.role.add(0x950),0,0);
  }else{
   const template=c.role.add(0x5e8).readS8()+0x25;
   // Heroes can share the base male/female template. Rebuild its original
   // avatar even when the template matches, so hero heads/parts cannot linger.
   c.man.add(0x108).writeS32(template);
   if(!normalSkin(c.man))throw Error('Native base character restoration failed');
   applied=apply(c.man,c.man.add(0x30).readPointer(),slots,0);
  }
  if(!applied)throw Error('Native appearance application failed');
  send({event:'local_outfit_restored',skin_id:outfit.skin_id,template:c.man.add(0x108).readS32(),items,actor:c.man.add(0x30).readPointer().toString()});
  return items;
 }
 function save(outfit){const f=new File(path,'w');try{f.write(JSON.stringify(outfit,null,2));}finally{f.close();}}
 function restore(){const outfit=profile(),items=applyProfile(outfit);if(missingProfile)save(outfit);return items;}
 function choose(outfit){
  validate(outfit);
  // Apply before saving: a refused in-world operation must preserve selection.
  if(worldReady())applyProfile(outfit);
  save(outfit);send({event:'local_appearance_selected',...outfit,applied:worldReady()});return outfit;
 }
 function selectSkin(id){if(!Number.isSafeInteger(id)||(id!==-1&&id<=0))throw Error('Invalid character skin');const outfit=profile();outfit.skin_id=id;return choose(outfit);}
 function wear(id,removeSlot){
  const outfit=profile();let replaced;
  if(id===0){if(!clothingSlots.has(removeSlot))throw Error('Invalid clothing slot');replaced=new Set([removeSlot]);}
  else replaced=new Set(itemSlots(id));
  outfit.items=outfit.items.filter(old=>!itemSlots(old).some(slot=>replaced.has(slot)));
  if(id!==0)outfit.items.push(id);
  outfit.skin_id=-1;return choose(outfit);
 }
 globalThis.LocalRoamOutfit={restore,selectSkin,wear,status(){return profile();}};
 send({event:'local_outfit_ready'});
}
let outfitInstalled=false;
const outfitObserver=Process.attachModuleObserver({onAdded(m){if(outfitInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;outfitInstalled=true;installLocalOutfit();}});
