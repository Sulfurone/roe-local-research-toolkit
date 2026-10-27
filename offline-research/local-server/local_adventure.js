'use strict';
// Starting abilities are native role attributes, not ordinary vehicle IDs.
function installLocalAdventure(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const manGet=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const db=new NativeFunction(b.add(0xd45f20),'pointer',['uint32','uint64']);
 const raw=new NativeFunction(b.add(0xf60f50),'int',['int']);
 const refreshAbilities=new NativeFunction(b.add(0xd8e0b0),'void',['pointer','pointer']);
 // The adventure component (man+0xCA0 hash) exposes an inline state machine at
 // +0x4A0; 0x122E210 is the transition entry that 0x122E540 uses. State ids and
 // the glider pose field are this build's shipped values.
 const trans=new NativeFunction(b.add(0x122e210),'void',['pointer','pointer','pointer','int','int']);
 const path='offline-research/local-server/local-adventure.json';
 const catalogue=globalThis.LocalRoamBackpacks,choices=catalogue.definitions;
 const controlled=[2,3,4,13,14,15];let mapId=Number(globalThis.ROAM_MAP_ID)||10020,selected=catalogue.defaultId(mapId),preferences={version:2,by_map:{}};
 const KIT_STATE={3:25,14:31},KIT_POSE={2:3,13:3};
 const registry=new NativeFunction(b.add(0x4982c0),'pointer',[])();
 const lookupKey=new NativeFunction(b.add(0x4984f0),'pointer',['pointer','pointer']);
 const keys={SKI:lookupKey(registry,Memory.allocUtf8String('SKI')),GET_ON_GLIDER:lookupKey(registry,Memory.allocUtf8String('GET_ON_GLIDER'))};
 const actionState=Memory.alloc(0x40);let requested=null;
 const bindingNames=new Map();
 for(const [name,key] of Object.entries(keys)){bindingNames.set(key.toString(),name);bindingNames.set(key.readPointer().toString(),name);}
 const bindingDown={};let bindingPending=null;
 // A4C160 receives the interned action string itself, so its first qword is the
 // action id ("SKI\0..."), not the string pointer. Match the id (and accept the
 // pointer forms of other call sites) instead of comparing the char* only.
 const hookStats={queries:0,direct:0,deref:0,id:0,overrides:0,lastAction:null,callers:{}};
 Interceptor.attach(b.add(0xa4c160),{onEnter(a){
  if(requested&&Date.now()>requested.until)requested=null;
  this.hit=false;this.which=null;this.binding=null;
  if(!requested){try{this.binding=bindingNames.get(a[1].toString())||bindingNames.get(a[1].readPointer().toString())||null;}catch(_){}return;}
  hookStats.queries++;
  try{const target=keys[requested.key],arg=a[1];
   if(arg.equals(target)){this.hit=true;this.which='direct';}
   else{const value=arg.readPointer();
    if(value.equals(target)){this.hit=true;this.which='deref';}
    else if(value.equals(target.readPointer())){this.hit=true;this.which='id';}
   }
   if(this.hit){hookStats[this.which]++;hookStats.lastAction=hookStats.lastAction||requested.key;
    const caller=this.returnAddress.sub(b).toString();hookStats.callers[caller]=(hookStats.callers[caller]||0)+1;}
  }catch(_){}
 },onLeave(r){
  if(!requested&&this.binding&&!r.isNull())observeBinding(this.binding,r);
  if(!requested||!this.hit||r.isNull())return;
  if(Date.now()>requested.until){requested=null;return;}
  const frame=b.add(0x3029b58).readU32();if(requested.frame===null)requested.frame=frame;
  actionState.writeByteArray(r.readByteArray(0x28));actionState.add(2).writeU8(requested.frame===frame?1:0);actionState.add(4).writeU32(frame);r.replace(actionState);
  hookStats.overrides++;
 }});
 try{const p=JSON.parse(File.readAllText(path));if(p.version===2&&p.by_map&&typeof p.by_map==='object')preferences=p;
  else if(p.version===1)preferences.by_map[String(mapId)]=catalogue.migrate(p.ability_id,mapId);
  const saved=preferences.by_map[String(mapId)];if(catalogue.allowed(saved,mapId))selected=Number(saved);
 }catch(_){}
 function choice(id){const c=choices.find(c=>c.id===Number(id));if(!c)throw Error('Unsupported starting ability '+id);return c;}
 function subOf(man){
  const key=man.add(0xfd0).readU32(),tag=man.add(0xfd4).readU16();
  const idx=((man.add(0x4a0+(key&0xff)*4).readU32()+0x28d+man.add(0x8a0+((key>>>8)&0xff)*4).readU32())>>>0)%0x66;
  return man.add(0xca0+idx*8).readPointer().xor(ptr(tag)).add(0x4a0);
 }
 // The state map is a std::map keyed by state id; resolve descriptors at
 // runtime so the low-memory addresses do not need to be hard-coded.
 function descriptorFor(table,state){
  if(!table||table.isNull())return null;
  let sentinel,root;
  try{sentinel=table.add(0x30).readPointer();root=table.add(0x40).readPointer();}catch(_){return null;}
  if(root.isNull()||root.equals(sentinel))return null;
  const stack=[root];
  for(let i=0;i<128&&stack.length;i++){
   const node=stack.pop();let key,value;
   try{key=node.add(0x20).readU32();value=node.add(0x28).readPointer();}catch(_){continue;}
   if(key===state)return value;
   try{const l=node.readPointer(),r=node.add(8).readPointer();
    if(!l.isNull()&&!l.equals(sentinel))stack.push(l);
    if(!r.isNull()&&!r.equals(sentinel))stack.push(r);}catch(_){}
  }
  return null;
 }
 const deployment={pending:null,active:null,lastError:null,deployed:0,folded:0,lastState:null};
 let neutralPose=null;
 // The ability FSM belongs to the loaded match world. Forcing a transition on
 // the lobby preview character is not a gameplay context and is also where the
 // earlier deploy attempt died, so only act once the world reports state 4.
 function inWorld(){
  if(globalThis.LocalRoamMatchActive!==true)return false;
  try{const world=b.add(0x302a870).readPointer();return !world.isNull()&&world.add(0x6c).readU32()===4;}catch(_){return false;}
 }
 function kitState(man){try{const fsm=subOf(man).add(8).readPointer();return fsm.isNull()?null:fsm.add(0x28).readU32();}catch(_){return null;}}
 function kitActive(man,c){
  try{if(KIT_POSE[c.id]!==undefined)return man.add(0x3a0).readU32()===KIT_POSE[c.id];const state=kitState(man),first=KIT_STATE[c.id];return first!==undefined&&state>=first&&state<=first+2;}catch(_){return false;}
 }
 function observeBinding(key,value){
  try{
   const frame=b.add(0x3029b58).readU32(),down=value.add(2).readU8()!==0&&value.add(4).readU32()===frame;
   const previous=bindingDown[key]||{down:false,frame:null};bindingDown[key]={down,frame:down?frame:previous.frame};
   if(!down||previous.down||previous.frame===frame||bindingPending||deployment.pending)return;
   if(!inWorld()||b.add(0x304071a).readU8()!==0)return;
   const c=choice(selected);if(c.key!==key)return;
   const man=manGet();if(man.isNull())return;
   const active=kitActive(man,c);
   if(!active&&globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())return;
   if(KIT_POSE[c.id]!==undefined&&!active){
    // Preserve the original airborne gate: Space on the ground still jumps,
    // and F beside a pickup or car must not force a glider pose.
    const glider=man.add(0x1190).readPointer();if(glider.isNull()||glider.add(0x7a).readU8()===0)return;
    if(globalThis.LocalRoamInteract&&globalThis.LocalRoamInteract.promptTarget())return;
   }
   bindingPending={key,ability_id:c.id,kind:active?'fold':'deploy',poseBase:man.add(0x3a0).readU32(),at:Date.now()};
   send({event:'local_adventure_binding_pressed',key,ability_id:c.id,action:bindingPending.kind,frame});
  }catch(e){send({event:'local_adventure_binding_error',error:String(e)});}
 }
 function consumeBinding(man){
  const press=bindingPending;if(!press)return;bindingPending=null;
  if(!inWorld()||Date.now()-press.at>1000||b.add(0x304071a).readU8()!==0||press.ability_id!==selected)return;
  const c=choice(selected),active=kitActive(man,c);
  // The game's own handler runs after its input query. Respect a transition it
  // already completed instead of toggling a second time from the new state.
  if(press.kind==='deploy'&&active){
   deployment.active={ability_id:c.id,poseBase:KIT_POSE[c.id]!==undefined?press.poseBase:null};deployment.lastError=null;deployment.deployed++;deployment.lastState=kitState(man);
   send({event:'local_adventure_deployed',ability_id:c.id,mode:'native-key',state:deployment.lastState,pose:man.add(0x3a0).readU32()});
   send({event:'local_adventure_binding_handled',ability_id:c.id,action:'deploy',mode:'native',state:kitState(man)});return;
  }
  if(press.kind==='fold'&&!active){
   deployment.active=null;deployment.lastError=null;deployment.folded++;deployment.lastState=kitState(man);
   send({event:'local_adventure_folded',ability_id:c.id,mode:'native-key',state:deployment.lastState,pose:man.add(0x3a0).readU32()});
   send({event:'local_adventure_binding_handled',ability_id:c.id,action:'fold',mode:'native',state:kitState(man)});return;
  }
  if(press.kind==='fold'){
   const base=deployment.active?deployment.active.poseBase:neutralPose;
   deployment.pending={kind:'fold',ability_id:c.id,poseBase:KIT_POSE[c.id]!==undefined?base:null,until:Date.now()+2000};
  }else{
   deployment.pending={kind:'deploy',ability_id:c.id,mode:KIT_POSE[c.id]!==undefined?'pose':'fsm',state:KIT_STATE[c.id]||null,
    poseBase:KIT_POSE[c.id]!==undefined?press.poseBase:null,at:Date.now(),until:Date.now()+3000};deployment.lastError=null;
  }
  send({event:'local_adventure_binding_handled',ability_id:c.id,action:press.kind,mode:'local'});
 }
 function fail(reason){
  const p=deployment.pending;deployment.pending=null;deployment.lastError=reason;
  send({event:'local_adventure_deploy_failed',ability_id:p?p.ability_id:null,reason});
 }
 function gameTick(){
  let man=null;
  try{man=manGet();}catch(_){}
  if(man&&!man.isNull()){try{const pose=man.add(0x3a0).readU32();if(pose!==KIT_POSE[2])neutralPose=pose;}catch(_){}}
  if(man&&!man.isNull())consumeBinding(man);
  const p=deployment.pending;if(!p)return;
  try{
   if(!man||man.isNull())return;
   if(!inWorld()){
    if(p.until&&Date.now()>p.until)fail('character is not in the loaded world');
    return;
   }
   if(p.kind==='fold'){
    const sub=subOf(man),fsm=sub.add(8).readPointer();
    if(!fsm.isNull()){
     const idle=descriptorFor(sub.readPointer(),0);
     if(idle&&!idle.isNull()&&!idle.equals(fsm))trans(fsm,idle,sub,0,1);
    }
    const poseBase=p.poseBase!==null&&p.poseBase!==undefined?p.poseBase:neutralPose;
    if(KIT_POSE[p.ability_id]!==undefined&&poseBase!==null&&poseBase!==undefined)man.add(0x3a0).writeU32(poseBase);
    const state=kitState(man),pose=man.add(0x3a0).readU32();
    deployment.active=null;deployment.pending=null;deployment.folded++;deployment.lastState=state;
    send({event:'local_adventure_folded',ability_id:p.ability_id,state,pose});
    return;
   }
   if(Date.now()<p.at)return;
   if(p.mode==='pose'){
    if(p.poseBase===null)p.poseBase=man.add(0x3a0).readU32();
    man.add(0x3a0).writeU32(KIT_POSE[p.ability_id]);
    deployment.active={ability_id:p.ability_id,poseBase:p.poseBase};deployment.pending=null;deployment.deployed++;
    send({event:'local_adventure_deployed',ability_id:p.ability_id,mode:'pose',state:null,pose:man.add(0x3a0).readU32()});
    return;
   }
   const sub=subOf(man),bit0=sub.add(0x1d8).readU8()&1;
   const fsm=sub.add(8).readPointer();
   // The native activation press is the preferred trigger, but a menu-driven
   // use has no key pulse. Once the world is loaded the shipped transition
   // entry takes the state directly, as the standalone kit probe proved.
   const direct=!bit0&&Date.now()>=p.at+800;
   if(!bit0&&!direct){if(Date.now()>p.until)fail('activation press was not recorded');return;}
   const target=descriptorFor(sub.readPointer(),p.state);
   if(fsm.isNull()||!target||target.isNull()){fail('state descriptor '+p.state+' is missing');return;}
   if(fsm.add(0x28).readU32()!==p.state)trans(fsm,target,sub,0,1);
   const state=kitState(man);
   if(state===p.state){
    deployment.active={ability_id:p.ability_id,poseBase:null,direct};deployment.pending=null;deployment.deployed++;deployment.lastState=state;
    send({event:'local_adventure_deployed',ability_id:p.ability_id,mode:direct?'direct':'fsm',state,bit0});
   }else if(Date.now()>p.until)fail('state transition did not stick');
  }catch(e){fail(String(e));}
 }
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){gameTick();}});
 function status(){return {map_id:mapId,selected:choice(selected),package_type:raw(1),attributes:controlled.map(id=>({id,value:raw(id)})),
  deployed:deployment.active,lastState:deployment.lastState,lastError:deployment.lastError,inWorld:inWorld()};}
 function check(){
  const man=manGet(),out={inWorld:inWorld(),menuReady:globalThis.LocalRoamReady===true,selected,deployed:deployment.active,lastState:deployment.lastState,
   lastError:deployment.lastError,folded:deployment.folded,deployedCount:deployment.deployed};
  if(man.isNull()){out.character=false;return out;}
  out.character=true;
  try{out.pose=man.add(0x3a0).readU32();const sub=subOf(man);out.bit0=sub.add(0x1d8).readU8()&1;
   const fsm=sub.add(8).readPointer();out.state=fsm.isNull()?null:fsm.add(0x28).readU32();}catch(e){out.nativeError=String(e);}
  try{out.attributes=controlled.map(id=>({id,value:raw(id)}));}catch(e){out.attributeError=String(e);}
  try{const world=b.add(0x302a870).readPointer(),scene=b.add(0x302a860).readPointer();
   out.worldState=world.isNull()?null:world.add(0x6c).readU32();out.sceneMap=scene.isNull()?null:scene.add(0xd0).readU32();}catch(e){out.worldError=String(e);}
  return out;
 }
 function save(){preferences.by_map[String(mapId)]=selected;File.writeAllText(path,JSON.stringify(preferences,null,2));}
 function setMap(id,requested){
  if(!Number.isInteger(id)||!Object.prototype.hasOwnProperty.call(catalogue.all(),id))throw Error('Unsupported adventure map '+id);
  const saved=preferences.by_map[String(id)];
  const next=requested===undefined?(catalogue.allowed(saved,id)?Number(saved):catalogue.defaultId(id)):Number(requested);
  if(!catalogue.allowed(next,id))throw Error('Starting backpack '+next+' is not available on map '+id);
  mapId=id;selected=next;bindingPending=null;deployment.pending=null;deployment.active=null;save();return choice(selected);
 }
 function select(id){const c=choice(id);
  if(!catalogue.allowed(c.id,mapId))throw Error('Starting backpack '+c.id+' is not available on map '+mapId);
  if(c.id!==selected&&inWorld()){const man=manGet();if(!man.isNull()&&kitActive(man,choice(selected)))throw Error('Fold the current adventure equipment before changing it');}
  selected=c.id;save();bindingPending=null;send({event:'local_adventure_selected',map_id:mapId,...c});return c;}
 function apply(){
  const man=manGet();if(man.isNull())throw Error('Character is missing');
  const role=db(1,man.add(0x28).readU64());if(role.isNull())throw Error('Role is missing');
  // F60F50 reads this exact 50-entry XOR-encoded array. Preserve health, motion
  // attributes, other abilities and the existing role object.
  for(const id of controlled)role.add(0x10+id*4).writeU32(((id===selected?1:0)^0xa59cf5b6)>>>0);
  role.add(0x14).writeU32((choice(selected).package_type^0xa59cf5b6)>>>0);
  role.add(8).writeU32((role.add(8).readU32()+1)>>>0);
  // The shipped role-update receiver calls this after updating the XOR array.
  // It refreshes man+354 and the native ice-axe / pulley components as well.
  refreshAbilities(man,role);
  const value=status();if(value.attributes.some(v=>v.value!==(v.id===selected?1:0)))throw Error('Starting ability readback failed');
  send({event:'local_adventure_applied',...value});return value;
 }
 function use(){const c=choice(selected);if(!c.key)throw Error(c.help||'No adventure equipment selected');
  if(!inWorld())throw Error('Character is not in the loaded world');
  const man=manGet();
  if(!man.isNull()&&kitActive(man,c)){
   requested=null;
   const recorded=deployment.active&&deployment.active.poseBase!==null?deployment.active.poseBase:null;
   deployment.pending={kind:'fold',ability_id:c.id,poseBase:KIT_POSE[c.id]!==undefined?recorded:null,until:Date.now()+2000};
   send({event:'local_adventure_use_requested',...c,action:'fold',state:kitState(man)});
   return;
  }
  for(const key of ['queries','direct','deref','id','overrides'])hookStats[key]=0;hookStats.lastAction=null;hookStats.callers={};
  requested={key:c.key,frame:null,until:Date.now()+1000};
  deployment.pending={kind:'deploy',ability_id:c.id,mode:KIT_POSE[c.id]!==undefined?'pose':'fsm',state:KIT_STATE[c.id]||null,
   poseBase:null,at:Date.now()+250,until:Date.now()+3000};deployment.lastError=null;
  send({event:'local_adventure_use_requested',...c,action:'deploy',state:kitState(man)});
  // Report what the action pipeline saw, so a pulse that never matched cannot be
  // mistaken for a native refusal.
  setTimeout(()=>{try{const m=manGet();send({event:'local_adventure_use_diagnostics',ability_id:c.id,key:c.key,...hookStats,
   state:kitState(m),pose:m.isNull()?null:m.add(0x3a0).readU32(),deployed:deployment.active,lastError:deployment.lastError});}catch(_){}},1500);
 }
 function prepareLoadout(){
  const c=choice(selected);if(!c.weapon)return;
  globalThis.LocalRoamWeapons.equip(c.weapon,3);
  const reserve=globalThis.LocalRoamWeapons.status().reserve||{},rounds=Number(reserve[String(c.ammo)])||0;
  if(rounds<c.rounds)globalThis.LocalRoamWeapons.grant(c.ammo,c.rounds-rounds);
  const items=globalThis.LocalRoamConsumables.status().items,bandages=Number(items['70001'])||0;
  if(bandages<5)globalThis.LocalRoamConsumables.grant(70001,5-bandages);
  send({event:'local_adventure_starting_items',ability_id:c.id,weapon:c.weapon,slot:3,ammo:c.ammo,minimum_rounds:c.rounds,minimum_bandages:5});
 }
 globalThis.LocalRoamAdventure={catalogue(id=mapId){return catalogue.forMap(id);},allCatalogues(){return catalogue.all();},savedSelections(){return {...preferences.by_map,[String(mapId)]:selected};},setMap,selected(){return choice(selected);},select,apply,status,check,use,prepareLoadout,fold(){const c=choice(selected);
  if(!c.key)throw Error(c.help||'No adventure equipment selected');if(!inWorld())throw Error('Character is not in the loaded world');const man=manGet();
  deployment.pending={kind:'fold',ability_id:c.id,poseBase:KIT_POSE[c.id]!==undefined&&deployment.active?deployment.active.poseBase:null,until:Date.now()+2000};
  send({event:'local_adventure_use_requested',...c,action:'fold',state:kitState(man)});}};
 send({event:'local_adventure_installed',selected});
}
let adventureInstalled=false;const adventureObserver=Process.attachModuleObserver({onAdded(m){
 if(adventureInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 adventureInstalled=true;installLocalAdventure();
}});
