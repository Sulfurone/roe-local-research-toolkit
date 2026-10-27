'use strict';
// Exact-build local vehicles. All entry points run on the client's frame thread.
//
// Protocol entries verified against this client build (RVA of Europa_Client.exe):
//   25931 BC_ENTER   0x10f6bc0   spawn a vehicle unit
//   25922 GETON_SYNC 0x10f7d00   board it
//   25924 GETOFF_SYNC 0x10f7d90  leave it
//   25966 OIL        0x10f80b0   fuel
// Offer native vehicles with both common spawn data and an appearance config.
function installLocalVehicles(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const manGet=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const lookup=new NativeFunction(b.add(0x131d260),'pointer',['uint64']);
 const enter=new NativeFunction(b.add(0x10f6bc0),'void',['pointer']);
 const geton=new NativeFunction(b.add(0x10f7d00),'void',['pointer']);
 const getoff=new NativeFunction(b.add(0x10f7d90),'void',['pointer']);
 const oil=new NativeFunction(b.add(0x10f80b0),'void',['pointer']);
 // Same entry used by qs.StartEngine(RID). Register the local engine so its
 // original per-frame RPM/acceleration RTPCs can start and stop vehicle audio.
 const startEngineAudio=new NativeFunction(b.add(0xe4dc00),'void',['pointer','uint64','int','pointer','int']);
 // Entity-level render activation. Actor visibility alone does not set the
 // proxy's render bit: local BC_ENTER leaves proxy+18C bit12 disabled.
 // This native setter also updates each draw instance's +C8 bit7.
 const enableRender=new NativeFunction(b.add(0x97a7c0),'void',['pointer','uint8']);
 const KINDS={0:'特殊',1:'船只',2:'地面载具',3:'工程',4:'滑行装备',5:'牵引',6:'升降',7:'飞行器',8:'雪橇',9:'军备',10:'特殊船只',11:'浮具',12:'装甲'};
 const LABELS={101:'四座吉普',102:'皮卡（FA_Vehicle_07）',103:'自行车',105:'越野吉普',106:'三轮车',107:'厢式车（FA_Vehicle_09）',108:'摩托车',109:'雪地摩托',110:'大脚车',111:'警车',112:'跑车',114:'特警装甲车',115:'全地形车',119:'皮卡',120:'悍马',201:'快艇',202:'汽艇',203:'渔船',204:'海盗船',205:'海盗船'};
 // 205 requires additional native state: bare BC_ENTER crashes at 130CF6D
 // dereferencing unit+1A0, before its renderer is activated. Do not offer it.
 const unsupported=new Set([205]);
 const applyModel=new NativeFunction(b.add(0xb89f10),'void',['pointer','pointer']);
 let serial=910000000,pending=null,latest=null,catalog=null,visualRows=null,visualPending=[];
 function blank(n){const p=Memory.alloc(n);p.writeByteArray(new Uint8Array(n));return p;}
 function position(unit){const p=new NativeFunction(unit.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(unit);return [0,4,8].map(o=>p.add(o).readFloat());}
 function owner(){
  const t=b.add(0x3094d90),k=t.add(0xb30).readU32();
  const h=(t.add((k&255)*4).readU32()+0x16af+t.add(0x400+((k>>>8)&255)*4).readU32())>>>0;
  return t.add(0x800+(h%102)*8).readPointer().xor(ptr(t.add(0xb34).readU16()));
 }
 function context(){const w=b.add(0x302a870).readPointer();if(w.isNull()||w.add(0x6c).readU32()!==4)throw Error('Map is not ready');const man=manGet();if(man.isNull()||man.add(0x30).readPointer().isNull())throw Error('Character is missing');return man;}
 // Getoff keeps the last RID. Native D5EC90 maps seated vehicle classes to
 // these poses; 3 is a glider and 14 is on foot.
 function isRiding(man){return !man.isNull()&&[0,1,2,4,5,6,7,8,9,11].includes(man.add(0x3a0).readS32())&&man.add(0x3a8).readU64().compare(uint64(0))!==0;}
 function modelRows(){
  if(visualRows)return visualRows;
  const rows=new Map();
  // The second table is the boat appearance table; boats use buoyancy instead of
  // the ground physics rows, so they must not be filtered out by physicsIds().
  for(const [rva,stride,offset,water] of [[0x3040888,0x220,0x80,false],[0x3040bf0,0x2d8,0x88,true]]){
   const table=b.add(rva).readPointer();if(table.isNull())continue;
   const begin=table.add(0xc0).readPointer(),end=table.add(0xc8).readPointer(),count=end.sub(begin).toInt32()/stride;
   if(!Number.isInteger(count)||count<0||count>1000)throw Error('Invalid vehicle appearance table');
   for(let i=0;i<count;i++){const row=begin.add(i*stride);rows.set(row.readS32(),{row:row.add(offset),water});}
  }
  if(rows.size)visualRows=rows;
  return rows;
 }
 // NOT a rendering proof: the player's own avatar reports loaded=0 on these same
 // fields while drawing normally. This only says the avatar resource was resolved
 // and a model proxy exists. renderEnabled reports the separate native drawing
 // gate; visual confirmation is documented in VEHICLE_RENDER_FIX.md.
 function bodyVisual(unit){
  try{
  const actor=unit.add(0x30).readPointer();if(actor.isNull())return {avatarReady:false,stage:'actor'};
  const root=actor.add(0xc30).readPointer();if(root.isNull())return {avatarReady:false,stage:'root'};
  // Root+180 is the render entity, not Actor+E18 or the physics component.
  const entity=root.add(0x180).readPointer();if(entity.isNull())return {avatarReady:false,stage:'render-entity'};
  const proxy=entity.add(0x60).readPointer();let path=null;
  try{path=entity.add(0x68).readPointer().readUtf8String();}catch(_){}
  const loaded=entity.add(0x7f).readU8()!==0;
  if(!loaded)return {avatarReady:false,stage:'mesh-not-loaded',resource:path};
  if(proxy.isNull()||proxy.add(0x138).readPointer().isNull())return {avatarReady:false,stage:'no-model-proxy',resource:path};
  // Boats live under Skin/Ship, ground vehicles under Skin/Vehicle.
  const matches=!!path&&/skin\/(vehicle|ship)\/.*mesh\.xml$/i.test(path.replace(/\\/g,'/'));
  return {avatarReady:matches,renderEnabled:(proxy.add(0x18c).readU32()&0x1000)!==0,resource:path,stage:matches?null:'unexpected-resource',loaded};
  }catch(e){return {avatarReady:false,stage:'error',error:String(e)};}
 }
 // Wheel actors are independent units in the vehicle part tree. Enabling the
 // chassis does not propagate to these proxies. Wait for their asynchronous
 // resources instead of completing visualPending as soon as the body is ready.
 function wheelVisuals(unit,activate=false){
  const wheels=[],seen=new Set();
  function walk(node){
   if(node.isNull()||seen.has(node.toString()))return;
   if(seen.size>=128)throw Error('Invalid vehicle part tree');
   seen.add(node.toString());walk(node.readPointer());
   const part=node.add(0x28).readPointer();
   if(!part.isNull()&&part.readPointer().equals(b.add(0x276f1f0))){
    const id=node.add(0x20).readS32(),state=bodyVisual(part);
    // Never activate an unrelated actor if a resource has been replaced.
    state.avatarReady=state.avatarReady&&/wheel.*mesh\.xml$/i.test(state.resource||'');
    if(activate&&state.avatarReady&&!state.renderEnabled){
     const entity=part.add(0x30).readPointer().add(0xc30).readPointer().add(0x180).readPointer();
     enableRender(entity,1);Object.assign(state,bodyVisual(part));
    }
    wheels.push({part_id:id,...state});
   }
   walk(node.add(8).readPointer());
  }
  walk(unit.add(0x288).readPointer());return wheels.sort((a,c)=>a.part_id-c.part_id);
 }
 function visual(unit){
  const state=bodyVisual(unit),wheels=wheelVisuals(unit);
  const expected=[101,105].includes(unit.add(0x17c).readS32())?4:wheels.length;
  return {...state,wheels,wheelsReady:wheels.length===expected&&wheels.every(w=>w.avatarReady&&w.renderEnabled)};
 }
 // A vehicle only spawns a drivable body when the native physics table has a row
 // for it. The appearance tables alone are not enough: ids 103/104/108 have car
 // art but no physics row; native initialization can dereference a null config.
 function physicsIds(){
  const ids=new Set();
  try{
   const t=b.add(0x302a908).readPointer();
   if(!t.isNull()){
    const begin=t.add(0xa8).readPointer(),end=t.add(0xb0).readPointer(),count=end.sub(begin).toInt32()/0x2e0;
    if(Number.isInteger(count)&&count>=0&&count<1000)for(let i=0;i<count;i++)ids.add(begin.add(i*0x2e0).readS32());
   }
  }catch(e){send({event:'local_vehicle_physics_error',error:String(e)});}
  return ids;
 }
 // The client's common vehicle table is reached through the guarded owner object;
 // rows are 0x260 bytes with the id at +0, the behaviour class at +4 and +0x68.
 function catalogue(){
  if(catalog)return catalog;
  const rows=new Map();
  try{
   const t=owner().add(0x30c0).readPointer(),begin=t.add(0x80).readPointer(),end=t.add(0x88).readPointer(),count=end.sub(begin).toInt32()/0x260;
   if(count>0&&count<1000)for(let i=0;i<count;i++){
    const row=begin.add(i*0x260),id=row.readS32(),kind=row.add(4).readS32();
    // Item-name lookup uses a different ID namespace. Prefer explicit vehicle
    // names and retain the ID for variants without a verified localized label.
    const label=LABELS[id]||('载具 '+id);
    rows.set(id,{id,label,kind,behavior:row.add(0x68).readS32()});
   }
  }catch(e){send({event:'local_vehicle_catalog_error',error:String(e)});}
  // A spawnable vehicle needs both art and a body. Art-only rows such as 103,
  // 104 and 108 must not enter the ordinary native car initialization path.
  const physics=physicsIds();
  catalog=[...rows.values()].filter(v=>{
   const entry=modelRows().get(v.id);
   return !unsupported.has(v.id)&&!!entry&&(physics.has(v.id)||entry.water);
  }).sort((x,y)=>x.id-y.id);
  send({event:'local_vehicle_catalog',count:catalog.length,physics:physics.size,
        kinds:catalog.map(v=>v.id+':'+v.kind+(modelRows().get(v.id).water?'w':'')).join(',')});
  return catalog;
 }
 function find(id){return catalogue().find(v=>v.id===id);}
 function instances(){
  const out=[];
  for(const v of tracked){
   if(v.rid.compare(uint64(0))===0)continue;
   const unit=lookup(v.rid);if(unit.isNull())continue;
   out.push({rid:v.rid.toString(),id:v.id,label:v.label,position:position(unit),visual:visual(unit)});
  }
  return out;
 }
 const tracked=[];
 function leave(){
  pending=null;const man=context(),rid=man.add(0x3a8).readU64();if(!isRiding(man))return;
  const unit=lookup(rid),p=unit.isNull()?position(man):position(unit),msg=blank(0x40);msg.writeU32(25924);msg.add(4).writeU64(rid);msg.add(0xc).writeS32(unit.isNull()?0:unit.add(0x17c).readS32());msg.add(0x10).writeU64(man.add(0x28).readU64());msg.add(0x18).writeS32(1);
  [p[0]+450,p[1],p[2]+200].forEach((v,i)=>msg.add(0x20+i*4).writeS32(Math.round(v)));
  getoff(msg);send({event:'local_vehicle_getoff',rid:rid.toString(),riding:isRiding(man),rider_state:man.add(0x3a0).readS32()});
 }
 function board(rid,seat){
  const man=context(),seatIndex=Number(seat)||1,v=lookup(uint64(rid));
  if(v.isNull())throw Error('Vehicle is missing');
  if(!Number.isInteger(seatIndex)||seatIndex<1||seatIndex>16)throw Error('Invalid vehicle seat');
  const vehicleId=v.add(0x17c).readS32();
  if(!find(vehicleId))throw Error('Unknown live vehicle '+vehicleId);
  // A rider must be detached from the previous vehicle before GETON_SYNC.
  // Repeated selection of the same vehicle must not attach a second time.
  if(isRiding(man)){
   if(man.add(0x3a8).readU64().compare(uint64(rid))===0)return;
   leave();if(isRiding(man))throw Error('Client has not left the previous vehicle');
  }
  // +0C is the vehicle config ID, used by D5EC90 to choose the rider state.
  // Passing seat 1 here returned fallback state 14 (standing), bypassing the car
  // animation and camera. The one-based seat belongs at +1C.
  const msg=blank(0x60);msg.writeU32(25922);msg.add(4).writeU64(uint64(rid));msg.add(0xc).writeS32(vehicleId);msg.add(0x10).writeS32(1);
  msg.add(0x14).writeU64(man.add(0x28).readU64());msg.add(0x1c).writeS32(seatIndex);
  geton(msg);
  if(!isRiding(man)||man.add(0x3a8).readU64().compare(uint64(rid))!==0)throw Error('Client rejected boarding');
  latest={rid:String(rid),id:vehicleId};
  if(seatIndex===1){const audio=b.add(0x30408d8).readPointer();if(!audio.isNull())startEngineAudio(audio,uint64(rid),0,blank(24),0);}
  send({event:'local_vehicle_geton',rid:String(rid),vehicle_id:vehicleId,seat:seatIndex,rider_state:man.add(0x3a0).readS32()});
 }
 function spawn(id,count,mode){
  const vehicle=find(Number(id));if(!vehicle)throw Error('Unsupported vehicle '+id);
  // The mode byte at body+0x0C is read three ways by 0x10F6BC0: (v&3) picks the
  // creation branch, bit 2 and bits 6-8 become separate descriptor flags, so values
  // above 3 are worth testing individually against the real screen.
  const spawnMode=Number.isInteger(mode)&&mode>=0&&mode<=0xfff?mode:1;
  const man=context(),riding=isRiding(man);
  const total=Math.min(Math.max(Number(count)||1,1),8);
  const map=b.add(0x302a860).readPointer().add(0xd0).readU32();
  const base=position(man);
  for(let index=0;index<total;index++){
   const rid=uint64(++serial),msg=blank(0x15a0),f=msg.add(4);
   msg.writeU32(25931);f.writeU64(rid);f.add(8).writeS32(vehicle.id);f.add(0xc).writeS32(spawnMode);f.add(0x10).writeS32(1000);
   // Spread a batch in a full ring at a fixed close distance so at least two cars
   // are inside the camera frustum no matter which way the player is facing.
   const angle=Math.PI*2*index/total,offset=400;
   [base[0]+Math.cos(angle)*offset,base[1]+Math.sin(angle)*offset,base[2]+150].forEach((v,i)=>f.add(0x14+i*4).writeS32(Math.round(v)));
   f.add(0x2d).writeFloat(1);f.add(0x39).writeU64(man.add(0x28).readU64());
   enter(msg);
   const fuel=blank(0x20);fuel.writeU32(25966);fuel.add(4).writeU64(rid);fuel.add(0xc).writeS32(100000);oil(fuel);
   const unit=lookup(rid);
   tracked.push({rid,id:vehicle.id,label:vehicle.label,kind:vehicle.kind});
   visualPending.push({rid,id:vehicle.id,map,at:Date.now()+1000,deadline:Date.now()+10000,retried:false});
   if(tracked.length>24)tracked.shift();
   send({event:'local_vehicle_spawned',rid:rid.toString(),id:vehicle.id,label:vehicle.label,kind:vehicle.kind,mode:spawnMode,
         position:unit.isNull()?null:position(unit),visual:unit.isNull()?'unit-missing':'unverified'});
  }
  const last=tracked[tracked.length-1];
  latest={rid:last.rid.toString(),id:last.id};
  // Only auto-board the first vehicle of a fresh batch, and never while the player
  // is already sitting in one.
  if(!riding&&total===1)pending={rid:last.rid,at:Date.now()+2000,map};
  return total;
 }
 globalThis.LocalRoamVehicles={
  spawn,leave,board,
  catalogue(){return catalogue().map(v=>({id:v.id,label:v.label+(modelRows().get(v.id).water?'（水上）':''),kind:v.kind,kind_label:KINDS[v.kind]||'其他',water:!!modelRows().get(v.id).water}));},
  instances,
  nearest(range){
   const man=context(),p=position(man);let best=null,bestDistance=Infinity;
   for(const v of instances()){
    const dx=v.position[0]-p[0],dy=v.position[1]-p[1],dz=v.position[2]-p[2];
    const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(d<bestDistance){bestDistance=d;best=v;}
   }
   return best&&bestDistance<=(range||400)?{vehicle:best,distance:bestDistance}:null;
  },
  boardLatest(){if(!latest)throw Error('Spawn a vehicle first');board(latest.rid,1);},
  riding(){return isRiding(manGet());},
  reset(){pending=null;latest=null;tracked.length=0;visualPending=[];catalog=null;visualRows=null;}
 };
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  const now=Date.now();
  visualPending=visualPending.filter(item=>{
   if(now<item.at)return true;
   try{
    if(b.add(0x302a860).readPointer().add(0xd0).readU32()!==item.map)return false;
    const unit=lookup(item.rid);if(unit.isNull())return false;
    let state=visual(unit);
    if(state.avatarReady){
     if(!state.renderEnabled){
      const root=unit.add(0x30).readPointer().add(0xc30).readPointer();
      enableRender(root.add(0x180).readPointer(),1);
      state=visual(unit);
      if(state.renderEnabled)send({event:'local_vehicle_render_enabled',rid:item.rid.toString(),resource:state.resource});
     }
     if(state.renderEnabled){
      const before=state.wheels.filter(w=>w.renderEnabled).length;
      wheelVisuals(unit,true);state=visual(unit);
      if(state.wheels.filter(w=>w.renderEnabled).length>before)send({event:'local_vehicle_wheels_enabled',rid:item.rid.toString(),wheels:state.wheels});
      if(state.wheelsReady){send({event:'local_vehicle_avatar_ready',rid:item.rid.toString(),...state});return false;}
     }
    }
    if(now>=item.deadline){send({event:'local_vehicle_avatar_missing',rid:item.rid.toString(),...state});return false;}
    if(!state.avatarReady&&!item.retried&&now>=item.deadline-6000){const art=modelRows().get(item.id);if(art){applyModel(unit.add(0x30).readPointer(),art.row);item.retried=true;send({event:'local_vehicle_visual_retry',rid:item.rid.toString()});}}
   }catch(e){send({event:'local_vehicle_visual_error',rid:item.rid.toString(),error:String(e)});return false;}
   item.at=now+500;return true;
  });
  if(!pending||now<pending.at)return;const p=pending;pending=null;
  try{if(b.add(0x302a860).readPointer().add(0xd0).readU32()===p.map)board(p.rid,1);}catch(e){send({event:'local_vehicle_error',error:String(e)});}
 }});
 send({event:'local_vehicles_ready'});
}
let lvInstalled=false;const lvObserver=Process.attachModuleObserver({onAdded(m){if(lvInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;lvInstalled=true;installLocalVehicles();}});
