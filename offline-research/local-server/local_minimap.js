'use strict';
// Local scene changes reuse the native HUD panels. Rebuild their authored map
// parameters once the new scene and the native UI agree on the active map.
function installLocalMinimap(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const initialize=new NativeFunction(b.add(0x1254810),'void',['pointer']);
 const getConfig=new NativeFunction(b.add(0x52c510),'pointer',['pointer','pointer']);
 const expectedCache=new Map();let next=0,lastError='',lastStatus=[],lastSignature='';
 function pathOf(panel){
  const start=panel.add(0x218).readPointer(),length=panel.add(0x220).readPointer().sub(start).toInt32();
  return !start.isNull()&&length>0&&length<1024?start.readUtf8String(length):null;
 }
 function expected(map,type){
  const table=getConfig(b.add(0x302a1f0).readPointer(),b.add(0x30abe20));
  if(table.isNull())return null;
  const key=table+':'+map+':'+type;if(expectedCache.has(key))return expectedCache.get(key);
  const begin=table.add(0xb8).readPointer(),end=table.add(0xc0).readPointer(),count=end.sub(begin).toInt32()/0x2c0;
  if(!Number.isInteger(count)||count<0||count>10000)throw Error('Invalid native map configuration');
  const variant=type===1?0x78:type===3?0xe8:0xb0;
  for(let i=0;i<count;i++){
   const row=begin.add(i*0x2c0);if(row.readS32()!==map)continue;
   const config=row.add(variant),x=config.add(0x24).readS32(),y=config.add(0x28).readS32();
   const value={imagePath:'../'+table.add(0x30).readPointer().readUtf8String()+'/'+config.readPointer().readUtf8String(),
    bounds:[x,y,x+config.add(0x2c).readS32(),y+config.add(0x30).readS32()]};
   expectedCache.set(key,value);return value;
  }
  return null;
 }
 function movieReady(panel){
  const wrapper=panel.add(0x158).readPointer();if(wrapper.isNull())return false;
  const holder=wrapper.add(0x10).readPointer();if(holder.isNull()||holder.add(0x18).readPointer().isNull())return false;
  const root=panel.add(0x168),alias=root.add(16).readPointer(),value=alias.isNull()?root.readPointer():alias;
  return !value.isNull()&&[8,9,10].includes(value.add(8).readU32()&31)&&!value.readPointer().isNull()&&!value.add(16).readPointer().isNull();
 }
 function state(panel){return {imagePath:pathOf(panel),bounds:[0x1ec,0x1f8,0x1f4,0x1f0].map(o=>panel.add(o).readS32()),initialized:panel.add(0x183).readU8()!==0};}
 function matches(actual,wanted){return actual.initialized&&actual.imagePath===wanted.imagePath&&actual.bounds.every((n,i)=>n===wanted.bounds[i]);}
 function synchronize(){
  const world=b.add(0x302a870).readPointer(),scene=b.add(0x302a860).readPointer();
  if(world.isNull()||scene.isNull()||world.add(0x6c).readU32()!==4)return;
  const map=scene.add(0xd0).readU32();if(map!==b.add(0x3040770).readU32())return;
  const manager=b.add(0x30411c8).readPointer();if(manager.isNull())return;
  const head=manager.add(0x28);let node=head.readPointer();const status=[];
  for(let i=0;i<1000&&!node.equals(head);i++,node=node.readPointer()){
   const panel=node.add(16).readPointer();if(panel.isNull())continue;
   const name=panel.add(0x18).readPointer().readUtf8String();
   if(!['EuHUDMinimapPanel0','EuUIMapPanel0'].includes(name)||!movieReady(panel))continue;
   const wanted=expected(map,panel.add(0x1e8).readS32());if(!wanted)continue;
   const before=state(panel);
   if(!matches(before,wanted)){
    initialize(panel);const after=state(panel);
    if(!matches(after,wanted))throw Error('Native map initialization did not apply the active scene');
    send({event:'local_minimap_refreshed',map,name,before,after});
   }
   status.push({map,name,...state(panel)});
  }
  lastStatus=status;lastError='';
  const signature=JSON.stringify(status);if(status.length&&signature!==lastSignature){lastSignature=signature;send({event:'local_minimap_synchronized',panels:status});}
 }
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(Date.now()<next)return;next=Date.now()+500;
  try{synchronize();}catch(error){const message=String(error);if(message!==lastError){lastError=message;send({event:'local_minimap_error',error:message});}next=Date.now()+2000;}
 }});
 globalThis.LocalRoamMinimap={status(){return lastStatus;}};
 rpc.exports={...rpc.exports,minimapStatus(){return lastStatus;}};
 send({event:'local_minimap_ready'});
}
let localMinimapInstalled=false;
const localMinimapObserver=Process.attachModuleObserver({onAdded(m){
 if(localMinimapInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 localMinimapInstalled=true;installLocalMinimap();
}});
