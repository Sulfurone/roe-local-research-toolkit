'use strict';
// Restore the shipped JetTriggerManager lifecycle for offline scene changes.
// Authored points, entry/exit conditions, FSM transitions and lift physics all
// remain native. Supply its tick only when the engine omitted it this frame.
function installLocalWindTunnels(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const load=new NativeFunction(b.add(0x11c0ab0),'void',['pointer']);
 const clear=new NativeFunction(b.add(0x11c0e80),'void',['pointer']);
 const tick=new NativeFunction(b.add(0x11c0f60),'void',['pointer']);
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 let loaded=null,lastTick=null,previous=null,nextError='',retryAt=0,nextReport=0,nativeTicks=0,fallbackTicks=0;
 function owner(){
  const t=b.add(0x3094d90),key=t.add(0xb30).readU32(),index=(t.add((key&255)*4).readU32()+0x16af+t.add(0x400+((key>>>8)&255)*4).readU32())>>>0;
  return t.add(0x800+(index%102)*8).readPointer().xor(ptr(t.add(0xb34).readU16()));
 }
 function context(){
  const world=b.add(0x302a870).readPointer(),scene=b.add(0x302a860).readPointer(),manager=b.add(0x3040cd8).readPointer();
  if(world.isNull()||scene.isNull()||manager.isNull()||world.add(0x6c).readU32()!==4)return null;
  const client=owner();if(client.isNull())return null;
  const levels=world.add(0x20).readPointer();if(levels.isNull()||levels.equals(world.add(0x28).readPointer()))return null;
  const level=levels.readPointer();if(level.isNull())return null;
  const field=level.add(0x78),start=field.readPointer(),length=field.add(8).readPointer().sub(start).toInt32();
  if(start.isNull()||length<1||length>128)return null;
  const name=start.readUtf8String(length);if(name!==client.add(0x31a8).readUtf8String())return null;
  const map=scene.add(0xd0).readU32();if(![10019,10020,10021,10024,10016].includes(map))return null;
  return {manager,map,name,key:manager+':'+map+':'+name+':'+level};
 }
 function count(manager){
  const n=manager.add(0xd0).readPointer().sub(manager.add(0xc8).readPointer()).toInt32()/24;
  if(!Number.isInteger(n)||n<0||n>10000)throw Error('Invalid native wind tunnel point list');return n;
 }
 function movement(man){
  const key=man.add(0xfd0).readU32(),index=((man.add(0x4a0+(key&255)*4).readU32()+0x28d+man.add(0x8a0+((key>>>8)&255)*4).readU32())>>>0)%102;
  const sub=man.add(0xca0+index*8).readPointer().xor(ptr(man.add(0xfd4).readU16())),fsm=sub.add(0x4a8).readPointer();
  return {state:fsm.isNull()?null:fsm.add(0x28).readU32(),flags:sub.add(0x7c0).readU32()};
 }
 Interceptor.attach(b.add(0x11c0ab0),{onLeave(){try{const c=context();if(c)loaded=c.key;}catch(_){}}});
 Interceptor.attach(b.add(0x11c0e80),{onLeave(){loaded=null;previous=null;}});
 Interceptor.attach(b.add(0x11c0f60),{onEnter(args){lastTick={manager:args[0].toString(),frame:b.add(0x3029b58).readU32()};nativeTicks++;}});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<retryAt)return;
  try{
   const c=context();if(!c)return;
   if(loaded!==c.key){
    // A first hot attachment may find a list loaded by the original handler.
    // On later map changes, remove old points/sounds through native cleanup.
    const before=count(c.manager);
    if(loaded!==null||before===0){if(before)clear(c.manager);load(c.manager);}
    loaded=c.key;previous=null;send({event:'local_wind_tunnels_loaded',map:c.map,level:c.name,points:count(c.manager)});
   }
   const man=getMan();if(man.isNull()||man.add(0x30).readPointer().isNull())return;
   if(count(c.manager)>0){
    const frame=b.add(0x3029b58).readU32();
    if(!lastTick||lastTick.manager!==c.manager.toString()||lastTick.frame!==frame){fallbackTicks++;tick(c.manager);}
   }
   if(Date.now()>=nextReport){
    nextReport=Date.now()+200;const m=movement(man),index=c.manager.add(0xe8).readS32(),signature=c.key+':'+index+':'+m.state+':'+m.flags;
    if(signature!==previous){
     previous=signature;const position=new NativeFunction(man.readPointer().add(0x1a8).readPointer(),'pointer',['pointer'])(man);
     send({event:'local_wind_tunnel_state',map:c.map,index,...m,pose:man.add(0x3a0).readU32(),position:[0,4,8].map(o=>position.add(o).readFloat()),nativeTicks,fallbackTicks});
    }
   }
   nextError='';
  }catch(error){const message=String(error);if(message!==nextError){nextError=message;send({event:'local_wind_tunnel_error',error:message});}retryAt=Date.now()+2000;}
 }});
 globalThis.LocalRoamWindTunnels={status(){const c=context();return c?{map:c.map,level:c.name,points:count(c.manager),index:c.manager.add(0xe8).readS32(),nativeTicks,fallbackTicks}:null;}};
 send({event:'local_wind_tunnels_ready'});
}
let localWindTunnelsInstalled=false;
const localWindTunnelsObserver=Process.attachModuleObserver({onAdded(module){
 if(localWindTunnelsInstalled||module.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 localWindTunnelsInstalled=true;installLocalWindTunnels();
}});
