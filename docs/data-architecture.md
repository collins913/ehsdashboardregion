# Data Architecture

UI 仅通过 repository 抽象访问数据。真实数据库、数据契约、数据库字段和权限尚未确定。

## V1 domain boundaries

- `Risk & Compliance`：底层业务事实与记录，包括 Events、Actions、Certificates、Environment。
- `Performance`：基于业务事实计算的指标和目标，不代表原始记录。
- `Overview`：汇总 Performance 与 Risk & Compliance，用于管理层概览与优先级判断。
- `Store Detail`：仅核验门店主数据，不承载 Performance 或 Risk & Compliance 内容。

## Reserved store master-data fields

- Region
- Area
- Store Name CN
- Store Name EN
- Store ID
- Manager
- EHS Ambassador

以上仅为确认的字段名称，类型、约束、来源和存储结构均为 TBD。
