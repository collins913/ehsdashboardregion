# 对接字段清单与来源映射表

## 使用方式

本文是对接人员可直接填写的字段工作表。先确认接入类别，再填写对应字段的来源、转换规则与证据；字段名保留代码中的大小写、空格和中文，不自行改名。

| 接入类别 | 对应章节 | 接入位置 |
|---|---|---|
| 访问用户：姓名、头像、邮箱 | [用户身份与访问资料](#用户身份与访问资料) | 企业服务端 Identity Provider；嵌入页面资料通过 GLIFE_CONTEXT |
| 权限管理：邮箱、可选姓名、授权范围 | [权限管理](#权限管理) | Access Service / 持久化 Repository，独立于业务批量导入 |
| 门店、培训、演练、检查、行动项、事件、证件、环境、必需集合 | [业务字段](#domain-字段映射) | 现有批量导入 API / Production Adapter |
| Take Charge 年度指标 | [年度指标直读](#take-charge-年度指标直读) | 授权后的 Production Repository；不能用通用导入 API |
| 批次、周期、完整性证明 | [公共映射](#公共映射) | 每次业务批量导入的外层字段 |

填写顺序：批次信息 → Domain 来源与粒度 → 字段映射 → 枚举与单位 → 完整性证明 → 审批。身份与权限接入可以独立填写。

### 表格约定

- **必传**：JSON 必须包含该键；不等于值不能为 `null`。例如 `completionRate` 必传，但允许 `null`。
- **可选**：允许省略该键；只有类型明确包含 `null` 时才可传 `null`。
- **条件**：按本行说明或 Domain 时间要求提供。
- `null`、空数组、零值和缺失字段含义不同；不把未知数据补成 0、否、正常或关闭。
- JSON path 中的 `.` 表示嵌套对象，`[]` 表示每个数组元素；实际请求不能把整个 path 当作一个扁平字段名。
- “公司来源”“源类型／空值”“转换／验证”由对接人员填写。状态使用 `UNMAPPED` / `MAPPED` / `BLOCKED` / `NOT_APPLICABLE`；证据填写脱敏样例、查询或验证记录的位置。可选字段不用时可标记 `NOT_APPLICABLE`。

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

## 用户身份与访问资料

访问时只对接以下三项用户资料。

| 字段 | 含义 | 传递要求 | 类型／格式 | 公司来源 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|
| `avatarUrl` | 用户头像 | 可选 | string 或 null | 待填写 | 可直接显示的头像 URL | UNMAPPED |
| `name` | 用户姓名 | 可选 | string 或 null | 待填写 | 如 San Zhang（张 三）；无值可为 null | UNMAPPED |
| `email` | 用户邮箱 | 必填 | 有效邮箱 string | 待填写 | 使用访问时带入的邮箱 | UNMAPPED |

用户资料示例：

```json
{
  "avatarUrl": "https://example.test/avatars/san-zhang.png",
  "name": "San Zhang（张 三）",
  "email": "san.zhang@example.test"
}
```

嵌入访问的完整消息示例：

```json
{
  "type": "GLIFE_CONTEXT",
  "payload": {
    "avatarUrl": "https://example.test/avatars/san-zhang.png",
    "name": "San Zhang（张 三）",
    "email": "san.zhang@example.test"
  }
}
```

## 权限管理

权限管理不是用户登录资料库，也不走业务批量导入 API。以下为现有 `GrantInput`；修改请求 `GrantUpdate` 不包含 `email`。邮箱必填，姓名可空；业务权限只由服务端解析。

| 字段 | 含义 | 传递要求 | 类型／格式 | 公司来源 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|
| `email` | 被授权用户邮箱 | 新增必传 | 有效邮箱 string | 待填写 | 不能为空；统一 canonical email；修改已有授权不更换邮箱 | UNMAPPED |
| `name` | 权限列表中的姓名 | 可选 | string 或 null | 待填写 | 空白转 null；门店联系人使用 Store Master 姓名 | UNMAPPED |
| `accessType` | 权限类型 | 必传 | GLOBAL_USER / GLOBAL_ADMIN / REGION / AREA / STORE | 待填写 | 仅接受已有类型 | UNMAPPED |
| `scopeId` | 授权范围 ID | 必传 | string 或 null | 待填写 | 全局权限为 null；区域／小区／门店使用服务端目录 ID | UNMAPPED |
| `note` | 授权备注 | 必传 | string 或 null | 待填写 | 无备注传 null | UNMAPPED |

`scopeDisplayName` 由服务端目录解析，不接受前端自行定义。小区 ID 使用现有 `areaScopeId(region, area)`，不能仅用同名小区名称拼接权限。

持久化 Repository 另外维护 `id`、`scopeDisplayName`、`grantedBy`、`grantedAt`、`updatedBy`、`updatedAt`；它们是服务端生成或解析的字段，不是新增授权的用户输入。审计记录沿用现有 `AuditEvent`，与授权写入原子提交，字段定义见 [`access/index.ts`](../../src/data/contracts/access/index.ts)。

同一 canonical email 的手动姓名在各条授权间同步，并在同一事务留下审计；Store Master 联系人姓名优先，冲突时不任取一个。权限管理中的姓名修改不覆盖访问用户的姓名和头像。

## 每个 Domain 必须先确认

### 数据粒度与时间

| Domain | 数据粒度 | 记录身份／关联 | 时间范围 |
|---|---|---|---|
| `store-master` | 一行一个门店 | TRTID 必须唯一；生命周期规则待确认；门店关联：TRTID | Snapshot effective time |
| `training` | Store × item × month | 当前技术键为 Store × Month × `trainingName`；Production 自然键待确认；门店关联：待填写 | Month + business period |
| `drill` | Store × drill × month | 待确认；门店关联：待填写 | Month + business period |
| `inspection` | 一行一个检查任务 | `inspectionNumber` 在 Domain 内唯一；门店关联：待填写 | `dueDate` + business period |
| `action-closure-rate` | Store × exact half-open period | Store + startInclusive + endExclusive；门店关联：待填写 | `[startInclusive, endExclusive)` |
| `events` | 一行一个事件 | `eventId` 在 Domain 内唯一；门店关联：待填写 | `eventDate` + business period |
| `actions` | 一行一个行动项 | `actionId` 在 Domain 内唯一；门店关联：待填写 | `submittedDate` + business period |
| `take-charge` | 一行一个提交 | `tchId` 在 Domain 内唯一；门店关联：待填写 | `submittedAt` + business period |
| Take Charge annual source | 授权 Scope × Year × reference month | 待确认；不使用通用 Import API；门店关联：由授权后的 canonical Store IDs 构成 Scope | 1 月至上海 reference month |
| `certificates` | 一行一张证件 | Production record ID / 自然键待确认；门店关联：TRTID / 英文名 | Snapshot effective time |
| `environment` | 一个门店 Snapshot，合同为 0..N | Snapshot identity 待确认；门店关联：TRTID / 英文名 | Snapshot effective time |
| `required-sets` | Store × Month × set kind | Store + Month + Training/Inspection kind；稳定 item/task ID 待确认；门店关联：待填写 | Month + effective time |

### 公司来源登记

| Domain | 公司来源对象／视图 | Coverage Proof 来源 | 刷新方式 | 状态／证据 |
|---|---|---|---|---|
| `store-master` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `training` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `drill` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `inspection` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `action-closure-rate` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `events` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `actions` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `take-charge` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| Take Charge annual source | 待填写 | 待填写 | Direct Repository read | UNMAPPED |
| `certificates` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `environment` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `required-sets` | 待填写 | 待填写 | 待填写 | UNMAPPED |

## 公共映射

### 门店引用（StoreReference）

优先精确 TRTID；缺失或无法唯一解析时回退到精确且唯一的英文门店名。TRTID 已唯一解析、英文名未匹配时保留 TRTID 结果；两者明确指向不同门店时拒绝。不得模糊匹配。对象至少提供一个非空标识；`trtid` 不能传 null，仅提供英文名时省略 `trtid`。

| 字段 | 传递要求／类型 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|
| `storeReference.trtid` | 优先提供，非空 string | 待填写 | 待填写 | 使用稳定门店标识 | UNMAPPED |
| `storeReference.storeNameEn` | 无 TRTID 时必传非空 string；有 TRTID 时可选 string 或 null | 待填写 | 待填写 | 精确英文名；中文名不参与关联 | UNMAPPED |

### 来源追溯（SourceReference，可选）

整个 `sourceReference` 可省略或为 null；提供对象时，以下子字段均可省略，但不接受 null。适用 Domain 见业务字段章节。

| 字段 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|
| `sourceReference.sourceSystem` | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `sourceReference.sourceRecordId` | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `sourceReference.sourceUrl` | absolute URI string | 待填写 | 待填写 | 不包含临时访问 Token | UNMAPPED |

### 批量导入外层字段

字段均位于请求体顶层，带 `coverage.` 的字段嵌套在必传对象 `coverage` 内。单次请求最多 10 MiB、10,000 条记录和 10,000 个覆盖门店。日期时间必须带 `Z` 或 UTC offset；时间范围为 `[startInclusive, endExclusive)` 且 start < end，不接受无时区时间。

| 字段 | 含义 | 传递要求／类型 | 生成来源 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|
| `schemaVersion` | 契约版本 | 必传，固定 v1 | Adapter | 固定值 | UNMAPPED |
| `domain` | 本批业务域 | 必传，本文件登记的 11 个批量 Domain 之一 | Adapter | 年度汇总不接受批量导入 | UNMAPPED |
| `sourceSystem` | 来源系统名称 | 必传，1–120 非空字符 | 待填写 | 待填写 | UNMAPPED |
| `sourceVersion` | 来源版本 | 可选，1–120 非空字符 | 待填写 | 不传 null | UNMAPPED |
| `configurationVersion` | 映射配置版本 | 可选，1–120 非空字符 | 待填写 | 不传 null | UNMAPPED |
| `batchId` | 批次标识 | 必传，1–160 非空字符 | 待填写 | 唯一性与重试策略待填写 | UNMAPPED |
| `extractionTime` | 数据提取时间 | 必传，带时区 ISO datetime | 待填写 | 可信服务端生成 | UNMAPPED |
| `businessPeriod` | 顶层业务周期 | 可选，TimeRange 对象 | 待填写 | 提供时须与 coverage.businessPeriod 表示同一时间范围 | UNMAPPED |
| `effectiveTime` | 快照／配置适用期 | 条件，TimeRange 对象 | 待填写 | 适用 Domain 见下表 | UNMAPPED |
| `coverage.completeness` | 来源声明的完整性 | 必传，COMPLETE / PARTIAL / UNKNOWN | 待填写 | COMPLETE 不等于已独立验证 | UNMAPPED |
| `coverage.stores` | 覆盖门店清单 | 必传，StoreReference[]，最多 10,000 项 | 待填写 | 与发布范围一致；完整 Store Master 清单必须使用 TRTID | UNMAPPED |
| `coverage.businessPeriod` | 覆盖业务周期 | 条件，TimeRange 对象 | 待填写 | 适用 Domain 见下表 | UNMAPPED |
| `coverage.proof` | 独立来源证明 | 提交可选；发布前必须验证，CoverageProof 对象 | 待填写 | 类型与子字段见下表 | UNMAPPED |
| `expectedRecordCount` | 本次记录数 | 必传，非负安全整数 | Adapter | 等于 records.length；仅证明请求自洽 | UNMAPPED |
| `idempotencyKey` | 幂等标识 | 必传，1–200 非空字符 | 待填写 | 同 body 可重试，不同 body 冲突 | UNMAPPED |
| `records` | 单一 Domain 的记录 | 必传，数组，0–10,000 项 | Adapter | 空数组仍须证明对应范围确实零记录 | UNMAPPED |

TimeRange 对象中的 `startInclusive`、`endExclusive` 两个字段均必传，类型为带时区 ISO datetime。外层可选对象不接受 null。

| Domain 分类 | 必须提供的时间范围 | 记录归属依据 |
|---|---|---|
| training / drill | coverage.businessPeriod | month 对应的上海完整月份必须包含在范围内 |
| inspection | coverage.businessPeriod | 上海 dueDate；null 保留供规则诊断 |
| action-closure-rate | coverage.businessPeriod | 记录自身完整的半开统计范围必须包含在覆盖范围内 |
| events / actions / take-charge | coverage.businessPeriod | 分别按 eventDate / submittedDate / submittedAt |
| store-master / certificates / environment | effectiveTime | 快照适用期 |
| required-sets | effectiveTime | 配置适用期；每条记录另提供 month |

### 完整性证明字段（CoverageProof）

| 字段 | 传递要求／类型 | 公司生成来源 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|
| `coverage.proof.kind` | 必传，以下四种类型之一 | 待填写 | SOURCE_CONTROL_TOTAL / EXPORT_MANIFEST / SCOPE_DIGEST / AUTHORITATIVE_EMPTY | UNMAPPED |
| `coverage.proof.reference` | 必传，1–500 非空字符 | 待填写 | 独立来源凭据／清单的引用，不是请求自己生成的计数 | UNMAPPED |
| `coverage.proof.controlRecordCount` | 条件，非负安全整数 | 待填写 | SOURCE_CONTROL_TOTAL 必传；AUTHORITATIVE_EMPTY 必须为 0；其他类型可选 | UNMAPPED |
| `coverage.proof.scope` | SCOPE_DIGEST 必传，其他可选；1–500 非空字符 | 待填写 | 必须对应本批授权覆盖范围 | UNMAPPED |
| `coverage.proof.digest` | SCOPE_DIGEST 必传，其他可选；1–256 非空字符 | 待填写 | 算法与独立比对来源待公司确认 | UNMAPPED |

EXPORT_MANIFEST 使用 reference 指向独立导出清单；不凭一个引用字符串认定数据完整，仍需公司校验器验证。所有可选证明子字段不接受 null。

### 批量导入使用顺序

| 操作 | 路径 | 用途 |
|---|---|---|
| POST | /api/v1/import/batches | 提交请求体，暂存批次 |
| POST | /api/v1/import/batches/{batchId}/validate | 验证字段、门店关联、覆盖范围与来源证明 |
| POST | /api/v1/import/batches/{batchId}/publish | 发布已验证批次 |
| GET | /api/v1/import/batches/{batchId} | 获取状态与诊断 |

请求使用 `Content-Type: application/json` 和公司机器身份 `Authorization: Bearer …`；机器权限按操作和 Domain 授权。当前企业身份、持久化和证明校验 Adapter 仍需公司实现，未配置时失败关闭。提交成功不等于发布成功，暂存记录不会被报表读取。完整请求／响应见 [OpenAPI](../api/production-api-v1.yaml)。

下面为可复制的培训请求结构，所有数据与证明引用均为虚构示例；替换为真实映射及独立证明后使用，不能直接作为生产发布证据。

```json
{
  "schemaVersion": "v1",
  "sourceSystem": "example-ehs",
  "domain": "training",
  "batchId": "training-2026-10-example-001",
  "extractionTime": "2026-10-16T10:00:00+08:00",
  "coverage": {
    "completeness": "COMPLETE",
    "stores": [{ "trtid": "S-001" }],
    "businessPeriod": {
      "startInclusive": "2026-10-01T00:00:00+08:00",
      "endExclusive": "2026-11-01T00:00:00+08:00"
    },
    "proof": {
      "kind": "SOURCE_CONTROL_TOTAL",
      "reference": "example-independent-control-reference",
      "controlRecordCount": 1
    }
  },
  "expectedRecordCount": 1,
  "idempotencyKey": "training-2026-10-example-001",
  "records": [{
    "storeReference": { "trtid": "S-001" },
    "month": "2026-10",
    "trainingName": "示例培训项目",
    "completionRate": null,
    "incompletePeople": null
  }]
}
```

## Domain 字段映射

以下表格固定目标字段、含义和传递要求；填写“公司来源”“源类型／空值”“转换／验证”“状态／证据”。枚举转换须遵循现有字典，差异需业务批准。

`training`、`drill`、`inspection`、`action-closure-rate`、`events`、`actions`、`take-charge` 均允许可选的 `sourceReference`（对象或 null），子字段见公共映射；其他批量 Domain 不接受该字段。不得向严格契约添加计算结果、UI 状态或未定义字段。

### Store Master

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `region` | 大区 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `area` | 小区 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeNameCn` | 门店中文名 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeNameEn` | 门店英文名 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `trtid` | 门店稳定标识 | 必传 | non-blank string；批次唯一 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `regionOwner` | 大区负责人姓名 | 可选 | string 或 null | 待填写 | 待填写 | 与负责人邮箱对应 | UNMAPPED |
| `regionOwnerEmail` | 大区负责人邮箱 | 可选 | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据 | UNMAPPED |
| `areaOwner` | 小区负责人姓名 | 可选 | string 或 null | 待填写 | 待填写 | 与联系人邮箱对应 | UNMAPPED |
| `areaOwnerEmail` | 小区负责人邮箱 | 可选 | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据 | UNMAPPED |
| `manager` | 门店经理姓名 | 可选 | string 或 null | 待填写 | 待填写 | 与联系人邮箱对应 | UNMAPPED |
| `managerEmail` | 门店经理邮箱 | 可选 | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据 | UNMAPPED |
| `ehsAmbassador` | 业车代表姓名 | 可选 | string 或 null | 待填写 | 待填写 | 与联系人邮箱对应 | UNMAPPED |
| `ehsAmbassadorEmail` | 业车代表邮箱 | 可选 | string 或 null | 待填写 | 待填写 | 邮箱用于 Base Grant；必须来自可信组织数据 | UNMAPPED |

### Training

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `month` | 业务月份 | 必传 | `YYYY-MM` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `trainingName` | 培训项目名称 | 必传 | string | 待填写 | 待填写 | 名称是否为稳定身份仍待确认 | UNMAPPED |
| `completionRate` | 培训完成率（百分数值） | 必传 | number 0–100 或 null | 待填写 | 待填写 | 单位必须确认是百分数值 | UNMAPPED |
| `incompletePeople` | 未完成人员名单 | 必传 | string[] 或 null | 待填写 | 待填写 | 空数组、null 与来源缺失必须区分 | UNMAPPED |

### Drill

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `month` | 业务月份 | 必传 | `YYYY-MM` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `drillName` | 演练项目名称 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `status` | 来源原始状态 | 必传 | string 或 null | 待填写 | 待填写 | 提交原始状态；状态语义由现有规则处理 | UNMAPPED |

### Inspection

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `inspectionNumber` | 检查任务编号 | 必传 | string；Domain 内唯一 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `inspectionName` | 检查任务名称 | 必传 | string | 待填写 | 待填写 | 与 expected task 稳定身份关系待确认 | UNMAPPED |
| `dueDate` | 截止日期／时间 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 按上海业务日期解释 | UNMAPPED |
| `inspector` | 检查人 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `status` | 来源原始状态 | 必传 | string 或 null | 待填写 | 待填写 | 提交原始状态 | UNMAPPED |

### Action Closure Rate

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `startInclusive` | 统计起点（含） | 必传 | 带时区 ISO datetime | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `endExclusive` | 统计终点（不含） | 必传 | 带时区 ISO datetime；晚于 start | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `value` | 来源提供的行动项关闭率 | 必传 | source-provided number 0–100 或 null | 待填写 | 待填写 | 不在 Dashboard 中重新计算或平均 | UNMAPPED |

### Events / ASTM

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `eventId` | 事件编号 | 必传 | string；Domain 内唯一 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `eventType` | 事件类型 | 必传 | string | 待填写 | 待填写 | 保留动态来源值 | UNMAPPED |
| `submittedBy` | 提交人 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `eventDate` | 事件发生时间 | 必传 | 带时区 ISO datetime | 待填写 | 待填写 | 页面 Period 以此字段为准 | UNMAPPED |
| `EventDetail.Description` | 事件描述 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Status` | 来源原始状态 | 必传 | string | 待填写 | 待填写 | 提交原始状态 | UNMAPPED |
| `ASTMInjuryIllness` | 是否 ASTM 事件 | 必传 | `Yes` 或 `No` | 待填写 | 待填写 | 其他来源值不得猜测映射 | UNMAPPED |

### Actions

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `actionId` | 行动项编号 | 必传 | string；Domain 内唯一 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `problem` | 问题描述 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `action` | 行动措施 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `submittedBy` | 提交人 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `owner` | 负责人 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `submittedDate` | 提交时间 | 必传 | 带时区 ISO datetime | 待填写 | 待填写 | 页面 Period 以此字段为准 | UNMAPPED |
| `dueDate` | 截止日期／时间 | 必传 | 带时区 ISO datetime | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `closedDate` | 关闭时间 | 必传 | 带时区 ISO datetime 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Status` | 来源原始状态 | 必传 | string | 待填写 | 待填写 | 未知状态必须保留为 UNKNOWN | UNMAPPED |

### Take Charge Records

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `tchId` | Take Charge 编号 | 必传 | string；Domain 内唯一 | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `submittedBy` | 提交人 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `submittedAt` | 提交时间 | 必传 | 带时区 ISO datetime | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `summary` | 提交摘要 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Status` | 来源原始状态 | 必传 | string | 待填写 | 待填写 | 提交原始状态 | UNMAPPED |
| `extraFields` | 已批准的扩展字段 | 可选 | string / finite number / boolean / null map | 待填写 | 待填写 | 字段字典未批准前保持 BLOCKED | BLOCKED |

### Take Charge 年度指标直读

此来源不进入通用 Import API。Production Repository 使用服务端授权后的 canonical Store IDs、当前年份和上海 reference month 查询来源，并只返回现有 `TakeChargeAnnualSource`。Mock fixture 中的 numerator / denominator 字段不是 Production Contract，不得复制到公司接口。

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| Query: authorized Store IDs | 服务端已授权门店集合 | 必传 | 来自服务端 Effective Access 后的 canonical Store Scope | 待填写 | 待填写 | 数据库 predicate 必须使用该 Scope | UNMAPPED |
| Query: year | 服务端参考年份 | 必传 | 来自服务端上海 reference month 的年份 | 待填写 | 待填写 | Client 不能覆盖 | UNMAPPED |
| Query: reference month | 服务端参考月份 | 必传 | 服务端上海月份，`YYYY-MM` | 待填写 | 待填写 | YTD 截止月份 | UNMAPPED |
| `submissionsPerCapitaYtd.value` | 年度人均提交数 | 必传 | source-provided number 或 null | 待填写 | 待填写 | 1 月至当前上海 reference month；不得推导未批准分母 | UNMAPPED |
| `submissionsPerCapitaYtd.reason` | 年度人均值来源／规则原因 | 可选 | 既有 DomainReason | 待填写 | 待填写 | 缺失、非法和不完整必须显式映射 | UNMAPPED |
| `participationRateYtd.value` | 年度参与率（百分数值） | 必传 | source-provided number 或 null | 待填写 | 待填写 | 百分数值；不得平均门店最终值 | UNMAPPED |
| `participationRateYtd.reason` | 年度参与率来源／规则原因 | 可选 | 既有 DomainReason | 待填写 | 待填写 | 缺失、非法和不完整必须显式映射 | UNMAPPED |

`closeRate` 不属于上述年度直读 Contract；它继续由已发布 Take Charge records 的现有 Repository / Rule 链路产生。

### Certificates

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `TRTID` | 门店稳定标识 | 必传 | non-blank string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `English Store Name` | 门店英文名 | 可选 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Certificate Type` | 证件类别 | 必传 | string | 待填写 | 待填写 | 不发明新类别映射 | UNMAPPED |
| `Expiry Date` | 证件到期日期原文 | 必传 | string 或 null | 待填写 | 待填写 | 非法日期文本保留给现有规则诊断 | UNMAPPED |
| `Person` | 持证人姓名 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Person Email` | 持证人邮箱 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `Business Title` | 持证人职位 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |

### Environment

Environment 使用现有嵌套 Contract；不得扁平化后丢失 0..N 合同记录。下列 path 的所有父对象必须存在，不能用 null 替代对象。两类合同数组均必传，元素为 0..N；无合同仅在覆盖完整且确认零记录时传 []。表中的 `合同[]` 行同时适用于两类合同的每个元素。

这里的 `监测` 是环境业务字段，继续保留；已移除的系统监控没有对接字段。产能和涂料批复用量的业务单位仍待确认。

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `TRTID` | 门店稳定标识 | 必传 | non-blank string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `English Store Name` | 门店英文名 | 可选 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.环境影响评价` | 环境影响评价 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.气-颗粒物` | 气-颗粒物（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.气-VOCs` | 气-VOCs（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-氨氮` | 水-氨氮（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-总氮` | 水-总氮（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-总磷` | 水-总磷（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境影响评价.总量要求.水-CODcr` | 水-CODcr（吨／年） | 必传 | finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.排污许可` | 排污许可 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.执行报告` | 执行报告 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.编号` | 编号 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.有效期起` | 有效期起 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.有效期止` | 有效期止 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.总量要求.产能` | 产能 | 必传 | string、finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.总量要求.涂料批复用量` | 涂料批复用量 | 必传 | string、finite number 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排污许可.备注` | 备注 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排水许可.洗车` | 洗车 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排水许可.排水许可` | 排水许可 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排水许可.有效期起` | 有效期起 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排水许可.有效期止` | 有效期止 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `排水许可.备注` | 备注 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境预案.突发环境事件应急预案备案情况` | 突发环境事件应急预案备案情况 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境预案.备案编号` | 备案编号 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境预案.有效期起` | 有效期起 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境预案.有效期止` | 有效期止 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `环境预案.备注` | 备注 | 必传 | string 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `监测` | 监测 | 必传 | `有` / `无` / `不适用` | 待填写 | 待填写 | 其他来源值不得猜测映射 | UNMAPPED |
| `废弃物合同.危险废物处置合同[]` | 危险废物处置合同 | 必传 | 0..N records | 待填写 | 待填写 | 不得只取第一条 | UNMAPPED |
| `废弃物合同.一般工业固体废物处置合同[]` | 一般工业固体废物处置合同 | 必传 | 0..N records | 待填写 | 待填写 | 不得只取第一条 | UNMAPPED |
| `合同[].供应商名称` | 供应商名称 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `合同[].种类` | 种类 | 必传 | string | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `合同[].有效期起` | 有效期起 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `合同[].有效期止` | 有效期止 | 必传 | `YYYY-MM-DD` 或 null | 待填写 | 待填写 | 待填写 | UNMAPPED |

### Required Sets（旧接口兼容项，不参与当前评分，无需为培训／检查接入填写）

培训／检查按已有记录评价，完整空范围达成并计满分。以下仅保留既有接口结构，不再作为必需数据或接入阻塞项。

每条记录必须且只能包含 Training 或 Inspection 其中一种集合。集合非空、无空项、无重复；不能从实际完成记录反推。

| 字段／JSON path | 含义 | 传递要求 | 类型／格式 | 公司来源对象.字段 | 源类型／空值 | 转换／验证 | 状态／证据 |
|---|---|---|---|---|---|---|---|
| `storeReference` | 门店关联对象 | 必传 | 公共 Store Reference | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `month` | 业务月份 | 必传 | `YYYY-MM` | 待填写 | 待填写 | 待填写 | UNMAPPED |
| `requiredTrainingItems` | 应完成培训项目集合 | 条件：二选一 | 非空、唯一 string[]；与 Inspection 二选一 | 待填写 | 待填写 | 当前评分无需此项 | NOT_REQUIRED |
| `expectedInspectionTasks` | 应完成检查任务集合 | 条件：二选一 | 非空、唯一 string[]；与 Training 二选一 | 待填写 | 待填写 | 当前评分无需此项 | NOT_REQUIRED |

## 枚举与原始状态映射

| 字段 | 当前契约／映射依据 | 接入要求 |
|---|---|---|
| Drill / Inspection `status` | 开放原始文本；仅规范化后精确 `已完成` 为完成 | 不把所有非空状态视为完成 |
| Events `Status`、Actions `Status`、Take Charge `Status` | 原文保留；集中映射见 [状态字典](../status-dictionary.md) | 不在 Adapter 或前端新增状态含义 |
| Events `ASTMInjuryIllness` | Yes / No | 未知来源值先阻断映射，不能默认 No |
| Environment `监测` | 有 / 无 / 不适用 | 未知来源值先阻断映射 |
| Training `completionRate`、Action Closure Rate `value` | 0–100；例如 85 表示 85% | 来源 0–1 时明确乘 100，记录转换依据 |
| 年度指标 `reason` | 现有 DomainReason；见 [domain-result.ts](../../src/data/contracts/domain-result.ts) | 不新增枚举；不在来源层伪造达成结论 |

任何来源状态、类别或布尔值与逻辑值不完全一致时，逐项记录；没有业务批准时保持 `BLOCKED`。不得把未知值映射为正常、关闭、达成或否。

| Domain / field | 公司原始值 | 目标逻辑值 | 批准依据 | 未知值处理 | 状态与证据 |
|---|---|---|---|---|---|
| 待填写 | 待填写 | 待填写 | 待填写 | 保留原值或显式 UNKNOWN / diagnostic | UNMAPPED |

## 尚需公司确认的事项

| 事项 | 必须确认的内容 | 未确认影响 | 状态／证据 |
|---|---|---|---|
| 用户资料 | 访问时头像、姓名、邮箱的实际来源字段 | 用户资料映射未完成 | UNMAPPED |
| 物理来源 | 每个 Domain 的表／视图／列、类型、空值、更新时间 | 对应 Adapter 不能完成 | UNMAPPED |
| 记录身份与历史 | 培训／演练／证件自然键、门店生命周期、快照替换与生效范围 | 重复与历史覆盖不可确认 | BLOCKED |
| 旧必需集合接口 | 当前培训／检查不使用，无需对接 | 不影响当前评价或接入 | NOT_REQUIRED |
| 年度汇总 | 人均提交数和参与率的权威值、授权范围聚合、参考月份、缺失原因 | 年度指标直读不能完成 | BLOCKED |
| 环境单位 | 产能、涂料批复用量的单位及规范化方式 | 对应字段映射不能定案 | BLOCKED |
| 完整性 | 独立来源证明、零记录证明与校验实现 | 批次不能正式发布 | BLOCKED |

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
| 企业身份与访问资料 | 待填写 | 待填写 | 待填写 | 待填写 |
| 权限目录与持久化 | 待填写 | 待填写 | 待填写 | 待填写 |
| 数据库对象、字段与类型 | 待填写 | 待填写 | 待填写 | 待填写 |
| 记录 ID / 自然键 | 待填写 | 待填写 | 待填写 | 待填写 |
| Store Resolution | 待填写 | 待填写 | 待填写 | 待填写 |
| 枚举和状态映射 | 待填写 | 待填写 | 待填写 | 待填写 |
| Coverage / authoritative empty | 待填写 | 待填写 | 待填写 | 待填写 |
| Required Sets（兼容项） | 当前无需对接 | — | — | NOT_REQUIRED |
| Take Charge annual source | 待填写 | 待填写 | 待填写 | 待填写 |

任何必需映射仍为 `UNMAPPED` / `BLOCKED` 时，对应 Domain 不得进入 Production 发布。


### 门店主数据扩展展示字段

`store-master` 可选 `extraFields` 为对象；key 直接用于列显示名称，value 只使用 string、有限 number、boolean 或 null。服务端完成门店授权和规范化后返回字段定义，所有扩展字段自动加入门店的共享列显示菜单，默认隐藏，不改变原有五个可选列的默认勾选。扩展值同时可在门店详情查看。
