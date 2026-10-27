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

先读 [HANDOFF_20261025_ICONS_SOUND_DOOR.md](HANDOFF_20261025_ICONS_SOUND_DOOR.md)。本轮只改 `local_menu.lua`（sha256 `afa7cf29…a9aacf`）：背包预览改用 `@ICON96_*`（`ICON268_*` 本机不存在，原来显示“?”），HUD 枪械大图恢复原生 `@EuHUDWeaponPictures_<id>.png`（codex 的 `applyWeaponImages` 会把宽图位塞成白条，且访问不存在的 `weaponSwitchInfo` 每次抛错）。冷启 `run-20261025-icons-door` 背包目视通过，HUD 像素待确认。UZI/MSR 无声已排除音效配置表，`weapon.bnk` HIRC 与 PostEvent object id 是下一步。开关门未实现。**游戏已退出，active-run.json PID 全部失效。**

# 优先事项更新：Codex 代理连接（2026-10-25 12:17）

用户明确“重连五次”发生在 Codex 聊天。已备份并仅开启 ~/.codex/config.toml 的 features.respect_system_proxy；原生 doctor 对比从 WebSocket 15 秒超时变为 HTTP 101，保存配置后无临时参数复查也通过（2.141 秒）。当前桌面会话尚未重启，需完全退出并重开 Codex 后验收实际聊天。详细证据、备份路径和回退方法见 [CODEX_PROXY_FIX_20261025.md](CODEX_PROXY_FIX_20261025.md)。车辆行驶声音仍待继续；本轮未修改游戏代码。

# 最新：单人队伍面板与本地角色衣柜（2026-10-25）

先读 [HANDOFF_20261025_SOLO_APPEARANCE.md](HANDOFF_20261025_SOLO_APPEARANCE.md)。左上角已通过原版名单初始化只显示自己、编号固定 01，并同步真实血量；最终会话实际 GFx 连续 10/10 样本通过（含父面板可见、其余三行隐藏）。新增 Esc 菜单的角色/造型/基础衣柜，73 个角色分组、352 个造型、120 件服饰可本地选择并保存。四个角色换模、三把枪保留、真实菜单按钮命令、无效 ID 拒绝和玲的冷启动恢复已验证。最终用户又选择嘉文，保留其 skin_id=1。所有造型尚未逐一目视验收，截图仍超时。车辆声音仍无本轮修复结论，10 月 24 日隔离测试的证据更正也写入新文档第 7 节。

# 最新：地面物品三维模型调查（2026-10-24 18:41）

先读 [LOOT_WORLD_MODEL_INVESTIGATION.md](LOOT_WORLD_MODEL_INVESTIGATION.md)。地面物品的拾取/HUD 已可用但模型仍不可见。本轮只读查清：物品→archetype 映射（EntityTable）、EuLoot 表只给内容/稀有度不给坐标、权威消息 ID 读法（`message-ids.json` 1200–1600 段不可信）、实时派发表里没有 1261/1282/3022、`0x131ED80` 证明 BC_ENTER 只能查载具表、`0xF13A10` 大厅图形工厂的 dl 语义与“不挂世界场景”的事实（含完整反汇编路径）。已备好 4 个探针但**未运行**：并发会话 `run-20261024-vehicle-sound-isolated`（客户端 7180）占用 8001，未启动客户端、未 attach。等端口释放后按该文档第 7 节顺序冷启验证。

# 最新：原生 T 键触发展开已实测 + 自行车回滚定性（2026-10-24 18:05）

# 最新：原生 T 键触发展开已实测（2026-10-24 17:52）

先读 [BINDING_AND_KITS_VERIFIED_20261024.md](BINDING_AND_KITS_VERIFIED_20261024.md)。并发会话启动的 `run-20261024-player-controls`（客户端 12056）加载了 17:37 的原生按键绑定源码；trace 中出现 11 次 `local_adventure_binding_pressed`（SKI，帧 46051–47913），每次都正确驱动自行车 `state 31 ↔ 0`，其中 9 分钟空窗和一次干净回归里**没有**任何自发触发，说明帧内查询没有被误判成持续按下。同一会话回归三套装备：滑雪 25→0、自行车 31→0、滑翔翼 pose 3→14，10020 区域 4 落点误差 −0.73 cm。**按键来源无法从日志区分物理键盘还是注入，鼠标点击、HUD 像素、滑翔翼空中 F/空格仍未验收。** 17:57 曾观测到菜单展开自行车约 0.5 秒后被游戏改回 state 0，18:01–18:03 用同一客户端切换地图重载场景后复测：**10019 12/12、10020 8/8 采样持续展开**，同场景滑雪与滑翔翼各 8/8（仍是 82717 构建、1 帧动作脉冲），证明回滚来自那个连续做了 11 次原生 T 切换又反复菜单收放的世界实例，重载即清除，不是构建回归；排查中临时加的脉冲/诊断改动已全部撤回，磁盘源码与实测构建逐字节一致。`verify_adventure_deploy.py` 新增 `summary.steady` 判据（哈希 `8DA53359…`），后续不再只看 `local_adventure_deployed` 事件。

# 历史：三图九宫格出生 27/27 通过（2026-10-24 17:39）

先读 [SPAWN_SWEEP_20261024.md](SPAWN_SWEEP_20261024.md)。新增 `verify_spawn_coverage.py`，在冷启会话 `run-20261024-coverage-sweep` 内按 10020 → 10019 → 10024 顺序跑满区域 0–8，共 27 次出生：**27/27 落地**，无 `respawn_frozen` / `respawn_timeout`、无天顶回退。18 个区域误差在厘米级；7 个区域高于预测地面 2.4–9.1 m（建筑/岩体等静态碰撞体，落地判据只比对水平距离，属正常落地）。**顺带更正单位**：此前文档把 Z 差值写成“米”，实际单位是厘米（沙漠中心是 2.38 m，不是 237 m）。scan 用的是 17:34 启动时加载的源码；17:37 另一会话更新了 `local_adventure.js` / `local_menu.js` / `local_menu.lua`（原生按键绑定），出生逻辑未变但该扫描不代表那版改动的运行情况。

> 并发提示：17:41 起有另一会话启动 `run-20261024-player-controls` 测试原生按键接线（`local_adventure_binding_*`），它在启动前清理了本会话客户端。两个会话共用 `active-run.json` 与同一批源码，后续接手前先看最新 run 目录与本文档时间戳。

# 历史：夜间 10021 卡在场景 ERROR 已定性为缺资产（2026-10-24 17:35）

先读 [NIGHT_MAP_10021_BLOCKER.md](NIGHT_MAP_10021_BLOCKER.md)。同一冷启会话内切到 10021 后，`enter` → `local_weather_reapplied map_id:10021` → `native_start_loading_finished`，随后不再有 state 4；窗口标题变为 `ERROR`。只读 Win32 探针读到弹窗文本 `Error Loading Data.Scene.general.building.FA_building_029_interiorvolume_mesh!!!`。VFS 索引里 `FA_BUILDING_029` 有 66 个条目，但**没有** `FA_BUILDING_029_INTERIORVOLUME.QSG`（相邻的 028/030/032/033/034 都有），即本机安装缺该网格。在「不改 VFS/SFC、不注入占位模型、不点击确定掩盖错误」的约束下这张图无法由本地补丁修复；10020/10019/10024 不受影响，冰岛高度资产已就绪，场景若能加载即可直接复用。本轮未改动任何生产脚本（local_menu.js 仍为 `c697da9a…`）。

# 历史：出生点覆盖修复，区域/点击不再回退天顶（2026-10-24 17:20）

先读 [HANDOFF_20261024_SPAWN_COVERAGE.md](HANDOFF_20261024_SPAWN_COVERAGE.md)。三张地图的高度网格以 (403100,403100) 为心、只有部分覆盖 819200 场景矩形，沙漠网格仅 275200–531000；旧九宫格按场景矩形取 0.3/0.5/0.7，沙漠九点里 8 个在网格外，于是回退 `peak+1000` 天顶下落。现新增 `mapCoverage()`（场景矩形 ∩ 网格），`regionPoint()` 按 coverage 取点，`spawn()` 把点击坐标夹进 coverage 并向内缩 200，发 `local_menu_spawn_point_clamped`；菜单 `deploy` 支持可选 `x/y`，驱动加 `--x/--y`。冷启 `run-20261024-coverage2`（客户端 7388，无新增 dmp）六次出生全部 2.65–2.89 秒落地：沙漠夹取 (100000,700000)→(275400,530800)、误差 −20 cm；海岛区域 0 +93 cm；雪山区域 0/8 为 +627/−705 cm；海岛区域 8 +270 cm。沙漠区域 4 停在高度场上方 238 cm 的静态碰撞体上（Z 差值单位是厘米，早期误写成米；中心网格平滑，已排除采样错误，物体未目视确认）。**画面层、真实鼠标点地图四角、真实按键展开仍未验收；夜间 10021 的场景 ERROR 与本修复无关。**

# 历史：三张地图地面出生已实测（2026-10-24 17:05）

先读 [HANDOFF_20261024_ISLAND_DESERT_GROUND.md](HANDOFF_20261024_ISLAND_DESERT_GROUND.md)。同一冷启会话 `run-20261024-islandground2`（客户端 13572，无新增 dmp）内先选 10019 后选 10024：`HEIGHT_MAPS` 现按地图切换高度资产（冰岛 2112² / 岛 2624² / 沙漠 1280²，均为 int16，映射公式一致）。10019 在 (409600,409600) 预测地面 40047.607、实测落地 40046.715（误差 −0.89 m），10024 在 (409600,409600) 预测 15771.114、实测 15770.403（误差 −0.71 m），两次都约 2.7 秒落地，随后滑雪板 state 25、收起 state 0/pose 14 照常。关键修正是 `LocalRoamUI.ready()` 在角色漫游启动时会晚于出生请求触发，旧代码会把在途 `landing` 清空导致永不落地；现改为置 `LocalRoamReady` 并保留在途落体，`adventure_check` 暴露 `menuReady`，驱动 `verify_adventure_deploy.py` 先等世界 state 4 + `menuReady` 再发 deploy。**夜间 10021 仍是场景加载问题（`world_state` 停在 3、窗口标题 ERROR），与高度场无关；真实鼠标选点、真实按键展开、画面观感仍未由用户验收。**

# 历史：三种出生装备展开已实测（2026-10-24 16:48）

先读 [HANDOFF_20261024_ADVENTURE_DEPLOY_VERIFIED.md](HANDOFF_20261024_ADVENTURE_DEPLOY_VERIFIED.md)。冷启对局 `run-20261024-163648`（客户端 1552，无新增崩溃）中，按「enter → 地图就绪 → 地面出生 → 发放起始装备 → 展开」流程实测：滑雪板 state 25、BMX state 31、滑翔翼 pose 3，`IsLookAtPlayerSki/Bmx/GliderActive` 均为 true，收起后分别回到 state 0 / pose 14。关键修正是**只能在世界 state 4 且 `LocalRoamMatchActive` 时展开**——原生动作管线 `A4C160` 只在对局内轮询，之前在大厅展开必然失败；早前的 `0x2F8110` 崩溃归因于大厅展开叠加第二会话 `0x1A3700` 探针，现已移除。新增菜单命令 `adventure_check` / `adventure_fold`，驱动为 `verify_adventure_deploy.py`。**仍缺原版 HUD/右侧卡片直接触发展开的接线，真实鼠标与运动手感待用户验收。**

# 历史：地面高度场短距出生已实测（2026-10-24 15:10）

先读 [HANDOFF_20261024_STARTPOINT_ANIMATION.md](HANDOFF_20261024_STARTPOINT_ANIMATION.md) 第 9 节。已从 `RIGIDTERRAIN_ICELAND.PXBIN` 解出 2112×2112 碰撞高度场并生成 `assets/iceland-height-2112.bin`；`local_menu.js` 的 `spawn()` 改为从预测地面 +5 米出生（仅 10020），不再从 `peak+1000` 掉落。冷启 `run-20261024-groundheight` 实测 region 0/4/8 与 GFx 选点回调四条路径：落地 Z 误差 +0.86/−0.15/+24.97/−0.90 cm，`respawn_started→landed` 约 2.65–2.74 秒（其中约 1.5 秒为静止判定），此前为 20–35 秒；每次落地后起始装备照常应用。夜图地形已从 VFS 解出，2112×2112 高度与白天逐字节相同，因此 10021 也启用了该高度资产；但本机夜图场景加载后停在 `ERROR`（world_state 3），尚无夜图落地实测。真实鼠标与过渡镜头仍未验收。第 8 节及第 9 节有最新 SHA256；下方历史记录保留。

# 历史：遮挡出生已验收，等候真实鼠标操作（2026-10-24 14:29）

先读 [HANDOFF_20261024_STARTPOINT_ANIMATION.md](HANDOFF_20261024_STARTPOINT_ANIMATION.md) 第 0 节。最终源码已冷启（`run-20261024-transition-final`，14:26）：选点面板冷启就绪、下落全程由原版 `EuUIStartPointPanel` 遮挡（59/86/85 次采样均可见、输入保持锁定）、落地后才恢复 HUD；三处地形落点坐标为实测。右侧原版卡片与三种出生装备在 Lua 层通过，真实鼠标点击和滑雪/自行车/滑翔翼展开运动仍待验收。仍存在的代价是遮挡下的下落约 20–35 秒。第 8 节已更新最终 SHA256；下方历史记录保留。

# 历史：开局选点与右侧装备首次接入（2026-10-24）

先读 [HANDOFF_20261024_STARTPOINT_ANIMATION.md](HANDOFF_20261024_STARTPOINT_ANIMATION.md)。已找到原版右侧 ChooseInventoryPanel，新增 local_deployment.lua / local_adventure.js 接入三种装备与本地能力；最新完整界面、点击、展开和运动尚未验收。该阶段“仍从天上掉落”的问题已由顶部遮挡过渡解决。

# 历史：投掷物引信校正与 50004 定性（2026-10-24 10:20）

先读 [MEDICAL_THROWABLE_RESTORE.md](MEDICAL_THROWABLE_RESTORE.md) 文末。客户端 `mThrowableParams` 给出权威引信：破片 5s、烟雾 5s、闪光 2.5s（生产原为 4s/3s/2.5s，已校正）。50004 已定性为 RPG-7（10605）的专用火箭弹（`TTYPE_ROCKET`），不是燃烧瓶，不加入手投白名单；本构建没有燃烧瓶条目。冷启会话 `run-20261024-fuse-verified` 中 `verify_consumables.py` 11/11、`verify_energy_drink.py` 6/6 通过，实测引信 5.068/5.057/2.511 秒。爆炸/烟幕/闪光像素仍未验收。下方车辆音频交接仍然有效。

# 最新交接：载具声音实测与交互说明（2026-10-24 09:52）

先读 [HANDOFF_20261024_VEHICLE_AUDIO.md](HANDOFF_20261024_VEHICLE_AUDIO.md)。最新源码已冷启加载，101/105 两款吉普完成真实加速、发动机激活、转速、有效播放事件和游戏会话音频输出检查；105 下车重上后仅启动一次发动机，并捕获正常 Stop 事件，当前 trace 无 error 事件。**人工听感、其余车型、真实鼠标选点及 HUD 画面仍待验收。** 新文档包含玩家操作、启动方式、菜单命令接口、证据路径、当前会话快照和 hook 注意事项。下方“尚未冷启验证”的说法属于此前历史记录，以本条与新文档为准。

# 历史用户反馈：开局选点、HUD与开车声音（2026-10-24）

先读 [HUD_SPAWN_VEHICLE_AUDIO_20261024.md](HUD_SPAWN_VEHICLE_AUDIO_20261024.md)。用户反馈优先于旧46项内部检查。已查明AS点击还要求allowPickPoint（旧代码只开allowMouse），补原版StartCountDown初始化与加载重试；修复菜单close漏恢复原生小地图/人数/罗盘，单机人数如实显示1；上驾驶位补qs.StartEngine对应原生E4DC00通知。源码与Lua编译检查通过，公开AS调用/面板可见性诊断通过。**尚未重启加载新源并完成真实点击、HUD像素与行驶听感验收。用户Esc停止了Computer Use，本轮后续未再自动操作窗口。** 当前诊断会话见active-run.json，PID需重新核实。

# 最新：投掷动作、选点出生与菜单切换（2026-10-24 08:01）

先读 [SPAWN_THROW_SWITCH_FIX.md](SPAWN_THROW_SWITCH_FIX.md) 顶部最终交接。本轮完整角色武器切换/原生投掷动作链、开局自动选点/胶囊接触缓存、菜单切换重入和序号溢出已修正。全新会话 run-20261024-throw-spawn-verified 的46项检查全部通过，模块错误0。动画图接受第一/第三人称准备、持弹、甩臂、收手，选点实际落在目标坐标；像素画面因截图接口超时尚未目视确认。当前角色HP100、步行、主武器槽1、input_lock=0。证据与源文件SHA256见该会话 throw-spawn-verification.json；继续工作前核实 active-run.json 中进程是否存活。

# 最新：吉普轮胎绘制修复（2026-10-23）

先读 [VEHICLE_WHEEL_FIX.md](VEHICLE_WHEEL_FIX.md)。101/105 的轮胎是独立部件，原模型已加载但绘制开关关闭；local_vehicles.js 已启用四轮原生绘制，并等待车身与轮胎共同 ready。冷启 wheel-fixed 会话 21 项检查全过，含两款吉普四轮及两轮上下车、109/201 回归；无载具或脚本错误。实际绘制实例证据已保存，屏幕像素尚未重新目视验收。

# 最新：医疗与投掷物（2026-10-23）

先读 [MEDICAL_THROWABLE_RESTORE.md](MEDICAL_THROWABLE_RESTORE.md)。三种药品的真实回血、三种投掷物的原生实体/轨迹/结束流程、能量饮料持续回血已有实机回归。七种补给的菜单拾取入口、动作中断和换图存档已补齐；最终 content-verified 会话 22 项运行检查和 3 项菜单检查全过、没有模块错误。完整动画、爆炸伤害和特效像素验收仍未完成，不能宣称已恢复全部原版对局。

# 本地拾取与原版交互提示（2026-10-23）

先读 [PICKUP_RESTORE.md](PICKUP_RESTORE.md)。已恢复原版 InteractHintListPanel 的 F 提示，修正拾取校验、清理、物品名称和配件兼容选择，以及载具“8 台实际生成 5 台”的菜单错误。冷启、拾取入账、8 台吉普绘制和换图清理已验证；地面物品模型尚未实现。最终运行会话见 active-run.json，旧 PID 均需核实。

# 人物衣服恢复（2026-10-23）

**用户已目视确认“衣服已显示”。** 自动穿着恢复及冷启动验证完成。

见 [OUTFIT_RESTORE.md](OUTFIT_RESTORE.md)。新增 local_outfit.js / local-outfit.json，原生 CE6E00 恢复上衣、裤子、鞋子，已接入人物 ready、武器恢复之前。原生应用和网格重建已验证，冷启结果及视觉确认以新文档最终记录为准。载具修复继续保留。

# 车身已显示（2026-10-23）

先读 [VEHICLE_RENDER_FIX.md](VEHICLE_RENDER_FIX.md)。用户已明确确认“能看到车身了”。根因是网格代理正常绘制开关未开启；生产 local_vehicles.js 在模型解析后主帧调用原生 97A7C0(entity,true)，同步 proxy bit12 / 实例 bit7。冷启动四车型和两轮上下车已通过，目录扫描结果见新文档。旧“车身不可见仍未修复”的段落为历史状态。

# 历史：接续 qcoder（2026-10-23 下午）

先读 [QCODER_CONTINUATION.md](QCODER_CONTINUATION.md)，再读 SYSTEMS_FIX_STATUS.md 历史。qcoder 已加入物理表筛选和菜单分类；本轮解开 SFC v3，纠正“全部载具资产缺失”和“D80=3 是异步加载阶段”的误判。车身不可见仍未修复。当前新会话 `run-20261023-sfc-collision-test` 已 map_ready，PID 要重新核实；以下上午“尚无物理过滤 / 无活跃会话”只代表历史时点。

# 历史交接：载具物理崩溃定位（2026-10-23 09:42）

**接手先读 [VEHICLE_HANDOFF_20261023.md](VEHICLE_HANDOFF_20261023.md)。** 108 的崩溃位于 A7DF2E；本轮实读汽车物理表没有 103/104/108，而旧菜单仅校验 common + appearance。尚未加入生产过滤，108 仍未修好。新会话 `run-20261023-vehicles-fix-4` 已启动，本轮没有生成测试载具；临时只读探针已停止。文档包含已验证项、当前进程、代码入口和接续步骤。

**09:43 最后核对：fix-4 已于 09:41:10 退出，原因未确认，没有新增 BugTrace；当前没有游戏/本地服务运行。active-run 中的 PID 已失效，接手需要重新启动。**

# 载具 / 天气修复（2026-10-23，工作中）

请先阅读 [SYSTEMS_FIX_STATUS.md](SYSTEMS_FIX_STATUS.md)。已修正上车车型字段、天气原生加载、F 下车提示；正在新会话回归。旧载具文档“完全没有车身模型”的结论被新 A/B 证据推翻，不能直接沿用。

# 最新：本地枪声与音效发声点修复（2026-10-22）

见 [AUDIO_EFFECTS_FIX.md](AUDIO_EFFECTS_FIX.md)。local_audio.js 已加入人物跑图启动链路；当前会话已热应用。枪声音频输出从约 0.000058 恢复到 0.7079。实际脚步动画触发与用户听感仍待确认。

# 最新追加：海岛和音频（2026-10-22）

见 [AUDIO_ISLAND_STATUS.md](AUDIO_ISLAND_STATUS.md)。海岛加载与落地已验证，HRTF/遮挡已开启且游戏音频有输出信号；实际听感、枪声和脚步声仍待用户确认。

# 无限法则本地版：当前交接（2026-10-22 18:45）

## 本轮追加：换弹改由引擎原生完成（`native: true`）

### 根因（终于定位到）

引擎判断「背包里还有多少备弹」是由 `0xFB43A0(holder, weaponItemId)` 算出来的：它遍历 `holder+0x90` 的桶链，把 `record+0x38` 累加（`record+0x2c==3` 且 `record+0x30` 等于该枪的弹药子类型）。本地枪由原生工厂造出来，服务端背包里没有对应弹药物品，所以这个查询恒返回 **0** → 引擎认为没子弹 → **直接拒绝换弹，动画自然不播**。

上一轮试过「往 `holder+0x90` 桶链里插假的弹药物品」，虽然确实把返回值从 0 变成了 300，但在大厅阶段改这张表会破坏哈希桶，客户端当场崩溃（`run-20261022-181117`）。

### 本轮做法：只改回答，不改数据结构

`local_weapons.js` 直接 hook `0xFB43A0`，当 itemId 属于本地管理的枪时返回 `profile.reserve[弹药类型]`。**完全不写引擎内存**，因此不可能破坏背包表。

```js
Interceptor.attach(b.add(0xfb43a0),{
 onEnter(a){this.weaponId=a[1].toInt32();},
 onLeave(r){const bullet=weaponBullet.get(this.weaponId);if(bullet===undefined)return;
  const value=Number(profile.reserve[bullet]);if(r.toInt32()!==value)r.replace(ptr(value));}
});
```

配套改动：
- `weaponBullet` 映射（枪 ID → 弹药类型）在 `equip()` / `status()` 里维护，`reset()` 清空。
- 换弹计时从 1.5s 放宽到 4s，并且**先看引擎有没有自己补上**：`gained>0` 判为原生换弹，只做备弹扣减、不再手动填弹；只有引擎完全没动才走本地兜底。
- `local_reload_complete` 增加 `native` 字段，用来区分两条路径。

### 实测证据（`run-20261022-183437`，用户亲自按 R）

```
local_input_action WEAPON_RELOAD
local_reload_started  weapon_id 10202
local_reload_complete ammo 30 reserve 195 native true
local_reload_complete ammo 30 reserve 182 native true
local_reload_complete ammo 30 reserve 162 native true
```

三次都是 `native: true`：**弹药是引擎自己补的**，本地兜底一次都没触发。备弹按实际打掉的发数递减（195→182→162），账目自洽。
另用 `reserve_hook_probe.js` 直接调引擎查询验证：`10202→162`、`10401→300`、`20001→279`（改之前全是 0）。

### 顺带修掉的启动参数缺陷

`character_roaming.js` 的就绪链路调 `globalThis.LocalRoamUI.ready()`，而 `LocalRoamUI` 定义在 `local_menu.js` 里；`local_menu.js` 只在 `-LocalMenu` 时才注入。所以 `start_character_roaming.ps1 -MapId 10021` 这种**直接进图**的启动方式，`ready()` 会被 `if(globalThis.LocalRoamUI)` 静默跳过 → **武器完全不恢复、HUD 也没有**（`run-20261022-182147` 就是这样，整个会话零条 `local_weapon_equipped`）。

修法：
- `instrument_client.py` 新增 `--local-ui`：只注入 Lua + `local_menu.js`，**不**开启大厅地图选择器（`LOCAL_MENU_ENABLED` 仍为 false，`native_scene_start_probe` 照旧自动进图）。
- `start_research.ps1`：`-LocalMenu` → `--local-menu`；否则只要是 `-CharacterRoaming` → `--local-ui`。
- `character_roaming.js` 增加兜底：没有 `LocalRoamUI` 就直接 `LocalRoamWeapons.restore()`，两者都没有则上报 `character_roaming_ready_missing`，不再静默失败。

### 用户已确认

- **开镜（瞄准镜）正常**（18:30 反馈）。

### 仍需用户目视确认

- 换弹**动画**是否正常播放（弹药已确认由引擎补，动画属于同一套原生状态机）。
- 切枪（1/2/3）动作是否正常。

---


## 本轮追加：HUD 弹药与输入放行（用户实测反馈后）

用户反馈：可以开火，但换弹没有动作、切枪动作有问题、开镜没有瞄准镜贴图、HUD 不显示子弹数、背包不显示子弹。

### 已修复并有实测证据

1. **HUD 弹药数不显示（已修好并验证）**。根因有两层：
   - `local_menu.js` 的 `close()` 调用 `qs.UISetAllPanelsVisible(false)` 关掉了全部面板，之后只重开了准星和血条，`EuCurWeaponPanel` 一直是隐藏的。
   - 即使显示，`EUCURWEAPONPANELLOGIC.LUA` 用 `qs.GetInventoryWeaponAmmoInBag(itemInfo.id)` 取备用弹药，而本地枪的备用弹药存在 `local-loadout.json`，原生背包里没有对应弹药物品，取到 0。
   - 修法：`close()` 之后重新显示 7 个 HealthHUD 面板；`local_menu.lua` 接管 `qs.GetInventoryWeaponAmmoInBag`，按**枪械 ID** 返回本地备用弹药；`local_menu.js` 每 400ms 把 `{枪ID: 备用数}` 推进 Lua 并调用 `LocalRoam.applyHUD()`（内部 `qs.UISetVisible` + `panel.UpdateData()`）。
   - 实测：HUD 显示 `30 | 262`，开火/换弹后数字实时变化，备用随换弹减少。
2. **R 换弹键真实生效（已验证）**。新增 `local_input_action` 事件后，用户实际按 R 得到 `WEAPON_RELOAD` → `local_reload_started` → `local_reload_complete`，备用 283→269→262。说明 `0xa4c160` 拦截链路对真实按键是通的。
3. **背包弹药显示**：本地背包「武器库」分类现在给每把枪追加 `[N号位 弹药/容量]`，弹药分类显示 `名称 × 备用数`。
4. **换弹/切枪改为放行原生管线**：不再把 `WEAPON_RELOAD`、`ACTIVE_WEAPON_*` 的按下状态清零，让引擎自己播动画；本地逻辑退化为兜底（切枪后 250ms 若原生没切过去，再调 `select()`）。换弹仍由本地 1.5 秒计时补弹，所以即使原生拒绝也一定能补上。

### 仍未解决

- **换弹动作/切枪动作/开镜贴图**属于原生动画与渲染层：本地枪虽由原生工厂 `FD1DF0` 创建、能开火、能扣弹，但引擎的动画状态机是否接受它还需要用户目视确认（本轮放行后未复测视觉效果）。
- 武器虚表 `+0x1c0/+0x1c8/+0x1d0` 三个槽位都跳到运行时解密区（`0x3769d59/0x376a361/0x376a468`），`+0x1c0` 单参数调用会访问越界（需要额外参数），暂未定位到换弹入口。
- 开镜贴图不是 Lua 面板（`UIFindPanel` 对 `EuScopePanel` 等全部返回 nil），走原生渲染；`QSScopeConfigTable`、`QSWeapon_UpdateScopeBehaviorParams` 只以名字注册，未在 SWIG 表里，暂未找到可直接调用的入口。

---

# 以下为上一轮记录（16:42）


## 用户目标与本轮状态

用户已亲自确认蹲/趴移动正常。本轮继续实现枪械开火，并扩展本地背包、弹药、配件；用户希望尽量接近原版。**当前仍是本地跑图/武器研究版，不是完整原版单机复原。**

本轮修复了两个真实缺陷，并在一份全新进程上重跑了完整库存夹具（全部通过）。

## 本轮修复（重要）

1. **截图调用中断了就绪链路（严重）**：`character_roaming.js` 在 crStage===3 分支里先调 `0xce4ab0`（截图），再置 `crStage=4` 并调用 `LocalRoamUI.ready()`。`0xce4ab0` 在游戏窗口非前台时抛 `Error: system error`，而该分支在 try 之外，异常直接冒泡，导致 **`ready()` 永不执行 → 武器/配件恢复永不执行**，槽位一直是空的，且每秒重试一次刷 `character_roaming_input_unlocked`。
   修复：把 `crStage=4` 与 `ready()` 提到截图之前，截图单独 try/catch 并降级为 `character_roaming_screenshot_skipped`。`native_scene_start_probe.js` 的 `startShot` 同样包住，避免把 startStage 打成 4。
2. **每帧诊断查询疑似吃掉 Tab 边沿**：`local_weapons.js` 主帧回调里每帧调用一次 `0xa4c160(manager, TOGGLE_INVENOTRY)` 并丢弃返回值。若该函数按帧latch按下边沿，这个调用会把 Tab 消耗掉（原生和本地都失效）。已删除该诊断调用与随之无用的 `queryAction`。
3. 新增诊断事件 `local_input_action {action}`：绑定动作真正按下时上报，用于确认 R/Tab/1/2/3 是否进了本地拦截。
4. `LocalRoamUI.ready()` 各步骤分别 try/catch，任一步失败都不会再卡住整个就绪流程，且必定发出 `local_menu_map_ready`。

## 已验证的结果（全新进程 run-20261022-170138）

`verify_inventory_runtime.py` 全绿（`"test":"result","passed":true`）：

| 枪械 | 开火前→后弹药 | 原生 StartFire 次数 |
| --- | --- | --- |
| M4A1（扩容） | 40→29 | 11 |
| MP5 | 30→20 | 10 |
| USP45 | 12→5 | 7 |
| 雷明顿870 | 5→3 | 2 |
| 雷明顿700 | 5→4 | 1 |
| 沙漠之鹰 | 7→2 | 5 |

- **换弹现在有真实耗弹证据**：弹药 30→40，备用 300→290（正好 10 发），不再是满弹匣的空操作。
- **扩容弹匣拆卸正确夹紧**：容量 40→30、弹药夹到 30，无溢出，默认模型 40451 回装。
- 配件 40110/40202/40303/40403/40502 全部装入成功；M4A1 拒绝 15 倍镜 40301；背包 9 个分类。
- **重启恢复**：新进程启动后三槽自动还原（M4A1 40/40 + 五配件、10401 5/5、USP45 12/12）。
- **换图**：10020 → 10021（EU_IceLandNight_4096）加载成功，落点、三槽与五配件全部还原（容量 40）。

## 必须继续验证的边界（不能忽略）

1. **真实键盘 R/Tab/1/2/3 未验证**：需要游戏窗口在前台。注入式 SendInput 已确认会因窗口非前台而丢键（`foreground:false`，游戏侧无任何按下记录）。请用户在游戏里亲自按 R、Tab、1、2、3 后查看 `local_input_action` 事件。
2. 通过 hook 伪造 `0xa4c160` 返回值无法验证本地拦截：探针的 onLeave 在 `local_weapons` 之后执行，强制写的 down 到不了拦截逻辑（Tab 测试未产生 `inventory` 命令即为证据）。只能靠真实按键。
3. 开火只验证到「原生 StartFire 被调用 + 扣弹」；命中、伤害、弹道、枪口特效、音效仍未验证。
4. 33 把枪没有逐一测，只测了上表 6 把。
5. 菜单偏好恢复、选枪后的挂载位置（D8F4D0）仍需视觉检查；部分动作与 HUD 尚不完整。
6. 尚未恢复原版拖拽背包、地图拾取/丢弃物品、AI 敌人、伤害判定、完整对局和全部动画。不能描述为「与原版一样」。

## 当前代码与入口

- 桌面：`C:/Users/<you>/Desktop/无限法则 - 本地跑图.lnk`。
- 根目录：`启动本地人物跑图.cmd` → `start_character_roaming.ps1` → `start_research.ps1 -LocalMenu`。
- 默认本地大厅选地图/枪械；地图中 Esc 打开菜单，点「背包与配件」；背包分类最后一项为地图选点复活。
- `local_weapons.js`：原生工厂/初始化、三个槽位、GC 根、配件、备用弹药、1.5 秒本地换弹、输入转接、配置保存。
- `local_menu.lua` / `local_menu.js`：原版面板外壳、33 把枪、配件兼容过滤、库存摘要、地图/复活、命令投递。
- `instrument_client.py --character-roaming` 先加载 local_weapons，再加载 character_roaming；LocalMenu 时追加本地 UI。
- `character_roaming.js` 属性 10..29 补全站/蹲/趴速度，用户已验证。
- `local-loadout.json` 保存三个槽位、手动配件、各弹药物品的备用数量。

## 关键原生结论（纠正旧笔记）

所有地址都是 Europa_Client.exe 相对 RVA，仅此客户端构建适用。

1. 创建：`FD1DF0(itemId,1)`。选择 QSRifle/QSShotgun/QSWeapon 并复制原生 itemInfo。
2. 初始化：`D043F0(w,完整Man, cfg+79C动画ID, 唯一instanceId)`，**四参数**。Man+150 是场景 UniqueID；w+58 接口+28 必须解析回 Man。
3. 必须在 Init 前 `D02E60(w,28字节运行参数)`：+10 int 初速=round(cfg+50 float)，+14 int 弹匣=cfg+48。
4. 弹药 w+90；当前弹药子类型 w+94；最终容量 w+810；服务器容量覆盖 w+E94。**E28 不是容量，cfg+4C 是 RPM。**
5. `w+58` 接口虚表+50 返回弹药**子类型**（1=5.56，5=12号，4=.45），不是物品 ID。用 FD2250(30001..30100) 的 type=3、subType 匹配成背包物品 ID。
6. itemInfo=`[w+50]`，+1F8 基础弹匣、+1FC 扩容弹匣。
7. D08CB0 加载配置；D07CA0 重算配件参数；D08AFD 在把 E94 覆盖到 810 之前，仅对本地托管枪写正确容量。不要把这些函数当 Tick。
8. 真正 Tick 虚表+18=D03D80，TickWhenActive D03E10。SetAmmo 虚表 1D8；GotoInactive 1A0；GotoActive 1A8；StopFire 1B8。
9. 槽表 `[Man+130]+B0`；槽查询 FB38F0(holder,slot)；FB3C30 更新原生激活状态；D8F4D0(man,w,slot,1) 分配原生挂载状态。
10. **GC 根** main+30528F0 为 begin/end/cap pointer vector，GC 标记 48BD30 会访问。扩容 472670(vec,end,&object)。485D10 不是 pin。
11. 配件兼容 D07B90(w,itemId,true)；D07860(w,subType,part) 装入；D07B10 卸下；D077D0 恢复默认；D07CA0 重算。槽 0 枪口、1 握把、2 瞄具、3 弹匣、4 枪托、5 其他。
12. 输入 A4C160(manager,&internedActionKey)，state+2 按下，+4 对应 main+3029B58 帧。**不要每帧额外调它做诊断，可能消耗按下边沿。**
13. `0xce4ab0`（截图/取景）在窗口非前台时抛 `system error`，任何调用点都必须 try/catch。

## 测试与下一步

- 当前活动记录 `active-run.json` 指向 `run-20261022-171814`（每次重启必重读，不能盲用旧 PID）。
- `verify_inventory_runtime.py`：真实菜单回调选枪、内部 FIRE、六枪、五配件、兼容性、弹匣、背包、换弹耗弹断言。
- `key_real_test.js`：SendInput 真实按键 + 原生动作状态读取（要求窗口前台）。
- `action_rate_probe.js` / `action_state_probe.js`：确认动作是否被轮询及状态结构。
- `key_force_tab.js`：验证「伪造 A4C160 返回」不可行（hook 顺序限制），保留作为反例。
- 原有 `weapon_spawn.js`、`weapon_initialize_probe.js` 等探针是失败历史，切勿当正式入口执行。
