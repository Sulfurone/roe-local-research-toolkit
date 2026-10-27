'use strict';
// Physical scene ids differ from the shipped 160xx match-template ids.
// Ability ids here are raw role attributes, not vecAbility.iType values.
globalThis.LocalRoamBackpacks=(()=>{
 const definitions=[
  {id:2,label:'滑翔背包',key:'GET_ON_GLIDER',icon:'ICON_ability_2',package_type:1,template_map:16008,template_type:1,weapon:20002,ammo:30003,rounds:15,help:'在可展开的空中使用原版滑翔操作。'},
  {id:3,label:'滑雪背包',key:'SKI',icon:'ICON_ability_3',package_type:2,template_map:16008,template_type:2,weapon:20003,ammo:30006,rounds:10,help:'落地后按 T 展开或收起滑雪板。'},
  {id:4,label:'登山背包',key:null,icon:'ICON_ability_1',package_type:3,template_map:16008,template_type:3,weapon:10402,ammo:30004,rounds:10,help:'携带冰斧 / 滑轮，使用场景中的攀登交互。'},
  {id:13,label:'滑翔翼背包',key:'GET_ON_GLIDER',icon:'ICON_ability_Parachute',package_type:1,template_map:16012,template_type:1,weapon:20002,ammo:30003,rounds:15,help:'在可展开的空中使用原版滑翔操作。'},
  {id:14,label:'自行车背包',key:'SKI',icon:'ICON_ability_Bmx',package_type:2,template_map:16012,template_type:2,weapon:20002,ammo:30003,rounds:15,help:'落地后按 T 展开或收起自行车。'},
  {id:15,label:'钩爪背包',key:null,icon:'ICON_ability_Grappling',package_type:3,template_map:16012,template_type:3,weapon:20002,ammo:30003,rounds:15,help:'瞄准可钩附位置后按 E 发射钩爪，按 F 松开。'},
  {id:0,label:'徒步 / 不携带特殊装备',key:null,icon:'ICON_ability_Empty',package_type:0,help:'不携带特殊移动装备。'}
 ];
 const snow=[2,3,4,0],island=[13,14,15,0],maps=[10020,10021,10019,10024,10016];
 function ids(mapId){return [10019,10024].includes(Number(mapId))?island:snow;}
 function forMap(mapId){return ids(mapId).map(id=>definitions.find(c=>c.id===id));}
 function defaultId(mapId){return ids(mapId)===snow?3:13;}
 function allowed(id,mapId){return ids(mapId).includes(Number(id));}
 function migrate(id,mapId){if(allowed(id,mapId))return Number(id);const pairs={2:13,13:2,3:14,14:3,4:15,15:4};return allowed(pairs[id],mapId)?pairs[id]:defaultId(mapId);}
 return {definitions,forMap,defaultId,allowed,migrate,all(){return Object.fromEntries(maps.map(id=>[id,forMap(id)]));}};
})();
