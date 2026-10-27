'use strict';
// UI callbacks and all native mutations run on the game's frame thread.
function installLocalMenu(){
const main=Process.getModuleByName('Europa_Client.exe');
const runLua=new NativeFunction(main.base.add(0x1003000),'uint8',['pointer','pointer']);
const setLock=new NativeFunction(main.base.add(0xce5420),'void',['int','uint8']);
const cursor=new NativeFunction(main.base.add(0xce4930),'void',['pointer','uint8']);
const actorGet=new NativeFunction(main.base.add(0xcd5d00),'pointer',['pointer']);
const actorPos=new NativeFunction(main.base.add(0xd9d680),'pointer',['pointer']);
const actorSet=new NativeFunction(main.base.add(0xd9d590),'void',['pointer','float','float','float']);
let installed=false,initialLoading=false,loadingNext=0,lastSequence=0,next=0,picking=false,pickerReported=false,pickerMapReady=false,pendingSpawn=null,landing=null,physTicks=0,pendingLoadout=null,hudNext=0,hudSignature=null,matchHudNext=0;
let pickerGeneration=0;
// Native falling-state ticks, recorded alongside the actual landing position.
Interceptor.attach(main.base.add(0x133b5b0),{onEnter(){physTicks++;}});
const consumed=Memory.allocUtf8String('__local_roam_consumed__');
let initializingPicker=false,pickerParametersAccepted=false;
Interceptor.attach(main.base.add(0x129df10),{onLeave(r){if(initializingPicker)pickerParametersAccepted=(r.toUInt32()&0xff)!==0;}});
function owner(){const t=main.base.add(0x3094d90),k=t.add(0xb30).readU32(),h=(t.add((k&255)*4).readU32()+0x16af+t.add(0x400+((k>>>8)&255)*4).readU32())>>>0;return t.add(0x800+(h%102)*8).readPointer().xor(ptr(t.add(0xb34).readU16()));}
function lua(source){
 const wrapped="local ok,err=xpcall(function() "+source+" end,debug.traceback); if not ok then local f=io.open('offline-research/local-server/local-menu-error.txt','w');if f then f:write(tostring(err));f:close() end end";
 const text=Memory.allocUtf8String(wrapped),size=unescape(encodeURIComponent(wrapped)).length,value=Memory.alloc(24);
 value.writePointer(text);value.add(8).writePointer(text.add(size));value.add(16).writePointer(text.add(size+1));
 const system=main.base.add(0x3048d48).readPointer();
 if(runLua(system.add(0x18),value)!==1)throw Error('Local menu Lua failed');
}
function input(menu){setLock(2,menu?1:0);const c=main.base.add(0x3040738).readPointer();cursor(c,menu?0:1);cursor(c,menu?1:0);}
function ensure(){if(installed)return;const preferences=globalThis.LocalRoamWeapons.preferences();lua(globalThis.LOCAL_MENU_LUA+'\nLocalRoam.outbox='+JSON.stringify(globalThis.LOCAL_MENU_OUTBOX)+';LocalRoam.weaponId='+preferences.weapon_id+';LocalRoam.weaponSlot='+preferences.slot);installed=true;}
function close(){picking=false;lua('LocalRoam.clearPreparationCover();qs.UISetAllPanelsVisible(false);LocalRoam.opened=false;LocalRoam.picking=false;LocalRoam.preparing=false;LocalRoam.restoreHUD()');input(false);}
function toLua(value){if(value===null||value===undefined)return 'nil';if(typeof value==='string')return JSON.stringify(value);if(typeof value==='number'||typeof value==='boolean')return String(value);if(Array.isArray(value))return '{'+value.map(toLua).join(',')+'}';return '{'+Object.entries(value).map(([key,v])=>'['+JSON.stringify(key)+']='+toLua(v)).join(',')+'}';}
function evaluate(source){
 const path='offline-research/local-server/local-eval.txt';
 lua('local ok,res=xpcall(function() return '+source+' end,debug.traceback);local f=assert(io.open('+JSON.stringify(path)+',\'w\'));f:write(ok and tostring(res) or (\'ERR:\'..tostring(res)));f:close()');
 try{return File.readAllText(path);}catch(e){return 'unreadable';}
}
// The interaction prompt is reported as an event and written into whichever hint
// panel the current build exposes; a missing panel must not break the frame.
function prompt(text){
 if(!installed)return;
 try{lua('LocalRoam.prompt='+toLua(text)+';LocalRoam.showPrompt()');}catch(e){send({event:'local_menu_prompt_error',error:String(e)});}
 send({event:'local_menu_prompt',text});
}
// Weather and vehicle choices live in the native modules, so hand the lists to Lua
// every time the menu opens. Each field is assigned on its own: a weapon that has no
// accessories yet must not leave the vehicle and weather dropdowns empty.
function syncSystems(){
 const assign=(name,value)=>{try{lua(name+'='+toLua(value)+';');}catch(e){send({event:'local_menu_sync_error',field:name,error:String(e)});}};
 try{assign('LocalRoam.appearance',globalThis.LocalRoamOutfit?globalThis.LocalRoamOutfit.status():null);}catch(e){assign('LocalRoam.appearance',null);}
 assign('LocalRoam.adventures',globalThis.LocalRoamAdventure?globalThis.LocalRoamAdventure.catalogue():[]);
 if(globalThis.LocalRoamAdventure){assign('LocalRoam.adventuresByMap',globalThis.LocalRoamAdventure.allCatalogues());assign('LocalRoam.savedBackpacks',globalThis.LocalRoamAdventure.savedSelections());}
 if(globalThis.LocalRoamAdventure)lua('LocalRoam.syncBackpackSelection('+globalThis.LocalRoamAdventure.status().map_id+','+globalThis.LocalRoamAdventure.selected().id+')');
 if(globalThis.LocalRoamAdventure)assign('LocalRoam.adventureState',globalThis.LocalRoamAdventure.status());
 assign('LocalRoam.vehicles',globalThis.LocalRoamVehicles?globalThis.LocalRoamVehicles.catalogue():[]);
 assign('LocalRoam.weathers',globalThis.LocalRoamWeather?globalThis.LocalRoamWeather.catalog():[]);
 assign('LocalRoam.weatherPresets',globalThis.LocalRoamWeather?globalThis.LocalRoamWeather.presets():[]);
 assign('LocalRoam.weather',globalThis.LocalRoamWeather?globalThis.LocalRoamWeather.current():null);
 try{assign('LocalRoam.accessories',globalThis.LocalRoamWeapons&&globalThis.LocalRoamWeapons.status().slots.length?globalThis.LocalRoamWeapons.accessoryReport(1):null);}catch(e){assign('LocalRoam.accessories',null);}
 // The weapon and ammo categories read the carried inventory for their hints, so it
 // has to travel with every menu open, not only with the old bag screen.
 try{assign('LocalRoam.inventory',globalThis.LocalRoamWeapons?globalThis.LocalRoamWeapons.status():null);}catch(e){assign('LocalRoam.inventory',null);}
 try{assign('LocalRoam.consumables',globalThis.LocalRoamConsumables?globalThis.LocalRoamConsumables.status():null);}catch(e){assign('LocalRoam.consumables',null);}
}
function deployment(){ensure();syncSystems();lua('LocalRoam.showDeployment()');input(true);send({event:'local_menu_deployment_opened',map_id:globalThis.ROAM_MAP_ID});}
function openPicker(){
 pickerGeneration++;
 pickerReported=false;pickerMapReady=false;picking=true;lua('LocalRoam.pick()');input(true);
 send({event:'local_menu_spawn_picker_opened',map_id:globalThis.ROAM_MAP_ID});
}
function initializePickerMap(){
 // Rebuild the original map image/world rectangle after the local scene change.
 // The native panel may have first been constructed while the lobby was active.
 const sentinel=main.base.add(0x30411c8).readPointer().add(0x28);let node=sentinel.readPointer();
 for(let i=0;i<1000&&!node.equals(sentinel);i++,node=node.readPointer()){
  const panel=node.add(16).readPointer();if(panel.isNull())continue;
  if(panel.add(0x18).readPointer().readUtf8String()!=='EuUIStartPointPanel0')continue;
  pickerParametersAccepted=false;initializingPicker=true;
  try{new NativeFunction(main.base.add(0x1254810),'void',['pointer'])(panel);}finally{initializingPicker=false;}
  // The wrapper return contract is not verified for this invocation. Keep it
  // diagnostic: using it as a hard gate prevented the AS click setup entirely.
  send({event:'local_menu_spawn_map_initialized',map_id:globalThis.ROAM_MAP_ID,ui_map_id:main.base.add(0x3040770).readS32(),parameters_accepted:pickerParametersAccepted});return true;
 }
 return false;
}
// The playable collision terrain does not fill the scene rectangle: each map's
// height grid is a square 200-unit-spaced raster centred on (403100,403100),
// while the scene rectangle is 819200 wide. The desert grid (275200..531000)
// covers only the middle third, so picking a corner region there used to miss
// the asset and drop from the map ceiling. Spawn points are confined to the
// intersection of the scene rectangle and the grid actually available.
function mapCoverage(){
 const scene=main.base.add(0x302a860).readPointer(),bounds=Memory.alloc(16);
 new NativeFunction(main.base.add(0x9f8b20),'pointer',['pointer','pointer'])(scene,bounds);
 const width=bounds.add(8).readFloat(),height=bounds.add(12).readFloat();
 const map=HEIGHT_MAPS[Number(globalThis.ROAM_MAP_ID)];
 if(!map)return {minX:0,minY:0,maxX:width,maxY:height};
 const minX=Math.max(0,map.origin),minY=Math.max(0,map.origin);
 const maxX=Math.min(width,map.origin+(map.N-1)*200),maxY=Math.min(height,map.origin+(map.N-1)*200);
 return {minX,minY,maxX:Math.max(minX,maxX),maxY:Math.max(minY,maxY)};
}
function regionPoint(region){
 if(!Number.isInteger(region)||region<0||region>8)throw Error('Invalid spawn region');
 const cover=mapCoverage(),fractions=[.3,.5,.7];
 return {x:cover.minX+(cover.maxX-cover.minX)*fractions[region%3],y:cover.minY+(cover.maxY-cover.minY)*fractions[Math.floor(region/3)]};
}
function bag(){ensure();syncSystems();lua('LocalRoam.inventory='+toLua(globalThis.LocalRoamWeapons.status())+';LocalRoam.showBag()');input(true);}
globalThis.LocalRoamUI={
 pickerState(){return {visible:picking||!!pendingSpawn||!!landing,ready:pickerMapReady&&pickerReported,generation:pickerGeneration,selected:pendingSpawn?{x:pendingSpawn.x,y:pendingSpawn.y}:landing?{x:landing.x,y:landing.y}:null};},
 loading(){ensure();initialLoading=true;},
 notice(text){if(installed)lua('LocalRoam.statusText='+toLua(text)+';LocalRoam.showPrompt()');},
 consumables(value){if(installed)lua('LocalRoam.setConsumables('+toLua(value)+')');},
 evalLua(source){ensure();return evaluate(source);},
 prompt,
 sync(){ensure();syncSystems();},
 inventoryToggle(){ensure();lua('if LocalRoam.bagMode and LocalRoam.opened then LocalRoam.close() else LocalRoam.command("inventory") end');},
 lobby(){ensure();syncSystems();lua('LocalRoam.show()');input(true);send({event:'local_menu_lobby_ready'});},
 ready(){ensure();initialLoading=false;picking=false;globalThis.LocalRoamReady=true;
  // A character-roaming boot reports the world loaded before the local UI is
  // ready. A spawn already in flight must not be cancelled by this late init.
  if(landing){send({event:'local_menu_map_ready',map_id:globalThis.ROAM_MAP_ID});return;}
  landing=null;try{lua('LocalRoam.preparing=false;LocalRoam.ready('+globalThis.ROAM_MAP_ID+')');}catch(e){send({event:'local_menu_ready_lua_error',error:String(e)});}try{globalThis.LocalRoamWeapons.restore();if(pendingLoadout){globalThis.LocalRoamWeapons.equip(pendingLoadout.id,pendingLoadout.slot);pendingLoadout=null;}if(globalThis.LocalRoamAdventure)globalThis.LocalRoamAdventure.apply();}catch(e){send({event:'local_menu_restore_error',error:String(e)});}syncSystems();try{if(globalThis.LocalRoamWeather)globalThis.LocalRoamWeather.applyPreferred();}catch(e){send({event:'local_menu_weather_error',error:String(e)});}try{close();}catch(e){send({event:'local_menu_close_error',error:String(e)});}send({event:'local_menu_map_ready',map_id:globalThis.ROAM_MAP_ID});try{openPicker();}catch(e){send({event:'local_menu_spawn_picker_error',error:String(e)});}}
};
function gfxNumber(value){const type=value.add(8).readU32()&0x1f;if(type===5)return value.add(16).readDouble();if(type===4)return value.add(16).readU32();if(type===3)return value.add(16).readS32();throw Error('Unsupported map coordinate type '+type);}
function gfxValue(array,index){const item=array.add(index*24),indirect=item.add(16).readPointer();return indirect.isNull()?item.readPointer():indirect;}
Interceptor.attach(main.base.add(0x1268890),{onEnter(a){
 if(!picking||landing)return;
 try{
  const array=a[2].readPointer(),end=a[2].add(8).readPointer();if(end.sub(array).toInt32()!==72)return;
  const command=gfxValue(array,0),flags=command.add(8).readU32();
  let name=command.add(16).readPointer();if(flags&0x40)name=name.readPointer();
  if(name.readUtf8String()!=='SET_START_POINT')return;
  const x=gfxNumber(gfxValue(array,1)),y=gfxNumber(gfxValue(array,2));
  pendingSpawn={x,y,at:Date.now()+2500,countdown:null};a[1]=consumed;
  send({event:'local_menu_map_point_selected',x,y});
 }catch(e){send({event:'local_menu_map_click_error',error:String(e)});}
}});
// The map's own rigid-terrain collision heightfield, extracted from each
// RIGIDTERRAINLINUX.PXBIN into assets/*-height-*.bin. Samples are column-major
// int16 heights (negative heights are two's-complement); each asset is read once
// and cached. The night scene's heights are byte-identical to the day map.
const HEIGHT_MAPS={
 10020:{asset:'iceland-height-2112.bin',N:2112,origin:192000,originZ:175002.671875,scale:5.340657711029053},
 10021:{asset:'iceland-height-2112.bin',N:2112,origin:192000,originZ:175002.671875,scale:5.340657711029053},
 10019:{asset:'island-height-2624.bin',N:2624,origin:140800,originZ:60000.9140625,scale:1.8310825824737549},
 10024:{asset:'desert-height-1280.bin',N:1280,origin:275200,originZ:60000.9140625,scale:1.8310825824737549},
};
const heightGrids={};
function groundHeight(x,y){
 const map=HEIGHT_MAPS[Number(globalThis.ROAM_MAP_ID)];
 if(!map)return null;
 const {N,origin,originZ,scale}=map,spacing=200;
 const row=(x-origin)/spacing,col=(y-origin)/spacing;
 if(!(row>=0&&col>=0&&row<=N-1&&col<=N-1))return null;
 let heights=heightGrids[map.asset];
 if(!heights){
  try{
   const bytes=File.readAllBytes('offline-research/local-server/assets/'+map.asset);
   if(bytes.byteLength!==N*N*2)throw Error('Terrain height asset is invalid');
   heights=new Int16Array(bytes);heightGrids[map.asset]=heights;
  }catch(e){send({event:'local_menu_height_asset_error',asset:map.asset,error:String(e)});return null;}
 }
 const r0=Math.floor(row),c0=Math.floor(col),r1=Math.min(r0+1,N-1),c1=Math.min(c0+1,N-1),tr=row-r0,tc=col-c0;
 const h=(r,c)=>heights[c*N+r];
 const north=h(r0,c0)*(1-tc)+h(r0,c1)*tc,south=h(r1,c0)*(1-tc)+h(r1,c1)*tc;
 const z=originZ+(north*(1-tr)+south*tr)*scale;
 return Number.isFinite(z)?z:null;
}
function spawn(point){ const world=main.base.add(0x302a870).readPointer(),scene=main.base.add(0x302a860).readPointer();
 if(world.add(0x6c).readU32()!==4||scene.add(0xd0).readU32()!==globalThis.ROAM_MAP_ID)throw Error('Map is not ready');
 if([22,23,24].includes(globalThis.LocalRoamAdventure.check().state))throw Error('Leave the zipline before changing spawn position');
 const previousActive=globalThis.LocalRoamMatchActive===true;
 // The room preview character shares the map scene, so a loaded world alone
 // does not mean the player is in the match. The adventure FSM is only safe to
 // drive after this spawn sequence settles on the ground.
 const level=world.add(0x20).readPointer().readPointer(),bounds=Memory.alloc(16);
 new NativeFunction(main.base.add(0x9f8b20),'pointer',['pointer','pointer'])(scene,bounds);
 const width=bounds.add(8).readFloat(),height=bounds.add(12).readFloat();
 if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<=0||point.y<=0||point.x>=width||point.y>=height)throw Error('Selected point is outside the map');
 const cover=mapCoverage();
 if(point.x<cover.minX||point.x>cover.maxX||point.y<cover.minY||point.y>cover.maxY){
  // Stay one grid step inside the raster so the bilinear sample is never read
  // from the outermost ring, where a map edge can be void collision.
  const lo=200,minX=cover.minX+lo,maxX=Math.max(minX,cover.maxX-lo),minY=cover.minY+lo,maxY=Math.max(minY,cover.maxY-lo);
  const clamped={x:Math.min(Math.max(point.x,minX),maxX),y:Math.min(Math.max(point.y,minY),maxY)};
  send({event:'local_menu_spawn_point_clamped',from:[point.x,point.y],to:[clamped.x,clamped.y],coverage:[cover.minX,cover.minY,cover.maxX,cover.maxY]});
  point=clamped;
 }
 const peak=level.add(0x1e0).readFloat();if(!Number.isFinite(peak)||peak<=0||peak>2000000)throw Error('Map height is invalid');
 const actor=actorGet(owner());if(actor.isNull()||actor.add(0x30).readPointer().isNull())throw Error('Local character is missing');
 // Spawn just above the map's own collision heightfield. The 5 m margin lets
 // the native gravity/collision path settle the capsule in about a second
 // instead of dropping from the map ceiling for 20-35 s. Maps without a
 // height asset still fall back to the ceiling. Never guess a ground Z.
 // D8C950 is deliberately not called: it resets the motion state machine and
 // leaves the character frozen in the air (see WORK_HANDOFF.md).
 const ground=groundHeight(point.x,point.y),startZ=ground===null?peak+1000:ground+500;
 if(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())globalThis.LocalRoamVehicles.leave();
 if(globalThis.LocalRoamConsumables)globalThis.LocalRoamConsumables.cancel('respawn');
 const selected=Number(evaluate('LocalRoam.abilityId'));if(selected!==globalThis.LocalRoamAdventure.selected().id)globalThis.LocalRoamAdventure.select(selected);globalThis.LocalRoamAdventure.apply();
 const controller=actor.add(0xb0).readPointer();if(controller.isNull())throw Error('Character collision controller is missing');
 const previous=actorPos(actor),previousPosition=[previous.readFloat(),previous.add(4).readFloat(),previous.add(8).readFloat()];
 globalThis.LocalRoamMatchActive=false;
 const target=Memory.alloc(12);[point.x,point.y,startZ].forEach((v,i)=>target.add(i*4).writeFloat(v));
 // Move the authoritative native capsule as well as its display avatar. Moving
 // only the avatar gets overwritten by the next controller update.
 new NativeFunction(main.base.add(0xd259a0),'void',['pointer','pointer'])(controller,target);
 // The server's position-correction path (1185DAD) invalidates the idle contact
 // cache at this exact byte. Otherwise a stationary capsule skips collision
 // queries and keeps its old grounded state after setPosition, floating in air.
 // Let the normal next physics frame detect no ground and enter native falling.
 controller.add(0x2d3).writeU8(1);
 actorSet(actor,point.x,point.y,startZ);
 picking=false;lua('LocalRoam.beginSpawnTransition()');input(true);
 landing={x:point.x,y:point.y,started:Date.now(),last:null,moved:false,phys0:physTicks,base:[point.x,point.y,startZ],previous:previousPosition,previousActive};
 send({event:'local_menu_respawn_started',map_id:globalThis.ROAM_MAP_ID,position:[point.x,point.y,startZ],ground,margin:ground===null?null:500});
}
function failedSpawn(reason,position){
 const previousActive=landing.previousActive===true;
 const old=landing.previous,actor=actorGet(owner()),controller=actor.add(0xb0).readPointer(),target=Memory.alloc(12);
 old.forEach((v,i)=>target.add(i*4).writeFloat(v));new NativeFunction(main.base.add(0xd259a0),'void',['pointer','pointer'])(controller,target);controller.add(0x2d3).writeU8(1);actorSet(actor,...old);
 globalThis.LocalRoamMatchActive=previousActive;
 landing=null;picking=false;lua('qs.UISetAllPanelsVisible(false);LocalRoam.clearPreparationCover();LocalRoam.preparing=false');deployment();
 send({event:reason,position,restored:old,match_active:previousActive});
}
Interceptor.attach(main.base.add(0xd4ca40),{onLeave(){
 if(globalThis.LocalRoamCharacter&&!globalThis.LocalRoamCharacter.ready()){
  try{const world=main.base.add(0x302a870).readPointer(),scene=main.base.add(0x302a860).readPointer();if(!world.isNull()&&!scene.isNull()&&world.add(0x6c).readU32()===4&&scene.add(0xd0).readU32()===globalThis.ROAM_MAP_ID){ensure();initialLoading=true;}}catch(_){}
 }
 if(!installed||Date.now()<next)return;next=Date.now()+100;
 try{
  let command=null;try{command=JSON.parse(File.readAllText(globalThis.LOCAL_MENU_OUTBOX));}catch(_){}
  if(command&&Number.isSafeInteger(command.sequence)&&command.sequence>lastSequence){
   lastSequence=command.sequence;send({event:'local_menu_command',action:command.action,map_id:command.map_id});
   switch(command.action){
    case 'enter':globalThis.LocalRoamAdventure.setMap(Number(command.map_id),command.ability_id);picking=false;landing=null;globalThis.LocalRoamReady=false;globalThis.LocalRoamMatchActive=false;if(globalThis.LocalRoamConsumables)globalThis.LocalRoamConsumables.reset();if(globalThis.LocalRoamInteract)globalThis.LocalRoamInteract.clear();if(globalThis.LocalRoamVehicles)globalThis.LocalRoamVehicles.reset();globalThis.LocalRoamWeapons.reset();pendingLoadout=command.weapon_id?{id:Number(command.weapon_id),slot:Number(command.slot)||1}:null;globalThis.LocalRoamScene.request(command.map_id);break;
    case 'menu':pendingSpawn=null;picking=false;syncSystems();input(true);lua('if LocalRoam.refreshMenuStatus then LocalRoam.refreshMenuStatus() end');break;
    case 'resume':if(!landing)close();break;
    case 'pick':if(!landing){if(!picking){pickerReported=false;pickerMapReady=false;}picking=true;input(true);}break;
    case 'deploy':{
     if(landing)throw Error('Spawn preparation is in progress');
     if([22,23,24].includes(globalThis.LocalRoamAdventure.check().state))throw Error('Leave the zipline before changing spawn position');
     if(evaluate('qs.IsLookAtPlayerBmxActive() or qs.IsLookAtPlayerSkiActive() or qs.IsLookAtPlayerGliderActive()')==='true')throw Error('Fold the active adventure equipment before changing spawn position');
     globalThis.LocalRoamAdventure.select(command.ability_id===undefined?globalThis.LocalRoamAdventure.selected().id:Number(command.ability_id));globalThis.LocalRoamAdventure.apply();syncSystems();
     if(command.x!==undefined&&command.x!==null&&Number.isFinite(Number(command.x))&&command.y!==undefined&&command.y!==null&&Number.isFinite(Number(command.y))){openPicker();pendingSpawn={x:Number(command.x),y:Number(command.y),at:Date.now()+2500,countdown:null};picking=false;send({event:'local_menu_spawn_point_selected',x:pendingSpawn.x,y:pendingSpawn.y});}
     else if(command.spawn_region===undefined||Number(command.spawn_region)===-1)openPicker();
     else{openPicker();pendingSpawn=regionPoint(Number(command.spawn_region));picking=false;send({event:'local_menu_spawn_region_selected',region:Number(command.spawn_region),...pendingSpawn});}
     break;
    }
    case 'adventure_use':if(landing||!globalThis.LocalRoamAdventure.status().inWorld)throw Error('Character is not in the loaded world');close();globalThis.LocalRoamAdventure.use();break;
    case 'adventure_fold':if(landing||!globalThis.LocalRoamAdventure.status().inWorld)throw Error('Character is not in the loaded world');close();globalThis.LocalRoamAdventure.fold();break;
    case 'adventure_kit':if(landing||!globalThis.LocalRoamAdventure.status().inWorld)throw Error('Character is not in the loaded world');globalThis.LocalRoamAdventure.select(Number(command.ability_id));globalThis.LocalRoamAdventure.apply();globalThis.LocalRoamAdventure.prepareLoadout();syncSystems();close();break;
    case 'adventure_check':{
     // Read the shipped queries on this same game thread instead of opening a
     // second Frida session: the 0x1A3700 frame hook is what the standalone
     // probe uses, and bundling the read removes that whole failure mode.
     const queryNames=['IsLookAtPlayerSkiAvailable','IsLookAtPlayerSkiActive','IsLookAtPlayerBmxAvailable',
      'IsLookAtPlayerBmxActive','IsLookAtPlayerGliderAvailable','IsLookAtPlayerGliderActive','GetCurSkiState'];
     const checkPath='offline-research/local-server/adventure-check.txt';
     const code="local r={} for _,k in ipairs({"+queryNames.map(n=>"'"+n+"'").join(',')+
      "}) do local ok,v=pcall(qs[k]);r[#r+1]=k..'='..(ok and tostring(v) or 'ERR') end local f=assert(io.open("+JSON.stringify(checkPath)+",'w'));f:write(table.concat(r,string.char(10)));f:close()";
     lua(code);
     const payload={event:'local_adventure_check',values:{}};
     try{for(const line of File.readAllText(checkPath).split(/\r?\n/)){const at=line.indexOf('=');if(at>0)payload.values[line.slice(0,at)]=line.slice(at+1);}}catch(e){payload.readError=String(e);}
     try{payload.status=globalThis.LocalRoamAdventure.check();}catch(e){payload.statusError=String(e);}
     try{const actor=actorGet(owner());if(!actor.isNull()){const p=actorPos(actor);payload.position=[p.readFloat(),p.add(4).readFloat(),p.add(8).readFloat()];}}catch(e){payload.positionError=String(e);}
     send(payload);break;
    }
    case 'starting_kit':if(!landing){globalThis.LocalRoamAdventure.select(Number(command.ability_id));globalThis.LocalRoamAdventure.apply();syncSystems();lua('LocalRoam.pickEquipReady=false;LocalRoam.kitPanelReady=false');send({event:'local_menu_starting_kit_changed',ability_id:Number(command.ability_id)});}break;
    case 'weapon':globalThis.LocalRoamWeapons.equip(Number(command.weapon_id),Number.isInteger(command.slot)?command.slot:1);close();break;
    case 'appearance_skin':globalThis.LocalRoamOutfit.selectSkin(Number(command.item_id));syncSystems();if(globalThis.LocalRoamReady)close();else lua('LocalRoam.show()');break;
    case 'appearance_clothing':globalThis.LocalRoamOutfit.wear(Number(command.item_id),Number(command.remove_slot));syncSystems();if(globalThis.LocalRoamReady)close();else lua('LocalRoam.show()');break;
    case 'inventory':bag();break;
    case 'bag_weapon':globalThis.LocalRoamWeapons.equip(Number(command.item_id),Number(command.slot)||1);bag();break;
    case 'accessory':globalThis.LocalRoamWeapons.accessory(Number(command.item_id),Number(command.slot)||1,command.item_id===0?Number(command.remove_slot):null);bag();break;
    case 'supply':globalThis.LocalRoamWeapons.supply();close();break;
    case 'reload':close();globalThis.LocalRoamWeapons.reload();break;
    case 'vehicle_spawn':globalThis.LocalRoamVehicles.spawn(Number(command.item_id),Number(command.count)||1,Number.isInteger(command.spawn_mode)?command.spawn_mode:1);close();break;
    case 'vehicle_board':globalThis.LocalRoamVehicles.boardLatest();close();break;
    case 'vehicle_leave':globalThis.LocalRoamVehicles.leave();close();break;
    case 'vehicle_nearest':{const found=globalThis.LocalRoamVehicles.nearest(1200);if(found)globalThis.LocalRoamVehicles.board(found.vehicle.rid,1);else send({event:'local_menu_no_vehicle_nearby'});close();break;}
    case 'weather':globalThis.LocalRoamWeather.set(Number(command.weather_id));close();break;
    case 'loot_drop':globalThis.LocalRoamInteract.drop(Number(command.item_id),command.count===undefined?1:Number(command.count));close();break;
    case 'loot_kit':globalThis.LocalRoamInteract.dropKit();close();break;
    case 'loot_clear':globalThis.LocalRoamInteract.clear();close();break;
    case 'medicine':close();globalThis.LocalRoamConsumables.use(Number(command.item_id));break;
    case 'medicine_cancel':globalThis.LocalRoamConsumables.cancel('menu');close();break;
    case 'consumable_supply':globalThis.LocalRoamConsumables.supply();bag();break;
    case 'throwable_equip':close();globalThis.LocalRoamConsumables.arm(Number(command.item_id));break;
    case 'throwable_throw':close();globalThis.LocalRoamConsumables.throw(Number(command.item_id),!!command.low_throw);break;
    case 'throwable_low':close();globalThis.LocalRoamConsumables.throw(Number(command.item_id),true);break;
    case 'consumable_status':send({event:'local_consumables_status',status:globalThis.LocalRoamConsumables.status()});break;
    case 'door_status':send({event:'local_doors_status',status:globalThis.LocalRoamDoors.status()});break;
    case 'interact':globalThis.LocalRoamInteract.execute();close();break;
    case 'accessory_best':globalThis.LocalRoamWeapons.installBest(Number(command.slot)||1);close();break;
   }
  }
  if(installed)lua('if LocalRoam.opened and LocalRoam.tickMenu then LocalRoam.tickMenu() end');
  if(initialLoading&&Date.now()>=loadingNext){loadingNext=Date.now()+500;lua('if not LocalRoam.preparationCover then LocalRoam.preparingSpawn() end;UIShowWindow("RoomSettingPanel",true)');input(true);}
  if(picking&&!pickerMapReady)pickerMapReady=initializePickerMap();
  if(picking&&pickerMapReady&&!pickerReported&&evaluate('LocalRoam.tickPicker()')==='true'){pickerReported=true;send({event:'local_menu_spawn_picker_ready',map_id:globalThis.ROAM_MAP_ID});}
  if(picking&&pickerMapReady)lua('LocalRoam.tickPicker();if LocalRoam.tickDeployment then LocalRoam.tickDeployment() end');
  if(pendingSpawn){
   const count=Math.max(0,Math.ceil(((pendingSpawn.at||0)-Date.now())/1000));
   if(pendingSpawn.countdown!==count){pendingSpawn.countdown=count;lua('QSUICall("EuUIStartPointPanel","Cpp2As_SetCountdown",'+count+');QSUICall("EuUIStartPointPanel","Cpp2As_InitInstruction",'+toLua('已选出生位置 · 即将准备地面出生，可在右侧切换装备')+')');}
   if(!pendingSpawn.at||Date.now()>=pendingSpawn.at){const point=pendingSpawn;pendingSpawn=null;spawn(point);}
  }
  if(globalThis.LocalRoamWeapons&&Date.now()>=hudNext){
   hudNext=Date.now()+400;
   try{
    const status=globalThis.LocalRoamWeapons.status();
    const signature=JSON.stringify(status.slots.map(s=>[s.slot,s.id,s.ammo,s.capacity,s.reserve]));
    if(signature!==hudSignature){hudSignature=signature;const reserve={};for(const s of status.slots)reserve[s.id]=s.reserve||0;lua('LocalRoam.setHUDReserve('+toLua(reserve)+')');}
   }catch(e){hudSignature=null;}
  }
  if(Date.now()>=matchHudNext){
   matchHudNext=Date.now()+1000;
   const health=globalThis.LocalRoamConsumables.status().health;
   const value={alive:health&&health.hp>0?1:0,kills:0,health,riding:!!(globalThis.LocalRoamVehicles&&globalThis.LocalRoamVehicles.riding())};
   lua('LocalRoam.updateMatchHUD('+toLua(value)+')');
  }
  if(landing){
   const elapsed=Date.now()-landing.started;
   if(elapsed>1000){
    if(Date.now()>=(landing.uiAt||0)){landing.uiAt=Date.now()+2000;lua('QSUICall("EuUIStartPointPanel","Cpp2As_InitInstruction",'+toLua('正在部署到所选位置 · 正在加载所选地点的地形')+')');}
    const p=actorPos(actorGet(owner())),position=[p.readFloat(),p.add(4).readFloat(),p.add(8).readFloat()];
    const delta=landing.last===null?null:Math.abs(position[2]-landing.last);
    // A still character only counts as landed if it left the teleport point:
    // the drop can finish inside the first sampling second, so compare against
    // the spawn coordinates rather than only consecutive samples.
    if(!landing.moved&&(Math.abs(position[0]-landing.base[0])>1||Math.abs(position[1]-landing.base[1])>1||Math.abs(position[2]-landing.base[2])>1))landing.moved=true;
    if(delta!==null&&delta>.5)landing.moved=true;
    landing.stable=delta!==null&&delta<.1?(landing.stable||0)+1:0;
    landing.last=position[2];
    const ticks=physTicks-landing.phys0;
    if(landing.moved&&landing.stable>=15&&Math.hypot(position[0]-landing.x,position[1]-landing.y)<500){globalThis.LocalRoamMatchActive=true;send({event:'local_menu_respawn_landed',position,physics_ticks:ticks});landing=null;try{globalThis.LocalRoamAdventure.prepareLoadout();}catch(e){send({event:'local_adventure_starting_items_error',error:String(e)});}close();send({event:'local_menu_ground_spawn_ready',position});}
    else if(!landing.moved&&elapsed>8000){failedSpawn('local_menu_respawn_frozen',position);}
    else if(elapsed>120000){failedSpawn('local_menu_respawn_timeout',position);}
   }
  }
 }catch(e){send({event:'local_menu_error',error:String(e)});try{lua('if LocalRoam.opened then local p=UIFindPanel("RoomSettingPanel");if p then p.RoomNameInput.text="操作未完成：请检查所选项目、数量和配件兼容性" end end');}catch(_){} }
}});
send({event:'local_menu_installed'});
}
let lmInstalled=false;const lmObserver=Process.attachModuleObserver({onAdded(m){if(lmInstalled||m.name.toLowerCase()!=='protocalhandler_x64.dll')return;lmInstalled=true;installLocalMenu();}});
