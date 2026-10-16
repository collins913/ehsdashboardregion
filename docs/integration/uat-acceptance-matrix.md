# Production Integration UAT 验收矩阵

## 使用范围

本矩阵用于公司非生产 / UAT 环境完成 Production Adapter 后的正式验收。它不用于证明当前 Mock 环境已经生产就绪，也不替代：

- [`corporate-ai-integration.md`](corporate-ai-integration.md) 的详细接口与事务要求；
- [`deployment-readiness-checklist.md`](deployment-readiness-checklist.md) 的接入顺序和 NO-GO 条件；
- [`../metric-rules.md`](../metric-rules.md)、[`../data-contract.md`](../data-contract.md) 和 [`../decisions.md`](../decisions.md) 的业务与架构规则。

未确认的业务语义、性能预算、历史 Snapshot 或企业平台能力必须记录为 `BLOCKED`，不得自行填写预期值后判定通过。

## 验收记录

| 项目 | 填写内容 |
|---|---|
| Git branch / commit | 待填写 |
| UAT 环境与 URL | 待填写；不得记录密钥或 Token |
| 应用版本 / 部署时间 | 待填写 |
| 数据来源与 source version | 待填写 |
| configuration version | 待填写 |
| SSO / M2M 配置版本 | 待填写 |
| 数据库 / Adapter 版本 | 待填写 |
| 验收时间 | 待填写 |
| 验收负责人 | 待填写 |
| 最终结论 | `GO` / `NO-GO` |

单项状态只允许：`NOT_RUN`、`PASS`、`FAIL`、`BLOCKED`。每项必须附证据位置；截图不能替代服务端日志、数据库事务记录或自动测试结果。

## 进入 UAT 的前置条件

| ID | 验收项 | 通过标准 | 必需证据 | 状态 |
|---|---|---|---|---|
| ENT-01 | 基线可追溯 | Git commit、构建产物和部署记录能一一对应；工作区改动已审查 | commit、CI run、artifact ID | NOT_RUN |
| ENT-02 | 运行时一致 | 使用 Node 22.x、pnpm 11.19.0 和冻结 lockfile 安装 | 运行时版本与安装日志 | NOT_RUN |
| ENT-03 | 接入输入确认 | 数据库、字段映射、身份、M2M、Required Sets、GLIFE Origin已确认；未确认项明确列为 BLOCKED | 已批准映射表与决策记录 | NOT_RUN |
| ENT-04 | Production Adapter 已安装 | UAT 所需 Repository、Identity、Import、Access 入口不再抛出 `*_NOT_CONFIGURED` | 启动日志与 Adapter 清单 | NOT_RUN |
| ENT-05 | 回滚起点可用 | 已记录上一可用应用版本、上一已发布数据指针和恢复步骤 | 回滚记录与演练计划 | NOT_RUN |

切换前必须把已验证步骤填写进 [`production-cutover-rollback-runbook.md`](production-cutover-rollback-runbook.md)，不能只保留口头回滚方案。

## 身份与权限

| ID | 场景与操作 | 通过标准 | 必需证据 | 状态 |
|---|---|---|---|---|
| IAM-01 | 未登录、过期或无效 SSO 访问受保护页面和 Server Action | 在 Repository 读取前拒绝；不返回受保护数据 | 请求日志、Repository 未调用证明 | NOT_RUN |
| IAM-02 | 有效 SSO 登录 | 服务端取得稳定 `principalId` 和已验证邮箱；Access 仍以规范化邮箱匹配 | 脱敏身份结果与 Access 解析记录 | NOT_RUN |
| IAM-03 | 伪造请求 JSON、URL、Header 或 `GLIFE_CONTEXT` 身份 | 伪造值不改变主体、角色或数据 Scope | 负向测试日志 | NOT_RUN |
| IAM-04 | Region / Area / Store 用户查看筛选、列表、汇总与详情 | 所有结果只包含 Effective Access 范围；计数和筛选选项也不泄露范围外数据 | 分范围对照结果 | NOT_RUN |
| IAM-05 | 篡改 Store ID、Area、Region、分页、排序或 Server Action DTO | 无法扩大 Scope；非法输入返回受控错误 | API / Action 负向测试 | NOT_RUN |
| IAM-06 | 撤销或修改 Manual Grant | 既定缓存 / 版本失效边界后权限生效，不复用旧 Scope 缓存 | 变更前后对照与缓存证据 | NOT_RUN |
| IAM-07 | 并发删除或降级管理员 | 不得产生零名有效 `GLOBAL_ADMIN`；写入与审计原子完成 | 并发测试和持久化审计 | NOT_RUN |
| IAM-08 | 首位管理员 Bootstrap | 仅配置的稳定 `principalId` 可执行一次；要求已验证邮箱；后续调用冲突且不重复创建 | Bootstrap 事务与审计 | NOT_RUN |
| IAM-09 | 非管理员访问 `/access`、`/dev/*` | 服务端拒绝或转到无权限页；仅隐藏导航不算通过 | 不同身份的 HTTP 与页面结果 | NOT_RUN |

## Import、数据库事务与发布

| ID | 场景与操作 | 通过标准 | 必需证据 | 状态 |
|---|---|---|---|---|
| IMP-01 | 无机器身份或无对应操作权限调用 Import API | 请求被拒绝，且数据库未创建或读取未授权批次 | 请求日志和数据库审计 | NOT_RUN |
| IMP-02 | 机器主体访问未授权 Domain | Storage predicate 在返回批次前拒绝；不会泄露批次是否存在 | Domain allowlist 负向测试 | NOT_RUN |
| IMP-03 | 合法提交批次 | 返回生命周期元数据和诊断，不返回 staged source records | API 响应与 OpenAPI 对照 | NOT_RUN |
| IMP-04 | 相同 idempotency key 重试相同请求，再提交不同请求 | 相同请求返回原批次；不同请求冲突；无重复数据 | 唯一约束与重试结果 | NOT_RUN |
| IMP-05 | 提交未知字段、错误类型、重复键、非法时间、必填时间为 null、混合 Required Set 属性、未解析 Store | 生成稳定诊断并阻止发布；异常行不被静默丢弃；Action closedDate / Inspection dueDate 的合法 null 仍保留 | 诊断响应与数据库状态 | NOT_RUN |
| IMP-06 | `PARTIAL`、`UNKNOWN`、缺少独立证明或证明不匹配 | 不得达到可发布的 `VERIFIED_COMPLETE` | Validation 结果与审计 | NOT_RUN |
| IMP-07 | 有效独立 Coverage Proof | 证明由可信来源校验器验证，不依赖请求自行声明；只在验证成功后允许发布 | Proof 校验记录 | NOT_RUN |
| IMP-08 | 并发 Validate / Publish 或使用过期 revision | 原子 CAS 只允许一个合法状态迁移；冲突不会覆盖新状态 | 并发测试与 revision 记录 | NOT_RUN |
| IMP-09 | 在数据、指针、批次终态或成功审计写入期间注入失败 | 整个发布回滚，上一已发布版本保持有效 | 事务失败注入与读回结果 | NOT_RUN |
| IMP-10 | 发布前从业务 Repository 查询 staged 数据 | staged 数据完全不可见；业务读取只返回当前已发布版本 | 发布前后查询对照 | NOT_RUN |
| IMP-11 | 超过 10 MiB、单批超过 10,000 records 或 coverage stores | 请求按契约拒绝，不发生部分写入 | 边界测试结果 | NOT_RUN |
| IMP-12 | 通过通用 Import API 提交 Take Charge 年度 aggregate，包括零条记录的权威空结果 | 均返回 `DIRECT_REPOSITORY_INTEGRATION_REQUIRED`；年度 aggregate 只由 Production Repository 直读映射 | API 结果与 Adapter 测试 | NOT_RUN |
| IMP-13 | 发布 Store Master 完整批次 | records 与 coverage TRTID 集合完全一致，TRTID 唯一；冲突或遗漏会阻止发布 | Store Master 校验结果 | NOT_RUN |
| IMP-14 | 记录业务时间、Training/Drill 完整月份或 Closure Rate 统计范围超出 coverage 周期 | 返回 `RECORD_OUTSIDE_COVERAGE_PERIOD` 并阻止提交 / 发布；起点计入、终点排除；Actions 按 submittedDate，不能按 dueDate / closedDate 判断 | 各 Domain 周期边界测试与发布指针记录 | NOT_RUN |
| IMP-15 | 批次与 coverage 周期交换 JSON 键顺序、使用等价时区，或改变实际端点 | 等价端点正常接受；实际端点不一致返回 `COVERAGE_PERIOD_MISMATCH` | 正反例 API 响应 | NOT_RUN |

## 数据、业务规则与页面

| ID | 场景与操作 | 通过标准 | 必需证据 | 状态 |
|---|---|---|---|---|
| DAT-01 | 公司字段映射到逻辑 Contract | 类型、时间、ID、Store reference 与批准映射一致；Adapter 不返回页面 DTO 或业务结论 | 字段映射表与 Adapter 测试 | NOT_RUN |
| DAT-02 | Store Resolution | 只使用精确 TRTID 或精确唯一英文名；冲突和无法定位记录保留诊断，不做模糊匹配 | 正反例测试 | NOT_RUN |
| DAT-03 | 缺失、非法、不完整或未知数据 | 保留 `null` / availability / diagnostic reason，不静默转为 0、Normal、Achieved 或 Closed | Domain Result 与页面对照 | NOT_RUN |
| DAT-04 | Client 尝试覆盖业务日期 | Production 使用服务端可信时钟并按 `Asia/Shanghai` 解释；Client 时间不生效 | 请求与服务端 referenceDate 证据 | NOT_RUN |
| DAT-05 | Take Charge 年度 aggregate | 公司物理字段正确映射为现有逻辑字段；不重新推导未批准分母，不平均门店最终结果 | Source-to-Contract 对账 | NOT_RUN |
| DAT-06 | 多用户并发切换 Scope / Period | 请求结果、缓存、下载、汇总与详情不跨身份或 Scope 串数据；旧 Scope 内容不可操作 | 并发会话和缓存键证据 | NOT_RUN |
| DAT-07 | 正式业务页面验收 | `/overview`、KPI、Goals、Events、Actions、Certificates、Environment、Stores 的数据与已发布来源及授权范围一致 | 页面、API 与数据库抽样对账 | NOT_RUN |
| DAT-08 | Loading、刷新、错误和不可用状态 | Scope 改变不展示旧业务数据；同 Scope 刷新不误导；错误和不可用不伪装为空结果 | 网络延迟 / 错误注入录像与日志 | NOT_RUN |
| DAT-09 | Overview 启用条件 | 只有全部评分输入、authoritative Required Sets、来源 aggregates、Coverage 与所需历史语义就绪后才启用 Production Overview | 完整性清单与 EHS 负责人签字 | NOT_RUN |
| DAT-10 | Rule Engine 一致性 | Source 经过既有 Repository、Domain Rules、Contribution 和聚合；Adapter / UI 没有复制业务规则 | 代码审查与端到端样本追踪 | NOT_RUN |

## 安全、质量门与切换

| ID | 场景与操作 | 通过标准 | 必需证据 | 状态 |
|---|---|---|---|---|
| OPS-01 | 完整质量门 | `test`、`typecheck`、OpenAPI、Performance V1、production audit、Webpack build、`git diff --check` 全部通过 | CI 日志 | NOT_RUN |
| OPS-02 | 性能与容量 | 记录公司环境的实际数据量、延迟、payload 和并发结果；按公司已批准预算判断，未批准预算时保持 BLOCKED | 测量报告与批准预算 | NOT_RUN |
| OPS-03 | Security Headers 与 TLS | `nosniff`、Referrer Policy、Production HSTS 生效；TLS 由公司入口终止并验证 | HTTP 响应和平台配置 | NOT_RUN |
| OPS-04 | GLIFE 嵌入 | 只接受精确 Parent Origin 与 `window.parent`；显示 Context 不参与认证；CSP `frame-ancestors` 与公司决定一致 | 浏览器负向测试与 CSP 配置 | NOT_RUN |
| OPS-05 | Secret 与日志检查 | 密钥、Token、连接串和真实个人数据未进入 Git、浏览器 bundle、错误响应或非授权日志 | Secret scan、bundle 和日志抽查 | NOT_RUN |
| OPS-06 | Production 切换 | 显式使用 `EHS_DATA_SOURCE=production` 与 enterprise identity；任何 Adapter 被移除都失败关闭且不回退 Mock | 配置记录与故障注入 | NOT_RUN |
| OPS-07 | 应用和数据回滚 | 能恢复上一应用版本与上一发布指针；失败回滚不会覆盖当前可用数据或审计 | 回滚演练记录 | NOT_RUN |
| OPS-08 | 上线后责任链 | 部署平台、数据库、身份和业务数据均有明确负责人及升级路径 | 已批准责任清单 | NOT_RUN |

## 最终签字

以下角色名称由公司填写，不预设组织结构：

| 验收范围 | 公司负责人 | 结论 | 证据位置 | 日期 |
|---|---|---|---|---|
| 数据来源与字段映射 | 待填写 | 待填写 | 待填写 | 待填写 |
| EHS 业务结果与页面 | 待填写 | 待填写 | 待填写 | 待填写 |
| 身份、权限与安全 | 待填写 | 待填写 | 待填写 | 待填写 |
| 数据库事务与回滚 | 待填写 | 待填写 | 待填写 | 待填写 |
| 应用发布 | 待填写 | 待填写 | 待填写 | 待填写 |

最终 `GO` 需要所有适用项为 `PASS`，没有未接受的 `FAIL` 或 `BLOCKED`，并且 [`deployment-readiness-checklist.md`](deployment-readiness-checklist.md) 中不存在 NO-GO 条件。条件不适用时必须写明原因和批准人，不能直接删除测试项。
