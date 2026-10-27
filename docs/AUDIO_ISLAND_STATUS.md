# 2026-10-22 海岛与音频修复记录

- 海岛 10019 / EU_KillZone_4096 已加入 Lua 地图菜单、备用地图选择器及全部启动参数白名单。
- 新增根目录“启动海岛人物跑图.cmd”，默认入口保持原地图选择菜单。
- 原生入场消息为海岛使用 (484877,362292,121000)，不再沿用雪山坐标。海岛不调用会冻结角色的 D8C950。
- 全新会话从 121000 下落到 z=51230.2734375，落地后恢复三槽武器，local_menu_map_ready=10019。Lua 菜单与 ready 断言通过。
- UserData/CurrentSettings6.xml 启用 bEnableHrtf、bEnableObstruction。运行时 local_audio_settings 两项均为 true。
- CoreAudio 实测：游戏会话音量 1.0，未静音，信号峰值约 0.045；默认 FxSound 音量 0.44，未静音，最终 USBFH10 输出峰值约 0.079。没有修改系统输出路由或总音量。
- 用户澄清原症状为所有声音都没有。运行时有输出信号，但是否已听到声音仍待用户确认，不能把 HRTF 开启等同于全静音根因已经解决。
- 内部开火测试本轮未成功产生 StartFire/耗弹，不能声称已验证海岛枪声。请在游戏前台实际测试。
- JS/Python/PowerShell 语法检查通过，原有 20 项测试通过。
- 第一次启动在初始化期间附加诊断后进程退出；后续两次启动成功。最终会话见 active-run.json。
- 初始文件及设置备份：backups/audio-island-20261022-192633。

本轮最终会话：E:\Program Files (x86)\Steam\steamapps\common\Ring of Elysium\offline-research\local-server\captures\run-20261022-193138
