'use strict';
// Reproduce the recovered order: lobby -> gameplay -> scene-enter handler ->
// native map loading. It deliberately does not run the earlier MapProbe.
function installNativeSceneStart(){
const startMain=Process.getModuleByName('Europa_Client.exe');let startStage=0,startTicks=0,startNext=0,startReadyAt=0,startArmed=false;
let startRequested=!globalThis.LOCAL_MENU_ENABLED,startLobbyShown=false;
globalThis.LocalRoamScene={request(mapId){if(![10020,10021,10024,10019,10016].includes(mapId))throw Error('Unsupported map');if(startStage>0&&startStage<4)throw Error('Map loading is still in progress');globalThis.ROAM_MAP_ID=mapId;startStage=0;startTicks=0;startReadyAt=0;startNext=0;startRequested=true;}};
const startEventName='EVENT_TRANS_TO_MAINSTATE',startEventText=Memory.allocUtf8String(startEventName),startEvent=Memory.alloc(24);
startEvent.writePointer(startEventText);startEvent.add(8).writePointer(startEventText.add(startEventName.length));startEvent.add(16).writePointer(startEventText.add(startEventName.length+1));
const startMessage=Memory.alloc(0x6de3);startMessage.writeByteArray(new Uint8Array(0x6de3));startMessage.writeU32(1021);const startFields=startMessage.add(4);
startFields.add(0x1c).writeU64(1);startFields.add(0x30).writeU64(1);startFields.add(0x38).writeUtf8String('LocalPlayer');
startFields.add(0x610).writeS32(100);startFields.add(0x922).writeS32(100);startFields.add(0x668).writeS32(globalThis.ROAM_MAP_ID||10020);
// QLevel's serialized viewpoint, verified in demo-26/27 for this exact build.
for(const [offset,value] of [[0x680,238413],[0x684,344830],[0x688,292841]])startFields.add(offset).writeS32(value);
const startDispatch=new NativeFunction(startMain.base.add(0x49dcb0),'void',['pointer'],{exceptions:'propagate'}),startEnter=new NativeFunction(startMain.base.add(0xd668f0),'void',['pointer'],{exceptions:'propagate'});
const startActor=new NativeFunction(startMain.base.add(0xcd5d00),'pointer',['pointer']),startPos=new NativeFunction(startMain.base.add(0xd9d680),'pointer',['pointer']),startShot=new NativeFunction(startMain.base.add(0xce4ab0),'void',['pointer']);
function startOwner(){const t=startMain.base.add(0x3094d90),k=t.add(0xb30).readU32(),h=(t.add((k&255)*4).readU32()+0x16af+t.add(0x400+((k>>>8)&255)*4).readU32())>>>0;return t.add(0x800+(h%102)*8).readPointer().xor(ptr(t.add(0xb34).readU16()));}
function startString(p){const b=p.readPointer(),n=p.add(8).readPointer().sub(b).toInt32();return n>=0&&n<1024?b.readUtf8String(n):null;}
function startVec(p){return [p.readFloat(),p.add(4).readFloat(),p.add(8).readFloat()];}
for(const [rva,name] of [[0xcf7ec0,'native_start_gameplay_enter'],[0xd66120,'native_start_loading_finished'],[0xd9d120,'native_start_actor_create']])Interceptor.attach(startMain.base.add(rva),{onEnter(a){send({event:name,object:a[0].toString()});}});
Interceptor.attach(startMain.base.add(0xbb1770),{onLeave(r){if(r.toInt32()===8053)startArmed=true;}});
Interceptor.attach(startMain.base.add(0xd4ca40),{onLeave(){
 if(!startArmed||startStage>=4||Date.now()<startNext)return;startNext=Date.now()+2000;
 try{
  const world=startMain.base.add(0x302a870).readPointer(),scene=startMain.base.add(0x302a860).readPointer(),owner=startOwner(),machine=owner.add(0x32a8).readPointer();
  if(machine.isNull())return;const stateObject=machine.add(0x28).readPointer();if(stateObject.isNull())return;
  const state=startString(stateObject.add(0x28)),worldState=world.add(0x6c).readU32(),plane=scene.add(0xd0).readU32(),actor=startActor(owner);
  if(startStage===0){
   if(globalThis.LOCAL_MENU_ENABLED&&!startRequested){if(state==='QSLobbyState'&&worldState===4&&plane===10050&&!startLobbyShown&&globalThis.LocalRoamUI){startLobbyShown=true;globalThis.LocalRoamUI.lobby();}return;}
   if(state==='QSGamePlayState'&&worldState===4){startStage=1;return;}
   if(state!=='QSLobbyState'||worldState!==4||plane!==10050||actor.isNull())return;
   startStage=1;send({event:'native_start_transition',state,world_state:worldState,plane,event_name:startEventText.readUtf8String()});startDispatch(startEvent);startEventText.readU8();
  }else if(startStage===1){
   if(state!=='QSGamePlayState'){if(++startTicks>15)throw Error('Gameplay transition timed out');return;}
   startFields.add(0x668).writeS32(globalThis.ROAM_MAP_ID||10020);const entryPosition=globalThis.ROAM_MAP_ID===10019?[484877,362292,121000]:[238413,344830,292841];for(let i=0;i<3;i++)startFields.add(0x680+i*4).writeS32(entryPosition[i]);startStage=2;send({event:'native_start_scene_call',state,plane},startMessage.readByteArray(0x6de3));startEnter(startMessage);if(globalThis.LocalRoamCharacter)globalThis.LocalRoamCharacter.reset();send({event:'native_start_scene_return'});
  }else{
   let levelName=null;const first=world.add(0x20).readPointer(),end=world.add(0x28).readPointer();if(!first.equals(end))levelName=startString(first.readPointer().add(0x78));
   send({event:'native_start_state',stage:startStage,state,world_state:worldState,plane,level:levelName,actor:actor.toString(),entity:actor.isNull()?null:actor.add(0x30).readPointer().toString(),position:actor.isNull()?null:startVec(startPos(actor))});
   if(worldState===4&&plane===(globalThis.ROAM_MAP_ID||10020)&&typeof levelName==='string'){
    if(startReadyAt===0)startReadyAt=Date.now();
    if(startStage===2&&Date.now()-startReadyAt>=8000){startStage=3;try{startShot(ptr(0));send({event:'native_start_screenshot',path:startString(startMain.base.add(0x302a4f8).readPointer().add(0x60))});}catch(e){send({event:'native_start_screenshot_skipped',error:String(e)});}}
    if(startStage===3&&Date.now()-startReadyAt>=30000)startStage=4;
   }
  }
 }catch(e){startStage=4;send({event:'native_start_error',error:String(e)});}
}});
send({event:'native_start_probe_ready'});
}
let nativeStartInstalled=false;
const nativeStartObserver=Process.attachModuleObserver({onAdded(m){if(nativeStartInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;nativeStartInstalled=true;installNativeSceneStart();}});

