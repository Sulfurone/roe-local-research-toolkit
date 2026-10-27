-- Local choices come from the shipped catalogue, including unowned entries.
-- Applying them changes the local actor/profile; no account request is sent.
local R=LocalRoam
function R.appearanceCategories()
 if not R.appearanceCatalogue then
  local catalogue={characters={{id=-1,label='普通角色 · 使用基础衣柜'}},skins={{id=-1,label='普通角色 · 使用基础衣柜'}},clothes={}}
  local groups=QSConfig.AppearanceCfg.GroupId2InfoMap
  for id,info in pairs(groups) do
   if type(id)=='number' and id>0 and info.defaultSuitId and QSConfig.AppearanceCfg.SuitId2InfoMap[info.defaultSuitId] then
    catalogue.characters[#catalogue.characters+1]={id=info.defaultSuitId,label=info.name,group=id}
   end
  end
  table.sort(catalogue.characters,function(a,b)return (a.group or -1)<(b.group or -1) end)
  for _,info in ipairs(QSConfig.AppearanceCfg.SuitTable) do
   local group=groups[info.group]
   if group and info.id and info.id>0 then catalogue.skins[#catalogue.skins+1]={id=info.id,label=group.name..' · '..info.name,group=info.group} end
  end
  table.sort(catalogue.skins,function(a,b)return (a.group or -1)==(b.group or -1) and a.id<b.id or (a.group or -1)<(b.group or -1) end)
  local allowed={[13]=true,[14]=true,[15]=true,[16]=true,[17]=true,[18]=true,[19]=true,[22]=true}
  for _,group in ipairs(qs.GetEuCharacterEquipTryOnSystem():GetClothesChestConfig()) do
   if allowed[group.ridOffSlot] then
    local cat={label='基础衣柜 / '..group.label,kind='outfit',index=group.ridOffSlot,items={{id=0,label='脱下此部位'}}}
    local seen={}
    for _,node in ipairs(group.nodes or {}) do for _,entry in ipairs(node.group or {}) do
     if entry.id and not seen[entry.id] then
      local info=qs.GetItemInfo(entry.id)
      if info then cat.items[#cat.items+1]={id=entry.id,label=info.name};seen[entry.id]=true end
     end
    end end
    catalogue.clothes[#catalogue.clothes+1]=cat
   end
  end
  R.appearanceCatalogue=catalogue
 end
 local cats={{label='角色 / 选择人物',kind='character',items=R.appearanceCatalogue.characters},
  {label='角色 / 全部服装造型',kind='skin',items=R.appearanceCatalogue.skins}}
 for _,cat in ipairs(R.appearanceCatalogue.clothes) do cats[#cats+1]=cat end
 return cats
end
