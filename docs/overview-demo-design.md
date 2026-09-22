# Overview Demo Design — Experimental / Working Draft

本文仅记录当前 Overview Demo 产品逻辑；不是正式 business rule、contract 或 architecture source。正式开发前须重新审核，并将确认内容迁移到相应正式文档。

## 目标与首页分析

发现问题 → 解释问题 → 定位 Area / Store → 进入业务页面处理。

首页当前呈现：综合得分、过去 12 个月趋势、改善最多 Area / Store、退步最多 Area / Store、主要失分、系统性问题、管理关注矩阵、小区 / 门店表现、本期变化（新增 / 持续 / 已改善）、重点诊断、问题洞察、管理事实。

## Demo Score

- Performance 5 项、Take Charge 3 项、Certificates 4 项；12 项暂时等权。
- Environment 保留位置，评分待定义。
- Missing 不算失败；Completeness 单独计算；保留 `scoreRuleVersion`。

## 趋势与 Snapshot 设想

正式方案预期每月 1 日先保存上一自然月快照，再更新当天最新数据。趋势默认展示过去 12 个月：11 个历史月快照加当前月最新结果。当前 Demo 的月度历史仅为 deterministic fixture，不是正式快照契约。

未来 Store snapshot 应保留 `month`、`storeId`、`scoredItems`、`dimensionResults`、`overallScore`、`completeness`、`scoreRuleVersion`；Area / Region 可基于 Store snapshot 聚合。

## 当前 Detail 展示

Demo Detail 与业务详情使用相同 Sheet 宽度，Scope 趋势使用过去 12 个月。诊断分别展示分类、状态和按当前 Demo 评分计算的得分变化；Movement 与 Scope Detail 内不嵌套跳转至其它详情或业务页面。

## 待正式确认

Dimension 权重；Store / Area / Region aggregation；门店是否等权；Environment scoring；Missing 对正式排名的影响；高风险事件是否 override；正式历史 snapshot contract。
