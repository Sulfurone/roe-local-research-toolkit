> **2026-10-25 证据更正**：10 月 24 日隔离背景音乐后，101 驾驶输出仍接近 0；旧总输出峰值不能证明发动机已经有声。最新排查摘要见 [本轮交接第 7 节](HANDOFF_20261025_SOLO_APPEARANCE.md#7-其他未完成工作避免误交接)。本文其余内容保留为历史记录。

# 无限法则本地版：工作交接与交互说明

> 后续最新工作前线见 [开局选点、右侧装备与出生动画交接](HANDOFF_20261024_STARTPOINT_ANIMATION.md)。用户已确认能选点，但仍看到高空掉落；最新侧栏和过渡实验有未验收项。本文保留车辆音频阶段记录。

更新：2026-10-24，最近一次实机检查约北京时间 09:52。项目目录为 `E:\Program Files (x86)\Steam\steamapps\common\Ring of Elysium`，以下相对路径均从 `offline-research/local-server` 起算。

## 1. 接手先看

用户目标是离线进入原版地图，控制人物、使用武器与补给、驾驶载具，并逐步恢复主界面、选图和选点出生。用户要求保留 Markdown 交接记录；已经授权在此范围内继续修复，无需反复询问确认。

最近正在处理“开车没有声音”。生产代码已补上驾驶位上车后的原版发动机启动通知，本轮已经冷启动新客户端，完成两款吉普实际加速及 105 下车、重新上车的回归。已确认原生发动机激活、转速变化、播放事件和游戏音频会话输出；**尚未由人工实际听声音确认，也未完成所有车型验证**。

开局真实鼠标选点、小地图和存活人数仍需要画面验收。不要把原生接口返回成功、内部坐标变化或以前的 46 项检查，当成这些用户问题已全部解决。

本轮最后一次工作因用户要求写文档而停止测试，没有继续重启客户端或更改游戏交互。

## 2. 启动与玩家交互

游戏根目录现有启动文件：

- `启动本地人物跑图.cmd`：进入本地菜单流程，默认通过 `start_character_roaming.ps1` 的 MapId=0 分支启动。
- `启动海岛人物跑图.cmd`：直接以 MapId=10019 启动人物跑图。
- `启动地图自由浏览.cmd`：旧地图浏览入口，不能拿它代替完整人物模式验证。

CMD 已使用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...`，用于单次进程执行。之前“系统禁止运行脚本”的报错应从这些入口解决，不需要永久修改系统执行策略。

基本操作：

| 操作 | 当前入口与说明 |
| --- | --- |
| 人物移动、转视角 | 点击游戏获得焦点，使用 W/A/S/D 和鼠标；此前用户已确认人物与视角可控制 |
| 打开或关闭本地菜单 | Esc；`local_menu.lua` 重定向了原版 EscProcess |
| 选地图 | 本地菜单；切图由 `LocalRoamScene.request(map_id)` 执行 |
| 选择出生位置 | 菜单选点入口打开原版选点面板；已补 AS 初始化，但实际鼠标点击仍待验收 |
| 上车、下车和拾取 | 原版 INTERACT 动作，默认 F；附近本地目标由 `local_interact.js` 补齐 |
| 武器、配件、补给、天气与召车 | 使用本地菜单对应项目；背包也有本地菜单入口 |

修改源码后，正在运行的旧 Frida 脚本不会自动更新。完整验证应退出旧会话，再从人物模式入口启动。不要同时启动两个客户端或两个监听同一端口的本地服务。

## 3. 开车无声的修复位置与原因

生产文件：`local_vehicles.js`，`board(rid, seat)`。

此前本地 BC_ENTER/GETON_SYNC 能生成和驾驶车辆，碰撞、轮胎事件也存在，但原生车辆音频记录的 `record+9`（engine active）为 0。未激活时，原生音频更新不会进入正常发动机 RPM/油门分支。

上驾驶位且确认原生上车成功后，现调用原版 `qs.StartEngine(RID)` 对应入口：

```text
audio manager = *(Europa_Client.exe + 0x30408D8)
E4DC00(manager, RID, 0, emptyVector, 0)
```

该接口设置启动请求 `record+8`，随后原版 `E4ED10` 初始化车型声音 switch、设置 `record+9=1`，再由 `E4F300` 根据真实物理 RPM 更新 RTPC，并自行触发发动机播放和停止。没有每帧反复播放录音，也没有强行伪造转速。

`local_interact.js` 的上车交互和菜单入口均调用 `LocalRoamVehicles.board`，所以会走同一初始化。

原生地址只适用于当前客户端构建，均为 Europa_Client.exe 的 RVA：

| 地址 | 用途 |
| --- | --- |
| 0x10F6BC0 / 0x10F7D00 / 0x10F7D90 | 生成车辆 / GETON_SYNC / GETOFF_SYNC |
| 0xE4DC00 | 原版 StartEngine 对应事件分发入口 |
| 0xE4ED10 / 0xE4EEF0 / 0xE4F070 | 发动机初始化 / 播放 / 停止 |
| 0xE4F300 | 按真实车辆状态更新音频 |
| 车辆 +0x560 / +0x57C | 地面载具 RPM / 油门 |
| 0x20B4210 | Wwise 按名称提交播放事件 |
| 0x941380 | 上游音频位置更新，输入坐标厘米；下游转换为米 |

## 4. 本轮实机证据

会话：`captures/run-20261024-audio-drive-check`，本轮以最新源码冷启动，并显式开启测试夹具。

| 项目 | 101 四座吉普 | 105 越野吉普 |
| --- | --- | --- |
| 实际位移 | 约 29.50 米 | 约 3.80 米 |
| 最高物理 RPM | 7639.44 | 6265.38 |
| 最大油门 | 1 | 1 |
| 发动机事件 | Play_vehicles_jeep_4seats | Play_Vehicles_PICKUP |
| 非零 playing ID | 21 | 38 |
| 静止 / 行驶会话峰值 | 0.01508 / 0.02937 | 0.08268 / 0.11051 |

峰值来自该游戏进程的 CoreAudio 会话，包含背景音乐、碰撞等声音，**不能单独证明发动机的听感或响度**。两次运行峰值也不能直接用于比较车型音量。系统及游戏音量没有被修改；读取时游戏会话音量为 1.0、未静音。

105 另做了一轮下车、重新上车、加速和松油门：

- 下车恢复 rider_state=14，重新上驾驶位为 rider_state=1。
- 最高 RPM 5898.80；17 个采样中，16 个观察到发动机激活和原生 loop playing。
- 本轮仅一次 Play_Vehicles_PICKUP，playing ID=51，没有每帧播放刷屏。
- 随后原生 Stop_Vehicles_PICKUP、Stop_vehicle_tires_ride、Stop_vehicle_tires_drift 均被捕获。
- 截至本轮检查，该会话 trace 中事件名含 error 的记录为 0。

证据文件：

- `captures/run-20261024-audio-drive-check/vehicle-audio-drive-101.json`
- `captures/run-20261024-audio-drive-check/vehicle-audio-drive-105.json`
- `captures/run-20261024-audio-drive-check/vehicle-audio-lifecycle.json`
- `captures/run-20261024-audio-drive-check/vehicle-audio-positions.json`
- 同目录 `trace.jsonl` 与 `bridge-stderr.txt`

生命周期测试首次汇总时，辅助 Python 对首帧 `audio=null` 未作兼容而报错；之后从同一真实 trace 重新汇总并执行断言通过。该报错不是客户端崩溃。接手解析采样时使用 `(sample.get('audio') or {})`。

本轮还通过了 `local_vehicles.js`、`local_audio.js`、`local_menu.js`、`vehicle_audio_test_fixture.js` 的 Node 语法检查，以及三个测试/启动 Python 文件的 AST 解析。

## 5. 测试入口与当前会话

新增 `vehicle_audio_test_fixture.js`，只在显式传入 `--vehicle-audio-test` 时，由 `instrument_client.py` 拼入**同一个主 Frida session**。`launch_session.py` 会转发该参数。普通桌面启动不启用它。

夹具短暂驱动游戏内部 MOVE_FRONT 查询，不发送 Windows 按键；单次最多 6 秒，随后释放。它只测试原生输入、物理 RPM 和声音，不伪造转速、不主动强制播放发动机。

可复现流程（先结束旧测试会话）：

```powershell
& 'C:/Users/<you>/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' offline-research/local-server/launch_session.py --map-id 10020 --duration 3600 --vehicle-audio-test --run-name run-audio-recheck-unique
& 'C:/Users/<you>/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' offline-research/local-server/verify_vehicle_audio_drive.py --vehicle 101
& 'C:/Users/<you>/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' offline-research/local-server/verify_vehicle_audio_drive.py --vehicle 105
```

run-name 目录必须不存在。测试会真实生成、驾驶车辆，确认人物模式地图加载完成后再执行；测试脚本会等待 ready 事件。`verify_vehicle_audio_drive.py` 保存数据，不会自动替代听感验收。每次脚本执行结束时通常仍坐在刚测试的车辆里；后续生命周期测试已让本轮人物下车。

北京时间约 09:52 核实存活的进程：客户端 12048，Bridge 3264，本地 Server 1780；创建时间约 09:41:53，测试时长一小时。**这些只是当时快照，接手必须重新读取 `active-run.json` 并核实进程，不能直接对旧 PID 操作。**

## 6. 本地菜单命令接口

`local_menu.js` 每约 100ms 读取 `LOCAL_MENU_OUTBOX`；当前会话为 run 目录下 `menu-command.json`。写入后由主游戏帧执行。应先写临时文件再原子替换，并使用严格递增、JavaScript 安全整数范围内的 sequence：

```json
{"sequence":1792800000001,"action":"vehicle_spawn","item_id":101,"count":1}
```

上面 sequence 仅为结构示例，实际使用当前毫秒时间戳并确保比文件上一次值更大。不要复用示例常量。

| action | 参数或效果 |
| --- | --- |
| menu / resume | 打开菜单 / 关闭菜单并恢复操作 |
| enter | map_id；切地图，清理本地物品和载具注册 |
| pick | 打开原版出生选点流程 |
| vehicle_spawn | item_id=车型 ID；count=1..8，可选 spawn_mode；单辆且原先步行时延迟自动上车 |
| vehicle_board / vehicle_leave | 进入最近一次生成的车辆 / 下车 |
| vehicle_nearest | 在限定距离内寻找已注册车辆并上驾驶位 |
| inventory / weapon / accessory | 背包、武器与配件；具体参数以 local_menu.js 对应 case 为准 |
| medicine / throwable_equip / throwable_throw | item_id；投掷可带 low_throw；由现有补给模块处理 |
| weather | weather_id；原生天气切换 |
| interact | 执行附近本地交互目标 |

内部驾驶测试另读取 `menu-command.json.drive-test.json`，例如 `{"sequence":当前递增时间戳,"duration":4500}`。**只供带测试夹具的会话使用，不是面向玩家的普通功能。**

## 7. 需要保留的既有修复

- 车身：原网格存在，原生渲染代理未开启；通过 0x97A7C0 启用。用户已确认能看到车身。
- 吉普轮胎：独立子部件也需要开启绘制。见 `VEHICLE_WHEEL_FIX.md`，不要只开车身后回退轮胎修复。
- 衣服：原生换装恢复上衣、裤子和鞋子，用户已确认显示。见 `OUTFIT_RESTORE.md`。
- 蹲趴移动、人物与视角控制此前已获用户确认；保持输入解锁逻辑。
- 枪械、配件、背包、医疗、能量和投掷物已有本地实现；完整原版对局尚未恢复。见 `MEDICAL_THROWABLE_RESTORE.md`、`SPAWN_THROW_SWITCH_FIX.md`、`PICKUP_RESTORE.md`。
- `local_audio.js` 为与监听器重合的本地主体发声对象 3 做 10cm 偏移，修复原空间音频路径近乎无声；不要删除或扩大成所有音源都贴近玩家。

## 8. 仍未完成及接手顺序

1. 对两款吉普在实际游戏中听声音，检查加速、滑行、下车、换车后的持续声音与响度。当前有原生链路和总输出证据，没有人工听感结论；其余车型待逐项验证。
2. 验收真实鼠标选点。已修 `allowMouse`、`allowPickPoint` 双条件：先 StartCountDown({'LocalPlayer'},0)，再 InitMapEnable(true)，并对未 ready 的电影重试。需要确认物理点击确实发出 SET_START_POINT，再验证出生落地。
3. 验收退出菜单、背包和上下车后的小地图、罗盘、存活人数。恢复逻辑已保存并加载新源，画面尚未确认；本地只有一个角色，存活人数应该如实为 1，死亡为 0，不能伪造联网百人对局。
4. 保持投掷动作、真实胶囊出生落地、枪械换槽和配件功能的回归。用户最新反馈优先于历史内部检查通过记录。

详见 `HUD_SPAWN_VEHICLE_AUDIO_20261024.md`；其中旧段落“尚未冷启验证驾驶”已被本文件的新证据更新，选点和 HUD 的未验收说明仍有效。

## 9. 避免重复踩坑

- 不要在第二个 Frida session 再 hook 主会话已 hook 的 0xD4CA40、0xA4C160、0x133B5B0、0x20B81C0。本轮测试夹具的 0xE4F300、0x20B4210 也已 hook；二次 attach/detach 可能覆盖主 trampoline。优先把新观察逻辑放入同一个主脚本并冷启。
- 0x1A3700 是可用的完整函数入口；0x1A38CF、0xD4CC0D 是函数中间地址，不能当入口挂钩。
- 不要把强写音频 record+0xA 或每帧 Play 当成修复。静止 RPM=0 时原版自行 Stop 是预期行为。
- 脚本中的 RID 是 64 位值。人物 +0x3A8 在下车后仍保留最后车辆 RID，要同时检查 +0x3A0=14 的步行状态。
- 车辆 205 裸生成会崩溃，保持过滤；103/104/108 缺少适用物理配置，不要为了填满菜单强行放开。
- 保持原始 EXE/DLL/VFS/SFC 不变。不要运行历史作废的 fix_skin_path、dismiss_error，或强写 D80/DFD。
- 不要全文打印巨大 `vfs-index.json`；用 JSON 解析后筛选。当前 PATH 没有 rg，可以使用 Python 检索。
- 文件统一 UTF-8；终端显示乱码不代表原文件坏了。本轮检查现有文档没有 U+FFFD 替换字符。
- 最新游戏截图工具仍报 `FrameArrived timed out: timed out waiting on channel`。本轮只激活了重新枚举的游戏窗口，没有依赖旧坐标点击。以后遇到用户主动停止 Computer Use，应立即停发窗口输入。

## 10. 本轮源码指纹

以下用于确认接手是否拿到同一份源码，不是版本兼容保证：

| 文件 | SHA256 |
| --- | --- |
| local_vehicles.js | cb86f60c91eb73579a94b306cabf662cfb8e18eb41955256b944e721f413be23 |
| local_audio.js | 318ee79d8305e6aae5133ca3082e5ca0950a60ce1d54fa159f6e9a00cd2f1d88 |
| local_menu.js | 3d28b93e00f1c2679c42702cb7eac4c45b359e98562cbc3dac8d401cd48ca086 |
| local_menu.lua | 05c11c76312d36d4fb56cf7ec053368c07622cf96559915cbe72f739093a9365 |
| vehicle_audio_test_fixture.js | e3b897bcff14a62ef8ebc9490e89c67a5e3a804281d10cf501afa3ddba5facbb |
| instrument_client.py | c89f5b0931a45c1f4908a66470001dcfc2750eff62aa3c07ff5e7c5f81151ba4 |
| launch_session.py | fcb67de86309d5b8f995da579c4fac65492af2d1944ab63778faed56f77d9686 |
| verify_vehicle_audio_drive.py | 71fcc686da48f8852d004798cad5175443090dd72f67444fcb97e6fa705e2a69 |
