# Business Documentation Conflict Review

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

## 未发现直接冲突

附件四份文档在信息架构、模块边界、数据源直接值、集中规则、Events/Actions 分层、Certificates 与 Environment 判定上相互一致。

## 仍阻塞实现的 TBD

以下不是冲突，但在实现相关功能前必须确认：

- Global Filters 数据源、默认值、单/多选、联动和 Period 边界
- Training 与 Inspection 的 Requirement 集合、缺记录处理和完成状态
- Action Closure Rate 目标；Events Open 状态；Severity 到 ASTM 的映射
- Take Charge Close Rate 明细的“未关闭”状态映射
- Required Slot 清单、证件匹配、有效期边界和空值处理
- 环境合同适用关系、组合结果列映射、许可空值处理
- Environmental Monitoring 明细、频次和达标规则
- Store Resolution 匹配优先级、冲突与未匹配处理
- 数据库、API、权限、刷新、持久化和业务视觉映射

## 需注意的表达边界

- Goal 汇总值可随 Region、Area、Store、Period 变化，但 `Goal Summary` 如何表达多门店汇总结果尚未形成 API Schema；实现时不得把单一 `Store Reference` 结构当作已冻结方案。
- “缺失 Expiry Date”仍为 TBD。不得因其它分支已定义，就默认把缺失日期视为有效或过期。
