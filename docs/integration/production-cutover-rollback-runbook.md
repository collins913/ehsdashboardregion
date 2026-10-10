# Production 切换与回滚 Runbook

## 用途与限制

本 Runbook 用于公司完成 Production Adapter、字段映射和 UAT 后的正式切换。它定义执行顺序、检查点、停止条件和证据；公司部署平台、数据库、流量入口和身份系统的实际命令由公司填写并审批。

当前仓库没有通用数据库回滚 API，也没有历史 Snapshot / replay 能力。数据回滚只能使用公司已经实现并演练过的原子发布指针恢复机制；不得临时删除记录、覆盖审计或编造 SQL。

详细边界：

- 接入与 NO-GO：[`deployment-readiness-checklist.md`](deployment-readiness-checklist.md)
- 字段与来源：[`source-field-mapping-template.md`](source-field-mapping-template.md)
- UAT 证据：[`uat-acceptance-matrix.md`](uat-acceptance-matrix.md)
- Production Contract：[`corporate-ai-integration.md`](corporate-ai-integration.md)

## 变更记录

| 项目 | 公司填写 |
|---|---|
| Change / Release ID | 待填写 |
| Git branch / commit | 待填写 |
| Artifact ID / digest | 待填写 |
| 数据库 Schema / Adapter 版本 | 待填写 |
| Source / configuration version | 待填写 |
| 计划切换时间 | 待填写 |
| 业务负责人 | 待填写 |
| 技术执行负责人 | 待填写 |
| 数据负责人 | 待填写 |
| Identity / Security 负责人 | 待填写 |
| Monitoring / Incident 负责人 | 待填写 |
| Go / No-Go 决策人 | 待填写 |
| 上一可用应用 Artifact | 待填写 |
| 上一已发布数据指针 | 按 Domain 待填写 |
| 公司回滚命令 / Runbook 位置 | 待填写；不得在本文件记录凭据 |

## 状态定义

- `READY`：前置证据完整，可以进入下一阶段。
- `HOLD`：信息或证据不足，保持当前生产状态。
- `ABORTED`：尚未向用户切换，流程终止；不需要数据回滚。
- `ROLLBACK`：已切换或已发布，需要恢复上一应用、配置或数据指针。
- `COMPLETE`：观察期结束并由负责人签字，不代表以后无需持续监控。

## 阶段 0：Go / No-Go 前置门

任一项未通过即为 `HOLD`，不得进入切换：

| ID | 检查项 | 通过证据 | 结果 |
|---|---|---|---|
| GATE-01 | 所有适用 UAT 项为 PASS，无未接受的 FAIL / BLOCKED | 已签字 UAT Matrix | 待填写 |
| GATE-02 | 字段映射、自然键、枚举、Required Sets 和 Coverage Proof 已批准 | 已签字 Mapping Template | 待填写 |
| GATE-03 | 完整 CI 与 Production build 使用冻结 commit / artifact 通过 | CI run 与 artifact digest | 待填写 |
| GATE-04 | Production Identity、Access、Import、Repository、Monitoring、Email Adapter 均已配置 | Adapter 清单与 fail-closed 测试 | 待填写 |
| GATE-05 | 上一应用 artifact 和每个 Domain 的上一发布指针可读取 | 读回结果 | 待填写 |
| GATE-06 | 应用、配置、数据指针、身份和 Monitoring 回滚均已在非生产环境演练 | 演练记录 | 待填写 |
| GATE-07 | 公司已批准性能 / 容量标准或明确记录阻塞 | 性能报告与批准记录 | 待填写 |
| GATE-08 | Monitoring、独立存储故障信号和 Incident 响应链可用 | 测试告警与响应记录 | 待填写 |
| GATE-09 | 变更窗口、执行人、决策人和通知对象已确认 | Change record | 待填写 |

## 阶段 1：切换前状态冻结

1. 停止或隔离会与本次切换冲突的 Import、Scheduler 和后台发布任务；不得停止公司要求持续运行的安全监控。
2. 确认没有未知发布事务或未处理的并发切换。`RECEIVED` / `VALIDATED` 批次可以保留，但不得在切换期间由其他执行者发布。
3. 记录以下不含密钥的状态：
   - 当前应用 artifact、Git commit、数据库 Schema / Adapter 版本；
   - `EHS_DATA_SOURCE`、`EHS_IDENTITY_MODE` 等配置的名称与版本；
   - 每个 Domain 当前已发布 batch / pointer、source version、configuration version、publishedAt；
   - 当前 Access / Bootstrap 数据版本和最后一名有效 `GLOBAL_ADMIN`；
   - active Monitoring incidents、待处理 Outbox 数量和 Scheduler 配置版本。
4. 验证上一 artifact 仍可部署，上一数据指针仍可读取，恢复权限已授权给执行人。
5. 对冻结状态生成证据包，并由技术执行负责人确认。

若无法准确记录当前状态，结果为 `ABORTED`。

## 阶段 2：部署新应用但不开放正式流量

使用公司支持的 inactive slot、隔离实例或等价机制；本 Runbook 不规定具体平台。

1. 部署已批准 artifact，不在服务器现场构建未审查代码。
2. 从公司 Secret Store 注入数据库、SSO、M2M、Email 和 Monitoring 配置；禁止写入 Git、浏览器环境或普通日志。
3. 显式配置 Production 数据与身份模式：
   - `EHS_DATA_SOURCE=production`
   - `EHS_IDENTITY_MODE=enterprise`
4. 配置精确 `NEXT_PUBLIC_GLIFE_PARENT_ORIGIN`、Monitoring recipients 和 Scheduler 参数；仅当一次性 Bootstrap 尚未完成时配置已批准的 Bootstrap principal。未使用的能力要明确禁用，不能留作未知默认值。
5. 在未开放用户流量时执行启动检查：
   - 所有必需 Adapter 可创建；
   - 任一 Adapter 临时移除时失败关闭，不回退 Mock / memory；
   - 未登录和无权限身份无法读取 Repository；
   - Security Headers 与公司 CSP / TLS 配置生效；
   - Monitoring 可写入持久化存储并触发测试告警。

出现身份绕过、Mock fallback、Adapter 未配置或 Monitoring 无法提供独立故障信号时，结果为 `ABORTED`。

## 阶段 3：Production 数据准备与发布

### 3.1 发布原则

- 一次只处理一个已批准 Domain / Scope / Period，并在进入下一项前完成检查点。
- `DECLARED_COMPLETE`、`PARTIAL`、`UNKNOWN` 均不可发布；只接受独立校验后的 `VERIFIED_COMPLETE`。
- staged records 在发布前不得被业务 Repository 读取。
- `publishAtomically` 必须在一个事务中更新 active data、pointer、batch terminal state 和成功审计。
- 失败发布保留上一已发布指针；不得为了继续上线手工改为成功。
- 不混合 Production 与 Mock Domain 数据。

### 3.2 推荐顺序

1. **Store Master**：验证 TRTID 唯一、完整 Coverage、层级、联系人邮箱和 Access projection。
2. **非 Overview Pilot Domain**：选择已在 UAT 批准的 Domain，完成 source → normalized record → page 的对账。
3. **其余独立 Domain**：逐个发布，每个 Domain 单独 Go / No-Go。
4. **Required Sets 与评分依赖**：只有 authority、稳定 ID、版本、生效范围和 Coverage 全部批准后发布。
5. **Take Charge annual source**：通过 Direct Repository 验证授权 Scope、年份、上海 reference month 及两个 source-provided aggregate；不进入通用 Import。
6. **Overview**：仅在全部评分输入、Required Sets、source aggregates、Coverage 和所需历史语义就绪后启用。

### 3.3 每个 Domain 的发布检查点

| 检查项 | 通过标准 | 证据 |
|---|---|---|
| Batch / source identity | batch、source、configuration version 与批准记录一致 | 待填写 |
| Store / period scope | coverage 与目标 Scope / Period 完全一致 | 待填写 |
| Coverage Proof | 独立校验成功并得到 `VERIFIED_COMPLETE` | 待填写 |
| Diagnostics | 没有阻断错误；Warning 已由对应负责人接受 | 待填写 |
| Pre-publish isolation | staged 数据对业务查询不可见 | 待填写 |
| Atomic publish | revision、pointer、终态、审计同事务成功 | 待填写 |
| Post-publish read | 只读到新发布版本，行数和抽样值与来源一致 | 待填写 |
| Authorization | 不同 Scope 身份只能看到各自数据 | 待填写 |
| Rollback target | 旧 batch / pointer 仍可恢复 | 待填写 |

任一检查点失败：停止后续 Domain。发布前失败为 `ABORTED`；发布后发现错误进入 `ROLLBACK` 评估。

## 阶段 4：正式流量切换

1. 记录切换前最后一次健康状态和当前发布指针。
2. 使用公司批准的流量切换机制逐步开放；具体比例和观察时长由公司批准，不在本仓库猜测。
3. 使用至少以下受控身份做 smoke check：
   - 未登录用户；
   - Store / Area / Region Scope 用户；
   - Global User；
   - Global Admin。
4. 检查 `/overview`、KPI、Goals、Events、Actions、Certificates、Environment、Stores；管理员另检查 `/access` 与 `/monitoring`。
5. 对每个身份核对：页面、汇总、筛选选项、详情、分页与 Server Action 均不超出授权 Scope。
6. 核对缺失 / 未知 / 不完整数据仍显示不可用或诊断状态，没有变成 0、Normal、Achieved 或 Closed。
7. 持续观察公司已批准的错误率、延迟、数据库、身份、Monitoring、Outbox、Email 和 Scheduler 指标。

未经 Go / No-Go 决策人确认，不得宣布切换完成。

## 立即停止或回滚条件

以下任一情况不等待普通观察窗口：

- 未授权用户读取到受保护数据，或不同身份 / Scope 发生数据串用。
- SSO、M2M 或 Bootstrap 可被 Client 输入、Header、URL 或 `GLIFE_CONTEXT` 冒充。
- Production 回退到 Mock Repository、Mock identity、内存 Access / Monitoring 或测试 Adapter。
- 错误字段映射、Store Resolution、时间范围或枚举映射造成业务结果失真。
- 未得到 `VERIFIED_COMPLETE` 就发布，或 staged records 提前可见。
- active data、pointer、batch 状态和审计出现部分提交或无法确认的一致性。
- 缺失 / 未知数据被展示为 0、正常、已达成或已关闭。
- Monitoring 失效且独立故障渠道也不可用。
- Artifact、数据库 Schema、Adapter 或配置版本与批准记录不一致。
- 触发公司已经批准的错误率、延迟、容量或安全阈值。

无法判断影响范围时先停止新流量和新发布，状态设为 `HOLD`；不要用继续发布来试探系统。

## 回滚执行

### A. 先控制影响

1. 停止新流量或进入公司批准的维护模式。
2. 停止新的 Import submit / validate / publish 和相关 Scheduler；保留证据采集与独立监控。
3. 若涉及 M2M、SSO 或密钥风险，按公司流程撤销受影响凭据。
4. 记录触发时间、发现人、影响身份 / Scope / Domain、当前 artifact 和发布指针。
5. 不删除失败批次、审计、Incident、Outbox 或日志。

### B. 应用与配置回滚

1. 使用已验证的上一 artifact，不从工作区临时重新构建。
2. 恢复对应的已批准配置版本；Secret 值从公司 Secret Store 恢复。
3. 验证旧版本仍使用 enterprise identity 和 Production Repository，不允许通过切换到 Mock 来“恢复页面”。
4. 在恢复流量前重复未登录、授权 Scope、Security Headers 和 Monitoring smoke checks。

### C. 数据指针回滚

1. 只使用公司预先实现、具备授权和审计的原子指针恢复操作。
2. 恢复前核对目标旧 batch 的 Domain、Scope、Period、schema / source / configuration version 和完整性证明。
3. active pointer 变更与追加式回滚审计必须原子提交；不得重写既有 batch 终态或历史审计。失败时保持回滚前指针，不得产生第三种半完成状态。
4. 回滚后从业务 Repository 读回并核对旧版本；新失败批次保留用于调查，不再作为 active data。
5. 当前仓库没有通用数据回滚 endpoint。若公司尚未实现并演练该能力，Production 数据切换为 NO-GO。

### D. Identity、Monitoring 与 Scheduler 回滚

1. 身份配置回滚后验证稳定 `principalId`、服务端验证邮箱和 Effective Access。
2. Access 数据回滚不得删除追加式审计，也不得绕过最后一名 `GLOBAL_ADMIN` 保护。
3. Monitoring / Email / Scheduler 恢复后验证 durable Incident、Outbox lease、Provider 状态和 Watchdog。
4. 没有正向恢复信号时不得自动关闭 Incident。

## 回滚后验证

| ID | 验证项 | 通过标准 | 证据 |
|---|---|---|---|
| RB-01 | Artifact / configuration | 与批准的上一版本完全一致 | 待填写 |
| RB-02 | Data pointer | 每个受影响 Domain 指向已验证旧 batch | 待填写 |
| RB-03 | Authorization | 所有测试身份恢复正确 Scope，无泄露 | 待填写 |
| RB-04 | Business data | 页面、汇总、筛选和详情与旧版本对账 | 待填写 |
| RB-05 | Monitoring | Incident、Outbox、Email、Watchdog 正常且保留失败证据 | 待填写 |
| RB-06 | Import isolation | 失败 / staged 批次不可被业务 Repository 读取 | 待填写 |
| RB-07 | Audit | 切换、失败、停止和回滚操作均可追溯 | 待填写 |

回滚完成不等于 Incident 关闭。只有影响已验证消除、数据与权限复核完成并收到正向恢复信号后，才能由授权人员关闭 Incident。

## 切换完成与证据归档

切换负责人只有在以下条件全部满足后才能标记 `COMPLETE`：

- 公司批准的观察期完成，期间未触发停止 / 回滚条件；
- UAT 抽样在正式环境重复通过；
- 所有发布 Domain、pointer、source / configuration version 已记录；
- Monitoring、Email、Scheduler 和责任链正常；
- 未解决 Warning、TBD 和后续任务有明确负责人；
- Go / No-Go 决策人、数据负责人、EHS 负责人、Identity / Security 和运维完成签字。

证据包至少包含：commit、artifact digest、CI run、无密钥配置版本、发布 batch / pointer、Coverage Proof、诊断、权限抽样、页面对账、Monitoring 演练、切换时间线、Incident 和回滚结果。

## 最终记录

| 项目 | 结果 |
|---|---|
| 最终状态 | 待填写：COMPLETE / ABORTED / ROLLBACK |
| 实际切换时间 | 待填写 |
| 实际恢复 / 回滚时间 | 不适用或待填写 |
| 最终 artifact | 待填写 |
| 最终数据指针 | 按 Domain 待填写 |
| 未解决问题 | 待填写 |
| 证据包位置 | 待填写 |
| 业务签字 | 待填写 |
| 技术签字 | 待填写 |
| 数据签字 | 待填写 |
| Security / Identity 签字 | 待填写 |
| 运维签字 | 待填写 |
