import type {
  ActionClosureRateRecord,
  RawActionRecord,
} from "@/types/ehs";

export const mockActionClosureRates = [
  { storeReference: { trtid: "TEST-001" }, period: "2026-01", value: 76 },
  { storeReference: { trtid: "TEST-001" }, period: "2026-02", value: 90 },
  { storeReference: { trtid: "TEST-001" }, period: "2026-03", value: 97.5 },
] satisfies readonly ActionClosureRateRecord[];

export const mockActionRecords = [
  { actionId: "ACT-001", storeReference: { trtid: "TEST-001" }, actionTitle: "补充设备点检记录", owner: "测试员工甲", createdDate: "2026-01-05", dueDate: "2026-01-20", closedDate: null, Status: "Assigned", sourceReference: { sourceSystem: "Mock Action", sourceRecordId: "ACT-001" } },
  { actionId: "ACT-002", storeReference: { trtid: "TEST-001" }, actionTitle: "更新疏散标识", owner: "测试员工乙", createdDate: "2026-01-12", dueDate: "2026-02-01", closedDate: null, Status: "InProgress" },
  { actionId: "ACT-003", storeReference: { storeNameCn: "示例云桥店" }, actionTitle: "完成护栏修复", owner: "测试员工丙", createdDate: "2026-02-03", dueDate: "2026-02-18", closedDate: "2026-02-16", Status: "Closed", sourceReference: { sourceSystem: "Mock Action", sourceRecordId: "ACT-003" } },
  { actionId: "ACT-004", storeReference: { trtid: "TEST-002" }, actionTitle: "取消重复整改项", owner: "测试员工丁", createdDate: "2026-02-08", dueDate: "2026-02-25", closedDate: null, Status: "Cancelled" },
  { actionId: "ACT-005", storeReference: { storeNameEn: "Sample Galaxy Store" }, actionTitle: "核对危废标签", owner: "测试员工戊", createdDate: "2026-03-01", dueDate: "2026-03-15", closedDate: null, Status: "Assigned" },
  { actionId: "ACT-006", storeReference: { trtid: "TEST-004" }, actionTitle: "更换破损插座", owner: "测试员工己", createdDate: "2026-03-02", dueDate: "2026-03-10", closedDate: "2026-03-09", Status: "Closed" },
  { actionId: "ACT-007", storeReference: { trtid: "TEST-005" }, actionTitle: "复核承包商资料", owner: "测试员工庚", createdDate: "2026-03-05", dueDate: "2026-03-22", closedDate: null, Status: "InProgress" },
  { actionId: "ACT-008", storeReference: { trtid: "TEST-006" }, actionTitle: "撤销误建记录", owner: "测试员工辛", createdDate: "2026-03-06", dueDate: "2026-03-24", closedDate: null, Status: "Cancelled", sourceReference: null },
] satisfies readonly RawActionRecord[];
