# UI Guidelines

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
- 侧栏层级为 `Overview`、`Performance / KPI / Goals`、`Risk & Compliance / Events / Actions / Certificates / Environment`、`Stores`。
- 单项 KPI 与 Goal 指标不进入侧栏。
- 全局筛选占位由共享组件统一渲染，不包含数据、默认选择或筛选逻辑。
