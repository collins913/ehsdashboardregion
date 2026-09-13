import type {
  CarWashDrainagePermitRecord,
  DischargePermitRecord,
  EiaRecord,
  EnvironmentalMonitoringRecord,
  WasteContractRecord,
} from "@/types/ehs";

export const mockWasteContractRecords = [
  { storeReference: { trtid: "TEST-001" }, contractCategory: "Hazardous Waste Contract", supplierContractor: "测试环保服务甲", expiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-001" }, contractCategory: "General Solid Waste Contract", supplierContractor: "测试清运服务甲", expiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-002" }, contractCategory: "General Solid Waste Contract", supplierContractor: "测试清运服务乙", expiryDate: "2027-06-30" },
  { storeReference: { trtid: "TEST-003" }, contractCategory: "Hazardous Waste Contract", supplierContractor: "测试环保服务丙", expiryDate: "2027-06-30" },
  { storeReference: { trtid: "TEST-004" }, contractCategory: "Hazardous Waste Contract", supplierContractor: "测试环保服务丁", expiryDate: "2025-12-31" },
  { storeReference: { trtid: "TEST-004" }, contractCategory: "General Solid Waste Contract", supplierContractor: "测试清运服务丁", expiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-005" }, contractCategory: "Hazardous Waste Contract", supplierContractor: "测试环保服务戊一", expiryDate: "2027-06-30" },
  { storeReference: { trtid: "TEST-005" }, contractCategory: "Hazardous Waste Contract", supplierContractor: "测试环保服务戊二", expiryDate: "2027-09-30" },
  { storeReference: { trtid: "TEST-005" }, contractCategory: "General Solid Waste Contract", supplierContractor: "测试清运服务戊", expiryDate: "2027-08-31" },
] satisfies readonly WasteContractRecord[];

export const mockCarWashDrainagePermitRecords = [
  { storeReference: { trtid: "TEST-001" }, hasCarWash: false, hasDrainagePermit: false, permitExpiryDate: null },
  { storeReference: { trtid: "TEST-002" }, hasCarWash: true, hasDrainagePermit: true, permitExpiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-003" }, hasCarWash: true, hasDrainagePermit: false, permitExpiryDate: null },
  { storeReference: { trtid: "TEST-004" }, hasCarWash: true, hasDrainagePermit: true, permitExpiryDate: "2025-12-31" },
] satisfies readonly CarWashDrainagePermitRecord[];

export const mockEiaRecords = [
  { storeReference: { trtid: "TEST-001" }, eiaRequired: false, eiaInformation: null },
  { storeReference: { trtid: "TEST-002" }, eiaRequired: true, eiaInformation: "测试 EIA 备案信息" },
  { storeReference: { trtid: "TEST-003" }, eiaRequired: true, eiaInformation: null },
] satisfies readonly EiaRecord[];

export const mockDischargePermitRecords = [
  { storeReference: { trtid: "TEST-001" }, dischargePermitRequired: false, permitInformation: null, expiryDate: null },
  { storeReference: { trtid: "TEST-002" }, dischargePermitRequired: true, permitInformation: "测试排污许可信息", expiryDate: "2027-12-31" },
  { storeReference: { trtid: "TEST-003" }, dischargePermitRequired: true, permitInformation: null, expiryDate: null },
  { storeReference: { trtid: "TEST-004" }, dischargePermitRequired: true, permitInformation: "测试已过期许可", expiryDate: "2025-12-31" },
] satisfies readonly DischargePermitRecord[];

export const mockEnvironmentalMonitoringRecords = [
  { storeReference: { trtid: "TEST-001" } },
  {
    storeReference: {
      storeNameEn: "Lanzhou Beian Gravity Direct Transit Center",
    },
  },
] satisfies readonly EnvironmentalMonitoringRecord[];
