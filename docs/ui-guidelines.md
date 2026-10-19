# UI Guidelines

## Language

- 用户可见界面统一使用中文，不提供中英文切换，不引入 i18n 框架。
- 业务枚举、类型名、变量名、文件名和路由继续使用英文。
- 状态中文文案由统一的 status presentation mapping 管理，不在页面或单元格重复定义。

## Theme

- 全局主题支持浅色、深色和跟随系统，内部值保持为 `light`、`dark`、`system`。
- 主题通过根级 ThemeProvider 写入 `html` class；组件只消费语义 token。
- 组件外观以项目配置的 shadcn/ui `radix-nova / neutral / lucide` 为准；尺寸、间距、字重、边界、阴影及交互状态使用官方实现和已有 size / variant。页面只组合业务布局，不重复覆盖 primitive 外观。
- 使用 shadcn/ui CSS 变量主题，不在页面写业务语义颜色。
- 可用通用语义色：`background`、`foreground`、`card`、`popover`、`primary`、`secondary`、`muted`、`accent`、`destructive`、`border`、`input`、`ring`。
- `destructive` 通常表达破坏性操作，不代表业务状态；按已确认的 UI 要求，DetailAccordion 的“需要关注”感叹号使用此主题红色。证件数量进度条复用关闭情况图表的 `chart-2`（已持有深蓝）/ `chart-1`（剩余浅蓝）；未设置目标的底条也使用 `chart-2` 深蓝，但不表示比例或达成状态。

## Score rate change presentation

- 得分率变化数值按实际正负统一着色：正数 `text-green-700 dark:text-green-400`；负数 `text-red-600 dark:text-red-400`；零 `text-foreground`；缺失 `text-muted-foreground` 并显示 `—`，不得当作零。
- 标题摘要、排名、比较、图表浮层与详情复用同一变化值 presentation，不按排名位置或提升/退步分区决定颜色；标签保持普通文字颜色。Overview 复用 feature-local `ScoreChange`。
- 比较标签必须与所用数据周期一致；“较上月”使用已准备的月度差值，不把季度或其它周期差值仅改名为月度差值。
- Overview 得分率变化显示 `%`，语义为当前得分率减上一个自然月得分率，不是相对增长率；原始得分变化使用“分”并与得分率变化分列。

## Typography

- 页面标题：`text-2xl font-semibold`。
- Card 区块标题复用官方 `CardTitle`；独立标题按语义层级排版。
- 正文：`text-base`；界面与辅助文字：`text-sm`；元数据：`text-xs`。
- 页面标题使用 `tracking-tight`；组件内部文字使用对应 primitive 的默认排版。

## Spacing and layout

- 使用 Tailwind 4px 间距体系；常用间距为 `2`、`3`、`4`、`6`、`8`。
- 页面水平边距由 `--page-padding` 控制：移动端 16px、平板 24px、1440px 起 32px。
- 内容最大宽度为 1600px，由 `PageContainer` 统一执行。
- Dashboard 页头底部分隔线到首行全局筛选、Tabs 或说明统一为 24px，复用 PageContainer 默认顶部间距，不分移动端与桌面。
- 页面级 Tabs 到正文区块使用 24px 间距；卡片内部 Tabs、表格工具栏和表单字段保留各组件原有内部间距。
- Dashboard Global Filters 与页面首个内容区之间为 24px；Analytics 与表格工具栏之间沿用 24px section gap。GlobalFilters 不承担页面外部间距。
- Desktop First：重点检查 1440px 与 1920px；平板保留完整操作，移动端保证基本可用。

## Radius and shadow

- 基础圆角为 10px，并通过 shadcn/ui 半径比例派生。
- 控件圆角、边界和阴影使用对应 Nova primitive 默认值；Card 默认 16px 间距，保留官方 ring 边界。

## Composition and accessibility

- `DashboardShell` 持续挂载 `PageHeader` / `GlobalFilters`；业务路由只组合内容与 `PageContainer`，不复制或重新挂载 Header。
- 导航名称、路径和图标只从 `src/config/navigation.ts` 读取。
- PageHeader 仅常驻显示页面标题；导航元数据中的非空说明通过标题的悬停或键盘焦点触发共享 shadcn HoverCard，不在标题旁增加提示图标；无说明时不渲染浮层。
- 正式 Detail Sheet 复用 shared `DetailHeader`：标题表达所选业务列、指标、分类或实体，副标题在适用时显示 Store Master 中文门店名；只有调用方提供正式结果/状态时才显示对应区块。正文不重复 Header 已表达的信息或虚构结果。
- Detail Accordion 表达业务分类 / 信息组。是否使用 `DetailRecordCard` 由正式 contract 的 multiplicity 决定，而非当前 mock 返回条数：singleton contract 直接展示 `DetailField` / layout；collection contract（0 / 1 / N）为每条 record 使用一个 `DetailRecordCard`。同一条 record 最多一个主要 DetailRecordCard shell；collection renderer 负责 record 边界，嵌入其中的业务内容不得再套 Card。不得为装饰添加 Card 或嵌套 Card。`DetailAccordion` 只负责 presentation；title、count、disabled、attention 与 default-open values 由调用方提供。空组可用 disabled semantics；count Badge 保持中性且不继承标题 hover 下划线；attention 使用带“需要关注”标签的图标，并按已确认要求使用主题 `text-destructive` 红色；不改变业务判定或其它状态标签。展开默认值属于 feature 选择，不是全局默认行为。
- `DetailField` 只负责 label、value、间距、排版与换行；不格式化日期、不推断状态、不计算业务值，也不把 null 转成零。业务组件按字段与 contract 提供已准备好的显示值。
- 保留 shadcn/ui 的键盘操作、焦点环、ARIA 属性和移动端 Sheet 行为。受控 Sheet 关闭后由共享 primitive 恢复原触发器焦点，并尊重调用方显式焦点处理。
- 表单使用原生 submit 语义，回车与点击共用提交入口，校验失败聚焦首个错误字段。mutation feedback：字段校验显示在字段附近；pending 显示在触发操作的控件内；成功与服务端 / mutation 失败使用 Sonner。

## Shared selection controls

- 少量互斥业务筛选复用 shared `FilterSelect` 与 shadcn `Select`；Feature 只提供业务 value、label 和变更处理，不复制 Select 结构或样式。
- 筛选选项默认将 `ALL` 放在左侧并作为初始值；明确业务需求另有规定时例外。

## Data tables

- Shared Table 提供 `primary`、`content`、`standard`、`compact` 四种列宽角色；Feature 必须按字段语义显式声明，不由 Shared 根据列名猜测。
- `primary` 用于 Store 等主要识别字段，保留可读最小宽度并优先扩展；`content` 用于正文长文本，在最小、首选和最大阅读宽度之间伸缩；`standard` 用于姓名、区域、分类等中短文本；`compact` 用于 ID、日期、状态等结构化短字段。
- 空间不足时使用 CSS truncate，并按真实 overflow 启用 Tooltip；共享最小表宽和横向滚动继续保证窄 viewport 的最低可读性。Sticky 只负责定位、背景和层级，不自行决定列宽。
- 异步表格保持 fixed layout 与稳定 table / tbody / row 几何。requested query 与 resolved rows / metadata 分离，新成功结果原子替换，并保留 Repository corrected page index。
- 相同语义范围的分页/排序 pending 可保留不可交互的 resolved presentation；语义筛选变化遮蔽旧业务内容。footer 固定文字、分页 DOM 与数字槽位保持，只对真正未知的数字呈现 pending，不先归零或把旧数据当作新筛选结果。
- 异步分页/排序 pending 在固定宽度的 footer 槽位显示轻量反馈，同时禁用重复操作；同步客户端分页不显示请求反馈。
- Events、Actions Analytics Card 复用统一高度；证件配置概览按内容自适应高度，完整展示小类，不设置内部纵向滚动；Analytics 查询刷新时保留最近成功图表。事件及行动项 CountTrend 只将绘图区改为官方 Area Chart - Gradient 样式，保留卡片、标题、筛选及数据；最新预计算数据直接交给稳定的 AreaChart。图表数据更新动画 375ms，数字动画 325ms，均尊重 `prefers-reduced-motion`。
- Dashboard Analytics 统一使用移动端（<640px）、中间屏（640–1151px）、桌面（>=1152px）的响应阶段。图表按组合与最小可读宽度选择列宽；必要时可在中间屏使用现有断点，不为统一列数牺牲可读性。
- 同类 AnalyticsMetricCard 组使用一致的响应式列断点：小于 640px 为 1 列，640–1151px 为 2 列，1152px 起按该页面卡片数量使用完整列数。统一断点，不统一业务卡片数量；具体列数由 feature 布局决定。
- 数字型 Dashboard summary cards 统一使用 shared `AnalyticsMetricCard` presentation contract。Feature 只负责 Grid composition 和业务内容，不覆盖卡片高度、间距、字体、Info trigger 或数值样式。
- adaptive page sizing 复用共享测量行为，仅使用 5 / 7 / 10 档位；已有业务表格由 Feature 持有分页状态，通用 shared DataTable 自行持有分页状态，不另建 responsive table engine。
- 表格单元格保留官方 Table 默认排版；TableCellTrigger 使用官方 ghost / sm Button，placeholder 按其 28px 控件高度预留行空间，自适应分页测量实际行高。排序状态同时写入表头 `aria-sort`。
- Sticky 首列维持不透明背景，并通过 shared row state 跟随整行 hover 与 selected 背景。
- 可下钻单元格复用 `TableCellTrigger`，详情复用已有 Sheet；同一领域的类别共用详情结构，不创建 Generic Detail framework。
- Shared `DataTable` 的整行点击是 opt-in：保持原生 table / row 语义，为可点击行提供 Tab、Enter / Space 和 focus ring；按钮、链接、表单控件及菜单项内部交互不得冒泡触发行操作。

## Motion

- primitive 交互与结构动画使用对应 Nova 官方时长；说明型 HoverCard 的打开延迟保持现有交互约定，Tooltip 默认即时出现。保留 reduced-motion 支持，Tabs 不给 panel 增加 entrance animation。
- Data update animation 使用 300–400ms，用于 `AnimatedNumber` 和 Recharts Analytics 图表。尊重 `prefers-reduced-motion`，不增加 artificial delay、stagger 或 bounce。
- 表格排序/分页、Global Filter 更新与页面软导航不做整表或整页 entrance/exit；刷新时保留已解析内容，只有首次加载可使用 Skeleton。

## Navigation

- 侧栏只回答“去哪里”，页面内容回答“看什么”。
- 同页 Tab 的独立筛选及 table page / sort state 由页面持有；已访问的 Tab 内容可保持挂载，但 inactive 内容不执行业务查询，也不参与布局、自适应测量或 ResizeObserver。
- 侧栏层级为“总览”、“绩效 / KPI / 目标”、“风险与合规 / 事件 / 行动项 / 证件 / 环境”、“门店”、“系统管理 / 权限管理”（仅全局管理员）。
- 全局面包屑统一从“首页”开始，并链接 Dashboard 总览页；侧栏名称仍为“总览”。
- 单项 KPI 与 Goal 指标不进入侧栏。
- 全局筛选由共享组件统一渲染，状态由 Dashboard route layout 持有；页面不重复拼装筛选参数。
- 页面查询只依赖实际使用的筛选维度；Period-independent 页面不因 Period 切换或暂时无效而 loading / IDLE。
- 全局筛选使用与 Dashboard Shell 连续的全宽紧凑 Filter Bar，不使用 Card、圆角外框或阴影。
- 筛选触发器文本保持单行截断；只对确实可能溢出的门店名称复用 `OverflowTooltip`，且仅在 DOM 实际溢出时启用提示。
- Region / Area / Period 使用官方 Select，Store 使用官方 outline Button；统一宽度与截断布局，不覆盖 hover 和 expanded 外观。Store 由 Popover + InputGroup 搜索 + Checkbox 多选组成，`aria-checked` 表达真实选择，保留 canonical selection 业务逻辑；Command 活动导航状态不得表示业务多选。
- 门店搜索只过滤当前 Region / Area 范围内的 `displayName`；关键词属于选择器临时 UI 状态，不进入 Filter Context。

## UI Lab maintenance

- 新增或改变项目级 shared visual component / interaction pattern 时，必须同时检查 `docs/ui-registry.md` 与 `/dev/ui`。
- feature-local UI、原始 shadcn primitive、纯业务规则、非视觉 utility 和无需人工视觉验证的 internal hook 不要求加入 `/dev/ui`。
