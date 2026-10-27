'use strict';
// Exact-build offline confirmation of authored door interactions. The engine
// owns the door animation, sounds, trigger volumes and physics transforms.
function installLocalDoors(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const actorForId=new NativeFunction(b.add(0x9ac220),'pointer',['pointer','int']);
 const recordForId=new NativeFunction(b.add(0x9ac340),'pointer',['pointer','int']);
 const confirm=new NativeFunction(b.add(0x9abe50),'void',['pointer','int','int','uint8']);
 const loaded=new NativeFunction(b.add(0x9ad150),'uint8',['pointer']);
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const recoveryMode=globalThis.LOCAL_DOOR_REQUEST_OBSERVER===true;
 const runLua=recoveryMode?new NativeFunction(b.add(0x1003000),'uint8',['pointer','pointer']):null;
 const range=400,cellSize=800;
 let signature='',buckets=new Map(),entries=new Map(),pending=null,lastChange=null,hintNext=0;
 const changedAt=new Map();
 function worldReady(){
  const w=b.add(0x302a870).readPointer();if(w.isNull()||w.add(0x6c).readU32()!==4||b.add(0x304071a).readU8()!==0)return false;
  const man=getMan();return !man.isNull()&&!man.add(0x30).readPointer().isNull();
 }
 function playerPosition(){
  const man=getMan();if(man.isNull())throw Error('Player is not ready');
  const p=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);
  return [0,4,8].map(o=>p.add(o).readFloat());
 }
 function reset(){signature='';buckets.clear();entries.clear();pending=null;changedAt.clear();lastChange=null;}
 function index(){
  if(!worldReady())return false;
  const manager=b.add(0x302a820).readPointer();if(manager.isNull())return false;
  const table=manager.add(0x40).readPointer();if(table.isNull())return false;
  const begin=table.add(0x18).readPointer(),end=table.add(0x20).readPointer();
  const key=manager+':'+table+':'+begin+':'+end;
  if(key===signature)return true;
  const count=end.sub(begin).toInt32()/0xc8;
  if(!Number.isInteger(count)||count<0||count>100000)throw Error('Invalid door table size');
  reset();signature=key;
  for(let i=0;i<count;i++){
   const rec=begin.add(i*0xc8);
   // Kind 2 includes inert scenery too; only authored type 1 accepts door
   // confirmations in the native manager (9ABE50).
   if(rec.add(0x90).readS32()!==1||rec.add(0x94).readS32()!==2)continue;
   const id=rec.readS32(),position=[0,4,8].map(o=>rec.add(0x48+o).readFloat());
   if(id<=0||!position.every(Number.isFinite))continue;
   const item={id,position,record:rec},bucketKey=Math.floor(position[0]/cellSize)+','+Math.floor(position[1]/cellSize);
   if(!buckets.has(bucketKey))buckets.set(bucketKey,[]);
   buckets.get(bucketKey).push(item);entries.set(id,item);
  }
  send({event:'local_doors_indexed',records:count,doors:entries.size});return true;
 }
 function resolve(id){
  if(!index()||!entries.has(id))throw Error('Unknown door in this scene');
  const manager=b.add(0x302a820).readPointer(),record=recordForId(manager,id),actor=actorForId(manager,id);
  if(record.isNull()||actor.isNull()||record.add(0x90).readS32()!==1||record.add(0x94).readS32()!==2)throw Error('Door is unavailable');
  const begin=actor.add(0xa8).readPointer(),end=actor.add(0xb0).readPointer();let component=null;
  for(let p=begin;!p.isNull()&&p.compare(end)<0&&p.sub(begin).toInt32()<512;p=p.add(8)){
   const c=p.readPointer();if(!c.isNull()&&c.readPointer().equals(b.add(0x2713b20))){component=c;break;}
  }
  if(!component||component.add(0xb8).readPointer().isNull()||!loaded(component))throw Error('Door geometry is still loading');
  const position=[0,4,8].map(o=>actor.add(0x1d0+o).readFloat());
  return {id,manager,record,actor,component,position,state:record.add(0x98).readS32()};
 }
 function nearby(origin,maximum=range){
  if(!index())return [];
  const cx=Math.floor(origin[0]/cellSize),cy=Math.floor(origin[1]/cellSize),out=[];
  for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const item of buckets.get(x+','+y)||[]){
   if(Math.hypot(...item.position.map((v,i)=>v-origin[i]))>maximum)continue;
   try{const door=resolve(item.id);if(![0,1,2].includes(door.state))continue;
    out.push({id:door.id,position:door.position,state:door.state,label:door.state===0?'开门':'关门'});
   }catch(_){}
  }
  return out;
 }
 function request(id,state,source='local'){
  if(!Number.isSafeInteger(id)||!worldReady())throw Error('Door interaction requires the loaded world');
  if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())throw Error('Leave the vehicle before opening a door');
  const door=resolve(id);
  if(Math.hypot(...door.position.map((v,i)=>v-playerPosition()[i]))>range)throw Error('Door is out of interaction range');
  if(![0,1,2].includes(door.state))throw Error('This door cannot be opened');
  const desired=state===undefined?(door.state===0?1:0):state;
  if(!Number.isInteger(desired)||![0,1,2].includes(desired))throw Error('Invalid door state');
  if(pending){if(pending.id===id&&source==='native')pending={id,state:desired,source};return pending.id===id;}
  if(Date.now()-(changedAt.get(id)||0)<450)return false;
  if(desired===door.state)return false;
  pending={id,state:desired,source};return true;
 }
 // Native door triggers already choose the swing direction from the side the
 // player approaches. Replace only their offline confirmation send; a queued
 // registry interaction and this native request are combined into one update.
 const sendAddress=b.add(0x1354780),originalSend=new NativeFunction(sendAddress,'void',['int','int']);
 if(recoveryMode)Interceptor.attach(sendAddress,{onEnter(args){
  if(!worldReady())return;
  try{request(args[0].toInt32(),args[1].toInt32(),'native');}catch(error){send({event:'local_door_request_rejected',id:args[0].toInt32(),error:String(error)});}
 }});
 else Interceptor.replace(sendAddress,new NativeCallback((id,state)=>{
  if(!worldReady()){originalSend(id,state);return;}
  try{request(id,state,'native');}catch(error){send({event:'local_door_request_rejected',id,error:String(error)});}
 },'void',['int','int']));
 function recoveryHint(){
  const doors=worldReady()?nearby(playerPosition()):[],origin=doors.length?playerPosition():null;
  doors.sort((a,c)=>Math.hypot(...a.position.map((v,i)=>v-origin[i]))-Math.hypot(...c.position.map((v,i)=>v-origin[i])));
  const label=doors.length?doors[0].label:null,value=label===null?'nil':JSON.stringify(label);
  const source='local R=LocalRoam;if R and (R.prompt==nil or R.prompt==R.doorRecoveryPrompt) then local value='+value+';if (R.matchHUD or {}).riding then value=nil end;if R.prompt~=value then R.prompt=value;R.showPrompt() end;R.doorRecoveryPrompt=value end';
  const text=Memory.allocUtf8String(source),size=unescape(encodeURIComponent(source)).length,arg=Memory.alloc(24);
  arg.writePointer(text);arg.add(8).writePointer(text.add(size));arg.add(16).writePointer(text.add(size+1));
  const system=b.add(0x3048d48).readPointer();if(!system.isNull())runLua(system.add(0x18),arg);
 }
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(recoveryMode&&Date.now()>hintNext){hintNext=Date.now()+250;try{recoveryHint();}catch(error){send({event:'local_door_hint_error',error:String(error)});}}
  if(!pending)return;const command=pending;pending=null;
  try{
   const door=resolve(command.id);
   if(Math.hypot(...door.position.map((v,i)=>v-playerPosition()[i]))>range)throw Error('Door is out of interaction range');
   if(door.state===command.state)return;
   confirm(door.manager,door.id,command.state,1);
   const actual=door.record.add(0x98).readS32();if(actual!==command.state)throw Error('Native door confirmation was rejected');
   changedAt.set(door.id,Date.now());lastChange={id:door.id,before:door.state,state:actual,source:command.source};
   send({event:'local_door_changed',...lastChange});
  }catch(error){send({event:'local_door_error',id:command.id,error:String(error)});}
 }});
 globalThis.LocalRoamDoors={nearby,toggle(id){return request(id);},reset,status(){return {ready:worldReady(),indexed:entries.size,lastChange,nearby:worldReady()?nearby(playerPosition()):[]};}};
 send({event:'local_doors_ready',range,recovery:recoveryMode});
}
let ldInstalled=false;
const ldObserver=Process.attachModuleObserver({onAdded(m){if(ldInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;ldInstalled=true;installLocalDoors();}});
