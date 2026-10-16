# 公司部署接入与上线检查清单

## 用途

本清单是公司 AI 和部署团队的执行入口。详细接口、字段和事务要求仍以 [`corporate-ai-integration.md`](corporate-ai-integration.md) 为准；API 结构以 [`../api/production-api-v1.yaml`](../api/production-api-v1.yaml) 为准。本文件不新增业务规则，也不代表当前项目已经可以上线。

开始接入时，先记录实际使用的 Git 分支和 commit。不得在未记录基线的工作区直接改造。

## 公司 AI 可以直接完成

以下工作属于技术适配。公司 AI 可以根据公司现有数据库、身份平台和部署平台选择实现方式，但必须保持现有接口、授权边界和 fail-closed 行为：

- 实现 server-only `ProductionStorageAdapter`，使用公司数据库的事务、唯一约束和原子 CAS。
- 实现并组合 `ProductionRepositoryAdapter`，把公司物理字段映射到现有逻辑字段。
- 实现可信 `ServerIdentityProvider` 与独立的 `MachineIdentityProvider`。
- 实现持久化 Access 与 Bootstrap Adapter。
- 把密钥放入公司部署平台的服务端 Secret Store，并配置非生产、UAT、Production 环境。
- 编写公司 Adapter 的集成测试、并发测试、失败注入测试和回滚验证。

公司 AI 不得修改现有指标阈值、状态含义、评分规则、权限继承或缺失数据语义来迎合公司数据。

## 必须由公司或业务负责人确认

没有以下输入时保持 TBD，不允许公司 AI 猜测：

| 确认项 | 最低所需输入 |
|---|---|
| 数据库 | 类型、网络入口、Approved Driver、凭据管理方式、事务与隔离能力 |
| 字段映射 | 各 Domain 物理表/视图、字段、类型、稳定记录 ID、自然键、时间含义、完整性证明 |
| Required Sets | Training required item catalog、Inspection expected task set、稳定 item/task ID、版本与生效范围 |
| 身份 | SSO issuer/audience/session 验证方式、稳定 `principalId`、服务端验证邮箱 |
| 初始管理员 | 唯一允许 Bootstrap 的稳定 `principalId`，以及对应已验证邮箱 |
| 机器身份 | 调用方、Domain allowlist、操作 allowlist、凭据轮换与撤销方式 |
| GLIFE 嵌入 | 精确 Parent Origin、消息 envelope、是否允许 iframe，以及 CSP `frame-ancestors` 策略 |
| 运维 | 部署平台日志保留、备份及故障响应负责人 |
| 历史数据 | 是否需要历史 Snapshot；若需要，确认冻结时点与重放语义后另行设计 |

Take Charge 的逻辑字段与目标已经确认；公司直接读取并映射 `submissionsPerCapitaYtd`、`participationRateYtd`，不得重新计算未批准的分母或平均门店最终结果。`closeRate` 继续由已发布 Take Charge records 通过现有 Repository / Rule 链路产生。

## 实现入口

| 能力 | 现有入口 |
|---|---|
| 业务数据存储 | `src/data/repositories/production-storage-adapter.ts` |
| Production Repository 组合 | `src/data/repositories/production-ehs-repository.server.ts` |
| 用户身份 | `src/data/contracts/server-identity.ts` |
| Import 机器身份 | `src/data/contracts/server-identity.ts` 中的 `MachineIdentityProvider`；`src/data/contracts/production-import.ts` 中的 `MachinePrincipal` |
| Access 持久化 | `src/data/repositories/access/access-repository.ts`、`access-runtime.server.ts` |
| 首位管理员 | `src/data/repositories/access/first-admin-bootstrap.ts` |
| Import API | `src/app/api/v1/import/`、`docs/api/production-api-v1.yaml` |

测试目录中的内存 Adapter 只能作为契约示例，禁止导入 Production Runtime。

## 推荐接入顺序

1. 在公司非生产环境部署冻结基线，保持 `EHS_DATA_SOURCE=mock`，验证构建和页面基础运行。
2. 接入可信用户身份与 Access 持久化；先证明未登录、越权和篡改 Scope 都会被拒绝。
3. 接入机器身份、Import Storage 和独立 Coverage Proof Verifier；Import 路由在验证前保持不可访问或禁用。
4. 接入 Store Master，验证 TRTID 唯一性、层级、联系人邮箱和授权投影。
5. 选择一个不影响 Overview 的 Domain 做 Production Pilot；核对原始数量、规范化结果、覆盖证明和回滚。
6. 逐个接入其他 Repository Domain；不得用 Mock 数据补齐缺失的 Production Domain。
7. 验证部署平台日志和故障响应流程；应用不提供系统监控模块。
8. 只有全部评分输入、authoritative required sets、来源 aggregate 和历史要求就绪后，才允许切换 Overview。
9. UAT 通过后显式设置 `EHS_DATA_SOURCE=production`；再次执行 fail-closed、回滚和权限隔离验证。

正式切换和回滚执行使用 [`production-cutover-rollback-runbook.md`](production-cutover-rollback-runbook.md)。

## 上线证据

每项必须保留可复查的结果，不接受“已经接好”的口头结论：

- 数据库事务测试：幂等冲突、并发 CAS、发布失败回滚、旧版本保持可读。
- 身份与权限测试：未登录拒绝、跨 Store/Area/Region 越权拒绝、撤权生效、最后一名管理员保护。
- 数据验证：字段映射表、异常行诊断、Store Resolution、Domain Coverage、独立完整性证明。
- 业务链验证：至少一条 Production source record 经过现有 Repository、Domain Rule、Contribution 到 UI，期间不复制业务规则。
- 切换与回滚：保留上一已发布版本，证明失败发布和 Adapter 移除不会回退到 Mock。
- UAT：由授权用户核对可见范围、关键页面、导入诊断和管理员操作日志。

逐项执行和签字使用 [`uat-acceptance-matrix.md`](uat-acceptance-matrix.md)。

代码质量门使用仓库现有命令：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run openapi:validate
pnpm performance:v1
pnpm audit --prod --audit-level=high
pnpm exec next build --webpack
git diff --check
```

部署运行时必须使用 Node 22.x 与 pnpm 11.19.0。

## 禁止上线条件

出现任一情况即为 **NO-GO**：

- 任何 Production Adapter 仍抛出 `*_NOT_CONFIGURED`。
- Production 使用 Mock identity、Mock Repository、内存 Access 或测试 Adapter。
- Client 可覆盖服务端身份、授权 Scope 或上海时区 `referenceDate`。
- 未验证来源完整性却发布批次，或把 `DECLARED_COMPLETE` 当作 `VERIFIED_COMPLETE`。
- Store Master、字段映射、Required Sets 或 Take Charge aggregate 映射仍未确认。
- 权限检查发生在读取受保护数据之后，或缓存未按身份/Scope 隔离。
- 没有持久化审计、回滚证据或 UAT 记录。
- 密钥、Token、连接串或真实个人数据进入 Git、浏览器配置或日志。
- 任一质量门失败。

## 交给公司 AI 的启动说明

向公司 AI 提供仓库、冻结 commit 和本清单，并要求它先输出以下内容，获得公司确认后再改代码：

1. 当前数据库、SSO、机器身份、部署平台的已验证事实。
2. 计划实现的 Adapter 与对应现有接口，不新增第二套 Repository 或业务规则。
3. 使用 [`source-field-mapping-template.md`](source-field-mapping-template.md) 完成字段映射，以及所有无法确认的 TBD。
4. 事务、权限、回滚和 UAT 测试计划。
5. 需要公司人员提供的账号、Origin、收件人、调度参数和业务确认。

公司 AI 每完成一个接入批次，都应提交：改动文件、测试证据、剩余 TBD、NO-GO 项和回滚方法。
