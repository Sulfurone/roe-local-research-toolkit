# Ring of Elysium 离线研究工具集（Local Research Toolkit）

针对《环形电梯 / Ring of Elysium》（Steam AppID `755790`）客户端的**本地离线研究工具集**：
一个自研的本地 TPDU 服务器 + 一组 Frida 运行时注入模块，让你在不连接官方服务器的情况下，
以单人沙盒方式进入地图、自由跑图、换武器/皮肤、生成并驾驶载具、切换天气、开门、拾取消耗品等。

> ⚠️ **法律与使用声明**
> 本仓库**不包含任何游戏本体文件**（可执行文件、DLL、VFS、模型、音频、配置表等一律不在仓库内）。
> 这里只有我们自己的代码：本地服务器协议实现、Frida 脚本、启动器与开发文档。
> 它仅用于对**你自己合法拥有的客户端副本**进行**本地、离线、研究性质**的逆向与沙盒实验。
> 请勿用于作弊、联机破坏或任何侵犯第三方权益的用途；使用产生的后果自负。

---

## 它是怎么工作的

官方客户端的登录与心跳走腾讯的 TPDU 协议（`ProtocalHandler_x64.dll`），并受 ACE 反作弊保护。
本工具的做法：

1. **本地服务器**（`server.py`）在 `127.0.0.1:8001` 上实现 TPDU 帧格式与登录/世界/心跳的最小应答，
   把客户端骗进"已登录、已进入世界"的状态。
2. **Frida 桥**（`instrument_client.py` + `local_transport_bridge.js`）在客户端启动早期挂入，
   把它的传输目标改写为本地服务器，并绕过 ACE。
3. **功能模块**（`local_*.js` / `local_*.lua`）注入到客户端进程里，直接驱动引擎的 Lua 层与原生层，
   实现菜单、载具、武器、天气等沙盒功能。

协议帧与关键偏移均从客户端二进制**只读分析**得出，未修改任何游戏文件；全部适配都在运行时完成。

---

## 目录结构

```
.
├── 启动本地人物跑图.cmd          # 一键：雪山地图自由跑图（含本地菜单）
├── 启动海岛人物跑图.cmd          # 一键：海岛地图
├── 启动地图自由浏览.cmd          # 一键：自由观察相机
└── offline-research/
    └── local-server/
        ├── server.py                     # 本地 TPDU/登录/世界 服务器
        ├── tpdu.py / application.py      # 帧格式 与 应用层消息编解码
        ├── instrument_client.py          # Frida 启动/挂载编排
        ├── launch_session.py             # 无 PowerShell 环境 bug 的编排入口
        ├── run_js.py / run_lua.py        # 对运行中的客户端跑单个脚本
        ├── local_transport_bridge.js     # 传输重定向桥（核心）
        ├── character_roaming.js          # 人物移动/相机基座
        ├── local_menu.js/.lua            # Esc 本地菜单（载具/天气/武器/皮肤…）
        ├── local_vehicles.js / local_weather.js / local_weapons.js
        ├── local_outfit.js / local_consumables.js / local_interact.js / local_doors.js …
        ├── supported-build.json          # 支持的客户端构建 SHA256（启动前校验）
        ├── local-*.json                  # 菜单/状态持久化（自制数据，非游戏文件）
        ├── fixtures/experimental-character-world-fields.bin   # 合成角色字段
        └── *.py                          # 各类研究/验证探针
```

> 运行时会自动创建 `offline-research/local-server/captures/`（抓包与日志，已在 `.gitignore` 内）。

---

## 环境准备

1. **Python 3.11+**（64 位）。客户端是 x64，Frida 宿主位数必须与目标一致。
2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
3. 把本仓库**整个放到游戏安装目录内**，即路径形如：
   ```
   <游戏根>/offline-research/local-server/...
   ```
   工具用相对位置推导游戏根目录（`offline-research/local-server/../..`），
   也据此找到 `Europa_Client.exe`。**不要**把它放到别处。
4. 指定 Python 解释器（二选一）：
   - 设环境变量 `ROAM_PYTHON` 指向你的 `python.exe`；或
   - 让目标 `python.exe` 出现在 `PATH` 中（`python` 命令可用）。
   Windows PowerShell 启动器与 `launch_session.py` 都遵循这个约定。
5. **支持的构建校验**：`supported-build.json` 记录了已验证的 `Europa_Client.exe` /
   `ProtocalHandler_x64.dll` 的 SHA256。启动器会在注入前比对；若官方更新导致哈希不符，
   需要重新分析新的偏移/签名后更新该文件（详见 `docs/`）。

---

## 使用

- **双击 `.cmd` 启动器**即可（会调用 `start_character_roaming.ps1` / `start_research.ps1`）。
- 或用命令行编排（推荐，能带调试参数）：
  ```bash
  python offline-research/local-server/launch_session.py --map-id 10020
  # 常用地图: 10020 雪山(白天) 10019 海岛(夜) 10021 雪山(夜,测试) 10024 沙漠(测试)
  ```
  加载需要 1–3 分钟；进入后**点一下游戏窗口**获得焦点。
- **本地菜单：按 `Esc` 呼出**（不是 `Tab`）。可切换地图、生成/上下载具、换武器与皮肤、切天气。
- 移动：`W/A/S/D`，视角：鼠标；载具驾驶同键位。
- 想对运行中的客户端跑单个探针脚本：
  ```bash
  python offline-research/local-server/run_js.py <pid> <script.js>
  ```

---

## 当前功能状态（概要）

| 功能 | 状态 |
|---|---|
| 登录/进世界/心跳（本地服务器） | ✅ 稳定 |
| 人物自由移动 / 碰撞 / 第三人称相机 | ✅ 稳定 |
| Esc 本地菜单（地图/载具/武器/皮肤/天气） | ✅ 稳定 |
| 载具生成 + 物理驾驶 + **模型渲染** | ✅ 稳定 |
| 武器切换/开火、皮肤、消耗品、开门、交互 | ✅ 可用 |
| 天气切换 | ✅ 可用 |
| **载具行驶声音** | ❌ 未解决（见下） |
| 驾驶员上车姿态/动画 | ⚠️ 待完善 |

### 已知问题：载具无声音
载具能正常渲染与驾驶，但**引擎/轮胎等一切载具音效都听不到**（脚步、枪声、UI 正常）。
已排查：事件确实被提交到 Wwise 并返回有效 playing_id；发射体位置正确；关掉遮挡/HRTF 无效；
`SetGameObjectOutputBusVolume` 提权无效；`LoadBank` 走 VFS 全部返回 FileNotFound（66/69）。
主要怀疑：`Vehicles.bnk` 未随本地离线流程加载，或引擎循环被某个 Switch/State 门控。
详见 `docs/HANDOFF_20261024_VEHICLE_AUDIO.md` 与 `docs/CURRENT_STATUS.md`。
（结论提醒：`IAudioMeterInformation` 对本进程读数不可靠，**以耳朵为准**。）

---

## 研究文档

`docs/` 下是开发过程中的实录与结论，接手时建议先读：

- `CURRENT_STATUS.md` —— 总进度与结论汇总
- `VEHICLE_STATUS.md` —— 载具子系统现状
- `HANDOFF_20261024_VEHICLE_AUDIO.md` —— 载具音频专项交接（未决）
- `AUDIO_EFFECTS_FIX.md` / `AUDIO_ISLAND_STATUS.md` —— 音效/环境声
- `BINDING_AND_KITS_VERIFIED_20261024.md` —— 按键与出生包验证
- `DOOR_RECOVERY_20261025.md` / `CODEX_PROXY_FIX_20261025.md` —— 具体问题记录

---

## 重要注意事项（踩过的坑）

- **不要**对未知 actor 调 `vtable+0x1a8`（会崩客户端）；`0xce4ab0` 截图非前台会抛异常，务必 try/catch。
- **只读**分析游戏文件，绝不修改游戏本体。所有适配都在 Frida 运行时 + 本地服务器完成。
- 注入模块必须用 `Process.attachModuleObserver` 等待 `protocalhandler_x64.dll` 加载后再装钩子，
  否则脚本启动时装的钩子会被覆盖。
- 帧钩子（`0xd4ca40`）内**不要**做重活，会卡死客户端。
- **另一个 Frida 会话看不到主会话的全局，且对已被主会话挂钩的 RVA 再 `Interceptor.attach` 会静默失效**——
  需要在主会话模块里加逻辑后重启。
- 观察类功能需在**启动时**用 `--vehicle-audio-test` / `--vehicle-audio-observe` 开启，无法热插。
- Windows 上 `Start-Process -RedirectStandardOutput` 在同时存在 `NO_PROXY`/`no_proxy` 时会抛异常，
  编排已改为用 Python 直接 `subprocess`。

---

## 贡献

欢迎提 Issue / PR。改协议帧或原生偏移时，请同步更新 `supported-build.json` 并在 `docs/` 记录验证过程。
提交前确认没有把任何游戏本体文件、抓包、内存转储、`local-*.json` 之外的运行时数据带进仓库。

## 许可

本项目代码采用 MIT 许可（见 `LICENSE`）。游戏本体与其中资源权利归属原版权方，不在本许可范围内。
