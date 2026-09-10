# Architecture Decisions

## Confirmed

- shadcn/ui 作为基础 UI 系统。
- 复用优先于创建：本地组件 → shadcn/ui → shared component → 提议新增组件。
- 采用 Desktop First。
- 业务规则与 UI 分离。
- UI 必须通过 repository 抽象访问数据。
- 真实数据库尚未选择。
- 业务指标和状态规则尚未定义。

## UI Foundation

- 应用采用 Next.js App Router、React 和 TypeScript。
- 样式采用 Tailwind CSS，shadcn/ui 使用 Radix Nova 预设及 CSS 变量主题。
- 页面路由共享同一个 Dashboard Shell；导航配置集中在 `src/config/navigation.ts`。
- 设计令牌只表达通用界面语义，不表达 EHS 业务状态。

## V1 Information Architecture

- 全局筛选预留 `Region`、`Area`、`Store`、`Period`，未来作用于所有业务页面；数据、默认值、周期规则和筛选关系均未定义。
- `Overview` 预留 `Health`、`Key Metrics`、`Area / Store Health`、`Attention`，暂不定义布局、指标、图表、评分或状态规则。
- `Performance` 表示计算后的业务绩效，包含 `KPI` 和 `Goals`。
- `KPI` 候选类别为 `Training`、`Drill`、`Actions`、`Inspections`、`Events`，不作为侧栏菜单项。
- `Goals` 当前包含 `Take Charge Submit Rate`、`Take Charge Close Rate`、`Take Charge Participate Rate`，不作为侧栏菜单项。
- `Risk & Compliance` 表示底层业务事实与记录，包含 `Events`、`Actions`、`Certificates`、`Environment`。
- `Stores` 下的 `Store Detail` 仅用于核验门店主数据，不包含 Performance 或 Risk & Compliance 区块。
- `Store Detail` 预留字段：`Region`、`Area`、`Store Name CN`、`Store Name EN`、`Store ID`、`Manager`、`EHS Ambassador`。

Conceptual relationship:

```text
Risk & Compliance -> underlying business facts
Performance       -> calculated metrics and goals
Overview          -> management-level summary and prioritization
```

所有公式、目标、阈值、颜色、状态规则、数据契约、数据库字段和权限仍为 TBD。
