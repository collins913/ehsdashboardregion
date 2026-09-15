# Business Documentation Conflict Review

- 定位：historical / resolved review，保留早期迁移记录，不是当前 active rule source。
- 以下结论是早期审查快照，后续 Certificates V1、Environment V1、Goals 与 Store Resolution 已有更新。当前实施以 `business-requirements.md`、`data-contract.md`、`metric-rules.md`、`status-dictionary.md` 和 `decisions.md` 的现行定义为准。

- 审查日期：2026-09-10
- 对比范围：附件四份 V1 业务文档、原项目 docs、当前源码中的相关名称

## 已解决冲突

| 项目 | 原项目内容 | V1 结论 | 处理 |
|---|---|---|---|
| 门店标识 | `Store ID` | `TRTID`；不得称为 Store ID，且不保证跨源唯一 | 已更新 `data-architecture.md`、`data-contract.md`、`decisions.md` |
| Goal 名称 | `Take Charge Submit Rate` | `Take Charge Submissions per Capita` | 已更新 `metric-rules.md` 与业务文档 |
| Goal 规则 | 目标、阈值全部 TBD | 4、90%、50% 已确认；展示精度分别为 1、0、0 位 | 以 V1 已确认规则替换旧占位说明 |
| Store 的 Period | 全局筛选未来作用于所有业务页面 | Period 对 Store Master Data 无业务意义 | 已明确 Stores 只使用 Region、Area、Store |
| 业务规则状态 | 所有公式与状态规则 TBD | Training、Drill、Inspections、ASTM、Actions Open、Certificates、Environment 已部分确认 | 已写入集中规则文档；未覆盖部分继续 TBD |
| ASTM 输入 | Severity 映射 TBD | 使用 `ASTMInjuryIllness`；`Yes` 表示 ASTM Incident | Severity 降为描述字段 |
| Event Open | 状态映射 TBD | `Open` 为 Open、`Closed` 为 Closed，其它值为 Unknown | 已写入 `status-dictionary.md` |
| Take Charge Open | 状态映射 TBD | 三个已确认状态为 Closed，其它值为 Open | 已写入集中规则 |
| 百分比表示 | 0–1 或 0–100 TBD | 应用内部统一 0–100 | repository/adapter 负责未来外部转换 |
| Certificate Slot | 清单及匹配规则 TBD | 五类证件、八个 Slot，仅按 Certificate Type 精确匹配 | 已写入业务、规则和数据契约 |
| Global Filters | 默认值、选择方式、联动和 Period 边界 TBD | Region / Area / Store 与自然月 Period V1 已冻结 | 见 `business-requirements.md`、`data-contract.md`、`decisions.md` |
| Action Closure Rate 目标 | 目标 TBD | `>= 90%` 达成，`< 90%` 未达成 | 见 `metric-rules.md` 与 `decisions.md` |
| Events / Actions Store Resolution | 匹配优先级与冲突处理 TBD | TRTID 优先；英文名 fallback；明确匹配另一门店才冲突 | 见 `data-contract.md`、`data-architecture.md`、`decisions.md` |

## 未发现直接冲突

附件四份文档在信息架构、模块边界、数据源直接值、集中规则、Events/Actions 分层、Certificates 与 Environment 判定上相互一致。

## 剩余非阻塞 TBD

以下不是本次 mock 数据的阻断项；实现对应生产逻辑前仍需确认：

- Global Filters 的生产数据源
- Training 与 Inspection 的 Requirement 集合来源及 source 状态映射
- 生产环境 Reference Date 的来源
- 环境合同适用关系、组合结果列映射、许可空值处理
- Environmental Monitoring 明细、频次和达标规则
- Events / Actions 以外数据源的 Store Resolution 策略
- 数据库、API、权限、刷新和持久化

## 需注意的表达边界

- Goal 汇总值可随 Region、Area、Store、Period 变化，但 `Goal Summary` 如何表达多门店汇总结果尚未形成 API Schema；实现时不得把单一 `Store Reference` 结构当作已冻结方案。
- 缺失必要 Expiry Date 且没有更早异常结论时返回 `UNDETERMINED`；不得将缺失日期视为有效或过期。
