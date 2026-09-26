# UI Guidelines

## Language

- 用户可见界面统一使用中文，不提供中英文切换，不引入 i18n 框架。
- 业务枚举、类型名、变量名、文件名和路由继续使用英文。
- 状态中文文案由统一的 status presentation mapping 管理，不在页面或单元格重复定义。

## Theme

- 全局主题支持浅色、深色和跟随系统，内部值保持为 `light`、`dark`、`system`。
- 主题通过根级 ThemeProvider 写入 `html` class；组件只消费语义 token。
- 使用 shadcn/ui CSS 变量主题，不在页面写业务语义颜色。
- 可用通用语义色：`background`、`foreground`、`card`、`popover`、`primary`、`secondary`、`muted`、`accent`、`destructive`、`border`、`input`、`ring`。
- `destructive` 只表达破坏性操作，不代表业务状态。

## Typography

- 页面标题：`text-2xl font-semibold`。
- 区块标题：`text-lg font-semibold`。
- 正文：`text-base`；界面与辅助文字：`text-sm`；元数据：`text-xs`。
- 标题使用 `tracking-tight`，正文使用默认字距。

## Spacing and layout

- 使用 Tailwind 4px 间距体系；常用间距为 `2`、`3`、`4`、`6`、`8`。
- 页面水平边距由 `--page-padding` 控制：移动端 16px、平板 24px、1440px 起 32px。
- 内容最大宽度为 1600px，由 `PageContainer` 统一执行。
- Dashboard Global Filters 与页面首个内容区之间为 24px；Analytics 与表格工具栏之间沿用 24px section gap。GlobalFilters 不承担页面外部间距。
- Desktop First：重点检查 1440px 与 1920px；平板保留完整操作，移动端保证基本可用。

## Radius and shadow

- 基础圆角为 10px，并通过 shadcn/ui 半径比例派生。
- 控件使用 `rounded-md` 或 `rounded-lg`。
- 普通控件最多使用 `shadow-xs`，浮层使用 `shadow-md`；页面内容不默认添加阴影。

## Composition and accessibility

- `DashboardShell` 持续挂载 `PageHeader` / `GlobalFilters`；业务路由只组合内容与 `PageContainer`，不复制或重新挂载 Header。
- 导航名称、路径和图标只从 `src/config/navigation.ts` 读取。
- PageHeader 仅常驻显示页面标题；导航元数据中的非空说明通过标题的悬停或键盘焦点触发共享 shadcn HoverCard，不在标题旁增加提示图标；无说明时不渲染浮层。
- 保留 shadcn/ui 的键盘操作、焦点环、ARIA 属性和移动端 Sheet 行为。
- 表单 mutation feedback：字段校验显示在字段附近；pending 显示在触发操作的控件内；成功与服务端 / mutation 失败使用 Sonner。

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
- Events、Actions、Certificates Analytics Card 复用统一高度；Analytics 查询刷新时保留最近成功图表，CountTrend 将最新预计算数据直接交给稳定的 Recharts AreaChart 并使用其默认动画，不自行路由月份域变化；中心数字插值 450ms；刷新失败时保留等高 Card 并显示错误。其它共享图表动画尊重 `prefers-reduced-motion`。
- adaptive page sizing 复用共享测量行为，仅使用 5 / 7 / 10 档位；已有业务表格由 Feature 持有分页状态，通用 shared DataTable 自行持有分页状态，不另建 responsive table engine。
- 业务表格正文行以 Actions 行为基准：shared DataTable presentation 统一单元格 22px 行盒，TableCellTrigger 与 placeholder 行遵循同一几何。
- Sticky 首列维持不透明背景，并通过 shared row state 跟随整行 hover 与 selected 背景。
- 可下钻单元格复用 `TableCellTrigger`，详情复用已有 Sheet；同一领域的类别共用详情结构，不创建 Generic Detail framework。

## Navigation

- 侧栏只回答“去哪里”，页面内容回答“看什么”。
- 同页 Tab 的独立筛选及 table page / sort state 由页面持有；已访问的 Tab 内容可保持挂载，但 inactive 内容不执行业务查询，也不参与布局、自适应测量或 ResizeObserver。
- 侧栏层级为“总览”、“绩效 / KPI / 目标”、“风险与合规 / 事件 / 行动项 / 证件 / 环境”、“门店”、“权限管理”（仅全局管理员）。
- 全局面包屑统一从“首页”开始，并链接 Dashboard 总览页；侧栏名称仍为“总览”。
- 单项 KPI 与 Goal 指标不进入侧栏。
- 全局筛选由共享组件统一渲染，状态由 Dashboard route layout 持有；页面不重复拼装筛选参数。
- 页面查询只依赖实际使用的筛选维度；Period-independent 页面不因 Period 切换或暂时无效而 loading / IDLE。
- 全局筛选使用与 Dashboard Shell 连续的全宽紧凑 Filter Bar，不使用 Card、圆角外框或阴影。
- 筛选触发器文本保持单行截断；只对确实可能溢出的门店名称复用 `OverflowTooltip`，且仅在 DOM 实际溢出时启用提示。
- Region / Area / Period Select 与 Store Button 复用 GlobalFilters 内同一触发器 presentation；Store 继续使用 Popover + Command 搜索多选，不替换选择业务逻辑。
- 门店搜索只过滤当前 Region / Area 范围内的 `displayName`；关键词属于选择器临时 UI 状态，不进入 Filter Context。

## UI Lab maintenance

- 新增或改变项目级 shared visual component / interaction pattern 时，必须同时检查 `docs/ui-registry.md` 与 `/dev/ui`。
- feature-local UI、原始 shadcn primitive、纯业务规则、非视觉 utility 和无需人工视觉验证的 internal hook 不要求加入 `/dev/ui`。
