'use strict';
// Local roaming's head-relative emitter (3) is placed exactly at listener 0.
// This build's spatial path produces near silence for a coincident emitter.
// Offset it 10 cm along its native forward axis; other emitters retain
// their native positions, attenuation and directional processing.
function installLocalAudio(){
 const main=Process.getModuleByName('Europa_Client.exe');
 // The shipped weapon bank contains these events, but their action targets
 // are absent from every installed bank. Use the user-approved substitutes
 // at the native event boundary, preserving the engine's fire/stop timing.
 const aliases=new Map(Object.entries({
  play_wp_uzi:'Play_wp_mp5',break_wp_uzi:'Break_wp_mp5',
  play_wp_uzi_sup:'Play_wp_mp5_sup',break_wp_uzi_sup:'Break_wp_mp5_sup',
  play_wp_uzi_dry:'Play_wp_mp5_dry',
  play_wp_msr:'Play_wp_R700',play_wp_msr_sup:'Play_wp_r700_sup',
  play_wp_msr_dry:'Play_wp_r700_dry'
 }).map(([name,replacement])=>[name,{replacement,pointer:Memory.allocUtf8String(replacement)}]));
 const aliasReported=new Set();
 Interceptor.attach(main.base.add(0x20b4210),{onEnter(args){
  if(!args[1].equals(ptr(3)))return;
  try{
   const original=args[0].readCString(),alias=aliases.get(original.toLowerCase());
   if(!alias)return;
   args[0]=alias.pointer;
   if(!aliasReported.has(original)){aliasReported.add(original);send({event:'local_audio_event_substituted',original,replacement:alias.replacement,object_id:3,reason:'missing_bank_target'});}
  }catch(error){send({event:'local_audio_alias_error',error:String(error)});}
 }});
 let listener=null,reported=false;
 const scratch=new Map();
 const debugPositions=new Map();
 globalThis.LocalRoamAudio={debug(){return {listener,positions:Array.from(debugPositions.values())};}};
 Interceptor.attach(main.base.add(0x20b81c0),{
  onEnter(args){
   const id=args[0];
   if(globalThis.LOCAL_VEHICLE_AUDIO_TEST){
    try{debugPositions.set(id.toString(),{id:id.toString(),time:Date.now(),transform:Array.from({length:9},(_,i)=>args[1].add(i*4).readFloat())});if(debugPositions.size>128)debugPositions.delete(debugPositions.keys().next().value);}catch(_){}
   }
   if(!id.isNull()&&!id.equals(ptr(3)))return;
   try{
    const transform=args[1];
    const position=[24,28,32].map(offset=>transform.add(offset).readFloat());
    if(!position.every(Number.isFinite))return;
    if(id.isNull()){
     const front=[0,4,8].map(offset=>transform.add(offset).readFloat());
     if(front.every(Number.isFinite))listener={position,front};
     return;
    }
    if(!listener)return;
    const delta=position.map((value,index)=>value-listener.position[index]);
    if(delta.reduce((sum,value)=>sum+value*value,0)>0.0001)return;
    const emitterFront=[0,4,8].map(offset=>transform.add(offset).readFloat());
    const length=Math.hypot(...emitterFront);if(!Number.isFinite(length)||length<0.5||length>1.5)return;
    let adjusted=scratch.get(this.threadId);
    if(!adjusted){adjusted=Memory.alloc(36);scratch.set(this.threadId,adjusted);}
    adjusted.writeByteArray(transform.readByteArray(36));
    for(let i=0;i<3;i++)adjusted.add(24+i*4).writeFloat(position[i]+emitterFront[i]/length*0.1);
    args[1]=adjusted;
    if(!reported){reported=true;send({event:'local_audio_emitter_adjusted',object_id:3,offset_meters:0.1});}
   }catch(error){if(!reported){reported=true;send({event:'local_audio_error',error:String(error)});}}
  }
 });
 send({event:'local_audio_installed'});
}
let localAudioInstalled=false;
const localAudioObserver=Process.attachModuleObserver({onAdded(module){
 if(localAudioInstalled||module.name.toLowerCase()!=='protocalhandler_x64.dll')return;
 localAudioInstalled=true;installLocalAudio();
}});
