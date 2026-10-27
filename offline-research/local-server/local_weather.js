'use strict';
// Exact-build local weather. All entry points run on the client's frame thread.
//
// CD8000 is the native override setter. It sets +98, resolves the map/time-specific
// resource at +B0 and marks the environment dirty. CD7640 then loads the resource
// through CD89D0 -> 9B9020. FF5F40 only prints the current resource to the UI log.
const WEATHER_CATALOG=[
 [0,'地图默认天气'],[1,'晴天'],[2,'晴朗'],[3,'小雨'],[4,'大雨'],[5,'雷雨'],[6,'雷电'],[7,'阴天'],
 [8,'大风'],[9,'多云'],[10,'潮湿'],[11,'雾霾'],[12,'雾'],[13,'小雪'],[14,'大雪'],[15,'浮尘'],
 [16,'沙暴'],[17,'火山'],[18,'落花'],[19,'蒲公英'],[20,'喷发'],[21,'沙漠雪'],[22,'沙尘雪'],
 [23,'客户端特写'],[24,'台风'],[25,'流星'],[26,'风雪'],[27,'暴风雪'],[28,'大厅雪景'],
 [29,'大厅海岛'],[30,'火山预警一'],[31,'火山预警二']];
const WEATHER_PRESETS=[
 {label:'晴天',weather:1},{label:'小雨',weather:3},{label:'大雨',weather:4},
 {label:'雷雨',weather:5},{label:'浓雾',weather:12},{label:'雾霾',weather:11},
 {label:'大风',weather:8},{label:'小雪',weather:13},{label:'暴雪',weather:14},
 {label:'沙暴',weather:16},{label:'台风',weather:24},{label:'火山',weather:17}];
function installLocalWeather(){
 const b=Process.getModuleByName('Europa_Client.exe').base;
 const getter=new NativeFunction(b.add(0x13a02a0),'int',[]);
 const applyNative=new NativeFunction(b.add(0xcd8000),'void',['pointer','int','int']);
 const names=new Map(WEATHER_CATALOG);
 const settingsPath='offline-research/local-server/local-weather.json';
 let desired=null,persisted=null,nextFrame=0,lastSystem=null,lastMap=null;
 try{const saved=JSON.parse(File.readAllText(settingsPath));if(saved&&Number.isInteger(saved.weather))persisted=saved.weather;}catch(_){}
 function system(){
  const o=b.add(0x3040750).readPointer();
  if(o.isNull())throw Error('Environment system is missing');
  return o;
 }
 function current(){return getter();}
 function resource(p){try{const start=p.readPointer(),n=p.add(8).readPointer().sub(start).toInt32();return n>=0&&n<1024?start.readUtf8String(n):null;}catch(_){return null;}}
 function status(){const o=system();return {weather:current(),requested:desired,active:o.add(8).readS32(),resource:resource(o.add(0x18)),target_resource:resource(o.add(0xb0)),override:!!o.add(0x98).readU8()};}
 function apply(value){const o=system();applyNative(o,value,1);lastSystem=o.toString();const scene=b.add(0x302a860).readPointer();lastMap=scene.isNull()?0:scene.add(0xd0).readU32();}
 function save(){persisted=desired;try{File.writeAllText(settingsPath,JSON.stringify({version:2,weather:desired}));}catch(e){send({event:'local_weather_save_error',error:String(e)});}}
 function set(id){
  if(!Number.isInteger(id)||id<0||id>=32)throw Error('Unknown weather '+id);
  // Apply before committing the preference, so an unavailable environment does
  // not turn an unsuccessful selection into a saved success.
  apply(id);desired=id;
  save();
  send({event:'local_weather_changed',weather:id,label:names.get(id),status:status()});
  return id;
 }
 function clear(){apply(0);desired=null;save();send({event:'local_weather_cleared',status:status()});}
 // Map transitions and native schedules can replace the environment. Reapply via
 // the setter only when needed; never rewrite renderer state or spoof its getter.
 Interceptor.attach(b.add(0xd4ca40),{onLeave(){
  if(desired===null||Date.now()<nextFrame)return;nextFrame=Date.now()+500;
  try{
   const world=b.add(0x302a870).readPointer(),scene=b.add(0x302a860).readPointer();
   if(world.isNull()||scene.isNull()||world.add(0x6c).readU32()!==4||scene.add(0xd0).readU32()===10050)return;
   const o=system(),map=scene.add(0xd0).readU32();
   if(o.toString()!==lastSystem||map!==lastMap||o.add(0xa0).readS32()!==desired||!!o.add(0x98).readU8()!==(desired!==0)){apply(desired);send({event:'local_weather_reapplied',weather:desired,map_id:map});}
  }catch(e){send({event:'local_weather_tick_error',error:String(e)});}
 }});
 globalThis.LocalRoamWeather={
  catalog(){return WEATHER_CATALOG.map(row=>({id:row[0],label:row[1]}));},
  presets(){return WEATHER_PRESETS;},
  label(id){return names.get(id)||('天气 '+id);},
  set,clear,status,
  current(){try{return current();}catch(e){return null;}},
  preferred(){return desired===null?persisted:desired;},
  applyPreferred(){const wanted=this.preferred();if(wanted===null)return null;try{return set(wanted);}catch(e){send({event:'local_weather_apply_error',error:String(e)});return null;}}
 };
 send({event:'local_weather_ready',weather:current(),count:WEATHER_CATALOG.length});
}
let lweInstalled=false;
const lweObserver=Process.attachModuleObserver({onAdded(m){if(lweInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;lweInstalled=true;installLocalWeather();}});
