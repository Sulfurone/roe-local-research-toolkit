-- The shipped 2D start screen's original right-hand backpack cards.
local R=LocalRoam
local kitPanel='ChooseInventoryPanel'
function R.buildStartingCards(p)
 R.startTable=R.startTable or qs.GetInitItemTable()
 local rows={}
 R.startTemplateRefs={}
 for _,choice in ipairs(R.backpackChoices()) do
  if choice.id~=0 then
   local template=nil
   for i=0,R.startTable.m_vecMapInitType:size()-1 do
    local map=R.startTable.m_vecMapInitType[i]
    if map.iMapId==choice.template_map and map.m_vecInitEquipType:size()>0 then
     local list=map.m_vecInitEquipType[0].m_vecInitType
     R.startTemplateRefs[#R.startTemplateRefs+1]=map
     R.startTemplateRefs[#R.startTemplateRefs+1]=list
     for j=0,list:size()-1 do if list[j].iType==choice.template_type then template=list[j];break end end
    end
   end
   assert(template,'Original starting equipment template missing')
   R.startTemplateRefs[#R.startTemplateRefs+1]=template
   local names,icons,abilities,tags={},{},{},{}
   for j=0,template.vecInitItems:size()-1 do
    local item=template.vecInitItems[j]
    if item.bShow then
     local info=qs.GetItemInfo(item.iItem_id)
     if info then
      icons[#icons+1]={id=item.iType,animIconLoader={iconLoader={fileName='@'..info.package2D}}}
     end
    end
   end
   for j=0,template.vecAbility:size()-1 do
    local ability=template.vecAbility[j]
    if ability.bShow then abilities[#abilities+1]={id=ability.iType,animIconLoader={iconLoader={fileName='@'..c_str(ability.szIconPath)}}} end
   end
   for j=0,template.vecInitTypeTags:size()-1 do
    local tag=template.vecInitTypeTags[j]
    if tag.bShow then tags[#tags+1]={bagInfoTextMc={bagInfoText={text=c_str(tag.szTagName)}},animLabel='label'..tag.iTagValue} end
   end
   local iconData=deepcopy(p.SpecificIconData);iconData.itemData=icons
   local row={type=choice.id,iconMc={icon={fileName='@InitItem_'..choice.template_type..'.png'}},titleText={text=choice.label},
    animItemNameList={itemNameList={data=names}},animItemIconList={itemIconList={data=iconData}},
    animAbilityItemList={abilityItemList={data=abilities}},animBagInfoList={bagInfoList={data=tags}}}
   rows[#rows+1]=row
  end
 end
 return rows
end
function R.showStartingKitPanel()
 Logic.UICore.LoadPanel(kitPanel)
 local p=UIFindPanel(kitPanel)
 if not p then return false end
 local width=p.This.mc.animContent.content.width
 if type(width)~='number' or width<=0 then return false end
 if not R.kitPanelReady or R.kitPanelMap~=R.currentMap then
  local rows=R.buildStartingCards(p)
  p.InitType=0
  p.This.mouseEnabled=true;p.This.mouseChildren=true;p.This.mc.visible=true
  p.This.mc.animContent.content.mouseEnabled=true;p.This.mc.animContent.content.mouseChildren=true
  p.This.mc.animContent.content.data=rows
  local selected=0
  for i,row in ipairs(rows) do if row.type==R.abilityId then selected=i-1 end end
  p.This.mc.animContent.content.selectedIndex=selected
  p.This.mc.animContent.tipsMc.visible=false
  p.UpdateData=function() R.kitPanelReady=false end
  p.Handlers['ChooseInventoryPanel.mc.animContent.content.contItemClick']=function(_,params)
   if R.picking and not R.preparing and params and params.itemData then R.pendingAbilityId=params.itemData.type end
  end
  p.Handlers['ChooseInventoryPanel.mc.animContent.content.contItemRollOver']=function(_,params)
   if not params or not params.itemData then return end
   for i,choice in ipairs(R.backpackChoices()) do
    if choice.id==params.itemData.type then
     p.This.mc.animContent.tipsMc.visible=true
     p.This.mc.animContent.tipsMc.x=248;p.This.mc.animContent.tipsMc.y=49+(i-1)*265
     p.This.mc.animContent.tipsMc.titleText.htmlText=choice.label
     p.This.mc.animContent.tipsMc.contentText.htmlText=choice.help or ''
    end
   end
  end
  p.Handlers['ChooseInventoryPanel.mc.animContent.content.contItemRollOut']=function()p.This.mc.animContent.tipsMc.visible=false end
  R.kitPanelReady=true
  R.kitPanelMap=R.currentMap
 end
 qs.UISetVisible(kitPanel,true)
 return true
end
function R.tickDeployment()
 if not R.picking or R.preparing then return end
 if R.pendingAbilityId then
  local id=R.pendingAbilityId;R.pendingAbilityId=nil
  if not R.backpackAllowed(R.currentMap,id) then return end
  R.rememberBackpack(R.currentMap,id);R.abilityId=id;R.pickEquipReady=false;R.kitPanelReady=false
  R.command('starting_kit')
 end
 R.showStartingKitPanel()
end
