# 交接：HEC v0.12 已发版 → 新对话继续改 UI（2026-11-16 晚）

> 前序：HANDOFF_2026-11-16-hec-v011.md（UI 五项+当日修台账）、HANDOFF_2026-11-16-phaseB-apk-integration.md（阶段 B）。
> 规矩照 AGENTS.md（7 四件事、20 先问、16 中文、15 正斜杠、18 推送走 VPN）。技能：android-tablet-apk-dev（通用坑唯一维护处）、decentplugin §22（算法）。
> 示意稿：D:/vscode/.impeccable/mocks/hec-ui5/（用户逐条确认过）；取证截图：D:/vscode/.impeccable/review/hec-ui5/（gitignore，不入库）。

## 0. 一句话现状

main HEAD 66d37ee（+本交接），tag v0.12 已发：GitHub Release v0.12 带 HyperExController_v0.12.apk（6,669,327 字节），夸克「/来自：Codex」有 v0.12。
v0.11 Release 附件 = 纯 v0.11 包（6,629,959 字节，worktree ca9786d = ea13901+断口线修 构建，不含阶段 B）。
平板与模拟器均已装 v0.12（versionCode 12）。**其他对话已被用户叫停，本对话是唯一 UI 改动入口**；阶段 B 真机验证归阶段 B 对话，别碰影子发送逻辑。

## 1. UI 现状口径（用户定稿，别回退）

- 学习中心：✕ flex 居中（28×28 外框不变）；弹窗宽 80%（dim 16px 内边距内）、高 min(86vh,860px)。
- 顶部文件夹标签 控制中心/学习中心（取代原 h3，右侧保留数据源小字+✕）：选中与主体同底、下缘开口连体、上缘与外框齐平
  （.lrn-top padding-top:0 + position:relative;top:-1px；**flex 不采纳负 margin**，别用 margin-top:-1px 修齐平）。
  蓝色只留选中文件夹左缘 2px 渐变亮条（首页拨轮卡同款）。控制中心页隐藏二级入口与只读脚注、占位空态——**内容等用户定义**（learn.js renderSection 的 control 分支）。
  学习中心内三个二级入口（算法学习/决策模型/仲裁模型）与记住 tab 照旧。
- 首页侧栏收合：#sideToggle 窄胶囊 16×52、opacity .45 碰/按亮；**断口分隔线画在 main::before**（展开 left:219、收合 left:0，.24s 与侧栏同步），
  两态都保留上下两条线、把手始终骑线（中心 219 / 0）。**别把线画回 aside**（overflow-y:auto 会裁掉 right:-1px 的伪元素→整条线消失）；控制页 aside border-right:0。
  **button.side-toggle:active 锁 translateY(-50%)**（全局 button:active 的 scale(.97) 会把按压中的把手拽跳 26px）。
  收合状态存 hecSideCollapsed；收合后 setTimeout drawCharts 重绘曲线。
- 曲线弹窗：80% 宽；顶 6 常用位（hecFavCurves 按标题存本机，空位虚线）；**每页两列网格、六条共享行轨**
  （.crv-page grid-auto-flow:column + grid-template-rows:repeat(6,auto) → 跨列水平对齐+等间距 6px）；页自带 padding:0 16px 使页宽=滚动口宽（下一页不露边）；
  scroll-snap x mandatory + 底部圆点；打开归零 scrollLeft。
- 长按曲线 500ms 弹 6 槽菜单：**点外关闭必须判 menu.contains(e.target)**（否则真机点菜单项的瞬间菜单先被关、点击落空，加入/移除全失效）；
  占用多槽的曲线逐槽显示「移除」；空位加入、占用替换。
- 曲线行内容顺序（用户三次口径迭代的最终版）：曲线名 → 支持HEC 胶囊（仅 hx，与常用位同款琥珀胶囊）→ 温度·目标液重（curveMeta()：steps[0].temperature / target_weight）→ 常用N。
  非 HyperEx 不挂任何标签（用户：绝大部分非 HyperEx，不用提示）。
- i18n：control.js / learn.js EN 表已补新键（支持HEC=HEC ready、常用=Fav 等）。

## 2. 验证通道（可复跑）

- 模拟器 AVD 名 hxpad；进程没了就 `emulator -avd hxpad -no-snapshot-load -gpu auto`（提权后台），adb -s emulator-5554。
- 平板 mDNS：adb-haf6uwvcqcdujzin-trqoCZ._adb-tls-connect._tcp；**灭屏不广播**，亮屏后 adb connect 或等自动重连；锁屏压视口 0（pitfalls 11），`wm dismiss-keyguard` 解锁。
- 联调桩 .tools/__ui5-stub.cjs 4799（14 曲线 2 页；**随会话清理死掉，要在同一条命令里重起**）；adb reverse tcp:4799；
  CDP：.tools/cdp-eval.cjs <port> <exprFile> [shotPath]（同步求值）；模拟器 9224 / 平板 9223，App 重启后重 forward。
- 回归：.tools/__ui5-regress.cjs A–D；几何探针在 .impeccable/review/hec-ui5/__m*.js / __b*.js / __g*.js
  （断言：rowDiff 全 0、gaps 等、page2Gap 0、lineLeft==handleCenter、菜单 aliveAfterPointerdown=true、重启持久化）。
- 构建：JAVA_HOME=D:/android-dev/jdk17/jdk-17.0.21+9、GRADLE_USER_HOME=D:/android-dev/gradle-home、gradle-8.7 -p app assembleDebug；
  **改 www 先 Copy-Item 同步 assets**；worktree 构建要拷 local.properties（gitignore 不入库）。

## 3. 本轮坑（项目特有；通用坑引技能 pitfalls 条号）

- apply_patch 多 hunk 必须按文件位置排序，否则报 Failed to find expected lines（单 hunk 永远稳）。
- **gh release create/upload 带附件会静默挂死**（日志空、REST 查 assets=[]）：改 REST/curl 走 VPN 代理 127.0.0.1:57890 直传 uploads.github.com；
  删旧附件 DELETE /repos/<owner>/<repo>/releases/assets/<id>；release id 用 GET /releases/tags/<tag>。
- adb 老服务僵尸拖死所有新客户端（devices 都挂）：Stop-Process 老服务+遗留客户端再 start-server。
- 夸克 MCP upload_file commit 203（读正常）：改 quarkclouddrive 技能 CLI upload；**别杀 MCP 进程**（v0.6 教训）。
- flex 负 margin 不生效；aside overflow 裁伸出伪元素；全局 button:active 的 transform 会覆盖自定义 transform（用 button.xxx:active 同特异性后置）。
- 多对话版本冲突处置：旧版发版包用隔离 worktree 构建；**真机不降级装旧 versionCode**（会盖别对话的测试包）。

## 4. 待办（新对话按顺序）

1. **控制中心页内容等用户定义**（learn.js renderSection control 分支；.lrn-top/.ftabs 样式已就绪）。
2. 用户继续提 UI 修改：先出示意稿（mocks/hec-ui5 同款做法：真令牌+真视口 1138×633+标注在设备框外）给用户确认，点头再改代码（AGENTS 20）。
3. 发版后续（升版本/装机/推送/夸克）一律先问用户；gh 附件走 REST。
4. 夸克 v0.6 历史欠传仍在（/来自：Codex 现有 v0.4/v0.5/v0.11/v0.12）。

## 5. 别碰

- shadow.js / arbiter.js 的发送逻辑（影子只记录不发送）；插件仓 D:/vscode/decenthyperexplugin；阶段 B 对话的真机验证安排。
- 4795 桩若还活着是上一轮对话遗留，别 kill。
