'use strict';
// Steam UnitAttr 1001, TableBin.sfc entry da6c2f7fd3a9c58c:
// eu_attr_grapple_{cd_ms,hang_side_max_ms,hang_top_max_ms,max_count}.
// The native policy owns targeting, flight, attachment and its cooldown clock.
function installLocalGrapple(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getMan=new NativeFunction(b.add(0xf69f70),'pointer',[]);
 const roleFor=new NativeFunction(b.add(0xd45f20),'pointer',['uint32','uint64']);
 const refresh=new NativeFunction(b.add(0xd96300),'void',['pointer','pointer']);
 const defaults=[[0x353,10000],[0x35c,10000],[0x365,10000],[0x36e,3]];
 const xor=0xa59cf5b6;let owner=null,pending=[],lastError='',lastStatus=null;
 function ready(){const world=b.add(0x302a870).readPointer();return !world.isNull()&&world.add(0x6c).readU32()===4&&b.add(0x304071a).readU8()===0;}
 function count(role,value){role.add(0x50).writeU32((value^xor)>>>0);role.add(8).writeU32((role.add(8).readU32()+1)>>>0);}
 function current(){
  if(!ready())return null;
  const man=getMan();if(man.isNull()||man.add(0x30).readPointer().isNull())return null;
  const policy=man.add(0x1090).readPointer();if(policy.isNull()||!policy.readPointer().equals(b.add(0x2785a88)))return null;
  const role=roleFor(1,man.add(0x28).readU64());if(role.isNull())return null;
  return {man,policy,role,key:man+':'+policy+':'+role+':'+man.add(0x28).readU64()};
 }
 Interceptor.attach(b.add(0xec9cb0),{onEnter(args){
  this.launch=null;
  if(args[1].toInt32()!==1)return;
  const c=current();if(!c||!args[0].equals(c.policy)||!owner||owner.key!==c.key)return;
  const before=c.policy.add(0x214).readU32(),charges=c.policy.add(0x7b4).readS32();
  if(before!==1&&charges>0)this.launch={key:c.key,before,charges};
 },onLeave(){
  if(!this.launch)return;
  const c=current();if(c&&c.key===this.launch.key&&c.policy.add(0x214).readU32()===1)pending.push(this.launch);
 }});
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){try{
  const c=current();if(!c){pending=[];return;}
  const {man,policy,role}=c,enabled=(man.add(0x354).readU32()&16)!==0;
  if(owner&&owner.key!==c.key){owner=null;pending=[];}
  if(!enabled){lastStatus={enabled:false};pending=[];return;}
  if(!owner){
   const empty=policy.add(0x7b0).readS32()===0&&policy.add(0x7b4).readS32()===0;
   const restored=[];
   for(const [offset,value] of defaults)if(role.add(offset).readS32()===0){role.add(offset).writeS32(value);restored.push(offset);}
   refresh(man,role);
   const maximum=policy.add(0x7b0).readS32(),cooldown=policy.add(0x7b8).readFloat();
   if(maximum<1||maximum>100||!Number.isFinite(cooldown)||cooldown<=0)throw Error('Invalid native grapple parameters');
   if(empty){policy.add(0x7b4).writeS32(maximum);policy.add(0x7bc).writeFloat(0);policy.add(0x7c4).writeFloat(policy.add(0x7c0).readFloat());count(role,maximum);}
   owner={key:c.key};send({event:'local_grapple_initialized',restored,maximum,cooldown,charges:policy.add(0x7b4).readS32(),source:'TableBin.sfc/steam.UnitAttr/1001'});
  }
  const maximum=policy.add(0x7b0).readS32(),cooldown=policy.add(0x7b8).readFloat();
  for(const launch of pending){
   if(launch.key!==c.key)continue;
   const before=policy.add(0x7b4).readS32();
   // A native/server update may already have consumed the launch.
   if(before===launch.charges){policy.add(0x7b4).writeS32(before-1);count(role,before-1);}
   if(before===maximum&&policy.add(0x7bc).readFloat()<=0)policy.add(0x7bc).writeFloat(cooldown);
   send({event:'local_grapple_launched',before:launch.before,state:policy.add(0x214).readU32(),charges:policy.add(0x7b4).readS32(),target:[0,4,8].map(o=>policy.add(0x244+o).readFloat())});
  }
  pending=[];
  let charges=policy.add(0x7b4).readS32();
  const state=policy.add(0x214).readU32();
  if(charges<maximum&&policy.add(0x7bc).readFloat()<=0&&[0,8,9,10].includes(state)){
   charges++;policy.add(0x7b4).writeS32(charges);count(role,charges);
   policy.add(0x7bc).writeFloat(charges<maximum?cooldown:0);
   send({event:'local_grapple_charge_recovered',charges,maximum});
  }
  lastStatus={enabled:true,charges,maximum,cooldown,remaining:policy.add(0x7bc).readFloat(),state,available:!!policy.add(0x1f8).readU8()};lastError='';
 }catch(error){const message=String(error);if(message!==lastError){lastError=message;send({event:'local_grapple_error',error:message});}}}});
 globalThis.LocalRoamGrapple={status(){return lastStatus;}};
 send({event:'local_grapple_ready'});
}
let localGrappleInstalled=false;
const localGrappleObserver=Process.attachModuleObserver({onAdded(module){
 if(localGrappleInstalled||module.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 localGrappleInstalled=true;installLocalGrapple();
}});
