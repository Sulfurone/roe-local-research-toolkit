-- Local session UI, built from the client's shipped Scaleform panels.
LocalRoam = LocalRoam or { sequence=0, canResume=false, opened=false }
local R=LocalRoam
R.maps={
 {id=10020,label='雪山 · 标准场景',image='img720_iceland.png'},
 {id=10021,label='雪山 · 夜间场景 [测试]',image='img720_icelandnight.png'},
 {id=10019,label='海岛 · 欧罗巴岛 [测试]',image='img720_newisland.png'},
 {id=10024,label='沙漠地图 [测试]',image='img720_desert.png'},
}
R.weaponIds={10201,10202,10203,10204,10205,10206,10207,10208,10209,10301,10302,10303,10305,10306,10307,10401,10402,10403,10101,10102,10103,10104,10105,10106,10107,10108,10110,10111,10601,20001,20002,20003,20004}
R.weapons={}
R.weaponImages={}
for _,id in ipairs(R.weaponIds) do
 local info=qs.GetItemInfo(id)
 if info then
  R.weapons[#R.weapons+1]={id=id,label=info.name}
  R.weaponImages[id]={large=info.iconL,small=info.tips2D or info.package2D}
 end
end
-- Only the 96 px icon set (ICON96_*) ships as loose PNGs in this build; the
-- 268 px names in the item table (ICON268_*) resolve to nothing, so the menu
-- preview must use the 96 px resource even for its large slot.
function R.weaponImage(id)
 local images=R.weaponImages[tonumber(id)]
 local name=images and images.small
 return type(name)=='string' and name~='' and ('@'..name) or nil
end
R.weaponId=R.weaponId or 10201
R.weaponSlot=R.weaponSlot or 1
R.spawnRegions={
 {id=-1,label='在大地图上点击位置'},
 {id=0,label='西北区域'},{id=1,label='北部区域'},{id=2,label='东北区域'},
 {id=3,label='西部区域'},{id=4,label='中央区域'},{id=5,label='东部区域'},
 {id=6,label='西南区域'},{id=7,label='南部区域'},{id=8,label='东南区域'},
}
R.spawnRegion=R.spawnRegion or -1
R.backpackDrafts=R.backpackDrafts or {}
function R.backpackChoices(mapId)
 mapId=tonumber(mapId) or R.currentMap or 10020
 local maps=R.adventuresByMap or {}
 return maps[tostring(mapId)] or maps[mapId] or R.adventures or {}
end
function R.backpackAllowed(mapId,id)
 for _,choice in ipairs(R.backpackChoices(mapId)) do if choice.id==tonumber(id) then return true end end
 return false
end
function R.backpackId(mapId)
 mapId=tonumber(mapId) or R.currentMap or 10020
 local key=tostring(mapId)
 local id=R.backpackDrafts[key]
 if not R.backpackAllowed(mapId,id) then id=(R.savedBackpacks or {})[key] end
 if not R.backpackAllowed(mapId,id) and mapId==R.currentMap then id=R.abilityId end
 if not R.backpackAllowed(mapId,id) then id=(mapId==10019 or mapId==10024) and 13 or 3 end
 if not R.backpackAllowed(mapId,id) then id=(R.backpackChoices(mapId)[1] or {}).id end
 return id or 0
end
function R.rememberBackpack(mapId,id)
 mapId=tonumber(mapId) or R.currentMap or 10020
 assert(R.backpackAllowed(mapId,id),'Backpack is not available on this map')
 R.backpackDrafts[tostring(mapId)]=tonumber(id)
end
function R.syncBackpackSelection(mapId,id)
 if R.actualBackpackMap~=mapId or R.actualBackpackId~=id then R.rememberBackpack(mapId,id) end
 R.actualBackpackMap=mapId;R.actualBackpackId=id;R.abilityId=id
end
function R.command(action,mapId)
 local old=io.open(R.outbox,'r')
 if old then local text=old:read('*a');old:close();R.sequence=math.max(R.sequence,tonumber(text:match('"sequence"%s*:%s*(%d+)')) or 0) end
 R.sequence=R.sequence+1
 local f=assert(io.open(R.outbox,'w'))
 -- External launcher/test commands use millisecond timestamps. Lua's %d casts
 -- those to a signed 32-bit integer; keep the exact integer as a double instead.
 local targetMap=mapId or R.currentMap or 10020
 f:write(string.format('{"sequence":%.0f,"action":"%s","map_id":%d,"weapon_id":%d,"slot":%d,"item_id":%d,"remove_slot":%d,"count":%d,"weather_id":%d,"ability_id":%d,"spawn_region":%d}',R.sequence,action,targetMap,R.weaponId,R.weaponSlot,R.itemId or 0,R.removeSlot or -1,R.itemCount or 1,R.weatherId or -1,R.backpackId(targetMap),R.spawnRegion or -1))
 f:close()
end
-- Use the shipped HUD hint panel, including its real INTERACT key binding.
function R.showPrompt()
 if not R.canResume then return end
 local hintText=R.statusText or R.prompt
 local visible=hintText~=nil and not R.opened and not R.picking
 if visible then
  Logic.UICore.LoadPanel('InteractHintListPanel')
  qs.UISetVisible('InteractHintListPanel',true)
 end
 local p=UIFindPanel('InteractHintListPanel')
 if p then
  local text=tostring(hintText or ''):gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;')
  p.OnSetInteractHintText(text)
  p.OnShowInteractHint(visible)
  p.UpdateUIData()
 end
end
-- The shipped panel only exposes three dropdowns, so the map menu selects
-- category first, then the item, then a parameter (slot or summon count).
function R.accessoryGroups()
 local groups={}
 for id=40001,40999 do
  local info=qs.GetItemInfo(id)
  if info and info.type==4 and info.subType>=0 and info.subType<6 then
   local group=groups[info.subType]
   if not group then local names={'枪口','握把','瞄准镜','弹匣','枪托','其他配件'};group={label=names[info.subType+1],kind='accessory',index=info.subType,items={}};groups[info.subType]=group end
   group.items[#group.items+1]={id=id,label=info.name}
  end
 end
 local ordered={}
 for i=0,5 do if groups[i] then ordered[#ordered+1]=groups[i] end end
 return ordered
end
function R.categoryList()
 local cats={{label='地图 / 场景',kind='map'},{label='本地枪械',kind='weapon'}}
 if R.appearanceCategories then for _,cat in ipairs(R.appearanceCategories()) do cats[#cats+1]=cat end end
 if R.canResume then
  cats[#cats+1]={label='开局装备 / 选择出生位置',kind='deployment'}
  cats[#cats+1]={label='移动装备 / 展开与收起',kind='mobility'}
  for _,group in ipairs(R.accessoryGroups()) do cats[#cats+1]=group end
  cats[#cats+1]={label='备用弹药 / 补给',kind='ammo'}
  cats[#cats+1]={label='医疗补给 / 治疗',kind='medicine'}
  cats[#cats+1]={label='投掷物 / 手榴弹 / 烟雾弹 / 闪光弹',kind='throwable'}
  cats[#cats+1]={label='载具 / 驾驶',kind='vehicle'}
  cats[#cats+1]={label='天气 / 环境',kind='weather'}
  cats[#cats+1]={label='地面交互 / 拾取',kind='interact'}
  cats[#cats+1]={label='地图选点复活',kind='respawn'}
 end
 return cats
end
function R.close()
 if not R.canResume then return end
 R.opened=false
 qs.UISetAllPanelsVisible(false)
 R.command('resume')
end
-- Native gameplay panels are outside the Lua panel registry. Hiding all panels
-- for the menu must be paired with restoring the complete gameplay HUD.
R.nativeHUD={'QSUICrosshairPanel','QSUIHealthBarPanel','EuHUDMinimapPanel','QSUIKillSurvivePanel','QSUICalibrationPanel','EuHUDTeamPanel','EuHUDNameBoardIconPanel','EuHUDPingSignalPanel','QSUIWeatherNotifyPanel'}
function R.restoreHUD()
 for _,name in ipairs(R.nativeHUD) do UIShowWindow(name,true) end
 for _,name in ipairs({'EuCurWeaponPanel','EuHUDArmorPanel','EuHUDWeaponSwitchPanel','EuHUDMedicinePanel','HudAbilityPanel','HudItemAbilityPanel','ShortcutHintPanel'}) do qs.UISetVisible(name,true) end
 R.updateMatchHUD(R.matchHUD or {alive=1,kills=0,riding=false})
 R.showPrompt()
end
function R.updateMatchHUD(value)
 R.matchHUD=value
 if not R.canResume or R.opened or R.picking then return end
 UICall('QSUIKillSurvivePanel','SetSurviveNumber',value.alive)
 UICall('QSUIKillSurvivePanel','SetKillNumber',value.kills)
 UIShowWindow('EuHUDVehiclePanel',value.riding)
 R.updateSoloTeamHUD(value)
end
-- The native team updater only initializes groups with at least two members.
-- A solo world otherwise leaves the movie's authored slot/health timelines
-- playing. Its real SetNames entry stops those timelines and hides unused rows.
function R.updateSoloTeamHUD(value)
 local health=value.health or (R.consumables or {}).health
 if type(health)~='table' or not tonumber(health.max) or health.max<=0 then return false end
 local ok,name=pcall(qs.GetMainPlayerName)
 name=ok and type(name)=='string' and name~='' and name or 'LocalPlayer'
 name=name:gsub('&','&amp;'):gsub('<','&lt;'):gsub('>','&gt;')
 local hp=math.max(0,math.min(1,(tonumber(health.hp) or 0)/health.max))
 local state=hp<=0 and 'Dead' or value.riding and 'LandVehicle' or 'Normal'
 local row={name=name,rankIconId=0,healthPercent=hp,healthPercentDying=0,
  stateName=state,voiceState=0,fuel=0,energy=0,ShowCountDown=false,CountDown=''}
 local _,accepted=QSUICall('EuHUDTeamPanel','Cpp2As_SetNames',{row},false)
 R.soloTeamHUD={name=name,count=1,hp=hp,state=state,accepted=accepted==true}
 return accepted==true
end
function R.pick()
  if not R.canResume then return end
  R.rememberBackpack(R.currentMap,R.abilityId)
  R.opened=false
  R.picking=true
  qs.UISetAllPanelsVisible(false)
  Logic.UICore.LoadPanel('EuUIStartPointPanel')
  UIShowWindow('EuUIStartPointPanel',true)
  R.pickNamesReady=false
  R.pickMouseReady=false
  R.pickEquipReady=false
  R.kitPanelReady=false
  -- Native map initialization must finish before enabling the AS click gates.
  R.command('pick')
 end
function R.tickPicker()
  if not R.picking then return false end
  -- The original movie gates clicks with allowPickPoint AND allowMouse.
  -- InitMapEnable alone only sets the second gate. StartCountDown initializes
  -- teammate layout and enables the first through its real public method.
  -- A fresh movie may not be ready on the frame that opens it. Retry only the
  -- unfinished step, so successful teammate initialization is never duplicated.
  if not R.pickNamesReady then
   local _,ok=QSUICall('EuUIStartPointPanel','Cpp2As_StartCountDown',{'LocalPlayer'},0)
   R.pickNamesReady=ok==true
  end
  if R.pickNamesReady and not R.pickMouseReady then
   local _,ok=QSUICall('EuUIStartPointPanel','Cpp2As_InitMapEnable',true)
   R.pickMouseReady=ok==true
  end
  if R.pickNamesReady and not R.pickEquipReady then
   local selected=nil
   for _,c in ipairs(R.backpackChoices()) do if c.id==R.abilityId then selected=c end end
   if selected then
    local _,ok=QSUICall('EuUIStartPointPanel','Cpp2As_UpdateInitEquip',0,selected.icon,'ICON_ability_Empty')
    R.pickEquipReady=ok==true
   end
   QSUICall('EuUIStartPointPanel','Cpp2As_InitInstruction','点击地图选择地面出生位置；Esc 返回开局装备菜单')
  end
  return R.pickNamesReady and R.pickMouseReady
end
function R.showDeployment()
 R.categoryIndex=0;R.itemIndex=0
 for i,c in ipairs(R.categoryList()) do if c.kind=='deployment' then R.categoryIndex=i-1 end end
 R.show()
end
function R.clearPreparationCover()
 if R.preparationCover then
  R.preparationCover:Call('clear')
  R.preparationCover=nil
 end
end
function R.preparingSpawn()
 R.opened=false;R.picking=false;R.preparing=true
 qs.UISetAllPanelsVisible(false)
 local p=UIFindPanel('RoomSettingPanel')
 if not p then Logic.UICore.LoadPanel('RoomSettingPanel');p=UIFindPanel('RoomSettingPanel') end
 assert(p,'Spawn preparation panel is missing')
 local graphics=p.This:GetChild('mc.graphics')
 graphics:Call('clear');graphics:Call('beginFill',0x0c121b,1)
 graphics:Call('drawRect',-16384,-16384,32768,32768);graphics:Call('endFill')
 graphics:SetVisible(true)
 R.preparationCover=graphics
 -- This SWIG wrapper exposes SetVisible/SetVariable, not Lua property
 -- assignment: `obj.visible=false` raises instead of changing the display.
 for _,child in ipairs({'settingList','mapImg','btnApply','btnCancel','closeBtn','lockButton'}) do
  pcall(function() p.This.mc[child]:SetVisible(false) end)
 end
 UIShowWindow('RoomSettingPanel',true)
end
function R.beginSpawnTransition()
 -- Keep the original full-screen start-point map on screen while the native
 -- capsule falls to terrain. Hiding the panels here exposed the sky and made
 -- the drop visible; the map is the transition cover.
 R.opened=false;R.picking=false;R.preparing=true
 QSUICall('EuUIStartPointPanel','Cpp2As_SetCountdown',0)
 QSUICall('EuUIStartPointPanel','Cpp2As_InitInstruction','正在部署到所选位置…')
 UIShowWindow('EuUIStartPointPanel',true)
end

function R.show()
 -- The spawn transition raises R.preparing and only the landing callback clears it.
 -- If that callback never runs the flag stays raised forever, which silently blocks
 -- this menu and the Esc handler, so the whole UI becomes unusable. Count attempts
 -- and release a stale flag rather than locking the player out.
 if R.preparing then
  R.preparingAttempts=(R.preparingAttempts or 0)+1
  if R.preparingAttempts<3 then return end
  R.preparing=false
  R.preparingAttempts=0
 end
 R.preparingAttempts=0
 R.clearPreparationCover()
 R.bagMode=false
 if R.picking then R.picking=false end
 qs.UISetAllPanelsVisible(false)
 Logic.UICore.LoadPanel('RoomSettingPanel')
 UIShowWindow('RoomSettingPanel',true)
 local p=UIFindPanel('RoomSettingPanel')
 p.This.mc.settingList.visible=true;p.This.mc.mapImg.visible=true;p.This.mc.btnApply.visible=true
 local handlers=p.Handlers
 local building=true
 local pending=nil
 -- Old handlers capture the previous panel state. Disconnect before setters can
 -- emit indexChange while a reopened menu is being populated.
 for _,name in ipairs({'mapDropdown','viewDropdown','teamDropdown'}) do
  handlers['RoomSettingPanel.mc.settingList.'..name..'.dropdown.indexChange']=function() end
 end
 p.RoomTitleText.text=R.canResume and '本地跑图 · 角色 / 衣柜 / 武器 / 载具' or '无限法则 · 本地大厅'
 p.RoomNameInput.editable=false
 p.This.mc.settingList.maxActorSlider.visible=false
 p.This.mc.lockButton.visible=false
 p.This.mc.btnCancel.visible=R.canResume
 p.This.mc.btnCancel.label='关闭菜单'
 p.This.mc.closeBtn.visible=R.canResume
 R.categories=R.categoryList()
 local categories={}
 for i,c in ipairs(R.categories) do categories[i]={label=c.label,type=i} end
 p.MapDropdown.listData=categories
 -- The category list grows with the accessory groups, so it must never open at its
 -- full height: rows past the panel edge are unreachable, which makes the trailing
 -- 载具 / 天气 entries impossible to select. Keep a scrollable window instead.
 p.MapDropdown.menuRowCount=math.max(math.min(#categories,8),1)
 p.MapDropdown.selectedIndex=math.min(R.categoryIndex or 0,#categories-1)
 p.This.mc.settingList.mapDropdown.titleTextField.text='功能分类'
 p.This.mc.settingList.viewDropdown.titleTextField.text='项目'
 p.This.mc.settingList.teamDropdown.titleTextField.text='参数'
 local function current() return R.categories[(p.MapDropdown.selectedIndex or 0)+1] or R.categories[1] end
 local parameterKind=nil
 local parameterData={}
 local function previewMap()
  return (R.maps[math.min((p.ViewDropdown.selectedIndex or 0)+1,#R.maps)] or R.maps[1]).id
 end
 local function parameterRows(kind,mapId)
  local signature=kind..':'..tostring(mapId or '')
  if parameterKind==signature then return end
  parameterKind=signature
  local rows=kind=='deployment' and R.spawnRegions
   or kind=='map' and R.backpackChoices(mapId)
   or kind=='vehicle' and {{label='1 台',type=1},{label='2 台',type=2},{label='3 台',type=3},{label='4 台',type=4},{label='8 台',type=8}}
   or kind=='throwable' and {{label='装备，左键高抛 / 右键轻抛',type=0},{label='直接高抛',type=1},{label='直接轻抛',type=2}}
   or {{label='1 · 主武器',type=1},{label='2 · 副武器',type=2},{label='3 · 手枪',type=3}}
  parameterData={}
  for i,row in ipairs(rows) do parameterData[i]={label=row.label,type=row.type or row.id} end
  rows=parameterData
  p.TeamDropdown.listData=rows
  p.TeamDropdown.menuRowCount=math.max(math.min(#rows,8),1)
  local value=kind=='deployment' and R.spawnRegion or kind=='map' and R.backpackId(mapId) or kind=='vehicle' and (R.vehicleCount or 1) or kind=='throwable' and (R.throwAction or 0) or (R.weaponSlot or 1)
  local selected=0
  for i,row in ipairs(rows) do if row.type==value then selected=i-1 end end
  p.TeamDropdown.selectedIndex=selected
 end
 local function selectionDetails(category)
  if category.kind=='map' then
   local m=R.maps[math.min((p.ViewDropdown.selectedIndex or 0)+1,#R.maps)]
   parameterRows('map',m.id)
   p.RoomMap:Call('Load','../Imagesets/UI/Lobby/'..m.image,true)
   p.RoomNameInput.text='先选地图和开局装备，加载后选择出生位置；不会直接从高空交还控制。'
  elseif category.kind=='mobility' then
   local state=R.adventureState or {};local selected=state.selected or {}
   p.RoomNameInput.text='当前：'..tostring(selected.label or '未选择')..' · '..tostring(selected.help or '')
  elseif category.kind=='deployment' then
   local selected=R.menuItems[(p.ViewDropdown.selectedIndex or 0)+1]
   p.RoomNameInput.text=(selected and selected.help or '选择本地图开局背包和出生区域')..' · 地面准备完成后进入'
  elseif category.kind=='respawn' then
   p.RoomNameInput.text='可打开地图点击位置，也可直接选择九宫格区域；定位地面期间显示准备界面。'
  elseif category.kind=='medicine' then
   local h=(R.consumables or {}).health or {}
   p.RoomNameInput.text=string.format('生命 %s/%s · 绷带/医疗包/医疗箱：9/8/7 使用 · 饮料4秒，持续回血 · 移动或F取消',tostring(h.hp or '?'),tostring(h.max or '?'))
  elseif category.kind=='throwable' then
   p.RoomNameInput.text='5 取出上次选择的投掷物 · 左键高抛 / 右键轻抛 · 1/2/3 返回枪械'
  elseif category.kind=='vehicle' then
   p.RoomNameInput.text=string.format('共 %d 种可召唤载具 · 陆地选平地，船只选水面 · W/S 前进倒退 · F 下车',#(R.vehicles or {}))
  elseif category.kind=='weather' then
   p.RoomNameInput.text=string.format('当前天气编号 %s · 天气 %d 项 · 载具 %d 种',tostring(R.weather),#(R.weathers or {}),#(R.vehicles or {}))
  elseif category.kind=='character' or category.kind=='skin' then
   local id=(R.appearance or {}).skin_id or -1
   local current=QSConfig.AppearanceCfg.SuitId2InfoMap[id]
   local group=current and QSConfig.AppearanceCfg.GroupId2InfoMap[current.group]
   p.RoomNameInput.text='当前：'..(group and (group.name..' · '..current.name) or '普通角色')..' · 选中后应用并保存，下次启动继续使用'
  elseif category.kind=='outfit' then
   p.RoomNameInput.text='基础角色衣柜 · 单件穿搭会切回普通角色，并保留其他部位；专属角色服装请在「全部服装造型」中选择'
  else
   if category.kind=='weapon' then
    local selected=R.menuItems[(p.ViewDropdown.selectedIndex or 0)+1]
    local image=selected and R.weaponImage(selected.id)
    if image then
     p.RoomMap:Call('Load',image,true)
     R.weaponPreview={id=selected.id,image=image}
    end
   end
   local record=nil
   for _,v in ipairs((R.inventory or {}).slots or {}) do if v.slot==R.weaponSlot then record=v end end
   if record then
    local info=qs.GetItemInfo(record.id)
    p.RoomNameInput.text=string.format('%s · 弹匣 %d/%d · 备用 %d · R 换弹',info and info.name or tostring(record.id),record.ammo,record.capacity,record.reserve)
   elseif category.kind=='weapon' then p.RoomNameInput.text='所选槽位为空；选中一把枪后点「装备到所选槽位」。'
   else p.RoomNameInput.text='左键开火 · R 换弹 · 1/2/3 切枪 · F 交互 · Esc 关闭菜单' end
  end
 end
 local function refresh()
  building=true
  local category=current()
  R.categoryIndex=p.MapDropdown.selectedIndex or 0
  if category.kind~='map' then parameterRows((category.kind=='vehicle' or category.kind=='throwable' or category.kind=='deployment') and category.kind or 'weapon') end
  local parameter=parameterData[(p.TeamDropdown.selectedIndex or 0)+1]
  if category.kind=='deployment' then R.spawnRegion=parameter and parameter.type or -1
  elseif category.kind=='map' then -- selectionDetails builds the target map's backpack list below.
  elseif category.kind=='vehicle' then R.vehicleCount=parameter and parameter.type or 1
  elseif category.kind=='throwable' then R.throwAction=parameter and parameter.type or 0
  else R.weaponSlot=parameter and parameter.type or 1 end
  p.This.mc.settingList.teamDropdown.visible=(category.kind=='weapon' or category.kind=='accessory' or category.kind=='vehicle' or category.kind=='throwable' or category.kind=='map' or category.kind=='deployment')
  p.This.mc.settingList.teamDropdown.titleTextField.text=category.kind=='deployment' and '出生位置' or category.kind=='map' and '开局装备' or '参数'
  p.This.mc.settingList.viewDropdown.visible=true
  R.menuItems={}
  if category.kind=='map' then
   for i,m in ipairs(R.maps) do R.menuItems[i]={id=m.id,label=m.label,index=i-1} end
   p.This.mc.btnApply.label='加载地图，选择出生位置'
  elseif category.kind=='deployment' then
   for i,c in ipairs(R.backpackChoices()) do R.menuItems[i]={id=c.id,label=c.label,help=c.help,index=i-1} end
   for i,c in ipairs(R.menuItems) do if c.id==R.backpackId() then R.itemIndex=i-1 end end
   p.This.mc.btnApply.label='确认装备，选择出生位置'
  elseif category.kind=='mobility' then
   R.menuItems={}
   if ((R.adventureState or {}).selected or {}).key then R.menuItems={{id=-1,label='展开 / 收起当前移动装备',index=-1},{id=-2,label='收起当前移动装备',index=-1}} end
   for _,c in ipairs(R.backpackChoices()) do R.menuItems[#R.menuItems+1]={id=c.id,label='改用：'..c.label,index=-1} end
   p.This.mc.btnApply.label='执行所选移动装备操作'
  elseif category.kind=='weapon' then
   local equipped={}
   for _,v in ipairs((R.inventory or {}).slots or {}) do equipped[v.id]=v end
   for i,weapon in ipairs(R.weapons) do
    local live=equipped[weapon.id]
    R.menuItems[i]={id=weapon.id,label=weapon.label..(live and string.format('  [%d号位 %d/%d]',live.slot,live.ammo,live.capacity) or ''),index=i-1}
   end
   p.This.mc.btnApply.label='装备到所选槽位'
  elseif category.kind=='character' or category.kind=='skin' or category.kind=='outfit' then
   local equipped={};for _,id in ipairs((R.appearance or {}).items or {}) do equipped[id]=true end
   for i,item in ipairs(category.items) do
    local selected=category.kind=='outfit' and equipped[item.id] or category.kind~='outfit' and item.id==((R.appearance or {}).skin_id or -1)
    R.menuItems[i]={id=item.id,label=item.label..(selected and '  [已选择]' or ''),index=category.index or -1}
   end
   p.This.mc.btnApply.label=category.kind=='outfit' and '穿上 / 脱下并保存' or '应用角色 / 造型并保存'
  elseif category.kind=='accessory' then
   R.menuItems[1]={id=0,label='恢复默认配件',index=0}
   for _,item in ipairs(category.items) do
    local ok,compatible=pcall(qs.CanWeaponInstallAccessory,R.weaponSlot,item.id,true)
    if ok and compatible then R.menuItems[#R.menuItems+1]={id=item.id,label=item.label,index=category.index} end
   end
   p.This.mc.btnApply.label='安装 / 拆下'
  elseif category.kind=='ammo' then
   for id=30001,30008 do local info=qs.GetItemInfo(id)
    if info then R.menuItems[#R.menuItems+1]={id=id,label=info.name..' × '..tostring(((R.inventory or {}).reserve or {})[tostring(id)] or 0),index=-1} end end
   p.This.mc.btnApply.label='备用弹药补给至 600'
  elseif category.kind=='medicine' or category.kind=='throwable' then
   local ids=category.kind=='medicine' and {70001,70002,70003,70004} or {50001,50002,50003}
   for _,id in ipairs(ids) do local info=qs.GetItemInfo(id)
    R.menuItems[#R.menuItems+1]={id=id,label=(info and info.name or tostring(id))..' × '..tostring(((R.consumables or {}).items or {})[tostring(id)] or 0),index=-1}
   end
   R.menuItems[#R.menuItems+1]={id=-10,label='补齐医疗和投掷物',index=-1}
   if category.kind=='medicine' then R.menuItems[#R.menuItems+1]={id=-11,label='取消当前治疗',index=-1} end
   p.This.mc.btnApply.label=category.kind=='medicine' and '使用所选药品（移动 / 受伤 / F 取消）' or '按所选方式装备 / 投掷'
  elseif category.kind=='vehicle' then
   for _,v in ipairs(R.vehicles or {}) do
    R.menuItems[#R.menuItems+1]={id=v.id,label=(v.kind_label or '载具')..' · '..(v.label or tostring(v.id)),index=-1,count=1}
   end
   R.menuItems[#R.menuItems+1]={id=-1,label='重新驾驶最近召唤的载具',index=-1}
   R.menuItems[#R.menuItems+1]={id=-2,label='下车',index=-1}
   R.menuItems[#R.menuItems+1]={id=-3,label='驾驶离我最近的载具',index=-1}
   p.This.mc.btnApply.label='召唤所选载具（参数=台数）'
  elseif category.kind=='weather' then
   for _,w in ipairs(R.weatherPresets or {}) do R.menuItems[#R.menuItems+1]={id=w.weather,label='预设 · '..w.label,index=-1} end
   for _,w in ipairs(R.weathers or {}) do R.menuItems[#R.menuItems+1]={id=w.id,label='['..tostring(w.id)..'] '..w.label,index=-1} end
   p.This.mc.btnApply.label='切换到所选天气'
  elseif category.kind=='interact' then
   R.menuItems={
    {id=-1,label='脚边生成补给（步枪 / 瞄具 / 弹药；暂不显示模型）',index=-1,count=1},
    {id=-2,label='立即执行一次交互（等价于按 F）',index=-1},
    {id=-3,label='清空本地图的本地拾取点',index=-1},
    {id=10201,label='掉落 M4A1',index=-1,count=1},
    {id=20001,label='掉落 USP45',index=-1,count=1},
    {id=40303,label='掉落 瞄准镜',index=-1,count=1},
    {id=30001,label='掉落 5.56 弹药',index=-1,count=30},
    {id=30003,label='掉落 9mm 弹药',index=-1,count=30},
    {id=70001,label='生成 绷带 ×3',index=-1,count=3},
    {id=70002,label='生成 医疗包',index=-1,count=1},
    {id=70003,label='生成 医疗箱',index=-1,count=1},
    {id=70004,label='生成 能量饮料',index=-1,count=1},
    {id=50001,label='生成 手榴弹',index=-1,count=1},
    {id=50002,label='生成 烟雾弹',index=-1,count=1},
    {id=50003,label='生成 闪光弹',index=-1,count=1}}
   p.This.mc.btnApply.label='生成拾取点（看屏幕提示，按 F 拾取）'
  else
   for i,c in ipairs(R.spawnRegions) do R.menuItems[i]={id=c.id,label=c.label,index=i-1} end
   p.This.mc.btnApply.label='在所选位置出生'
  end
  local rows={}
  for i,item in ipairs(R.menuItems) do rows[i]={label=item.label,type=item.id} end
  p.ViewDropdown.listData=rows
  p.ViewDropdown.menuRowCount=math.max(math.min(#rows,10),1)
  p.ViewDropdown.selectedIndex=math.min(R.itemIndex or 0,math.max(#rows-1,0))
  R.itemIndex=p.ViewDropdown.selectedIndex
  selectionDetails(category)
  building=false
 end
 -- GFx is still dispatching indexChange here. Never replace listData or call
 -- display methods from that callback; drain one coalesced update next frame.
 handlers['RoomSettingPanel.mc.settingList.mapDropdown.dropdown.indexChange']=function()
  if not building then pending={kind='category',index=p.MapDropdown.selectedIndex or 0} end
 end
 handlers['RoomSettingPanel.mc.settingList.viewDropdown.dropdown.indexChange']=function()
  if not building and not (pending and pending.kind=='category') then pending={kind='item',index=p.ViewDropdown.selectedIndex or 0} end
 end
 handlers['RoomSettingPanel.mc.settingList.teamDropdown.dropdown.indexChange']=function()
  if not building and not (pending and pending.kind=='category') then pending={kind='parameter',index=p.TeamDropdown.selectedIndex or 0} end
 end
 R.refreshMenuStatus=function()if R.opened and not building then selectionDetails(current()) end end
 R.tickMenu=function()
  if not R.opened or building or not pending then return end
  local change=pending;pending=nil
  if change.kind=='category' then
   R.categoryIndex=change.index;R.itemIndex=0;refresh()
  elseif change.kind=='item' then
   R.itemIndex=change.index;building=true;selectionDetails(current());building=false
  else
   local row=parameterData[change.index+1];local category=current()
   if row then
    if category.kind=='deployment' then R.spawnRegion=row.type
    elseif category.kind=='map' then R.rememberBackpack(previewMap(),row.type)
    elseif category.kind=='vehicle' then R.vehicleCount=row.type
    elseif category.kind=='throwable' then R.throwAction=row.type
    else R.weaponSlot=row.type end
   end
   if category.kind=='accessory' then refresh() else selectionDetails(category) end
  end
 end
 handlers['RoomSettingPanel.mc.btnApply.buttonClick']=function()
  if building or pending then return end
  local category=current()
  local item=R.menuItems[(p.ViewDropdown.selectedIndex or 0)+1]
  if not item then return end
  if R.canResume and (category.kind=='character' or category.kind=='skin' or category.kind=='outfit') then
   if qs.IsLookAtPlayerBmxActive() or qs.IsLookAtPlayerSkiActive() or qs.IsLookAtPlayerGliderActive() then
    p.RoomNameInput.text='请先收起移动装备并下车，再更换角色或衣服。';return
   end
  end
  R.itemId=item.id;R.removeSlot=(category.kind=='accessory' or category.kind=='outfit') and category.index or -1
  if not R.canResume then
   if category.kind~='map' then
    -- Before a map is loaded, only remember the preference; entering a map is
    -- the map category's job.
    if category.kind=='weapon' then R.weaponId=item.id end
    if category.kind=='character' or category.kind=='skin' then R.command('appearance_skin')
    elseif category.kind=='outfit' then R.command('appearance_clothing') end
    refresh()
    return
   end
   R.opened=false
   qs.UISetAllPanelsVisible(false)
   R.command('enter',(R.maps[item.index+1] or R.maps[1]).id)
   return
  end
  if category.kind=='map' then
   if item.id==R.currentMap then R.command('deploy') return end
   R.opened=false;R.canResume=false
   qs.UISetAllPanelsVisible(false)
   R.command('enter',item.id)
  elseif category.kind=='deployment' then R.rememberBackpack(R.currentMap,item.id);R.command('deploy')
  elseif category.kind=='mobility' then
   if item.id==-1 then R.command('adventure_use')
   elseif item.id==-2 then R.command('adventure_fold')
   else R.rememberBackpack(R.currentMap,item.id);R.command('adventure_kit') end
  elseif category.kind=='weapon' then R.command('bag_weapon')
  elseif category.kind=='character' or category.kind=='skin' then R.command('appearance_skin')
  elseif category.kind=='outfit' then R.command('appearance_clothing')
  elseif category.kind=='accessory' then R.command('accessory')
  elseif category.kind=='ammo' then R.command('supply')
  elseif category.kind=='medicine' or category.kind=='throwable' then
   if item.id==-10 then R.command('consumable_supply')
   elseif item.id==-11 then R.command('medicine_cancel')
   elseif category.kind=='medicine' then R.command('medicine')
   elseif (R.throwAction or 0)==0 then R.command('throwable_equip')
   else R.command(R.throwAction==2 and 'throwable_low' or 'throwable_throw') end
  elseif category.kind=='vehicle' then
   R.itemCount=R.vehicleCount or 1
   R.command(item.id==-2 and 'vehicle_leave' or item.id==-1 and 'vehicle_board' or item.id==-3 and 'vehicle_nearest' or 'vehicle_spawn')
  elseif category.kind=='weather' then R.weatherId=item.id;R.command('weather')
  elseif category.kind=='interact' then
   if item.id==-1 then R.command('loot_kit')
   elseif item.id==-2 then R.command('interact')
   elseif item.id==-3 then R.command('loot_clear')
   else R.itemId=item.id;R.itemCount=item.count or 1;R.command('loot_drop') end
  else R.spawnRegion=item.id;R.command('deploy') end
 end
 handlers['RoomSettingPanel.mc.btnCancel.buttonClick']=R.close
 handlers['RoomSettingPanel.mc.closeBtn.buttonClick']=R.close
 R.opened=true
 refresh()
 R.command('menu')
end
-- Tab and the old menu button still land here; the map menu already carries every
-- bag category, so this only remembers that the caller came from the inventory.
function R.showBag()
 R.show()
 R.bagMode=true
 local p=UIFindPanel('RoomSettingPanel')
 p.RoomTitleText.text='本地背包 · 武器 / 配件 / 载具 / 天气'
 p.This.mc.btnCancel.label='返回地图菜单'
end
function R.ready(mapId)
 R.currentMap=mapId
 R.canResume=true
 R.opened=false
 R.picking=false
end
-- Local weapons live outside the server inventory, so the native HUD finds no
-- reserve ammunition and hides itself. Feed it our own numbers.
R.hudReserve=R.hudReserve or {}
if not R.originalAmmoInBag then R.originalAmmoInBag=qs.GetInventoryWeaponAmmoInBag end
qs.GetInventoryWeaponAmmoInBag=function(itemId)
 local value=R.hudReserve[tostring(itemId)]
 if value~=nil then return value end
 return R.originalAmmoInBag(itemId)
end
function R.applyHUD()
 local panel=UIFindPanel('EuCurWeaponPanel')
 if not panel then return end
 qs.UISetVisible('EuCurWeaponPanel',true)
 if panel.UpdateData then pcall(panel.UpdateData) end
 R.restoreWeaponPicture()
end
-- The HUD weapon picture is an image set inside EuHUDWeaponPictures.swf keyed by
-- item id, and every selectable firearm in this build has an entry. Keep the
-- native name: swapping in the 96 px item icon renders as a white sliver because
-- the loader is laid out for the wide atlas picture.
function R.restoreWeaponPicture()
 local panel=UIFindPanel('EuCurWeaponPanel')
 if not panel then return end
 pcall(function()
  local info=qs.GetInventoryInfo(qs.IST_EQUIP,qs.GetCurrentWeaponSlot(),false)
  local id=info and info.itemInfo and info.itemInfo.id
  if not id then return end
  local asset='@EuHUDWeaponPictures_'..id..'.png'
  local loader=panel.This.mc.gunMc.weaponContainer
  if loader.fileName~=asset then loader.fileName=asset end
 end)
end
function R.setHUDReserve(reserve)
 R.hudReserve={}
 if type(reserve)=='table' then for k,v in pairs(reserve) do R.hudReserve[tostring(k)]=v end end
 R.applyHUD()
end
function R.setConsumables(value)
 R.consumables=value
 local panel=UIFindPanel('EuHUDMedicinePanel')
 if R.canResume and not R.opened and not R.picking then
  if panel and panel.RefreshUI then pcall(panel.RefreshUI) end
  R.applyHUD()
 end
end
if not R.originalInventoryInfo then R.originalInventoryInfo=qs.GetInventoryInfo end
qs.GetInventoryInfo=function(kind,slot,observed)
 if not observed and slot==qs.WEAPON_THROW and (kind==qs.IST_EQUIP or kind==qs.IST_WEAPON) then
  local c=R.consumables
  if c and c.selected and ((c.items or {})[tostring(c.selected)] or 0)>0 then
   return {itemInfo=qs.GetItemInfo(c.selected),count=c.items[tostring(c.selected)]}
  end
 end
 return R.originalInventoryInfo(kind,slot,observed)
end
if not R.originalEsc then R.originalEsc=QSConfig.Input.EscProcess end
QSConfig.Input.EscProcess=function()
 -- A raised R.preparing swallows Esc entirely, so a stuck spawn transition leaves no
 -- way back to the menu. Let the menu's own retry logic decide instead of returning
 -- silently here.
 if R.preparing then R.show();return end
 if R.picking then R.picking=false;R.showDeployment()
 elseif R.opened then R.close()
 else R.show() end
end
