# 原生 T 键触发展开已实测 + 三套装备回归（2026-10-24 17:52，18:05 复核）

会话 `run-20261024-player-controls`（客户端 12056，17:41 由另一并发会话启动，
加载的是 17:37 更新后的源码）。本文件记录的是**这份源码**上的实测结果。

## 1. 源码身份

| 文件 | 实测构建 = 当前源码 |
| --- | --- |
| local_adventure.js | `82717B473D838ECCB90EF27833E86AB2A3395B52322D419C843C081ACA76B1BA` |
| local_menu.js | `0E75AEB4C24E07C1C021CA894610F87DA88C5F95C963E99C0320F0DF728C495D` |
| local_menu.lua | `50B9FFF1BB6199E255709DEC1BA888E7AB2EE748C27EFC04EEAEAEC705F1ACB3` |

18:04 复核：磁盘源码与 17:41 快照逐字节相同（3.1 的临时诊断/脉冲改动已
全部撤回），所以本文件所有实测都对应现在这份源码。

改动要点：`local_adventure.js` 的 `A4C160` hook 在空闲分支里把
`SKI` / `GET_ON_GLIDER` 的动作查询结果交给 `observeBinding()`；按下沿
（+2 字节非 0 且 +4 帧号等于当前帧）转成 `bindingPending`，下一 tick 由
`consumeBinding()` 处理。若原生处理器已经完成状态迁移则只记账
（`mode:'native'`），否则由本地状态机补一次迁移（`mode:'local'`）。
滑翔翼仍保留空中门槛（`man+1190 → +7a`）并避开拾取/载具交互键。

## 2. 原生按键链路证据

`run-20261024-player-controls/trace.jsonl` 中共 11 次
`local_adventure_binding_pressed`，全部 `key=SKI`、`ability_id=14`，
帧号 46051 → 47913（约 17:50:50 – 17:51:23 UTC+8），每次紧随
`local_adventure_binding_handled{action}` 与对应的
`local_adventure_deployed{state:31}` / `local_adventure_folded{state:0}`：

```
50:50.17 pressed fold  46051 -> folded   state 0
50:51.00 pressed deploy 46097 -> deployed state 31 (mode fsm)
52:48.84 pressed deploy 46180 -> deployed state 31
53:03.80 pressed fold   46211 -> folded   state 0
53:82.56 pressed deploy 46258 -> deployed state 31
51:05.33 pressed fold   46886 -> folded   state 0
51:06.61 pressed deploy 46964 -> deployed state 31
51:19.12 pressed fold   47690 -> folded   state 0
51:20.47 pressed deploy 47773 -> deployed state 31
51:21.51 pressed fold   47833 -> folded   state 0
51:22.88 pressed deploy 47913 -> deployed state 31
```

**没有自发触发**：
- 17:41:35（bridge 启动）到 17:50:48 共 9 分多钟，没有一次
  `binding_pressed`，期间有地图加载、出生和一次菜单驱动的滑雪展开/收起。
- 17:51:55 之后的干净对照：`verify_adventure_deploy.py --ability 14`
  全程只有菜单触发的 `deployed{31}` / `folded{0}`，没有 `binding_pressed`。
  说明 `observeBinding()` 没有把帧内查询误判成持续按下。

`transport_send_input` 是每 5 秒一次的传输心跳，与按键事件无对应关系。

**边界**：这些事件证明「原生动作查询报告按下 → 状态机正确展开/收起」，
但无法从本机日志区分按下来自物理键盘还是注入。屏幕像素与鼠标点击仍未验收，
不能把本条当作完整人工验收。

## 3. 三套装备回归（同一源码、同一会话，10020 区域 4）

| 装备 | 触发方式 | 展开 | 收起 | 稳态采样（`steady`） |
| --- | --- | --- | --- | --- |
| 滑雪板 3 | 菜单 + 原生 T | state 25 | state 0 / pose 14 | 8/8（18:05） |
| 自行车 14 | 菜单 + 原生 T | state 31 | state 0 / pose 14 | 8/8（18:03）；10019 重载后 12/12 |
| 滑翔翼 2 | 菜单（pose 路径） | pose 3 | pose 14 | 8/8（18:05） |

稳态采样指展开后到收起前，每次 `adventure_check` 都同时满足
“state（或 pose）在目标值”与“原版谓词为 true”。三套装备在重载后的
10020 场景里全部通过，落点均为区域 4；滑翔翼上一轮的地面/落地差为
−0.73 cm（详见 3.1 与 `adventure-deploy-*.json`）。

一次收尾观测：菜单收起自行车后 `state` 曾读到 5（`lastState` 0、pose 14、
`deployed:null`），随后干净回归中收起稳定在 0。推测是 FSM 从骑行回到
站立时的过渡状态，未影响 `deployed` 记账，但若要严格对齐原版还需确认
state 5 的含义。

### 3.1 自行车回滚已定性：世界实例脏状态，重载即恢复

17:53 的观测：`starting_kit 14` → `adventure_use` 后立即读到
`deployed{state:31}`；下一次 `adventure_check` 即变成
`state 0 / pose 14 / bit0 1`，原版 Lua 谓词同时从
`IsLookAtPlayerBmxActive=true` 变为 `false`。17:57 在 16:48 成功过的
坐标 (409600,409600) 复测仍然回滚，滑雪在同客户端同坐标稳定，因此当时
怀疑是 17:37 绑定改动造成的回归。

18:01–18:03 的关键对照改写了结论：**切换地图、重载场景后，同一客户端
（仍是 82717 构建、仍是 1 帧动作脉冲）在 10019 与 10020 都能持续展开。**

| 场景 | 地图 | 采样（展开后到收起前） | `steady` |
| --- | --- | --- | --- |
| 切到海岛后 | 10019 区域 4 | 12 次，state 31、`BmxActive=true` | 12/12 |
| 再切回雪山 | 10020 区域 4，落点 (403100,403100) | 8 次，state 31、`BmxActive=true` | 8/8 |
| 同一重载后的 10020 | 滑翔翼 / 滑雪 | 各 8 次，pose 3 / state 25，谓词均 true | 8/8、8/8 |

也就是说：回滚只出现在那个连续做了 11 次原生 T 切换、又反复菜单展开/
收起的 10020 世界实例里，重载地图即清除；不是构建回归、与坐标无关，也
不需要改 1 帧脉冲。推测是快速反复切换后残留的骑行实体/能力状态让游戏
的权威 tick 立即退出骑行态，但未逐项证实。**排查中临时加入的 8 帧脉冲
与 `componentKey`/`active` 诊断已全部撤回，磁盘源码与实测构建逐字节一致。**

`verify_adventure_deploy.py` 现在输出 `summary.steady`（展开后到收起前
仍满足“state 在区间内且原版谓词为 true”的采样数 / 总采样数；哈希
`8DA53359…`）。以后判定展开是否真的生效，看 `steady.checks ==
steady.active`，不要只看 `local_adventure_deployed` 事件。

## 4. 复现

```
# 会话已在运行（active-run.json 指向 run-20261024-player-controls）
python verify_adventure_deploy.py --map-id 10020 --ability 14 --spawn-region 4 --hold 4
python verify_adventure_deploy.py --map-id 10020 --ability 2  --spawn-region 4 --hold 4
```

切装备前若已有展开的装备，先 `adventure_fold`，否则 deploy 会以
`Fold the active adventure equipment before changing spawn position` 拒绝。

## 5. 仍未完成

- 物理鼠标点地图四角、原版卡片点击、HUD 像素、滑翔翼空中按 F/空格的实机验收。
- state 5 的语义。
- 夜间 10021 缺 `FA_BUILDING_029_INTERIORVOLUME.QSG`，见
  `NIGHT_MAP_10021_BLOCKER.md`。
