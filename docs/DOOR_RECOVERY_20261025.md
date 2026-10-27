# 部署超时后开门回归：当前会话已热修复（2026-10-25）

用户反馈「有的门现在打不开，刚才可以打开的」。原因已确认是前一轮滑索复位测试的恢复状态残留。

## 原因

`local_menu.js`的`failedSpawn()`把人物恢复到旧位置后，仍无条件将`LocalRoamMatchActive=false`。旧门模块把这个标志当作所有门交互的前提。因此世界和人物正常，原版F请求却绕过离线确认，发给不处理开门的本地服务。

实测旧主bundle：`adventure_check`报告worldState=4、sceneMap=10020、character=true、menuReady=true，但inWorld=false；`door_status`已有1688扇门索引，nearby仍为空。对应超时为本会话的`local_menu_respawn_timeout`。

## 修正

- 门现在以原生世界state4、人物资源存在、输入未被菜单/部署锁定判断是否可交互，不再依赖可能残留的MatchActive标志。
- 部署开始记录previousActive；失败回滚恢复这个状态，保留初次未入局时的false。参数验证在关掉状态之前完成。
- 部署命令和实际spawn入口均拒绝挂索状态22/23/24，防止人物仍附着滑索时复位。
- 返回菜单时取消尚未执行的出生倒计时；原生门状态已经等于目标时不重复播放确认。

## 当前热修复

为保留人物当前位置和已打开的门，没有重启、复位或传送。当前旧主bundle的私有MatchActive仍是false；通过门模块的独立原生就绪判定恢复门功能。

`door_live_recovery.js`以观察原版1354780门请求的方式运行，不覆盖旧的replacement；收到原版F请求后，在游戏帧线程调用同一个原版9ABE50确认。离线确认目标状态固定且检查重复，不反向toggle。提示仍使用原版F面板。

保持热修复`run_js.py 10140 door_live_recovery.js --wait 0`运行（exec97154），输出`captures/run-20261025-zipline-speed/door-recovery.jsonl`。不要停止它，否则当前旧主bundle仍受旧标志影响。游戏退出后它自动detach；下次启动主bundle已经加载修正源码，无需重复热加载。

## 验证

- 新门模块在旧标志false的同一场景中ready=true，索引9983条场景记录中的1688扇可交互门。
- 用户的原生交互请求已成功打开门64840（0→2）和64844（0→2）。没有自动移动人物或替用户调用toggle。关闭分支保留同一原生状态0路径，本轮尚无新的关门动作记录。
- `node --check local_doors.js / local_menu.js`通过。
- `node test_spawn_recovery.js`通过：失败回滚分别保留之前的active/inactive状态；22/23/24三种挂索状态在任何原生位置修改前被拒绝。实际部署失败路径未再次运行，避免干扰用户；新主菜单保护尚未另行冷启。

证据汇总：本会话`door-recovery-verification.json`。客户端10140、服务11908、bridge26540，后续先核实进程。

`local_adventure.js`菜单主动展开仍使用旧主bundle的MatchActive判定，当前热修复只处理门；若后续主动展开菜单报未入局，应检查这一残留，不要重复测试或传送来修复。源码已修正产生残留的恢复路径。
