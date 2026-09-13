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
- Desktop First：重点检查 1440px 与 1920px；平板保留完整操作，移动端保证基本可用。

## Radius and shadow

- 基础圆角为 10px，并通过 shadcn/ui 半径比例派生。
- 控件使用 `rounded-md` 或 `rounded-lg`。
- 普通控件最多使用 `shadow-xs`，浮层使用 `shadow-md`；页面内容不默认添加阴影。

## Composition and accessibility

- 页面使用 `DashboardShell`、`PageHeader` 和 `PageContainer`，不复制壳层布局。
- 导航名称、路径和图标只从 `src/config/navigation.ts` 读取。
- 保留 shadcn/ui 的键盘操作、焦点环、ARIA 属性和移动端 Sheet 行为。

## Navigation

- 侧栏只回答“去哪里”，页面内容回答“看什么”。
- 侧栏层级为“总览”、“绩效 / KPI / 目标”、“风险与合规 / 事件 / 行动项 / 证件 / 环境”、“门店”。
- 全局面包屑统一从“首页”开始，并链接 Dashboard 总览页；侧栏名称仍为“总览”。
- 单项 KPI 与 Goal 指标不进入侧栏。
- 全局筛选由共享组件统一渲染，状态由 Dashboard route layout 持有；页面不重复拼装筛选参数。
- 全局筛选使用与 Dashboard Shell 连续的全宽紧凑 Filter Bar，不使用 Card、圆角外框或阴影。
- 筛选触发器文本保持单行截断；只对确实可能溢出的门店名称复用 `OverflowTooltip`，且仅在 DOM 实际溢出时启用提示。
- 门店搜索只过滤当前 Region / Area 范围内的 `displayName`；关键词属于选择器临时 UI 状态，不进入 Filter Context。

## UI Lab maintenance

- 新增或改变项目级 shared visual component / interaction pattern 时，必须同时检查 `docs/ui-registry.md` 与 `/dev/ui`。
- feature-local UI、原始 shadcn primitive、纯业务规则、非视觉 utility 和无需人工视觉验证的 internal hook 不要求加入 `/dev/ui`。
