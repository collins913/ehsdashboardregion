# Overview Prototype Design — Experimental / Working Draft

正式 `/overview` 和 `/dev/overview` 现消费 ScoreContribution preparation result。本文只记录保留的 Prototype 数据与 presentation 假设，不是正式 business rule、contract 或 architecture source。已冻结的正式 scoring / aggregation 规则以 `metric-rules.md`、`data-contract.md` 和 `decisions.md` 为准；Prototype outcomes 与 history 不代表这些正式计算。

## 当前 Overview 展示原则：FACT-FIRST / FACT-ONLY

本文下述展示原则与布局记录的是 Prototype presentation 参考，不描述正式 `/overview` 的当前数据来源。正式页面由 Overview preparation result 提供得分率、趋势、排名、矩阵、维度与门店清单；Prototype preparation layer 和 fixture 不参与正式页面计算。

叙述性诊断、趋势标签、关注标签、建议和启发式洞察暂缓展示。当前页面不展示系统性问题、本期变化、问题洞察、主要失分、管理事实、重点诊断、主要变化或当前关注。底层 Prototype model 和 fixture 可继续保留供后续评估，不代表正式业务规则。

Area 与 Store 分别在 preparation/model 层准备变化 Top 3，仅纳入两期结果有限且完整的数据。进步候选为 delta ≥ 0，按 delta 降序；退步候选为 delta ≤ 0，按 delta 升序；相同差值按 canonical id 升序。先确定进步 Top 3，再从退步候选中排除已入选对象后取 Top 3，因此持平对象重复入选时优先出现在进步侧。候选不足三名时只提供实际条目，presentation 始终保留上下各三根柱体，缺少条目的柱体不补名称、数值或交互；无可比较数据时保留柱体并显示 unavailable，点击已有结果进入事实型 Scope Detail。

综合得分率、矩阵、范围对比和维度分析的解释说明通过 feature-local `OverviewSectionHeader` 复用 shadcn HoverCard；标题和 Info 图标共同构成可键盘访问的触发器。范围、时间、数值等事实仍常驻展示。此模式仅适用于 Overview。

Overview 详情统一复用 `DetailHeader` 与已有月度趋势图，只显示主题、明确范围名称和数值事实；当前没有正式结果状态，不显示 result/status。详情结构遵循 [UI Guidelines](./ui-guidelines.md) 中的 Detail UI V2 规则，不在 Overview 新建通用详情抽象。

## Prototype Score (prototype-only legacy)

- 当前 Prototype 使用 Performance 5 项、Take Charge 3 项、Certificates 4 项的 synthetic `PASS / FAIL / MISSING` outcomes。
- Prototype 以非 `MISSING` outcomes 计算比例，并单独计算 completeness；Environment 不参与 Prototype 比例。
- 以上是既有 Prototype 行为，不是正式评分规则，不得用于正式 Overview 数据、历史、排名或数据完整度。


Formal Overview V1 已改用 ScoreContribution：每项每 Store × Month 固定 1 available point，达成得 1，无法证明达成得 0；不因缺失或不完整而排除分母，不计算 Overview completeness。Store / Area / Region 均汇总 points 后计算 scoreRate。完整 metric catalog 与未决映射见 `metric-rules.md`。

## 趋势与 Snapshot 设想

正式 history contract 按每个 Store × Metric × Month 产生 ScoreContribution；可由可靠的历史 domain records 使用月末 referenceDate 重算时优先重算，否则 Production 后续采用 snapshot。当前 Demo 月度 history 仍是 deterministic Prototype fixture，不是正式快照或正式历史结果。snapshot schema 与实现不属于 Phase 1。

未来生产 snapshot（仅用于无法可靠 as-of 重算的 Domain）需保留足以生成或复原逐月 ScoreContribution 的 Store、Metric、Month 与 rule version 信息；Area / Region 从 Store contributions pooled 聚合。V1 不产生 Overview completeness。snapshot 的物理结构与实现尚未设计。

## 当前页面模块与清单

页面顺序为综合得分率与变化排名、得分与变化、维度得分、门店得分清单。清单在 preparation 层纳入当前筛选和授权范围的全部门店，取消原首尾各五项截取；列为排名、范围、得分率、得分率变化、得分数、得分变化，复用 shared `DataTable` 的表头、行高、5 / 7 / 10 自适应分页，以及 `TableCellTrigger` / `OverflowTooltip`。分页只控制每页显示数量，不截断清单，全部门店均可打开得分详情。六列表头均可排序，数值列使用 prepared 数字按数值排序，缺失值在升降序中均置后；默认保留 preparation 排名顺序。得分率显示整数百分比，得分率变化为原上期百分点差值。得分数展示 `earnedPoints / totalPoints`，分子为 PASS 总数，分母为总指标数量（含 MISSING）；全部未知时分子显示 `—`。得分变化在 preparation 层计算为本期 PASS 总数减上期 PASS 总数，任一期全部未知时为 `null`，不从百分比变化反推分数。得分数排序使用分子总得分，不使用格式化字符串。

页面与 Sheet 复用 feature-local `DimensionScoreAccordion`，底层使用 shared `DetailAccordion`。页面多门店范围显示 prepared 每店均分，单门店显示原始得分；页面变化保持原上期比较，Sheet 变化保持上月比较。展示组件不计算得分、均分或变化。维度列标题、汇总与展开小指标共用得分/变化列宽，并预留相同的 Accordion 箭头空间；两列数值在各列内居中，页面与详情同步对齐。

## 当前 Detail 展示

Overview Scope Detail 使用 shared shadcn Sheet 默认宽度与 `DetailHeader`，标题为“得分详情”。Store / Area subtitle 仅显示名称，Region subtitle 明确标示区域。正文复用顶部同一个 feature-local `OverviewScoreRateSummary`：综合得分率标题与 Info HoverCard、当前得分率、prepared 较上月变化和过去 12 个月得分率趋势；不重复展示上期得分、排名、同级平均或数据完整度。趋势图显示首尾月份，并为两端标签留对称边距。

详情下方“维度得分”以 KPI / 目标 / 证件 / 环境固定顺序复用 shared `DetailAccordion`，默认收起，展开大维度查看小指标。小区与门店共用同一详情展示；展开后不重复显示列标题，仅为读屏保留表头。门店与区域当前得分仍展示 `earnedPoints / totalPoints`：分子复用 PASS 数量，分母为该范围 Store × 指标总数（包含 MISSING），不是百分比；没有任何已知结果时分子显示 `—`，不把缺失当作零。小区的维度及小指标主值展示“每店均分”：分子、分母分别除以当前授权范围门店数，在 preparation 层准备 `averageEarnedPoints / averageTotalPoints`，最多保留一位小数；缺失值或零门店不变成零。小区维度标题的 HoverCard 说明计算口径并保留各维度总分；小指标得分 HoverCard 保留该指标总分，可通过键盘焦点访问。大维度的变化保留原月度得分率差值，小指标变化通过原有 `scoreOutcomes` / `scoreDelta` 按相同月度尺度准备，不改成平均原始得分差。所有数量与变化在 preparation 完成，React 只格式化、渲染，不按诊断优先级排序。环境仍未评分、无小指标，显示 `—` 并禁用展开。变化颜色复用 `ScoreChange`，整体得分率与排名计算不变。

Scope Detail 打开时仅把初始焦点落在可编程聚焦的 Sheet 容器，不自动聚焦说明触发器，避免自动弹出 HoverCard；仍保留焦点锁定、关闭后焦点恢复及通过 Tab / 悬停访问说明。

## 正式规则尚未关闭的事项

ASTM V1 scoring 方向已确认：`NOT_OCCURRED` 得 1/1，`OCCURRED` 得 0/1。Mock V1 的 Training required item catalog 与 Inspection expected task set 已由集中 provider 提供；Production authoritative source/config 尚未接入，不能从 observed records 推导。不能可靠从历史源 records 重算的 Production Domain，其 snapshot 来源与保存策略仍待后续确定。此文档描述 Overview 页面与 Prototype 参考，不是 Prototype 算分的正式口径。

## 顶部展示布局

顶部为三个同级 shadcn Card：综合得分率、小区变化排名、门店变化排名，无管理总览/关键变化外层标题或嵌套 Card。外层按真实内容容器宽度响应：960px 起三张等宽并排；704–959px 得分率独占一行、两张排名卡等宽；低于 704px 单列。

两张排名卡按 Area / Store 分开，复用 feature-local `ChangeRankingList`。每张卡按提升 Top 3、退步 Top 3 分为两个紧凑表格，显示名次、名称、得分率与变化；候选不足三名时保留空行和明确空值，无有效数据时显示“无可比较数据”。名称复用 `OverflowTooltip` 与 `TableCellTrigger` 打开已有详情，变化颜色复用 `ScoreChange`。排名不使用领奖台、奖牌或装饰性柱体，不引入诊断或风险判断。

Prototype presentation 仍复用既有 `hero.monthlyDelta`、趋势与说明文案；这些字段背后的 Prototype 数值不能作为正式 scoreRate。正式分母固定为 12 个 V1 metric points，不排除 MISSING / N/A / incomplete；正式页面已接入独立的 ScoreContribution contract 与 Overview preparation result。

Overview 数值精度统一在计算层处理：`roundOverviewScore` 将得分、得分率内部值、均分及变化四舍五入到一位小数，规范化负零。得分率不先取整再求差；得分、变化、同级均值、排名与历史共用该精度。UI 的非整数得分和变化显示一位小数，整数不补零；综合得分率及其趋势 Tooltip 单独显示零位小数的百分比。此规则只改变数值精度，不改变分母、权重、缺失规则、筛选或 deterministic 排序规则。

散点矩阵右上 / 左下象限分别使用 6% 不透明度的绿色 / 红色背景。点提示框取消位置过渡，仅保留轻量淡入与缩放。Standard Mock 为 50 家确定性门店，保留原有门店身份与场景。

Overview 的得分变化值统一复用 feature-local `ScoreChange`：正数绿色、负数红色、零为普通前景色、缺失为 muted；覆盖顶部、排名、比较、维度、散点提示与详情，颜色按数值正负判断，不按排名区域判断。

得分与变化：preparation 按已准备的精确 `(score, delta)` 合并可绘制对象，保留全部成员与数量；不偏移坐标、不额外舍入坐标、不截取 Top N，缺失坐标不伪造零。重叠点显示 `×N`，复用 shadcn HoverCard 先列出全部成员，再分行显示共同当前得分、变化值，不额外显示数量标题；名单可滚动、可点击打开已有详情，支持键盘焦点及点击打开。

Standard 的 50 家门店使用按身份匹配的确定性评分快照：多数 `(score, delta)` 组合唯一，保留少量同坐标场景；额外门店得分仍由 PASS / FAIL outcomes 通过原有评分公式得出，月度历史使用同一批快照。

得分与变化层级按用户原始全局选择决定，权限转换后的 INCLUDE 不当作显式门店多选：多选门店仅画所选门店；单选门店画该门店所在小区全部授权门店；选择小区画所选小区全部授权门店；只选择区域画区域内小区；全部区域画区域，但授权可见数据源仅有一个区域时直接画该区域全部小区。聚合、同级均值与坐标域在 preparation 完成，评分公式不变。单成员点点击直接打开现有 Sheet；多成员点点击打开 HoverCard 再选择名称。浮层使用默认 256px 宽度，名称和数值左对齐。
