import type { CertificateRecord } from "@/types/ehs";

export const mockCertificateRecords = [
  { storeReference: { trtid: "TEST-001" }, certificateCategory: "安全证书", certificateType: "店长安全证", person: "测试人员甲", roleTitle: "任意岗位甲", expiryDate: "2027-06-30", certificateNumber: "TEST-CERT-001" },
  { storeReference: { trtid: "TEST-001" }, certificateCategory: "安全证书", certificateType: "EHS RN安全证", person: "测试人员乙", roleTitle: "任意岗位乙", expiryDate: "2027-08-31", certificateNumber: "TEST-CERT-002" },
  { storeReference: { trtid: "TEST-001" }, certificateCategory: "安全证书", certificateType: "安全学习记录", person: "测试人员丙", roleTitle: "任意岗位丙", expiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-002" }, certificateCategory: "安全证书", certificateType: "主要负责人安全生产培训合格证书-S", person: "测试人员丁", roleTitle: "不参与匹配", expiryDate: "2027-05-31" },
  { storeReference: { trtid: "TEST-003" }, certificateCategory: "急救员", certificateType: "急救员证", person: "测试人员戊", roleTitle: "不参与匹配", expiryDate: "2025-12-31" },
  { storeReference: { trtid: "TEST-004" }, certificateCategory: "职业卫生证书", certificateType: "职业健康证", person: "测试人员己", roleTitle: "岗位一", expiryDate: "2027-04-30" },
  { storeReference: { trtid: "TEST-004" }, certificateCategory: "职业卫生证书", certificateType: "职业健康证", person: "测试人员庚", roleTitle: "岗位二", expiryDate: "2027-05-31" },
  { storeReference: { trtid: "TEST-005" }, certificateCategory: "内驾证", certificateType: "内训师", person: "测试人员辛", roleTitle: "任意岗位", expiryDate: "2027-06-30" },
  { storeReference: { trtid: "TEST-005" }, certificateCategory: "内驾证", certificateType: "内驾证", person: "测试人员壬", roleTitle: "任意岗位", expiryDate: "2027-07-31" },
  { storeReference: { trtid: "TEST-006" }, certificateCategory: "焊工证", certificateType: "熔化焊接与热切割作业", person: "测试人员癸", roleTitle: "任意岗位", expiryDate: "2027-09-30" },
  { storeReference: { trtid: "TEST-007" }, certificateCategory: "职业卫生证书", certificateType: "主要负责人职业卫生培训合格证书-H1", person: "测试人员子", roleTitle: "任意岗位", expiryDate: "2027-10-31" },
  { storeReference: { trtid: "TEST-007" }, certificateCategory: "职业卫生证书", certificateType: "职业卫生管理人员职业卫生培训合格证书-H2", person: "测试人员丑", roleTitle: "任意岗位", expiryDate: "2027-11-30" },
  { storeReference: { trtid: "TEST-007" }, certificateCategory: "职业卫生证书", certificateType: "职业健康复训记录", person: "测试人员寅", roleTitle: "任意岗位", expiryDate: "2025-11-30" },
  { storeReference: { trtid: "TEST-009" }, certificateCategory: "急救员", certificateType: "红十字急救员", person: "测试人员卯", roleTitle: "任意岗位", expiryDate: null },
] satisfies readonly CertificateRecord[];
