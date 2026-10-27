'use strict';
// Exact-build local consumables. All effects run on the game's frame thread.
function installLocalConsumables(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const manGet=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const db=new NativeFunction(b.add(0xd45f20),'pointer',['uint32','uint64']);
 const getSlot=new NativeFunction(b.add(0xfb38f0),'pointer',['pointer','int']);
 const powerSync=new NativeFunction(b.add(0x12ebcf0),'void',['pointer','pointer']);
 const beginNativeThrow=new NativeFunction(b.add(0xe8ba10),'uint8',['pointer']);
 const releaseNativeThrow=new NativeFunction(b.add(0xe8bce0),'uint8',['pointer']);
 const cancelNativeThrow=new NativeFunction(b.add(0xe8bc00),'uint8',['pointer']);
 const nativeThrowState=new NativeFunction(b.add(0x13329c0),'pointer',['pointer']);
 const finishThrow=new NativeFunction(b.add(0xe8b8e0),'void',['pointer','int','pointer','int']);
 const enableRender=new NativeFunction(b.add(0x97a7c0),'void',['pointer','uint8']);
 const initTrajectoryQuery=new NativeFunction(b.add(0x134e560),'void',['pointer','float','int']);
 // Fuse times from QSWeaponConfigTable.mThrowableParams: FRAG 5s, SMOKE 5s, FLASHBANG 2.5s.
 const specs={50001:{name:'手榴弹',kind:'throwable',fuse:5000,stock:5},50002:{name:'烟雾弹',kind:'throwable',fuse:5000,stock:5},50003:{name:'闪光弹',kind:'throwable',fuse:2500,stock:5},70001:{name:'绷带',kind:'medicine',duration:3000,heal:10,stock:10},70002:{name:'医疗包',kind:'medicine',duration:6000,heal:50,stock:5},70003:{name:'医疗箱',kind:'medicine',duration:8000,heal:100,stock:2},70004:{name:'能量饮料',kind:'medicine',duration:4000,heal:0,stock:5,regen:{buff:2,per:2,interval:6000,duration:60000}}};
 const path='offline-research/local-server/local-consumables.json';
 let profile={version:1,selected:50001,items:{}},profileError=null;
 for(const [id,s] of Object.entries(specs))profile.items[id]=s.stock;
 try{
  const saved=JSON.parse(File.readAllText(path));
  if(saved.version!==1||!saved.items||!specs[saved.selected]||specs[saved.selected].kind!=='throwable')throw Error('Invalid consumables profile');
  for(const id of Object.keys(specs))if(saved.items[id]===undefined)saved.items[id]=specs[id].stock;else if(!Number.isSafeInteger(saved.items[id])||saved.items[id]<0||saved.items[id]>999)throw Error('Invalid consumable count '+id);
  profile=saved;
 }catch(e){if(!/no such file|not found/i.test(String(e)))profileError=String(e);}
 let medical=null,pendingThrow=null,armed=null,tracked=[],next=0,hudAt=0,previous={},queued=[],lastThrow=0,regen=null;
 function save(){File.writeAllText(path,JSON.stringify(profile,null,2));}
 function context(){
  if(profileError)throw Error(profileError);
  const world=b.add(0x302a870).readPointer();
  if(world.isNull()||world.add(0x6c).readU32()!==4||!globalThis.LocalRoamCharacter||!globalThis.LocalRoamCharacter.ready())throw Error('Character is not ready');
  const man=manGet();if(man.isNull()||man.add(0x30).readPointer().isNull())throw Error('Character is missing');
  const uid=man.add(0x28).readU64(),role=db(1,uid);if(role.isNull())throw Error('Character health is missing');
  return {man,uid,role,holder:man.add(0x130).readPointer(),system:man.add(0x170).readPointer()};
 }
 function health(c){const decode=o=>(c.role.add(o).readU32()^0xa59cf5b6)>>>0;const hp=decode(0x5f0),max=decode(0x5f8);if(max<1||max>100000||hp>max)throw Error('Invalid native health');return {hp,max};}
 function position(man){const p=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);return [0,4,8].map(o=>p.add(o).readFloat());}
 function syncHealth(c,hp){
  const h=health(c),msg=Memory.alloc(0x40);msg.writeByteArray(new Uint8Array(0x40));msg.writeU32(4201);msg.add(4).writeU64(c.uid);msg.add(0xd).writeU8(1);msg.add(0xe).writeU8(0);msg.add(0xf).writeS32(Math.min(h.max,Math.max(0,Math.round(hp))));msg.add(0x13).writeS32(h.max);
  powerSync(NULL,msg);return health(c).hp;
 }
 function notice(text){if(globalThis.LocalRoamUI&&globalThis.LocalRoamUI.notice)globalThis.LocalRoamUI.notice(text);}
 function cancel(reason){if(!medical)return false;const id=medical.id;medical=null;notice(null);send({event:'local_medicine_cancelled',item_id:id,reason});return true;}
 function use(id){
  const s=specs[id];if(!s||s.kind!=='medicine')throw Error('Unsupported medicine');
  const c=context(),h=health(c);
  if(medical||pendingThrow)throw Error('An item is already being used');
  if(h.hp<=0||h.hp>=h.max){send({event:'local_medicine_refused',item_id:id,reason:h.hp<=0?'not_alive':'full_health'});return false;}
  if((profile.items[id]||0)<1)throw Error('No '+s.name+' remaining');
  if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())throw Error('Leave the vehicle before healing');
  medical={id,owner:c.man.toString(),uid:c.uid.toString(),slot:c.holder.add(0x220).readS32(),started:Date.now(),finish:Date.now()+s.duration,position:position(c.man),hp:h.hp};
  notice('使用'+s.name+' · '+(s.duration/1000)+'秒 · F 取消');
  send({event:'local_medicine_started',item_id:id,duration:s.duration,hp:h.hp,count:profile.items[id]});return true;
 }
 function grant(id,count){
  if(!specs[id]||!Number.isSafeInteger(count)||count<1)throw Error('Invalid consumable');
  if(profileError)throw Error(profileError);
  const total=profile.items[id]+count;if(total>(specs[id].kind==='throwable'?100:999))throw Error('Consumable stack is full');
  const before=profile.items[id];profile.items[id]=total;try{save();}catch(e){profile.items[id]=before;throw e;}
  send({event:'local_consumable_granted',item_id:id,added:count,count:total});return {kind:specs[id].kind,item_id:id,added:count,count:total};
 }
 function supply(){if(profileError)throw Error(profileError);for(const [id,s] of Object.entries(specs))profile.items[id]=Math.max(profile.items[id],s.stock);save();send({event:'local_consumables_supplied',items:profile.items});return status();}
 function arm(id){
  const s=specs[id];if(!s||s.kind!=='throwable')throw Error('Unsupported throwable');
  const c=context();if(health(c).hp<=0)throw Error('Character is not alive');
  if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())throw Error('Leave the vehicle before equipping a throwable');
  if(profile.items[id]<1)throw Error('No '+s.name+' remaining');
  cancel('switch_weapon');
  if(pendingThrow)interruptThrow('switch_throwable');
  const w=globalThis.LocalRoamWeapons.equip(id,5);w.add(0x38).writeS32(profile.items[id]);
  // The base weapon Init leaves this derived throwable query null. The same
  // native initializer is used by the projectile's embedded trajectory object.
  // Radius comes from the copied ThrowableConfig (+14), not a guessed size.
  if(w.add(0x1180).readPointer().isNull()){
   const radius=w.add(0x10dc).readFloat();if(!Number.isFinite(radius)||radius<=0||radius>1000)throw Error('Invalid throwable collision radius');
   const mask=new NativeFunction(c.man.readPointer().add(0x2e0).readPointer(),'int',['pointer'])(c.man);
   initTrajectoryQuery(w.add(0x1160),radius,mask);
   if(w.add(0x1180).readPointer().isNull())throw Error('Throwable trajectory query failed');
  }
  armed={id,weapon:w,at:Date.now()};profile.selected=id;save();return id;
 }
 function queueThrow(id,low){
  if(pendingThrow)throw Error('A throw is already queued');
  const c=context();if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())throw Error('Leave the vehicle before throwing');
  cancel('throw');
  if(!armed||armed.id!==id||c.holder.add(0x220).readS32()!==5)arm(id);
  if(profile.items[id]<1)throw Error('No throwable remaining');
  pendingThrow={id,low:!!low,at:Math.max(Date.now(),armed.at+600),owner:c.man.toString()};
 }
 function objects(system){
  if(system.isNull())return [];
  const begin=system.add(0x20).readPointer(),end=system.add(0x28).readPointer(),n=end.sub(begin).toInt32()/8;
  if(!Number.isInteger(n)||n<0||n>1000)throw Error('Invalid native throwable registry');
  const out=[];for(let i=0;i<n;i++)out.push(begin.add(i*8).readPointer());return out;
 }
 function interruptThrow(reason){
  const request=pendingThrow;pendingThrow=null;if(!request)return;
  try{const c=context();if(c.man.toString()===request.owner&&!nativeThrowState(c.man).isNull())cancelNativeThrow(c.system);}catch(_){}
  send({event:'local_throwable_cancelled',item_id:request.id,reason});
 }
 function beginAnimation(request){
  const c=context();
  if(c.man.toString()!==request.owner||c.system.isNull()||c.holder.add(0x220).readS32()!==5||!armed||armed.id!==request.id||!getSlot(c.holder,5).equals(armed.weapon)||b.add(0x304071a).readU8()!==0||health(c).hp<=0||(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())){interruptThrow('state_changed');return;}
  if(tracked.length>=24||profile.items[request.id]<1){interruptThrow('no_capacity');return;}
  request.phase='animation';request.started=Date.now();
  if(!beginNativeThrow(c.system)){interruptThrow('native_action_refused');return;}
  send({event:'local_throwable_animation_started',item_id:request.id,low:request.low});
 }
 // Observe the native factory and release rather than spawning a second object
 // on a JS timer. QSMan's throwable state drives the arm motion and release time.
 Interceptor.attach(b.add(0xe8d6e0),{onEnter(a){
  this.request=null;try{const r=pendingThrow,c=context();if(r&&r.phase==='animation'&&a[0].equals(c.system)&&a[1].toInt32()===r.id&&c.man.toString()===r.owner){this.request=r;this.sequence=a[2].toInt32();}}catch(_){}
 },onLeave(object){const r=this.request;if(r&&pendingThrow===r&&!object.isNull())r.created={object:object.toString(),sequence:this.sequence};}});
 Interceptor.attach(b.add(0x11e1100),{onEnter(a){
  this.request=null;const r=pendingThrow;if(r&&r.created&&a[0].toString()===r.created.object){this.request=r;this.position=[0,4,8].map(o=>a[1].add(o).readFloat());this.direction=[0,4,8].map(o=>a[2].add(o).readFloat());}
 },onLeave(){
  const r=this.request;if(!r||pendingThrow!==r)return;pendingThrow=null;
  profile.items[r.id]=Math.max(0,profile.items[r.id]-1);if(armed&&armed.id===r.id)armed.weapon.add(0x38).writeS32(profile.items[r.id]);save();
  tracked.push({seq:r.created.sequence,id:r.id,owner:r.owner,finish:Date.now()+specs[r.id].fuse,finished:false,render:false,started:Date.now()});lastThrow=Date.now();
  send({event:'local_throwable_launched',item_id:r.id,sequence:r.created.sequence,count:profile.items[r.id],position:this.position,direction:this.direction,low:r.low,native_animation:true});
 }});
 function status(){let h=null,active=null;try{const c=context();h=health(c);active=c.holder.add(0x220).readS32();}catch(_){}return {items:{...profile.items},selected:profile.selected,health:h,active_slot:active,using:medical?{item_id:medical.id,remaining:Math.max(0,medical.finish-Date.now())}:null,regen:regen?{item_id:regen.id,buff:regen.buff,ticks:regen.ticks,remaining:Math.max(0,regen.until-Date.now())}:null,projectiles:tracked.map(t=>({sequence:t.seq,item_id:t.id,finished:t.finished,render:t.render})),error:profileError};}
 function reset(){cancel('map_change');interruptThrow('map_change');armed=null;tracked=[];queued=[];previous={};regen=null;notice(null);}
 // Read answers only; never insert fabricated objects into the engine inventory.
 Interceptor.attach(b.add(0x139edc0),{onEnter(a){this.id=a[0].toInt32();this.local=a[1].toInt32()===0;},onLeave(r){if(this.local&&specs[this.id]&&!profileError&&globalThis.LocalRoamCharacter&&globalThis.LocalRoamCharacter.ready())r.replace(ptr(profile.items[this.id]));}});
 const registry=new NativeFunction(b.add(0x4982c0),'pointer',[])(),lookup=new NativeFunction(b.add(0x4984f0),'pointer',['pointer','pointer']),keys=new Map();
 for(const name of ['USE_ITEM_70001','USE_ITEM_70002','USE_ITEM_70003','USE_ITEM_70004','ACTIVE_WEAPON_THROW','FIRE','AIM'])keys.set(lookup(registry,Memory.allocUtf8String(name)).toString(),name);
 const suppressed=Memory.alloc(0x40);
 Interceptor.attach(b.add(0xa4c160),{onEnter(a){this.key=null;try{this.key=keys.get(a[1].readPointer().toString());}catch(_){}},onLeave(r){
  if(!this.key||r.isNull()||!globalThis.LocalRoamCharacter||!globalThis.LocalRoamCharacter.ready())return;
  const key=this.key,down=r.add(2).readU8()!==0&&r.add(4).readU32()===b.add(0x3029b58).readU32();
  let throwing=false;try{const man=manGet(),holder=man.add(0x130).readPointer();throwing=!!armed&&!holder.isNull()&&holder.add(0x220).readS32()===5;}catch(_){}
  if(down&&!previous[key]&&b.add(0x304071a).readU8()===0){if(key.startsWith('USE_ITEM_'))queued.push({kind:'medicine',id:Number(key.slice(9))});else if(key==='ACTIVE_WEAPON_THROW')queued.push({kind:'arm'});else if(medical)cancel('combat');else if(throwing&&!pendingThrow&&Date.now()-lastThrow>400)queued.push({kind:'throw',low:key==='AIM'});}
  previous[key]=down;
  if(key.startsWith('USE_ITEM_')||key==='ACTIVE_WEAPON_THROW'||throwing){
   suppressed.writeByteArray(r.readByteArray(0x28));
   // The native prepare state must see FIRE/AIM held long enough to reach its
   // hold pose. Returning zero throughout skips that state; the animation graph
   // then rejects the release message even though a projectile is created.
   const action=pendingThrow,held=action&&action.phase==='animation'&&Date.now()-action.started<1100&&key===(action.low?'AIM':'FIRE');
   suppressed.add(2).writeU8(held?1:0);if(held)suppressed.add(4).writeU32(b.add(0x3029b58).readU32());r.replace(suppressed);
  }
 }});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){if(Date.now()<next)return;next=Date.now()+100;try{
  if(queued.length){const action=queued.shift();if(action.kind==='medicine')use(action.id);else if(action.kind==='arm')arm(profile.selected);else queueThrow(armed.id,action.low);}
  if(pendingThrow){
   const request=pendingThrow,c=context();
   if(c.man.toString()!==request.owner||c.holder.add(0x220).readS32()!==5||b.add(0x304071a).readU8()!==0||health(c).hp<=0||(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding()))interruptThrow('state_changed');
   else if(!request.phase&&Date.now()>=request.at)beginAnimation(request);
   else if(request.phase==='animation'){
    if(armed&&armed.id===request.id)armed.weapon.add(0x10c0).writeS32(request.low?1:0);
    const motion=nativeThrowState(c.man);
    if(!request.released&&!motion.isNull()&&motion.add(0x4c).readS32()===2&&Date.now()-request.started>=1100){request.released=true;releaseNativeThrow(c.system);send({event:'local_throwable_animation_released',item_id:request.id});}
    if(Date.now()-request.started>8000)interruptThrow('animation_timeout');
   }
  }
  if(medical){
   const c=context(),h=health(c),p=position(c.man),moving=Math.hypot(...p.map((v,i)=>v-medical.position[i]))>40;
   if(c.man.toString()!==medical.owner||moving||c.holder.add(0x220).readS32()!==medical.slot||h.hp<medical.hp||h.hp<=0||b.add(0x304071a).readU8()!==0||(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding()))cancel(moving?'movement':'state_changed');
   else if(Date.now()>=medical.finish){const id=medical.id,before=h.hp,after=syncHealth(c,Math.min(h.max,h.hp+specs[id].heal));const buff=specs[id].regen;if(buff)regen={id,buff:buff.buff,per:buff.per,interval:buff.interval,next:Date.now()+buff.interval,until:Date.now()+buff.duration,owner:c.man.toString(),ticks:0};if(after>before||buff){profile.items[id]--;save();}medical=null;notice(null);send({event:'local_medicine_completed',item_id:id,before,hp:after,healed:after-before,regen:buff?buff.buff:null,count:profile.items[id]});}
   else notice('使用'+specs[medical.id].name+' · 剩余 '+Math.ceil((medical.finish-Date.now())/1000)+'秒 · F 取消');
  }
  if(regen){
   const c=context(),h=health(c);
   if(c.man.toString()!==regen.owner||h.hp<=0){send({event:'local_regen_stopped',item_id:regen.id,reason:c.man.toString()!==regen.owner?'owner_changed':'not_alive',hp:h.hp});regen=null;}
   else if(h.hp>=h.max||Date.now()>=regen.until){send({event:'local_regen_expired',item_id:regen.id,ticks:regen.ticks,hp:h.hp});regen=null;}
   else if(Date.now()>=regen.next){regen.next+=regen.interval;regen.ticks++;const before=h.hp,after=syncHealth(c,Math.min(h.max,h.hp+regen.per));send({event:'local_regen_tick',item_id:regen.id,buff:regen.buff,tick:regen.ticks,before,hp:after,healed:after-before});}
  }
  if(tracked.length){const c=context(),live=objects(c.system);tracked=tracked.filter(t=>{
   const object=live.find(p=>!p.isNull()&&p.add(0x2c).readS32()===t.seq);if(!object)return false;
   if(!t.render){const root=object.add(0x300).readPointer();if(!root.isNull()){const entity=root.add(0x180).readPointer();if(!entity.isNull()&&entity.add(0x7f).readU8()){enableRender(entity,1);t.render=true;send({event:'local_throwable_render_enabled',sequence:t.seq});}}}
   if(!t.finished&&Date.now()>=t.finish){const pos=Memory.alloc(12);pos.writeByteArray(object.add(0x74).readByteArray(12));const before=object.add(0x30).readS32();if(before!==4)finishThrow(c.system,t.seq,pos,0);t.finished=true;send({event:'local_throwable_finished',sequence:t.seq,item_id:t.id,position:[0,4,8].map(o=>pos.add(o).readFloat()),state_before:before,native:true});}
   return Date.now()-t.started<120000;
  });}
  if(Date.now()>=hudAt&&globalThis.LocalRoamUI&&globalThis.LocalRoamUI.consumables){hudAt=Date.now()+500;globalThis.LocalRoamUI.consumables(status());}
 }catch(e){cancel('error');interruptThrow('error');regen=null;send({event:'local_consumables_error',error:String(e),stack:e.stack});}}});
 globalThis.LocalRoamConsumables={supports:id=>!!specs[id],grant,supply,use,arm,throw:queueThrow,cancel,reset,status,catalogue(){return Object.entries(specs).map(([id,s])=>({id:Number(id),...s,count:profile.items[id]}));}};
 if(!profileError)save();send({event:'local_consumables_ready',error:profileError});
}
let consumablesInstalled=false;const consumablesObserver=Process.attachModuleObserver({onAdded(m){if(consumablesInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;consumablesInstalled=true;installLocalConsumables();}});
