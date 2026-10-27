# 验收通过：用户确认钩爪可发射并拉拽（2026-10-26）

用户实际按 E 测试并明确回复「可以射出并拉过去」。本项完成，local_grapple.js已随主bundle加载。当前956会话继续保留，临时只读观察器通过observer.stop正常分离；不要为该项重复发射、传送或重启。细节见 [GRAPPLE_FIX_20261026.md](GRAPPLE_FIX_20261026.md)。

# 最新：钩爪零次数修复，原生发射与冷却已验证（2026-10-26）

见 [GRAPPLE_FIX_20261026.md](GRAPPLE_FIX_20261026.md)。用户报告准星出现但不发射，确认原生钩爪次数/冷却参数为0，按原版Steam UnitAttr补齐3次/10秒。新local_grapple.js已随主bundle加载。新会话956/12332/16700、exec40080，海岛钩爪出生。原生输入查询fixture验证0→1→2→4→0、3→2→3，完整墙面拉拽和真实E键待用户反馈。只读观察器exec92713，勿重复加载修复或传送用户。旧16796已于23:25正常退出。

# 最新：风洞与滑翔伞用户确认正常，继续钩锁（2026-10-25）

见 [WIND_GLIDER_FIX_20261025.md](WIND_GLIDER_FIX_20261025.md)。恢复海岛15/沙漠16处原生风洞点位并补缺失Tick，实际state38升空后转9，用户确认可以起飞。滑翔误报乘车已修正，已加载的伞模型补上渲染激活，用户确认「模型和提示都正常」。旧10140切沙漠后原生异常退出；新主会话16796/24812/20812、exec76728、run-20261025-wind-glider已完整加载所有修复，无独立热模块。当前用户反馈钩锁用不了，继续该项，勿重启或传送用户。

# 最新：海岛显示雪图小地图已热修复（2026-10-25）

见 [MINIMAP_FIX_20261025.md](MINIMAP_FIX_20261025.md)。实际场景/UI编号均为海岛10019，但小地图与大地图保留雪图Iceland.dds及坐标范围。原版初始化已热修复两者为Killzone_4096.dds，GFx真实Loader URL及isLoaded=true已验证。新增local_minimap.js自动按实际场景刷新底图/坐标范围，主启动已接入，转换等待与面板重置等模拟回归通过。当前小地图热模块exec45238、门修复exec97154保留至游戏退出；未主动切图/传送/重启，修复后的实际跨图自动刷新尚待用户自然切图观察。

# 最新：部署超时后的门交互回归已热修复（2026-10-25）

见 [DOOR_RECOVERY_20261025.md](DOOR_RECOVERY_20261025.md)。用户反馈门打不开，确认旧恢复流程在回滚后留下MatchActive=false；世界state4/人物正常但门确认被阻断。当前通过门模块原生就绪判定及请求观察热修复，无重启/传送，原生F已打开64840和64844。热修复exec97154必须保留至游戏退出；未来主bundle已修正门判定、失败回滚状态、挂索复位拒绝及倒计时取消。5种状态回归测试通过，新菜单保护尚未另行冷启，不再用部署测试干扰用户。

# 最新：滑索速度用户确认正常（2026-10-25）

见 [ZIPLINE_SPEED_VERIFIED_20261025.md](ZIPLINE_SPEED_VERIFIED_20261025.md)。补齐最小离线角色缺失的packed property59速度保护上限，值来自原版CharacterInfo.MaxSpeedProtection；新会话下滑state23实测约16.24米/秒。用户澄清滑索应由高处向低处使用，并明确「现在可以了」。已停止速度探针，保留当前源码与游戏，不再复位、重启或继续提速。当前run-20261025-zipline-speed，10140/11908/26540；复位测试曾与挂索冲突，注意新文档的测试副作用记录。

# 最新：登山背包滑索交互（2026-10-25）

见 [ZIPLINE_INTERACTION_20261025.md](ZIPLINE_INTERACTION_20261025.md)。已找到并补齐原版D8E0B0角色能力刷新：raw4=1而缓存0的问题已修复为缓存4，原版F滑索回调不再被拒绝。新增滑索提示，当前11740已热应用；在原版目标1310处实测状态0→22→24、TO_HANG_CLIMB及约5米上索位移，无坐标/状态强制写入。完整往返与中途离索尚未回归，当前角色已挂索，勿传送或重启。最终热模块exec68474，后续查文档避免重复加载。

# 最新：按地图区分背包（2026-10-25 18:40）

见 [MAP_BACKPACKS_20261025.md](MAP_BACKPACKS_20261025.md)。雪山卡片已改为滑翔/滑雪/登山（角色属性2/3/4），海岛为滑翔翼/自行车/钩爪（13/14/15）；地图分别保存选择，菜单预览、卡片和实际授予能力共用目录。已冷启到run-20261025-map-backpacks，实际登山属性与开局物品通过，用户已选点出生并操作。预览/配置验证通过，完整点击fixture因用户已出生而超时，不得称全套通过；完整登山/滑轮/钩爪交互仍待验证。当前勿重复打开界面、传送或重启。

# 最新：选点地图自己位置标记（2026-10-25 18:25）

见 [STARTPOINT_MARKERS_20261025.md](STARTPOINT_MARKERS_20261025.md)。用户已确认位置小点出现，并纠正自己应为黄点；最终自己黄点/敌人蓝方块源码已保存并热应用。真实点击两处位置与原版标记更新一一对应；当前单人敌人数据为0。当前游戏保持运行，勿重复运行传送/重启测试。

# 最新：替代枪声通过，开关门用户确认（2026-10-25 18:03）

先读 [SOUND_DOOR_VERIFIED_20261025.md](SOUND_DOOR_VERIFIED_20261025.md)。UZI→MP5、MSR→R700已冷启隔离枪声测试通过；新增原生F开关门，雪山1688扇可交互门，用户明确确认「现在开关门没有问题」。当前run-20261025-doors-clean保持运行，用户在操作，勿运行传送测试干扰。旧“未验证/未实现”段落已被本记录更新；梯子/钩锁未实现。

# 最新接续：UZI/MSR音频目标缺失（2026-10-25）

先读 [HANDOFF_20261025_SOUND_TARGETS.md](HANDOFF_20261025_SOUND_TARGETS.md)。已确认两枪事件引用的播放节点在本机全部银行中缺失，真实开火均使用音源3。用户选择暂用MP5/R700；local_audio.js替代代码已保存，**尚未冷启或验证声音**。用户物理Esc停止电脑操作，测试已停止。开关门未实现。

# 最新接续：武器图标 / UZI与MSR枪声 / 开关门（2026-10-25 16:20）

先读 [HANDOFF_20261025_ICONS_SOUND_DOOR.md](HANDOFF_20261025_ICONS_SOUND_DOOR.md)。上一轮 codex 的图标改动**当时未验证**，本轮验证结果：`@ICON268_*` 在本机安装里根本没有文件，背包预览的“?”由此而来，已改用 `@ICON96_*` 并冷启目视确认；HUD 枪械大图被 codex 换成 96px 图标后变成白条，现已改回原生 `@EuHUDWeaponPictures_<id>.png`（像素待用户确认）。UZI(10302)/MSR(10103) 无枪声已排除配置表问题，下一步是确认 `weapon.bnk` 的 HIRC Event 与运行时 PostEvent 的 object id。开关门/梯子/钩锁未开始，只有字符串与实体状态系统的只读线索。**游戏已退出，active-run.json 中 PID 全部失效。**

# 优先事项更新：Codex 代理连接（2026-10-25 12:17）

用户明确“重连五次”发生在 Codex 聊天。已备份并仅开启 ~/.codex/config.toml 的 features.respect_system_proxy；原生 doctor 对比从 WebSocket 15 秒超时变为 HTTP 101，保存配置后无临时参数复查也通过（2.141 秒）。当前桌面会话尚未重启，需完全退出并重开 Codex 后验收实际聊天。详细证据、备份路径和回退方法见 [CODEX_PROXY_FIX_20261025.md](CODEX_PROXY_FIX_20261025.md)。车辆行驶声音仍待继续；本轮未修改游戏代码。

# 最新：单人队伍面板与本地角色衣柜（2026-10-25）

先读 [HANDOFF_20261025_SOLO_APPEARANCE.md](HANDOFF_20261025_SOLO_APPEARANCE.md)。左上角已通过原版名单初始化只显示自己、编号固定 01，并同步真实血量；最终会话实际 GFx 连续 10/10 样本通过（含父面板可见、其余三行隐藏）。新增 Esc 菜单的角色/造型/基础衣柜，73 个角色分组、352 个造型、120 件服饰可本地选择并保存。四个角色换模、三把枪保留、真实菜单按钮命令、无效 ID 拒绝和玲的冷启动恢复已验证。最终用户又选择嘉文，保留其 skin_id=1。所有造型尚未逐一目视验收，截图仍超时。车辆声音仍无本轮修复结论，10 月 24 日隔离测试的证据更正也写入新文档第 7 节。

# 最新接续：玩家移动装备操作入口（2026-10-24）

先读 CURRENT_STATUS.md 顶部、BINDING_AND_KITS_VERIFIED_20261024.md，再读 [HANDOFF_20261024_PLAYER_CONTROLS.md](HANDOFF_20261024_PLAYER_CONTROLS.md)。新增菜单与原生按键接线已保存，但最新BMX持续展开回归修正尚未冷启；用户Esc停止Computer Use后已停止窗口输入。

# 最新交接：开局选点、右侧装备与出生动画（2026-10-24）

先读 [HANDOFF_20261024_STARTPOINT_ANIMATION.md](HANDOFF_20261024_STARTPOINT_ANIMATION.md)。**用户已确认“现在可以选了”，但仍从天上掉落，出生/选点动画没有完成。** 已找到原版右侧 ChooseInventoryPanel，新增 local_deployment.lua / local_adventure.js 接入三种装备与本地能力；最新完整界面、点击、展开和运动尚未验收。最后测试中的未验证 ready 硬门槛已从磁盘源码撤回，当前运行会话尚未重载，不能直接用旧会话判定最新源码。新文档记录了已知 Lua 错误、配置编号差异、运行证据、源码指纹和接手顺序；下方历史记录保留。

# 历史：投掷物引信校正与 50004 定性（2026-10-24 10:20）

见 [MEDICAL_THROWABLE_RESTORE.md](MEDICAL_THROWABLE_RESTORE.md) 文末：引信按客户端表改为 5/5/2.5 秒；50004 是 RPG-7 火箭弹（`TTYPE_ROCKET`），不是燃烧瓶，不加入手投白名单。冷启 `run-20261024-fuse-verified` 中 11/11 + 6/6 通过。下方 09:52 车辆音频交接仍然有效。

# 最新交接：载具声音实测与交互说明（2026-10-24 09:52）

先读 [HANDOFF_20261024_VEHICLE_AUDIO.md](HANDOFF_20261024_VEHICLE_AUDIO.md)。最新源码已冷启加载，101/105 两款吉普完成真实加速、发动机激活、转速、有效播放事件和游戏会话音频输出检查；105 下车重上后仅启动一次发动机，并捕获正常 Stop 事件，当前 trace 无 error 事件。**人工听感、其余车型、真实鼠标选点及 HUD 画面仍待验收。** 新文档包含玩家操作、启动方式、菜单命令接口、证据路径、当前会话快照和 hook 注意事项。下方“尚未冷启验证”的说法属于此前历史记录，以本条与新文档为准。

# 历史用户反馈：开局选点、HUD与开车声音（2026-10-24）

先读 [HUD_SPAWN_VEHICLE_AUDIO_20261024.md](HUD_SPAWN_VEHICLE_AUDIO_20261024.md)。用户反馈优先于旧46项内部检查。已查明AS点击还要求allowPickPoint（旧代码只开allowMouse），补原版StartCountDown初始化与加载重试；修复菜单close漏恢复原生小地图/人数/罗盘，单机人数如实显示1；上驾驶位补qs.StartEngine对应原生E4DC00通知。源码与Lua编译检查通过，公开AS调用/面板可见性诊断通过。**尚未重启加载新源并完成真实点击、HUD像素与行驶听感验收。用户Esc停止了Computer Use，本轮后续未再自动操作窗口。** 当前诊断会话见active-run.json，PID需重新核实。

# 最新：投掷动作、选点出生与菜单切换（2026-10-24 08:01）

先读 [SPAWN_THROW_SWITCH_FIX.md](SPAWN_THROW_SWITCH_FIX.md) 顶部最终交接。本轮完整角色武器切换/原生投掷动作链、开局自动选点/胶囊接触缓存、菜单切换重入和序号溢出已修正。全新会话 run-20261024-throw-spawn-verified 的46项检查全部通过，模块错误0。动画图接受第一/第三人称准备、持弹、甩臂、收手，选点实际落在目标坐标；像素画面因截图接口超时尚未目视确认。当前角色HP100、步行、主武器槽1、input_lock=0。证据与源文件SHA256见该会话 throw-spawn-verification.json；继续工作前核实 active-run.json 中进程是否存活。

# 最新交接：吉普轮胎（2026-10-23）

先读 [VEHICLE_WHEEL_FIX.md](VEHICLE_WHEEL_FIX.md)。101/105 的轮胎是独立部件，原模型已加载但绘制开关关闭；local_vehicles.js 已启用四轮原生绘制，并等待车身与轮胎共同 ready。冷启 wheel-fixed 会话 21 项检查全过，含两款吉普四轮及两轮上下车、109/201 回归；无载具或脚本错误。实际绘制实例证据已保存，屏幕像素尚未重新目视验收。

# 最新交接入口

**2026-10-23 20:00 后继续完善：见 [MEDICAL_THROWABLE_RESTORE.md](MEDICAL_THROWABLE_RESTORE.md) 顶部新增记录。** 保留能量饮料持续回血，补齐七种补给的菜单拾取入口，修正治疗与投掷冲突及菜单取消排队投掷。新会话和最终验证结果以该记录为准；不要把旧 active-run PID 当存活证据。

**2026-10-23 18:55 接续 codex：先读 [HANDOFF_FOR_CODEX_20261023.md](HANDOFF_FOR_CODEX_20261023.md)。** 车身渲染已修复（真实根因是网格代理绘制开关 `proxy+18C` bit12，原生入口 `97A7C0`）并经用户目视确认；同文档列出了本轮 qoder 会话已被推翻的"资产缺失/D80 卡死"结论、禁止运行的作废工具（`fix_skin_path.*`、`dismiss_error.ps1`、强写 D80/DFD）以及载具遗留项（205、103/104/108、逐车型目视、座椅坐姿像素证据）。当前前线为医疗与投掷物。

**2026-10-23 拾取 / 交互 HUD：先读 [PICKUP_RESTORE.md](PICKUP_RESTORE.md)。** 原版 F 提示已接入；拾取成功才清除，换图清理、兼容枪械配件选择、载具数量参数均已修正并完成真实会话测试。地面模型未恢复，旧“helper 存在”不是模型成功证据。最终 PID 见 active-run.json，勿使用下面历史 PID。

**2026-10-23 人物衣服恢复：见 [OUTFIT_RESTORE.md](OUTFIT_RESTORE.md)。** 原版上衣/裤子/鞋子独立存档，使用 CE6E00 在人物 ready、武器恢复前应用；不要把大厅 TryOn 预览当作地图人物换装。

**2026-10-23 车身显示修复：先读 [VEHICLE_RENDER_FIX.md](VEHICLE_RENDER_FIX.md)。** 用户确认车身可见；正式模块通过原生网格实体入口开启绘制，冷启动与上下车回归已验证。诊断时不要调用 747CB0 作为只读 getter（它会写渲染双缓冲）。

**2026-10-23 下午接续 qcoder：先读 [QCODER_CONTINUATION.md](QCODER_CONTINUATION.md)。** 已解开 SFC v3，确认吉普碰撞和网格数据存在；纠正构建分派解释。车身不可见未修复，不能沿用资产全部缺失/强推 D80 的方案。上午的代码与进程状态已过时。

**2026-10-23 09:42：接手先读 [VEHICLE_HANDOFF_20261023.md](VEHICLE_HANDOFF_20261023.md)。** 已定位 108 摩托车原生物理初始化空配置崩溃；生产代码尚缺物理表过滤，不能继续盲测 108。文档给出新进程、已通过/未通过项及接续顺序。

**2026-10-23：最新载具 / 天气工作见 [SYSTEMS_FIX_STATUS.md](SYSTEMS_FIX_STATUS.md)，并以 CURRENT_STATUS.md 最新段落为准。** 不要沿用旧载具文档中“只有物理、完全没有车身”的结论；本轮确认了真实 renderer 的读取路径，并纠正了上车车型字段、天气 native setter 和 F 下车目标刷新。

**2026-10-22 17:20：请先阅读 [CURRENT_STATUS.md](CURRENT_STATUS.md)。** 本轮修掉了「截图抛异常导致就绪链路中断、武器恢复从未执行」的严重缺陷，换弹/弹匣夹紧/换图恢复已在新进程上全部验证通过；真实键盘 R/Tab/1/2/3 仍需用户在窗口前台亲测。以下历史记录包含已被推翻的地址解释，不可直接照做。

---

# 当前进展（2026-10-22 16:02，工作中，优先阅读）

- 用户已亲自确认蹲/趴移动正常；保持 `character_roaming.js` 属性 10..29，不再投入姿态测试。
- 最新目标：验证多种枪械、完善本地背包/弹药/配件，尽量恢复原版操作。原版全部系统尚未完成，不得宣称已复原。
- 新生产模块 `local_weapons.js`，已由 `instrument_client.py --character-roaming` 加载；`local_menu.js` 武器动作改为调用该模块。菜单 Lua 增加 33 把枪及槽位，正在整合背包/配件。
- **旧文档中的 Init 两参数和 mount descriptor 结论错误**：D043F0(w, **完整 Man**, cfg+79C 动画ID, 唯一实例ID)，四参数。Man+150 是16字节场景UniqueID，不是偏移。weapon+58 接口虚表+28通过 w+78 UniqueID找Man，必须返回Man。
- 创建用 `FD1DF0(id,1)` 正确选择 QSRifle / QSShotgun / QSWeapon并复制原生 itemInfo；手工构造无注册对象容易被GC删掉。其创建对象仍须加入GC根。
- **GC根修复**：全局 `main+30528F0` 为原生 pointer vector（begin/end/cap），GC mark阶段48BD30访问它。将本地武器及w+E30配件向量中的对象加入。扩容函数472670(vec,end,&object)。root列表不要混入非对象。`485D10` 不是pin！曾误用把对象加入删除路径，已去掉。
- 武器构造不初始化 w+E80..E98；必须在Init前用 `D02E60(w,28字节参数)` 写入，+10 int速度=round(cfg+50 float)，+14 int弹匣=cfg+48。否则D07CA0最后从E94拷贝随机数到810，容量错误。
- 真正弹药 w+90，容量w+810；**E28不是弹匣容量**。虚表+1D8 SetAmmo，+1A8 GotoActive，+1A0 GotoInactive。D08CB0是配置加载，D07CA0是配件/参数重算，不是tick；真正tick虚表+18=D03D80，TickWhenActive D03E10。
- 有效测试 `weapon-matrix-results-8.jsonl`（游戏内部FIRE事件，不是OS键注入）：USP45 12→4/8次，M4A1 30→18/12次，MP5 30→19/11次，870 5→3/2次；700狙和沙鹰该轮0次，需要继续验证切枪、模型就绪、冷却。只是调用与扣弹证据，画面枪口、音效、弹道还需验证。
- 新模块已试着改用 FB3C30(holder,slot) 更新切枪（另保留GotoActive），尚未新进程验证；替换前GotoInactive旧枪。正在解决完整切枪及本地补弹。
- `D07B90(w,accessoryId,replace=true)` 是兼容检查，按w+50中158/178 vectors比较配件分类；配件 info+14 subtype 对应槽0..5。工厂FD1DF0配件后 `D07860(w,subtype,part)` 安装（内部FC6530绑模型），D07CA0重算。尚未接入/验证。
- `qs.CanWeaponInstallAccessory(slot,accessoryId,true)` 三参数，不是weaponId二参数。
- 测试会话weapons-6曾稳定运行数分钟后进程退出且没有新BugTrace（原因未确认），**PID66748已失效**。active-run仍旧，启动后须重新读PID。所有前面试验PID均不可复用。
- 请不要执行旧 `weapon_spawn.js`/`weapon_initialize_probe.js` 两参数或虚构descriptor路径；这些是失败历史实验。
- Computer Use已按26.1016.51333技能读取。sky.list_windows/get_window_state返回无accessibility，未再注入OS输入。用户在测试期间会打开菜单/选复活点；FIRE没反应先看input锁及当前菜单，不能只靠弹药没减推断武器坏。

--- 以下旧记录保留作历史，和以上冲突时以以上为准 ---

# 无限法则本地跑图：工作交接

更新时间：2026-10-22 13:40（Asia/Shanghai）。本文件在工作中更新，请先读当前状态，不要把早期研究笔记中的“已完成”当作本轮新功能已完成。

## 本轮（13:40）：刷枪链路已打通，武器能进槽位、能绑模型

### 结论（最重要）

**已实现：任意武器 → 造对象 → 装物品 ID → 绑网格到角色渲染实体 → 写入槽位哈希表 → 激活。**
`qs.GetCurrentWeaponSlot()` 返回目标槽位、`qs.IsWeaponActived()` 返回 true、`qs.GetCurWeaponShootType()` 底层虚函数返回 1（单发）。

**尚未验证：画面里是否真的看得见枪、左键是否真的打出子弹。** 需要用户亲眼确认（后台窗口下 `0xce4ab0` 截图接口报 `system error`，拿不到证据）。

### 完整刷枪调用链（全部是 RVA）

```
controller = 0xf69f70()                      // 本地玩家
holder     = [controller+0x130]              // 武器容器
man        = 0xcd5d00(owner())               // 与 controller 同一个对象

w = 0xd01bf0()                               // QSWeapon 构造，0x10c0 字节
0xd04580(w, stItemInfo)                      // SetInfo，内部 0x5cbb10 做 0x400 memcpy
0xfd2330(w, itemId)                          // ← 关键：写 w+0x28=id, +0x2c=type, +0x30=subType
0xd043f0(w, descriptor)                      // Init
0xd04610(w, descriptor)                      // 绑网格（Init 内部的前置判断会漏掉，要单独调）
0x4713c0(holder+0xb0, out, &key)             // 哈希表插入，key={int32 slot}
[out[0]+8] = w                               // 把槽位值改成自己的武器
[holder+0x220] = slot ; [holder+0x224] = 1   // 当前槽位 + 激活
```

### 两个必须踩对的坑

1. **`0xfd2330(w, itemId)` 不能省。** 不调它 `w+0x28 = -1`，`0xf683f0(-1)` 返回空，`0xd04610` 直接建不出模型（网格指针保持 0）。调完 `w+0x28=20001, w+0x2c=2, w+0x30=5`。
2. **`descriptor` 不是 Man 本身。**
   ```
   descriptor = 0x160 字节缓冲
   descriptor+0x28 = man              // → 写进 w+0x18（owner）
   descriptor+0x30 = [man+0x30]       // ← 必须是渲染实体，不是 man！
   descriptor+0x150..0x160 = 0        // → 写进 w+0x78（挂载偏移）
   ```
   把 `+0x30` 写成 man 本身时，`0xd04610` 仍返回 1，但 `w+0xdc8`/`w+0xdd0` 保持 0（假成功）。

### 武器运行时配置表（这是之前一直找不到的东西）

- **`0xf683f0(itemId)` → 配置指针**，按**物品 ID**索引，元素大小 **0xa08**。
- 数组位置：`manager = decode(owner表, 0x2d30, 0x2d34)`；`container = decode(manager, 0xb58, 0xb5c)`；元素数组在 `container+0x90`/`+0x98`。
- **当前共 44 条**，ID 分布：
  - 步枪/长枪：`10101–10108, 10110, 10111, 10201–10209, 10301–10307, 10401–10403`
  - 手枪：`20001, 20002, 20003, 20004, 20006`
  - 发射器/RPG：`10601–10606`
  - 近战：`60001`；投掷物：`50001–50004`
- 配置内：`+0x798` int（是否用 `Data_x64` 资源）、`+0x808` 起是资源名列表（`Data/Avatars/weapon/body/WP_long_011_mesh` 这种）、`+0x828`、`+0x9f4` bool。
- **之前“没有步枪”的结论是错的**：物品表只有手枪，但武器配置表步枪齐全。

### `0xd04610` 内部（挂载到底做了什么）

```
r14 = [descriptor+0x30]                      // 渲染实体
r15 = 0xf683f0([weapon+0x28])                // 配置
[weapon]vtable+0x230(weapon, &xform, r15)    // 用配置准备
node = [r14]vtable+0x518(r14, &xform)        // 建网格
[weapon+0xdc8] = node                        // mMesh（第三人称）
node 追加进 [r14+0x1168] 的网格链表
若 [r14]vtable+0x598 == 3:                   // 第一人称
    fppActor = [r14+0x1ab0]
    [weapon+0xdd0] = [fppActor]vtable+0x518(...)   // mFppMesh
[weapon+0xda8] = [config+0x19] ; [weapon+0xe28] = [config+0x1c]
[weapon]vtable+0x228(weapon, [weapon+0xead])
```
注意：**即使网格建失败，它也返回 1**，所以不能拿返回值判断成功，必须看 `weapon+0xdc8`。

### 开火现状

- `weapon vtable+0x1b0`（`0xd03d10`，是个 `jmp 0x3769cfa` 跳转桩）可以直接调用，**不会崩**，调用后 `weapon+0xdc0` 由 0 变 1（开火状态标志）。
- 但弹药字段没有变化，说明真正的射击在逐帧更新里，而更新没被触发。
- 实测 3 秒内 `0xfb38f0`（按槽位取武器）被调用 **2270 次**，说明主循环一直在查询这个槽位；但 `vtable+0x220`(0xd08cb0)、`vtable+0x228`(0xd09770) 对这把武器的调用次数都是 0。
- 下一步要查：武器是被谁 tick 的（`0xd8f4d0..0xd8f8e7` 那个函数 6 次调用 `0xfb38f0`，很可能是武器更新循环）。

### 本轮新增/更新的工具

- **`spawn_weapon.py ID [--slot N]`** —— 给运行中的会话刷枪，自动读 `active-run.json`、递增序号、写 `menu-command.json`。已实测：`spawn_weapon.py 10101 --slot 2` 和 `spawn_weapon.py 20001 --slot 3` 都返回 `local_menu_weapon_spawned`，`lookup_ok=true`，`mesh`/`fpp_mesh` 均非空。
- **`weapon_spawn.js`** —— 完整刷枪，读 `weapon-request.json`（`{"id":10101,"slot":2}`）执行整条链路并回报网格指针。
- **`weapon_fire.js`** —— 调用 `vtable+0x1b0` 并对比开火前后字段。
- **`probe_weapon_list.js`** —— 枚举 44 条武器配置（ID + 资源名）。
- **`probe_weapon_array2.js` / `probe_weapon_key.js`** —— 定位配置数组、验证 `0xf683f0(id)`。
- **`probe_weapon_tick.js`** —— 统计武器被主循环调用的次数。
- **`probe_holder_vtable.js` / `probe_weapon_mgr.js` / `probe_item_record.js`** —— 容器虚表、控制器内存、物品表原始布局。
- **`local_menu.js` 新增 `weapon` 动作**：往 `menu-command.json` 写
  `{"sequence":N,"action":"weapon","weapon_id":10101,"slot":2}` 即可刷枪（**改完必须新开一轮才生效**）。已在新会话 `run-20261022-131701` 验证通过。


### 可用的武器 ID 速查

| ID | 类型 |
| --- | --- |
| 10101–10111 | 长枪/步枪（WP_long_*） |
| 10201–10209 | 长枪/步枪 |
| 10301–10307 | 长枪/步枪 |
| 10401–10403 | 长枪/步枪 |
| 10601–10606 | 发射器/RPG |
| 20001 | USP45 手枪 |
| 20002 | Glock17 |
| 20003 | 沙漠之鹰 |
| 20004 | 燧发枪 |
| 20006 | 急救手枪 |
| 60001 | 近战（镐） |
| 50001–50004 | 投掷物 |

## 上一轮（12:50）：武器容器与槽位哈希表已完全定位

### 一句话结论

`QSWeapon` 能造、能 `SetInfo`、能 `Init`，但**装备是服务端驱动的**：客户端的 `EquipSlot`/`ActiveWeapon` 只是「查槽位 + 发网络包」，本地不会插入。要真正把枪挂上手，必须绕到容器层直接写入，或者补上服务端消息。

### 新解出的原生地址（都是 RVA）

| RVA | 签名 | 作用 |
| --- | --- | --- |
| `0xf69f70` | `LocalController* ()` | 取本地玩家控制器，**无参数** |
| — | `controller+0x130` | 武器容器（holder） |
| — | `holder+0x220` (int32) | 当前武器槽位（`GetCurrentWeaponSlot` 就读这里） |
| — | `holder+0x224` (uint8) | 是否激活（`IsWeaponActived` 读这里） |
| — | `holder+0xb0` | **`eastl::hash_map<int slot, QSWeapon*>`**：bucket 数组在 `+0xb8`，bucket 数在 `+0xc0` |
| `0xfb38f0` | `QSWeapon* (holder, int slot)` | 按槽位取武器；slot>9 直接返回空 |
| `0x4713c0` | `void (map, void* outIter, void* key)` | 引擎自己的 hash_map find-or-insert；`out[0]` 拿到 node 指针 |
| `0xfb10d0` | `int (manager, int containerType, int itemId, int param)` | **只读查找**：返回该物品所在槽位，找不到返回 -1 |
| `0xfd2250` | `ItemRecord* (int id)` | 物品表哈希查询（自带 owner 混淆解码） |
| `0xfd2330` | `void (out, int id)` | `out+0x28=id`，`out+0x2c=rec[0x10]`，`out+0x30=rec[0x14]` |
| `0x5cbb10` | `void (QSWeaponInfo*, const stItemInfo*)` | **纯 0x400 字节 memcpy** |
| `0xd01c50` | `void ()` | `QSWeapon` 反射成员注册（见下） |

### 哈希表节点布局（手写插入时必须照这个来）

```
node+0x00 : int32 key（槽位号）
node+0x08 : void* value（QSWeapon*）
node+0x10 : node* next
buckets[slot % bucketCount] 是链表头；buckets[bucketCount] 是 end 哨兵
```
**不要自己 malloc 节点**，用 `0x4713c0(map, out, key)` 让引擎插入，再把 `node+0x8` 改成自己的武器指针。`key` 是 16 字节 `{int32 slot; 4字节填充; uint64 0}`，`out` 也是 16 字节，`out[0]` 是 node。

### 物品表记录的真实布局（约 0x118 字节，**不是** 0x400 的 stItemInfo）

```
+0x00 int32  id            (20001)
+0x08 char*  name          ("USP45")
+0x10 int32  type          (20001=2 武器, 60001=6 近战, 30001=3 弹药)
+0x14 int32  subType       (20001=5, 30001=1)
+0x20 float  (30001=0.5)
+0x30/+0x40/+0x48 char* 共享图标指针（多个物品相同）
+0xc8 int32  (30001=999 堆叠)
+0x110 char* 每个物品不同
```
**所以这个表不是武器配置表**，`stItemInfo`（0x400）另有来源，目前仍未找到。

### 装备链路是服务端权威（重要）

`qs.EquipSlot(itemId)` 的真实流程（`0x18c5ff0` 包装 → `0x18c6144`）：

1. `r14 = [解码后的 owner + 0x2d60]` —— 背包管理器（12 个容器，`manager+0x40` 起、每个 0x28 字节）；
2. `rec = 0xfd2250(itemId)`；空则返回；
3. `slot = 0xfb10d0(manager, 0xa, itemId, rec[0x118]首值)`；`-1` 则返回；
4. 组包后调 `0xbaf300(...)` **发网络请求**（消息号 0x601 / 0x3e80 附近）。

→ 本地不会插入武器，必须有服务端回包。同理 `qs.ActiveWeapon`、`qs.UnequipWeapon` 也是「发请求」。

### 反射系统（可用于拿结构体字段表）

- 注册表全局：`0x4982d4` 处 `mov rax,[rip+0x2c53ed5]` → **RVA `0x30ec1b0`**。
- `0x4982c0()` 取/建注册表；`0x4984f0(reg, const char* name)` 按名字哈希查类（`h = h*0x3d + table[ch]`，初值 `0x1234abcd`）；`0x490260(reg, cls, name, offset, type)` 注册成员。
- `0xd01c50` 给 `QSWeapon` 注册的成员：**`mMesh`=+0xdc8、`mFppMesh`=+0xdd0、`mAccessories`=…**（继续往下反汇编可取全表）。
- 待办：用这套反射把 `stItemInfo` 的字段表 dump 出来，就能手工拼出合法的 0x400 配置。

### 已排除的路线（不要再花时间）

- **`CommonWrapper.lua` 的 `AddEquip`/`AddGoods`**：是**服务端** MMO 逻辑（家族/任务/NPC），客户端给枪用不了。定义在 `Data/Script/Logic/CommonWrapper.lua:481-485`，共 215 个全局，全是服务端函数。
- **客户端 GM 指令**：映像里没有 `additem`/`addequipment`/`GMCommand` 字符串，客户端没有 GM 解析器。`\DATA\TABLE\GM_COMMAND.BIN` 只对服务端有效。
- **Lua 侧没有给枪接口**：`qs` 里没有 `EquipWeapon(id)` 之类；`qs.QSWeapon()` 造的武器默认 `GetWeaponID()=-1`。
- **`QSWeapon_GetStaticMetaInfo`(0x17ae570)**：只是 `lua_getfield` 取一个 Lua 全局表，不是配置结构体。

### 环境坑（新增，很重要）

- **绝对不要对客户端做全地址空间 `Memory.scanSync`**。本轮扫 7102 个 rw- 区段找 `stItemInfo`，直接把 `Europa_Client.exe` 扫崩（PID 55504 消失，之后 attach 报 `VirtualAllocEx returned 0x5`）。要搜内存必须限定小范围，或改用「已知指针 + 偏移校验」。
- 客户端崩溃后 `active-run.json` 里的 PID 全部失效，必须重新 `start_research.ps1 -LocalMenu -Duration 3600`。

### 本轮新增工具

- `probe_equip_api.lua` / `probe_equip_api2.lua` —— 枚举 `qs` 里装备/武器相关成员及函数定义来源。
- `probe_dump_equip.lua` —— `string.dump` 导出 Lua 函数字节码（`bc_*.luac`）。
- `probe_weapon_mgr.js` —— dump 控制器与武器容器内存。
- `probe_holder_vtable.js` —— dump 武器容器虚表（96 槽）。
- `probe_item_record.js` —— dump 物品表记录原始内存。
- `weapon_mount.js` —— 造枪 → SetInfo → Init → 插入槽位哈希表 → 激活，全链路实验（待跑）。

## 上一轮（12:20）：复活链路已改，武器系统已摸清入口

### 武器原生结构（本轮最重要的进展）

- **QSWeapon 虚表 RVA = `0x27663c8`**（注意：构造里 `lea rax,[rip+0x1a64470]` 是相对位移，不是绝对 RVA，直接拿 0x1a64470 会读错）。
- 虚表槽位：**`+0x158` = `QSWeapon::SetInfo` = RVA `0xd04580`**；`+0x168` = `0xd043f0`。
- `SetInfo(this, const stItemInfo*)` 的实现只有两步：
  1. `new(0x400)` 后调用 **`0x5cbb10(QSWeaponInfo*, const stItemInfo*)`** 完成转换；
  2. 结果存到 `this+0x50`，并置 `this+0xea9`。
  → **所以 `SetInfo` 唯一缺的就是一个合法 `stItemInfo`**，拿到它武器就能初始化。
- `QSWeapon` 对象大小 **0x10c0**；构造 `0xd01bf0`（内部 `0xd01ee0`）。`qs.QSWeapon()` 走的就是这条，可安全调用。
- QSWeapon 的两个子类工厂：`0xfda1d0`（0x10c0，+0x88=2）和 `0xfdc1e0`（0x10d0，+0x88=4）。它们**没有直接调用者**，说明由创建器表间接调用；不要指望靠 `find_callers` 找到上层。
- `0xd01ee0` 的直接调用者只有 7 个：`0xea9080`、`0xf1b110`、`0xfda1d0`、`0xfdc1e0`、`0x12a1b60`、`0x12ec480`、`0x17ae920`。

### 还没解决：stItemInfo 从哪来

- Lua 侧**没有任何接口返回 stItemInfo 结构体**：`GetItemInfo` 返回普通 table，`GetItemDetail` 返回 nil，`GetItemInfo_DEFHead(id)` 返回数字 0，`SetInfo(table)` 直接失败。
- `qs.GetEuWeaponSystem()` 在 gameplay 仍返回 `EuLobbyWeaponSystem`，`GetLobbyWeapon(...)` 各参数都返回 nil（大厅武器在 gameplay 下不存在），`GetWeaponId(...)` 恒为 0。
- 已加载物品表只有 71 项：手枪 20001-20006（USP45/Glock17/沙鹰/燧发/急救手枪）、弹药 30001-30030、配件 401xx、投掷物 50001-50004、近战 60001-60002、消耗品 70001+。**步枪不在已加载子集**，`GetItemInfo` 对 1-300、10000-10120、30000-30120、40000-40120、50000-50120、70000-70120、90000-90060 均无结果。
- 下一步两条路：
  1. **运行时抓取**：hook `0x5cbb10`（QSWeaponInfo 构造），从任意一次真实 `SetInfo` 调用中截获 stItemInfo 指针并复制；或 hook 物品表查询，在其返回处取指针。
  2. **静态定位物品表全局**：反汇编 `0x5cbb10`，看它从 stItemInfo 的哪些偏移取值，同时找物品配置表单例。
- 服务端路线暂缓：`transport-schema.json` 只有 28 个底层 TPDU 结构，没有游戏消息格式；要发「给武器」消息得先逆出消息体，成本更高。

### 复活（代码已改，待新会话复测）

- `local_menu.js` 已移除 `actorReset`(D8C950)，只保留 `actorSet`(D9D590)。
- 落点判定重写：新增 `local_menu_respawn_frozen`；必须「离开传送点 + 静止 1.5 秒」才算 `landed`，否则 8 秒后报 frozen。
- **注意：注入脚本只在启动时加载，改完必须新开一轮才生效。** 12:05 那次复测仍报 frozen，是因为跑的还是 11:26 启动时的旧脚本，不能算失败。
- 上一轮实测数据：从 peak+1000=121000 传送到 (359658,421627)，8 秒后落在 (366997.875,417050.375,14920.41)。**人物确实下落约 10.6 万单位并停住**，说明去掉 D8C950 后落点解析在工作。
- `physics_ticks`（hook 0x133b5b0）恒为 0，即使人物明显下落 → **0x133b5b0 不是有效物理信号，不要再用它判断模拟是否运行**。


### 武器：已确认可行的入口

- `qs.QSWeapon()` 可在运行时成功构造，返回 userdata；`GetWeaponID()=-1`、`IsReady()=false`、`GetOwner()=nil`（默认未初始化，不崩溃）。**这是刷枪的基础。**
- 构造函数原生为 `0xd01bf0`（分配 0x10c0 字节并调用 `0xd01ee0` 初始化），对象大小 **0x10c0**。
- 关键方法签名（SWIG 包装反汇编所得）：
  - `QSWeapon::SetInfo(const stItemInfo*)` —— 参数是 C++ 结构体指针，不是 Lua 表。
  - `QSWeapon::Init(Man*)` —— 参数是 Man 指针。
  - `QSWeapon::StartFire`、`Fire`、`SetAmmo`、`HasAmmo`、`GetItemInfo` 均存在。
- `qs.GetItemInfo(id)` 返回 **Lua 表**（不是 userdata），字段含 id/name/type/subType/icon 等：
  - `20001` = USP45 手枪，type=2，subType=5
  - `60001` = 近战武器，type=6
  - 武器 ID 是数字段，可按区间扫描补全步枪等。
- `QSConfig.Weapon` 有 10 个成员：`AutoLoadWeapon/PickWeapon/SwitchWeapon/Pickaxes/InputBindCfg/ThrowableBindCfg`。`Pickaxes` 给出镐 weaponId=60001、weaponDesc=101/100；`InputBindCfg` 1-7 对应 ACTIVE_WEAPON_PRIMARY/SECONDARY/SIDEARM/MELEE/THROW。
- `qs.GetEuWeaponSystem()` 在 gameplay 状态下仍返回 **EuLobbyWeaponSystem**（大厅外观系统），其方法需要参数，不能当作对局武器系统用。
- 没有 `qs.EquipWeapon(id)` 这类直接给枪的 Lua 接口；装备是服务端驱动的。
- `\DATA\TABLE\GM_COMMAND.BIN(.TXT)` 是**服务端** GM 命令表（171 条，含 `/.additem`、`/.addequipment`），对本机离线客户端无直接作用。
- 下一步推荐：写 JS 桥接——`0xd01bf0()` 造对象 → 用原生按 ID 取 `stItemInfo` → `SetInfo` → `Init(man)`；或用 `QSWeapon::Remount`/`GetBoneRoot` 手动挂到手骨。**先解决 stItemInfo 的来源**（原生 `GetItemInfo` 实现在 `0xcf7190` 函数内，含字符串引用 0xcf75be）。

### 本轮新增工具（都可复用）

- `resolve_swig.py NAME...` —— 解析 SWIG 导出表 `{name_ptr, fn_ptr}`，得原生 RVA。仅对全局注册函数有效，类成员方法不在该表。
- `xref_string.py TEXT` —— 查字符串的绝对指针引用，用来看方法表布局。
- `extract_vfs.py '\DATA\...' --out file` —— 从 VFS 按名导出单个文件；块头 16 字节后是 **zlib**（不是 lz4），文本多为 GBK。
- `run_js.py PID script.js [--wait N]` —— 对活动客户端执行任意 Frida 脚本并打印消息。
- `probe_qs.lua` / `probe_weapon*.lua` —— 分别导出 5222 个 `qs` 成员、武器系统与方法探测。

### 环境坑（重要）

- 本机 shell 里同时存在 `http_proxy` 与 `HTTP_PROXY`（大小写重复），会让 `Start-Process` 抛 “已添加了具有相同键的项”，导致 `start_research.ps1` 直接失败。启动前需先清除 `http_proxy/https_proxy/all_proxy/no_proxy` 及大写版本。用户从资源管理器双击 CMD 不受影响。

## 旧记录：本次结束点（2026-10-22 11:03）

- 11:02:40，Computer Use 返回：`Computer Use was stopped by the user with the physical Escape key. Stop your work, do not call further Computer Use tools in this turn, and send a final message noting that the user stopped Computer Use.` 本轮随后只保存交接信息，未继续电脑输入。
- **新大厅已能用，选点复活尚未完成。** 默认入口已接新大厅；复活代码仍是实验实现，不能对用户宣称完成。
- 新增的 `scene_respawn_probe.js` 在 10:55:41 主帧调用完整 D668F0，将当前 10021 场景坐标设为 (238000,343000,351000)，45秒内表现位置仍不变。该诊断未调用原主脚本的 LocalRoamCharacter.reset，因此不是完整产品流程测试。证据在 `captures/native-menu-1/full-respawn`。
- `respawn_state.js` 最新 `captures/native-menu-1/respawn-state-2`：RoleDB terminal=3000，站姿速度[170,460,600,170,345,170,322]均正常；controller+10=0，+2D1=0，+18结构首U32=0，模拟位置也是 (238000,343000,351000)。不是简单属性速度为0。
- **待核实的新假设：游戏失去焦点/暂停时可能不运行人物模拟。** 117F350 前置条件包括 main+3040C8B 的 bool，以及 Ptr(main+30299B8) 对象虚表+188 返回值；若不满足直接返回，之后才会调用物理/117F950。当前只看到117F350，无117F950/133B5B0，尚未查明是哪一条件。不要过早把冻结完全归因于 D8C950，也不要把后台静止当成错误落地。尝试用 Sky 恢复窗口焦点时收到上述停止通知，尚未验证此假设。
- 当前 native-menu-1 会话约11:12到期；交接时请重新核实 active-run.json/PID，必要时新开一轮。

## 用户目标与授权

- 停服客户端供本人本地跑图。已明确授权继续逆向、本地服务、运行时适配、测试和重启，不需要反复确认。
- 基础跑图已完成，用户亲自确认“人物和视角都能控制”。
- 当前新增需求：恢复一个游戏内主界面，从中选地图进入，再在地图上选位置复活。
- 用户要求保留交接 MD，方便转交另一个 agent。没有授权创建其他聊天或使用子 agent。

## 环境与入口

- 游戏根目录：`E:\Program Files (x86)\Steam\steamapps\common\Ring of Elysium`
- 研究目录：`offline-research/local-server`
- Python：`C:\Users\<you>\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`
- Frida、capstone 等在 `offline-research/vendor`，工具脚本会自动加入 sys.path。
- 根目录 `启动本地人物跑图.cmd` 已使用 `powershell.exe -NoProfile -ExecutionPolicy Bypass`，解决用户的脚本执行策略报错；未修改系统执行策略。
- **最新默认启动**：双击上述 CMD -> `start_character_roaming.ps1` 默认 MapId=0 -> `start_research.ps1 -LocalMenu`。
- 指定 `start_character_roaming.ps1 -MapId 10020` 仍走先前的自动人物跑图路线，方便回退。
- EXE、协议 DLL、VFS 未做本轮磁盘修改。启动器校验 supported-build.json，仅适配本机 0.2.989.0/build 7968306。
- PowerShell 用 UTF-8 BOM 处理含中文的 .ps1。不要全局修改执行策略。

## 正在运行的本轮测试（必须重新核实进程）

`active-run.json`，RunDir=`captures/native-menu-1`：

- Client PID **41272**
- Bridge PID **58900**
- Server PID **53376**
- 启动约 10:12，本次限时 3600 秒，约 11:12 到时清理。可能已退出，勿盲用 PID。
- 启动工具会话 ID 72810（exec_command）。
- 当前地图后来经实际界面操作从雪山 10020 切到了夜间 10021。日志里有非诊断脚本发出的 menu/enter 命令，说明用户可能在操作，不能假定画面一直停在我们上次截图。
- 本轮复活测试已把角色传到 (238000,343000,351000)，**当前悬空，尚未修好**。不要拿此状态演示完成。

## 已实现与验证的新增功能

1. `local_menu.lua` + `local_menu.js`：复用客户端原有 **RoomSettingPanel** Scaleform 资源作为“无限法则 · 本地大厅”。原生 3D 大厅人物和背景仍在，地图下拉框及原资源预览显示正常。
2. “进入地图”按钮经过 Lua `UIDispatchEvent` 真实注册回调测试 -> outbox -> 原生场景加载 -> 雪山 -> 原生人物/相机/碰撞。完整新进程路径成功。
3. **实际系统 Escape 按键已用 Sky 测试**，能打开“本地跑图 · 地图与复活”菜单。菜单有“继续跑图”和“地图选点复活”。
4. 原生 `EuUIStartPointPanel` 选点地图能显示。`QSUICall(...,'Cpp2As_InitMapEnable',true)` 返回 success=true。
5. 选点事件 `SET_START_POINT,x,y` 已在原生事件处理函数 hook 中解析，原始网络发送被局部吞掉；集成测试喂相同形状的事件成功得到 x=238000,y=343000 并进入 spawn。
6. 切到夜间地图 10021 已观察到 world_state=4、模型创建及菜单 ready；但夜间默认出生点和后续复活存在下面的问题，不能宣称所有地图完整验证。

### 截图证据（客户端自带截图，非普通窗口捕获）

- `C:\Users\<you>\Documents\Ring of Elysium\20261022_101431_1.png`：本地大厅选地图面板、预览及原生 3D 背景。
- `...\20261022_101902_4.png`：雪山里按真实 Esc 打开的本地菜单。
- `...\20261022_102043_5.png`：完整雪山出生点地图。
- 较早 `...\20261022_095536_5.png` 是 UI 原型，不是最终入口。

## 当前阻塞：传送后模拟/落地没有恢复（优先修复）

不要把“位置连续不变”当成落地！现有 `local_menu_respawn_landed` **有假阳性**。

- `local_menu.js::spawn()` 暂时用 QLevel+1E0 的 peak+1000，先传到地图最高处之上，再想让原生重力落地。
- 当前调用 `D9D590(actor,x,y,z)` 后又调用 `D8C950(actor)`。
- 复活日志显示从 10:35:03 传送到 (238000,343000,351000)，到 10:36:31 仍完全不动，却被错误的稳定性判断标成 landed。
- `character_roaming.js` 对非 10020 地图也用 `D9D590` + `D8C950`，同样可能停在保存视角的空中。夜间 ground_ready 位于 256882.359375，与保存视角完全相同，不能视为碰撞落地。
- `D9D590` 是 Lua `qs.PlayerSetPosition` 的原生路径：调用实体虚表+1C8/B86460，写表现对象的变换；需核实它是否同步角色模拟控制器。
- `D8C950` **不是已确认的传送重置接口**。它调用 actor+18 虚表+70 获取控制器并调用虚表+8，然后清理模型状态，最后 D8E9E0(actor,0)。很可能重置了运动状态机，导致物理不再跑，不能继续盲用。
- 复活后 `physics_step_diagnostic.js` 在 3 秒内 **没有任何 133B5B0 回调**；时钟仍推进，`simulation_clock_diagnostic.js` 确认 8023 帧正常，117F350 在跑，所以这轮不是早期的时钟为零问题。
- 应找到真正的模拟传送/重建状态路径，或先试移除 D8C950，并从新场景初始化后验证。不应靠每帧手动移动角色假装物理。
- 目前还没有完成地面高度查询。9F8A40/79F740/79FC40 读的是水面/区域高度类，不能直接当成地形高度。

### 刚查到的关键运动控制器接口（下一步）

- actor+**B0** 是本地运动控制器，对当前进程约 `0xc1bae428`（勿硬编码地址）。
- 控制器虚表方法：+8 = **D236D0**，+18 = D23840（帧更新），+88 = D23D60，+70 = D259E0。
- **D236D0(controller)** 的反汇编：
  - 调用 FBA660(controller+C0)，重置 controller+B8、controller+18 的状态；
  - 调用 actor=Ptr(controller+310) 的虚表+1A8 取得当前表现位置；
  - 将 float XYZ 转 double 写 controller+**C0/C8/D0**；
  - 若本地角色，调用 Ptr(controller+200) 的虚表+1B8。
- 这说明 D8C950 调用的控制器 reset 至少会复制新表现坐标，但同时可能把当前物理状态清为 0。需要恢复站姿运动状态/正确初始化接口。
- `movement_state_diagnostic.js` 能 dump actor、entity、解码后的 inner 和 controller。最新 `captures/native-menu-1/move-state`。
- 旧成功帧路径参考 `captures/demo-33/movement-pipeline/trace.jsonl`：D891B0 -> D814C0 -> D9D410 -> D23840 -> D23D60；随后模拟正常时 133B5B0 会运行。
- 先前落地/原生行走成功参考 `captures/demo-34`、`demo-35` 和 SCENE_RESEARCH.md。

## 本轮代码与交互流程

- `instrument_client.py --local-menu` 注入：
  - `globalThis.LOCAL_MENU_ENABLED=true`
  - 本轮 captures 下独立 `LOCAL_MENU_OUTBOX` 文件路径
  - `LOCAL_MENU_LUA` 源码 + local_menu.js
- Lua UI 回调往 outbox 写含 sequence/action/map_id 的 JSON；JS 每 100ms 在 D4CA40 主线程 onLeave 读取并验证递增序号。
- action：menu/resume/enter/pick。
- `native_scene_start_probe.js` 新增 `LocalRoamScene.request(mapId)`，默认 LocalMenu 时先等待大厅选择；gameplay 状态允许再次调用 D668F0 切地图。
- `character_roaming.js` 新增 `LocalRoamCharacter.reset()`，场景进入后重置自动初始化阶段；最终输入恢复后通知 `LocalRoamUI.ready()`。
- Lua 覆盖 `QSConfig.Input.EscProcess` 进入/退出本地菜单；保留 originalEsc 引用但当前默认走本地菜单。
- 首次进入地图当前仍先在默认点加载，随后用户 Esc -> 地图选点复活。可以在修好复活后改成加载完成自动打开选点地图，以贴合用户“选地图->选位置复活”的流程。
- 限制/待完善：复活提示、无效地点可见错误提示、真实点击完整验证、沙漠地图和反复切图后地图贴图/边界刷新、输入恢复回归。

## 原生地址/对象（本机专用 RVA）

- 主程序基址从 Frida Process.getModuleByName 读取，不硬编码。
- 主帧 D4CA40.onLeave。
- world Ptr(main+302A870)，+6C=4就绪，+20/+28为 QLevel 指针向量。
- scene Ptr(main+302A860)，+D0地图ID。
- QLevel+1D8/1DC尺寸，+1E0 peak，+1E8保存相机XYZ（不是地面出生点）。
- 9F8B20(scene,out16) 返回 float xmin,ymin,xmax,ymax（目前 min=0）。
- 10020雪山，10021夜间，10024沙漠，10016内部测试，10050角色/大厅场景。
- ManPlayer CD5D00(owner)；位置读 D9D680；表现位置写 D9D590。
- owner解码：t=main+3094D90，k=U32(t+B30)，h=(U32(t+(k&255)*4)+16AF+U32(t+400+((k>>8)&255)*4)) mod2^32，owner=Ptr(t+800+(h%102)*8) XOR U16(t+B34)。
- UI管理器 Ptr(main+30411C8)。其+28是已加载原生面板链表哨兵，node+0 next，node+10 panel指针。
- 原生 panel+18 字符串是带实例后缀的 **EuUIStartPointPanel0**；panel+38 是不带后缀的类型名。此前查找失败就是忘了这个 0。
- start-point vtable **27D5448**；原生 AS 回调函数 **1268890(panel,instanceNameCString,vector24*)**。
- 三个参数：SET_START_POINT、int x、int y。vector=begin/end/cap；每元素24字节，item+10为间接 value 指针（若null则item+0）；value+8 flags/type，value+10字符串或int32。
- `local_menu.js` 仅 picking=true 时截取上述事件，把第二参数换为不匹配的名称，使原生联网发送分支不执行，然后下一主帧本地传送。
- 输入锁 CE5420(int index,uint8 locked)，锁数组main+3040718，已知地图锁index2。
- 光标/捕获 CE4930(Ptr(main+3040738),uint8 showCursor)。必须反向再正向切换（显示->隐藏）刷新捕获，单独传false可能直接return。这是先前用户键鼠失效的根因，**不要删掉**。
- Lua运行：QSScriptSystem=Ptr(main+3048D48)，system+18持有LuaState。**1003000(system+18,eastlString24)** 返回uint8成功。源码字符串使用UTF8字节长度，不是JS length。

## 调试工具与检查

- `run_lua.py PID source.lua`：在主线程执行本地 Lua 文件，xpcall 结果写 lua-last-result.txt 并打印。不支持 Frida Session context manager，已用 try/finally detach。
- `frame_screenshot.js`：主帧调用 CE4AB0(0) 排队游戏原生截图，输出到 Documents/Ring of Elysium。
- `test_menu_enter.lua`：派发地图进入按钮的注册 Lua 回调。
- `test_menu_pick.lua`：打开复活选点地图；会改变当前界面。
- `test_map_event.js`：在主帧找到 EuUIStartPointPanel0，构造原生 SET_START_POINT 参数，喂入 (238000,343000)。**这是程序内事件夹具，不是物理鼠标点击验证**。
- `panel_inspect.js`：读取 UI 管理器面板链表和类型名。
- 原型文件 lua_inspect.js、inspect_ui.lua、menu_preview.lua 等只作诊断，不由正式启动器加载。
- `disassemble.py RVA SIZE --image offline-research/client-runtime-image.bin --strings` 反汇编保存的已解包映像。
- `inspect_refs.py STRING/0xRVA` 只扫 RIP lea/mov，SWIG 导出表是数据指针，需额外查找 QWORD=base+字符串地址再读后一QWORD函数地址。
- 目前 JS node --check、Python py_compile 均通过；`python -m unittest discover -s offline-research/local-server -p 'test_*.py'` **20项通过**。这些不代表新复活逻辑通过。

## 电脑操作限制

- Windows UI 用 computer-use skill 的 @oai/sky，通过 mcp__node_repl__js。已完整读取26.1016.51333版本 SKILL/guidance/api/confirmations。
- 持久 node 中有 sky/menuWindows/menuGame/menuState，但句柄/坐标可能已旧，必须重新观察。
- 普通游戏窗口截图两次失败：`FrameArrived timed out: timed out waiting on channel` / `window capture timed out: timed out waiting on channel`。不要复用截图坐标，也不要伪造Sky截图ID。
- 无截图的 accessibility 查询能读游戏窗口及焦点，Sky.press_key Escape 实测成功。
- 原生截图文件可 view_image 用于检查自研界面，但不能伪造为 Sky 的截图状态。

## 交付前待办

1. 修好模拟传送、落地及对真实地面的判定；不能保留当前稳定坐标即成功的假阳性。
2. 复活后验证人物可走、视角可转，菜单开/关恢复原生输入。
3. 增加选点操作提示与出错反馈；核对真实地图点击回调。
4. 验证反复切图及至少雪山完整新进程路径；其他地图仍可标实验。
5. 更新 README.md、SCENE_RESEARCH.md、当前结果.md（它们有历史描述，不是本轮最终状态），并更新本交接文件。
