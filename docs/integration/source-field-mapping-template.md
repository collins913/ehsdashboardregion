# 公司数据源字段映射模板

## 用途与边界

公司 AI 在获得公司数据库只读访问后，使用本模板记录物理数据源到现有 EHS Dashboard Contract 的映射。逻辑字段和校验条件来自当前代码与 [`../api/production-api-v1.yaml`](../api/production-api-v1.yaml)，不得为了适配数据库而改名或改变含义。

本模板中所有“公司来源”字段均由公司 AI 基于实际数据库填写；当前仓库不提供也不猜测表名、列名、自然键、枚举映射、刷新频率或完整性证明。不得在此文件记录连接串、Token、密码或真实个人数据样例。

字段状态只允许：`UNMAPPED`、`MAPPED`、`BLOCKED`、`NOT_APPLICABLE`。`MAPPED` 必须有查询、样例或自动测试证据。

## 映射批次信息

| 项目 | 公司填写 |
|---|---|
| Git branch / commit | 待填写 |
| 数据库类型与环境 | 待填写；不得填写凭据 |
| Source System | 待填写 |
| 数据库 Schema / View 版本 | 待填写 |
| Adapter 名称与版本 | 待填写 |
| Source Owner | 待填写 |
| Data Owner / EHS Approver | 待填写 |
| 提取方式 | 待填写 |
| 上海时区处理方式 | 待填写 |
| 映射日期 | 待填写 |

## 每个 Domain 必须先确认

| Domain | 公司来源对象 | Source grain | 稳定记录 ID / 自然键 | Store 关联字段 | 时间 / 生效范围 | Coverage Proof | 刷新方式 | 状态 |
|---|---|---|---|---|---|---|---|---|
| `store-master` | 待填写 | 一行一个门店 | TRTID 必须唯一；生命周期规则待确认 | TRTID | Snapshot effective time | 待填写 | 待填写 | UNMAPPED |
| `training` | 待填写 | Store × item × month | 当前技术键为 Store × Month × `trainingName`；Production 自然键待确认 | 待填写 | Month + business period | 待填写 | 待填写 | UNMAPPED |
| `drill` | 待填写 | Store × drill × month | 待确认 | 待填写 | Month + business period | 待填写 | 待填写 | UNMAPPED |
| `inspection` | 待填写 | 一行一个检查任务 | `inspectionNumber` 在 Domain 内唯一 | 待填写 | `dueDate` + business period | 待填写 | 待填写 | UNMAPPED |
| `action-closure-rate` | 待填写 | Store × exact half-open period | Store + startInclusive + endExclusive | 待填写 | `[startInclusive, endExclusive)` | 待填写 | 待填写 | UNMAPPED |
| `events` | 待填写 | 一行一个事件 | `eventId` 在 Domain 内唯一 | 待填写 | `eventDate` + business period | 待填写 | 待填写 | UNMAPPED |
| `actions` | 待填写 | 一行一个行动项 | `actionId` 在 Domain 内唯一 | 待填写 | `submittedDate` + business period | 待填写 | 待填写 | UNMAPPED |
| `take-charge` | 待填写 | 一行一个提交 | `tchId` 在 Domain 内唯一 | 待填写 | `submittedAt` + business period | 待填写 | 待填写 | UNMAPPED |
| Take Charge annual source | 待填写 | 授权 Scope × Year × reference month | 待确认；不使用通用 Import API | 由授权后的 canonical Store IDs 构成 Scope | 1 月至上海 reference month | 待填写 | Direct Repository read | UNMAPPED |
| `certificates` | 待填写 | 一行一张证件 | Production record ID / 自然键待确认 | TRTID / 英文名 | Snapshot effective time | 待填写 | 待填写 | UNMAPPED |
| `environment` | 待填写 | 一个门店 Snapshot，合同为 0..N | Snapshot identity 待确认 | TRTID / 英文名 | Snapshot effective time | 待填写 | 待填写 | UNMAPPED |
| `required-sets` | 待填写 | Store × Month × set kind | Store + Month + Training/Inspection kind；稳定 item/task ID 待确认 | 待填写 | Month + effective time | 待填写 | 待填写 | UNMAPPED |

## 公共映射

### Store Reference

只允许精确 TRTID，或 TRTID 缺失时使用精确且唯一的英文门店名。不得使用模糊匹配。

| Logical field | Contract | 公司来源对象.字段 | Physical type | 转换 / null 处理 | 状态与证据 |
|---|---|---|---|---|---|
| `storeReference.trtid` | 非空 string，优先 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeReference.storeNameEn` | string，可作为辅助或唯一精确匹配 | 待填写 | 待填写 | 待填写 | UNMAPPED |

### Source Reference（可选）

| Logical field | Contract | 公司来源对象.字段 | Physical type | 转换 / null 处理 | 状态与证据 |
|---|---|---|---|---|---|
| `sourceReference.sourceSystem` | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `sourceReference.sourceRecordId` | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `sourceReference.sourceUrl` | absolute URI string | 待填写 | 待填写 | 不得包含临时访问 Token | UNMAPPED |

### 发布与完整性元数据

| Logical metadata | Contract | 公司生成来源 | 生成 / 验证方式 | 状态与证据 |
|---|---|---|---|---|
| `schemaVersion` | 固定 `v1` | Adapter | 固定值 | UNMAPPED |
| `sourceSystem` | 1–120 非空字符 | 待填写 | 待填写 | UNMAPPED |
| `sourceVersion` | 可选，1–120 非空字符 | 待填写 | 待填写 | UNMAPPED |
| `configurationVersion` | 可选，1–120 非空字符 | 待填写 | 待填写 | UNMAPPED |
| `batchId` | 1–160 非空字符 | 待填写 | 唯一性与重试策略待填写 | UNMAPPED |
| `extractionTime` | 带时区 ISO datetime | 待填写 | 可信服务端生成 | UNMAPPED |
| `businessPeriod` | 半开时区范围 | 待填写 | start < end | UNMAPPED |
| `effectiveTime` | 半开时区范围 | 待填写 | start < end | UNMAPPED |
| `coverage.stores` | 最多 10,000 个 StoreReference | 待填写 | 必须与发布 Scope 一致 | UNMAPPED |
| `coverage.businessPeriod` | 与批次业务周期一致 | 待填写 | 待填写 | UNMAPPED |
| `coverage.proof` | 独立 control total / manifest / digest / authoritative empty | 待填写 | 不能仅比较请求自己提供的值 | UNMAPPED |
| `expectedRecordCount` | 非负整数，等于 records.length | Adapter | 仅校验请求自洽 | UNMAPPED |
| `idempotencyKey` | 1–200 非空字符 | 待填写 | 相同 body 可重试，不同 body 冲突 | UNMAPPED |

## Domain 字段映射

以下表格固定逻辑字段。公司 AI 填写后三列并附证据；枚举和值域转换必须保留原始值或获得业务批准。

### Store Master

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `region` | required string | 待填写 | 待填写 | UNMAPPED |
| `area` | required string | 待填写 | 待填写 | UNMAPPED |
| `storeNameCn` | required string | 待填写 | 待填写 | UNMAPPED |
| `storeNameEn` | required string | 待填写 | 待填写 | UNMAPPED |
| `trtid` | required non-blank string；批次唯一 | 待填写 | 待填写 | UNMAPPED |
| `regionOwner` / `regionOwnerEmail` | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据。UNMAPPED |
| `areaOwner` / `areaOwnerEmail` | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据。UNMAPPED |
| `manager` / `managerEmail` | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据。UNMAPPED |
| `ehsAmbassador` / `ehsAmbassadorEmail` | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据。UNMAPPED |

### Training

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `month` | required `YYYY-MM` | 待填写 | 待填写 | UNMAPPED |
| `trainingName` | required string | 待填写 | 待填写 | 名称是否为稳定身份仍待确认。UNMAPPED |
| `completionRate` | number 0–100 或 null | 待填写 | 待填写 | 单位必须确认是百分数值。UNMAPPED |
| `incompletePeople` | string[] 或 null | 待填写 | 待填写 | 空数组、null 与来源缺失必须区分。UNMAPPED |

### Drill

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `month` | required `YYYY-MM` | 待填写 | 待填写 | UNMAPPED |
| `drillName` | required string | 待填写 | 待填写 | UNMAPPED |
| `status` | string 或 null | 待填写 | 待填写 | 提交原始状态；状态语义由现有规则处理。UNMAPPED |

### Inspection

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `inspectionNumber` | required string；Domain 内唯一 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `inspectionName` | required string | 待填写 | 待填写 | 与 expected task 稳定身份关系待确认。UNMAPPED |
| `dueDate` | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 按上海业务日期解释。UNMAPPED |
| `inspector` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `status` | string 或 null | 待填写 | 待填写 | 提交原始状态。UNMAPPED |

### Action Closure Rate

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `startInclusive` | 带时区 ISO datetime | 待填写 | 待填写 | UNMAPPED |
| `endExclusive` | 带时区 ISO datetime；晚于 start | 待填写 | 待填写 | UNMAPPED |
| `value` | source-provided number 0–100 或 null | 待填写 | 待填写 | 不在 Dashboard 中重新计算或平均。UNMAPPED |

### Events / ASTM

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `eventId` | required string；Domain 内唯一 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `eventType` | required string | 待填写 | 待填写 | 保留动态来源值。UNMAPPED |
| `submittedBy` | required string | 待填写 | 待填写 | UNMAPPED |
| `eventDate` | required 带时区 ISO datetime | 待填写 | 待填写 | 页面 Period 以此字段为准。UNMAPPED |
| `EventDetail.Description` | required string | 待填写 | 待填写 | UNMAPPED |
| `Status` | required string | 待填写 | 待填写 | 提交原始状态。UNMAPPED |
| `ASTMInjuryIllness` | `Yes` 或 `No` | 待填写 | 待填写 | 其他来源值不得猜测映射。UNMAPPED |

### Actions

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `actionId` | required string；Domain 内唯一 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `problem` | required string | 待填写 | 待填写 | UNMAPPED |
| `action` | required string | 待填写 | 待填写 | UNMAPPED |
| `submittedBy` | required string | 待填写 | 待填写 | UNMAPPED |
| `owner` | required string | 待填写 | 待填写 | UNMAPPED |
| `submittedDate` | required 带时区 ISO datetime | 待填写 | 待填写 | 页面 Period 以此字段为准。UNMAPPED |
| `dueDate` | required 带时区 ISO datetime | 待填写 | 待填写 | UNMAPPED |
| `closedDate` | 带时区 ISO datetime 或 null | 待填写 | 待填写 | UNMAPPED |
| `Status` | required string | 待填写 | 待填写 | 未知状态必须保留为 UNKNOWN。UNMAPPED |

### Take Charge Records

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `tchId` | required string；Domain 内唯一 | 待填写 | 待填写 | UNMAPPED |
| `submittedBy` | required string | 待填写 | 待填写 | UNMAPPED |
| `submittedAt` | required 带时区 ISO datetime | 待填写 | 待填写 | UNMAPPED |
| `summary` | required string | 待填写 | 待填写 | UNMAPPED |
| `Status` | required string | 待填写 | 待填写 | 提交原始状态。UNMAPPED |
| `extraFields` | string / finite number / boolean / null map | 待填写 | 待填写 | 字段字典未批准前保持 BLOCKED。UNMAPPED |

### Take Charge Annual Source（Direct Repository）

此来源不进入通用 Import API。Production Repository 使用服务端授权后的 canonical Store IDs、当前年份和上海 reference month 查询来源，并只返回现有 `TakeChargeAnnualSource`。Mock fixture 中的 numerator / denominator 字段不是 Production Contract，不得复制到公司接口。

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| Query: authorized Store IDs | 来自服务端 Effective Access 后的 canonical Store Scope | 待填写 | 待填写 | 数据库 predicate 必须使用该 Scope。UNMAPPED |
| Query: year | 来自服务端上海 reference month 的年份 | 待填写 | 待填写 | Client 不能覆盖。UNMAPPED |
| Query: reference month | 服务端上海月份，`YYYY-MM` | 待填写 | 待填写 | YTD 截止月份。UNMAPPED |
| `submissionsPerCapitaYtd.value` | source-provided number 或 null | 待填写 | 待填写 | 1 月至当前上海 reference month；不得推导未批准分母。UNMAPPED |
| `submissionsPerCapitaYtd.reason` | 可选既有 DomainReason | 待填写 | 待填写 | 缺失、非法和不完整必须显式映射。UNMAPPED |
| `participationRateYtd.value` | source-provided number 或 null | 待填写 | 待填写 | 百分数值；不得平均门店最终值。UNMAPPED |
| `participationRateYtd.reason` | 可选既有 DomainReason | 待填写 | 待填写 | 缺失、非法和不完整必须显式映射。UNMAPPED |

`closeRate` 不属于上述年度直读 Contract；它继续由已发布 Take Charge records 的现有 Repository / Rule 链路产生。

### Certificates

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `TRTID` | required non-blank string | 待填写 | 待填写 | UNMAPPED |
| `English Store Name` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `Certificate Type` | required string | 待填写 | 待填写 | 不发明新类别映射。UNMAPPED |
| `Expiry Date` | string 或 null | 待填写 | 待填写 | 非法日期文本保留给现有规则诊断。UNMAPPED |
| `Person` | required string | 待填写 | 待填写 | UNMAPPED |
| `Person Email` | required string | 待填写 | 待填写 | UNMAPPED |
| `Business Title` | required string | 待填写 | 待填写 | UNMAPPED |

### Environment

Environment 使用现有嵌套 Contract；不得扁平化后丢失 0..N 合同记录。每个下列 JSON path 都要映射。

| Logical JSON path | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `TRTID` | required non-blank string | 待填写 | 待填写 | UNMAPPED |
| `English Store Name` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.环境影响评价` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.气-颗粒物` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.气-VOCs` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-氨氮` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-总氮` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-总磷` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-CODcr` | finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.排污许可` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.执行报告` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.编号` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.有效期起` / `有效期止` | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.总量要求.产能` | string、finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.总量要求.涂料批复用量` | string、finite number 或 null | 待填写 | 待填写 | UNMAPPED |
| `排污许可.备注` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排水许可.洗车` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排水许可.排水许可` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `排水许可.有效期起` / `有效期止` | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | UNMAPPED |
| `排水许可.备注` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境预案.突发环境事件应急预案备案情况` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境预案.备案编号` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境预案.有效期起` / `有效期止` | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | UNMAPPED |
| `环境预案.备注` | string 或 null | 待填写 | 待填写 | UNMAPPED |
| `监测` | `有` / `无` / `不适用` | 待填写 | 待填写 | 其他来源值不得猜测映射。UNMAPPED |
| `废弃物合同.危险废物处置合同[]` | 0..N records | 待填写 | 待填写 | 不得只取第一条。UNMAPPED |
| `废弃物合同.一般工业固体废物处置合同[]` | 0..N records | 待填写 | 待填写 | 不得只取第一条。UNMAPPED |
| `合同[].供应商名称` | required string | 待填写 | 待填写 | UNMAPPED |
| `合同[].种类` | required string | 待填写 | 待填写 | UNMAPPED |
| `合同[].有效期起` / `有效期止` | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | UNMAPPED |

### Required Sets

每条记录必须且只能包含 Training 或 Inspection 其中一种集合。集合非空、无空项、无重复；不能从实际完成记录反推。

| Logical field | Contract | 公司来源对象.字段 | Physical type / null | 转换、验证与证据 |
|---|---|---|---|---|
| `storeReference` | 公共 Store Reference | 待填写 | 待填写 | UNMAPPED |
| `month` | required `YYYY-MM` | 待填写 | 待填写 | UNMAPPED |
| `requiredTrainingItems` | 非空、唯一 string[]；与 Inspection 二选一 | 待填写 | 待填写 | Authority 与稳定 item ID 待确认。BLOCKED |
| `expectedInspectionTasks` | 非空、唯一 string[]；与 Training 二选一 | 待填写 | 待填写 | Authority 与稳定 task ID 待确认。BLOCKED |

## 枚举与原始状态映射

任何来源状态、类别或布尔值与逻辑值不完全一致时，逐项记录；没有业务批准时保持 `BLOCKED`。不得把未知值映射为正常、关闭、达成或否。

| Domain / field | 公司原始值 | 目标逻辑值 | 批准依据 | 未知值处理 | 状态与证据 |
|---|---|---|---|---|---|
| 待填写 | 待填写 | 待填写 | 待填写 | 保留原值或显式 UNKNOWN / diagnostic | UNMAPPED |

## 完整性与空数据证明

| Domain | 预期 Scope / Period 的来源清单 | Control total / manifest / digest 来源 | 零记录权威证明 | 独立校验器 | 发布阻断条件 | 状态与证据 |
|---|---|---|---|---|---|---|
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | Proof 未验证时不得发布 | UNMAPPED |

每个 Domain 单独填写一行。`expectedRecordCount === records.length` 只证明请求自洽，不证明来源完整。

## 公司 AI 执行要求

1. 先以只读方式读取数据库 Schema、约束、视图定义和字段统计，不先改代码。
2. 填写所有可确认映射；无法确认的字段、自然键、枚举和 Coverage Proof 标记 `BLOCKED`。
3. 输出重复、缺失、null、无效时间、孤立 Store、Schema drift 和历史覆盖报告。
4. 由数据负责人和 EHS 负责人批准映射与 BLOCKED 清单后，再实现 Adapter。
5. Adapter 只做授权 Scope、读取、类型规范化、Store Resolution 和来源诊断；业务判断继续走现有 Rule Engine。
6. 实现后用 [`uat-acceptance-matrix.md`](uat-acceptance-matrix.md) 记录测试和签字证据。

## 审批

| 范围 | 公司负责人 | 结论 | 证据位置 | 日期 |
|---|---|---|---|---|
| 数据库对象、字段与类型 | 待填写 | 待填写 | 待填写 | 待填写 |
| 记录 ID / 自然键 | 待填写 | 待填写 | 待填写 | 待填写 |
| Store Resolution | 待填写 | 待填写 | 待填写 | 待填写 |
| 枚举和状态映射 | 待填写 | 待填写 | 待填写 | 待填写 |
| Coverage / authoritative empty | 待填写 | 待填写 | 待填写 | 待填写 |
| Required Sets | 待填写 | 待填写 | 待填写 | 待填写 |
| Take Charge annual source | 待填写 | 待填写 | 待填写 | 待填写 |

任何必需映射仍为 `UNMAPPED` / `BLOCKED` 时，对应 Domain 不得进入 Production 发布。
