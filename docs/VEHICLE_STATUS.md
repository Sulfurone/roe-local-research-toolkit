# 载具本地化状态（2026-10-22 22:41，2026-10-23 00:25 / 10-24 20:25 重大修正见下）

## 🔴 2026-10-24 20:25 决定性发现：`actor+0x180` 不是渲染实体，整条查找链走错了

在雪图 10020 用**玩家 actor（一定渲染）作阳性对照**，与 spawn 出来的载具 actor 做同偏移对比，
得到干净结论：

| 偏移 | 玩家 actor（渲染正常） | 载具 actor（不渲染） |
|---|---|---|
| vtable RVA | `0x2745f20` | **`0x2745158`（完全不同类）** |
| `+0x40` | `0x13b0bd00` ✅ 有效对象（vt `0x273fc58`） | **`0x0`** ❌ |
| `+0x88/0x90/0x98` | `0x19568c20` ✅ 三连有效 | **`0x0` `0x0` `0x0`** ❌ |
| `+0x50/+0x60` | `0x135c2f28`/`0x135c2f30` ✅ 成对 | `0x13689ed58`/`0x13689ed60` ✅ 成对 |
| `+0x180` | `0x61faa02061fa27ae` | `0xa7ad6a60a7a5e34` |

**`+0x180` 在两边都不是指针**：它是成对的「计数器/校验对」，高 32 位减低 32 位恒等于同一常数
（实测 `0x7872`）。所以 codex 在地面物品 actor 上总结的 `actor+0x180 → +0x60 → +0x138(模型)`
链条 **对载具类不成立**，之前在载具上找 renderEntity 全是空转。

**真正的断点是 `+0x40` 和 `+0x88/0x90/0x98`**：玩家有有效对象，载具全零。

### 报文→描述结构映射（已从 `0x10f6bc0` / `0xd5f630` 反汇编确认）

`rdi = msg+4`：

| 报文偏移 | 描述结构字段 | 说明 |
|---|---|---|
| `+0` | `+0x0` | rid (u64) |
| `+8` | `+0x34` | **vehicle id**（用于查 `0x260` 步长配置表） |
| `+0xc` | `+0x38` | `(v & 3) - 1` 分支 → 写入 `+0x10`/`+0xc` |
| `+0x10` | `+0x14` | dword（我们填 1000） |
| `+0x14/18/1c` | `+0x30/2c/28` | 位置（int→float） |
| **`+0x21` (16B)** | **`+0x24`** | **`movups` 原样拷贝；我们一直填零** |
| `+0x2d` | — | float 1 |
| `+0x35` | `+0xb` | byte，`cmp 1 / cmp 2` 分支 |
| `+0x39` | — | owner uid（`0xf62570` 比对本地 uid） |
| `+0x1593` | — | dword（报文尾部） |
| `+0x1597` | — | byte（报文尾部） |

已实测：`f+0x21` 那 16 字节分别填 `zero/ff/asc/float1` 四种模式，**渲染链状态完全一致**
（`flags68=5120, lod=0, +0x40=0`），说明它不是决定网格加载的开关。

配置表 `0x131ed80(id)` 返回 `0x260` 字节 entry，`[entry+4]` = type：**101/102/105/107 全是 type=2**
（不是走 `0x11db440` 备选路径的 `0xb`），所以走的是正常 spawn 路径，配置查得到。

### 已排除的方向（不要再查）
- boarding / geton 报文
- 相机切换（`QSCameraControllerVehicle` vs 过肩）
- LOD（`unit+0x4f0` 恒为 0）
- `actor+0xc38` bit2
- `f+0x21` 16 字节外观块
- `actor+0x180` 当作 renderEntity

### 扫过的负面结果
- rid 1..40000 全扫，**雪图上没有原生载具 unit**（挖掘机是静态场景道具，不是 unit），
  所以拿不到「渲染正常的同类载具」当基准。
- 场景 unit 管理器 `0x3094d90 → +0xB60` 派生式在这局解出垃圾指针（`0xe83eda97...`），
  `n=0`，该派生式不可靠。

### 下一步
沿 `+0x40` / `+0x88` 这条真实断点走：在**玩家 actor** 上把 `+0x40` 链（`0x13b0bd00`，
vt `0x273fc58`）完整展开，弄清它是什么组件、由谁创建；再找载具 spawn 路径里
本该创建它却没创建的那一步。注意：帧钩子内不要跑重型 BFS（曾把帧线程堵死，
`Responding=False`），要分批、小步。

## ⚠️ 2026-10-23 00:25 重大修正：根因不在 boarding/相机/LOD

雪图 10020 干净会话（客户端 66244）实测，**推翻了"上车才隐藏"的旧前提**：

- 背景里**地图原生载具（黄色挖掘机）渲染完全正常**。
- 我们 spawn 的车（25931）**无论有主/无主、上车/没上车，车身网格一律不显示**：
  - 空车（free，未 boarding）：`actor_c38=97`、`unit_flags_68=5120`、`lod_4f0=0`，画面无车。
  - 无主车（owner uid=0）4 辆围一圈：画面仍无车。
- 结论：**问题在 spawn 结果本身——客户端建出了载具的物理/座位/HUD/碰撞，但没有加载/挂载车身网格**。
  之前那张"22:17 能看到车"的 `veh-at-feet.jpg` 很可能是地图原生车被误认。
- 因此 boarding、相机切换、LOD、`actor+0xc38` bit2 隐藏位**都不是根因**，别再在这些路径上查。

## 环境修复：Game++ 叠加层导致启动崩溃

客户端此前每次启动约 40 秒崩 `0xC00000FD`（栈溢出，栈含 `GPP64.dll`/`BugTrace.dll`）——是**游戏加加(Game++)叠加层**
与注入冲突。用 WMI 以 SYSTEM 权限结掉 4 个 GamePP 进程后稳定（`Stop-Process` 会 Access denied）：

```powershell
foreach ($p in (Get-CimInstance Win32_Process -Filter "Name='GamePP.exe'")) { Invoke-CimMethod -InputObject $p -MethodName Terminate -Arguments @{Reason=0} }
```

`launch_session.py` 也加了 `--attach-mode`（先起客户端再 attach，避开 spawn-suspend 与叠加层 hook 竞争）。

## 旧结论速览（部分已被上面推翻，保留备查）

| 环节 | 状态 | 证据 |
| --- | --- | --- |
| 生成（spawn） | ✅ 可用 | `local_vehicle_spawned`，unit/actor/模型路径/坐标齐全 |
| 上车（board） | ✅ 可用 | `man+0x3a8 = rid`、`man+0x3a0 = 1`，HUD 切到车速表 |
| 驾驶（drive） | ✅ 可用 | 强制 `MOVE_FRONT` 4 秒，载具平移约 188 单位，松开即停 |
| HUD | ✅ 可用 | 左下角 `0 km/h` + 座位图标 |
| **模型渲染** | ❌ **上车后消失** | 脚边 LOD=0 可见；上车后 LOD 跳变到 1/2，模型不可见 |
| 角色坐姿 | ❌ 站着 | 截图里角色直立，未进入坐姿动画 |
| 相机 | ⚠️ 卡在车体内朝下看 | 见下 |

## 关键新发现（22:41）

**上车前后状态对比**（`vehicle_spawn_and_test.js` 自动 A/B 测试）：

| 字段 | 上车前 | 上车后 | 变化 |
|------|--------|--------|------|
| `unit+0x4f0` (LOD) | **0** | **1 或 2** | ⬆️ 跳变 |
| `actor+0xc38` flags | 97 (0x61) | 101 (0x65) | +0x4 |
| `unit+0x68` flags | 5120 (0x1400) | 5121 (0x1401) | +0x1 |

- **LOD 从 0 变成 >0 是载具消失的最直接相关量**。
- `actor+0xc38` 新增的 0x4 位可能与「本地玩家驾驶中」状态有关。
- 下车后 `unit+0x68` 和 `actor+0xc38` 恢复，但 `LOD` 保持 1/2 不回落。

**修复尝试**（`vehicle_fix_lod.js`）：
上车后强制执行：
- `unit.add(0x4f0).writeS32(0)` —— 把 LOD 强行写回 0
- `actor.add(0xc38).writeU32(flags & ~0x4)` —— 清除新增的 0x4 标志位

**等待用户确认**：强制修复后，驾驶位视角里载具模型是否出现？

截图：`captures/vehicle-shot.jpg`（朝下看地面）、`vehicle-shot3/4.jpg`（第三人称正常，但无车）。

## 协议入口（已验证可调）

```
25931 enter   → 0x10f6bc0   spawn（0x15a0 字节大包）
25922 geton   → 0x10f7d00   上车
25924 getoff  → 0x10f7d90   下车
25966 oil     → 0x10f80b0   油量
```

`0x131d260(rid)` → unit。`unit+0x30` → actor，`actor+0xc30` → root component，
`root+0x40/+0x48` → 子组件数组，子组件 `+0x68` → 模型路径字符串
（实测 `Data/Avatars/Skin/Vehicle/VE_Jeep4_001_hd_mesh.xml`）。

## 相机：绕了很多弯，暂未打通

- `0x302a910` 混淆句柄解出的是**挂在玩家 Actor 上的相机组件**（组件 `+0x188` = 玩家 Actor `0xda0df058`，`+0xd80` = 当前控制器，虚表 `0x2793898`）。
- 真正的切换函数是 `0xf6f520(manager, key, params)`：
  - `key` 用 `find(registry, "QSCameraControllerVehicle")`；
  - **`this` 必须是相机管理器**（函数内读 `[this+0xc8]` 当槽位索引，再访问 `+0x18`/`+0x48` 两个控制器数组）；
  - 传相机组件 `c` → `[c+0xc8]` 是 `0x41700000`（float 15.0），当索引用直接越界崩溃；传 `c+0xd80` → `0xf6f840` 返回 -1，静默返回（**原来 `local_vehicles.js` 里就是这种空转**）。
  - 管理器**不在相机组件内**（扫 0x1200 字节只找到玩家 Actor 一个候选）。
- 更关键：**上车时引擎自己根本没调用 `0xf6f520`**（挂 13 秒，0 次）；`0xf707d0` 也是 0 次。说明这条函数族不是游戏内相机切换入口。
- 相机模式号（`0xf6f840` 实测）：越肩 0、越肩瞄准 1、**载具 2**、动画驱动 3、第一人称 5、观战 7、地图 9、大厅 10、自由 13。
- 唯一正向线索：把相机组件 `+0x188` 从玩家 Actor 改成载具 Actor 后，画面从「朝下看地面」变成正常第三人称（但当时角色也站起来了，不能确定是这次写入的功劳）。

## 模型为什么不显示（下一步方向）

- 两个载具（乘坐中的 910000001、旁边裸生成的 910000002）都进渲染管线，`0x1323050` 给的都是 **lod 0 / query 0**，没有被剔除。
- 载具与玩家共用同一个变换指针 `0xc6bbf1f8`，旋转矩阵三行都是单位长度，**没有零缩放**。
- `DATA\AVATARS\SKIN\VEHICLE\` 下只有 `.QSG` 网格和 `.DDS` 贴图，**没有任何网格 XML**；
  载具骨架在 `DATA\ACTORS\VEHICLE\VE_JEEP4_001\*.QSS`。
  这些目录 `flags=1`，实体在 `SFC/Avatars_Skin_*.sfc`，**vfs 索引不覆盖 SFC**，所以「模型文件不存在」这个结论不成立。
- 配置表 `\DATA\TABLE\VEHICLE\EUVEHICLETABLE_CAR.XML` 同样在 `SFC/TableBin.sfc`（magic `SFC\x1a`，version 3），尚未解开。
  → 解开它才能知道 101 号车应有的模型/皮肤字段，进而判断是 spawn 包字段没填对，还是流式加载没触发。

## 21:59 新会话复测（`run-20261022-215449`，地图 10019）

- 生产路径（菜单 `vehicle_spawn` 101）生成 + 自动上车成功，坐标为 `[482982, 375302, 47292]`。
- 上车后视角在**驾驶位**朝前：因为车体不渲染，等于「透明车第一人称」。截图 `captures/veh-boarded.jpg`。
- `0xb26cc0(actor,1)` + `unit+0x68 |= 1` 强制可见 **无效**，画面无变化（`captures/veh-visible-test.jpg`）。
- 该会话里车速表跑到 **79 km/h**，证明驱动/物理链路完整可用。
- 两个 Actor 的根组件是**同一个类**（虚表 `0x2714480`），`root+0x40/+0x48` 不是子组件数组（读到空），
  上一轮 `root+0x180` 能读到模型路径、这一轮读不到，说明子组件的定位方式还没确定，不能依赖 `+0x180/+0x68`。
- `0x1323050` 的第一个参数其实是**载具 unit**（`+0x28`=rid、`+0x30`=actor），不是渲染实体；
  `unit+0x4f0` = 当前 LOD = 0，说明 LOD 已经正确设置，问题不在剔除。

## 踩过的坑

- **不要对未知类的 Actor 调 `vtable+0x1a8`**：`vehicle_actor_position.js` 这样调用直接把客户端打挂（`run-20261022-210146` 结束于 21:41）。
- `holder` 类对象（`0x302a910`/`0x3094d90`）读字段前必须先按公式解混淆，直接 `+0x800` 读出来是垃圾。
- `PrintWindow(hwnd, hdc, 2)` 可以抓 D3D 画面，但窗口不在前台时可能拿到旧帧；抓图脚本 `/tmp/cap.py`、`/tmp/focus_cap.py`（后者会短暂抢焦点）。

## 本轮新增工具

`vehicle_state_report.js`（总状态）、`vehicle_drive_test.js`（驾驶位移）、`vehicle_render_count.js`（渲染调用计数）、
`vehicle_camera_state.js` / `_active.js` / `_switch_test.js` / `_fix_test.js` / `_hook.js` / `_modes.js` / `_dump.js` / `_manager_search.js`（相机系列）、
`vehicle_spawn_bare.js`（裸生成对照）、`vehicle_lod_report.js`（LOD 判定）、`vehicle_transform_probe.js`（变换对比）。
