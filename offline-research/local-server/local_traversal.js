'use strict';
// Preserve the authored trigger, input and traversal state machines. Offline
// role grants must also run the native ability refresh used by F3D6A2.
function installLocalTraversal(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const roleFor=new NativeFunction(b.add(0xd45f20),'pointer',['uint32','uint64']);
 const refresh=new NativeFunction(b.add(0xd8e0b0),'void',['pointer','pointer']);
 const characterConfig=new NativeFunction(b.add(0x1087640),'pointer',[]);
 const getField=new NativeFunction(b.add(0x4fe680),'pointer',['pointer','pointer']);
 const asInt=new NativeFunction(b.add(0x4ff390),'int',['pointer']);
 const runLua=new NativeFunction(b.add(0x1003000),'uint8',['pointer','pointer']);
 const typeText=Memory.allocUtf8String('type'),typeKey=Memory.alloc(24);
 typeKey.writePointer(typeText);typeKey.add(8).writePointer(typeText.add(4));typeKey.add(16).writePointer(typeText.add(5));
 const bits=[2,3,4,14,15,13];let next=0,lastTarget=null,lastState=null,lastError=0;
 function ready(){const world=b.add(0x302a870).readPointer();return !world.isNull()&&world.add(0x6c).readU32()===4;}
 function abilityMask(role){let mask=0;bits.forEach((id,index)=>{if(role.add(0x10+id*4).readU32()!==0xa59cf5b6)mask|=1<<index;});return mask;}
 function typeOf(object){
  // Keep the NativePointer that owns the UTF-8 allocation alive with the key.
  typeKey.writePointer(typeText);
  return asInt(getField(object.add(0x90),typeKey));
 }
 function synchronize(man){
  if(man.isNull()||man.add(0x30).readPointer().isNull())return;
  for(const offset of [0x11a0,0x1090,0x10c8])if(man.add(offset).readPointer().isNull())return;
  const role=roleFor(1,man.add(0x28).readU64());if(role.isNull())return;
  // Hang physics at 133A40D clamps velocity using packed role property 59.
  // The minimal offline actor leaves it zero, resetting velocity every frame.
  // Use the character table's MaxSpeedProtection value; actual acceleration,
  // gravity, slope and climbing speed remain owned by the native controller.
  const limit=role.add(0x2f0);
  if(limit.readS32()===0){
   const cfg=characterConfig(),value=cfg.isNull()?NaN:cfg.add(0xd0).readFloat();
   if(!Number.isFinite(value)||value<=0||value>0x7fffffff)throw Error('Character speed protection configuration is invalid');
   const applied=Math.round(value);limit.writeS32(applied);
   send({event:'local_traversal_speed_limit_restored',property:59,offset:0x2f0,before:0,value:applied,source:'CharacterInfo.MaxSpeedProtection'});
  }
  const before=man.add(0x354).readU32(),expected=abilityMask(role);
  if((before&63)===expected)return;
  refresh(man,role);
  const actual=man.add(0x354).readU32();
  if((actual&63)!==expected)throw Error('Native movement ability refresh did not match the role');
  send({event:'local_traversal_abilities_refreshed',before,actual,climbing:!!(actual&4)});
 }
 function currentTarget(){
  if(!ready())return null;
  const state=b.add(0x3040b28).readPointer(),manager=b.add(0x3040b20).readPointer();
  if(state.isNull()||manager.isNull()||!state.add(0x1c).readU8())return null;
  const id=state.add(0x18).readU32(),table=manager.add(0x40).readPointer(),count=manager.add(0x48).readU32();
  if(!id||table.isNull()||!count||count>100000)return null;
  let node=table.add((id%count)*8).readPointer();
  for(let i=0;i<1000&&!node.isNull();i++,node=node.add(0x10).readPointer()){
   if(node.readU32()!==id)continue;
   const object=node.add(8).readPointer();
   if(object.isNull()||!object.add(0x68).readPointer().equals(b.add(0x12a6c10)))return null;
   const type=typeOf(object);
   return type===2?{id,type,object}:null;
  }
  return null;
 }
 function stateOf(man){
  const key=man.add(0xfd0).readU32(),tag=man.add(0xfd4).readU16();
  const index=((man.add(0x4a0+(key&255)*4).readU32()+0x28d+man.add(0x8a0+((key>>>8)&255)*4).readU32())>>>0)%102;
  const sub=man.add(0xca0+index*8).readPointer().xor(ptr(tag));
  const fsm=sub.add(0x4a8).readPointer();return fsm.isNull()?null:fsm.add(0x28).readU32();
 }
 function hint(label){
  // Respect another nearby local target or a healing status. The same Lua path
  // also lets this module repair an already running session without a restart.
  const value=label===null?'nil':JSON.stringify(label);
  const source='local R=LocalRoam;if R and (R.prompt==nil or R.prompt==R.traversalPrompt) then local value='+value+';if R.prompt~=value then R.prompt=value;R.showPrompt() end;R.traversalPrompt=value end';
  const text=Memory.allocUtf8String(source),size=unescape(encodeURIComponent(source)).length,arg=Memory.alloc(24);
  arg.writePointer(text);arg.add(8).writePointer(text.add(size));arg.add(16).writePointer(text.add(size+1));
  const system=b.add(0x3048d48).readPointer();if(!system.isNull())runLua(system.add(0x18),arg);
 }
 Interceptor.attach(b.add(0x12a6c10),{onEnter(args){
  try{if(typeOf(args[0])===2){const man=getMan();send({event:'local_zipline_native_interact',climbing:!!(man.add(0x354).readU32()&4),state:stateOf(man)});}}catch(_){}
 }});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<next)return;next=Date.now()+200;
  try{
   if(!ready()){hint(null);return;}
   const man=getMan();if(man.isNull())return;synchronize(man);
   const target=b.add(0x304071a).readU8()===0?currentTarget():null;
   const label=target?(man.add(0x354).readU32()&4?'使用滑索':'需要登山背包'):null;
   hint(label);
   const signature=target?target.id+':'+label:null;
   if(signature!==lastTarget){lastTarget=signature;send({event:'local_zipline_target',id:target?target.id:null,label});}
   const state=stateOf(man);if(state!==lastState){lastState=state;send({event:'local_traversal_state',state,pose:man.add(0x3a0).readU32()});}
  }catch(error){if(Date.now()>lastError+10000){lastError=Date.now();send({event:'local_traversal_error',error:String(error)});}}
 }});
 globalThis.LocalRoamTraversal={status(){const man=getMan(),target=currentTarget();let speedLimit=null;if(!man.isNull()){const role=roleFor(1,man.add(0x28).readU64());if(!role.isNull())speedLimit=role.add(0x2f0).readS32();}return {abilities:man.isNull()?null:man.add(0x354).readU32(),speedLimit,state:man.isNull()?null:stateOf(man),target:target?{id:target.id,type:target.type}:null};}};
 send({event:'local_traversal_ready'});
}
let traversalInstalled=false;const traversalObserver=Process.attachModuleObserver({onAdded(m){
 if(traversalInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 traversalInstalled=true;installLocalTraversal();
}});
