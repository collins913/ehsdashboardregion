import { PRODUCTION_DOMAINS, type ImportDiagnostic, type ProductionDomain, type ProductionImportBatchInput } from "./production-import";
import { parseTimezoneAwareInstant, periodFromMonthRange, type ParsedKpiPeriod } from "@/data/contracts/kpi-period";
import type { Month } from "@/types/ehs";

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): value is UnknownRecord => value !== null && typeof value === "object" && !Array.isArray(value);
const only = (value: UnknownRecord, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
const timestamp = (value: unknown): value is string => typeof value === "string" && parseTimezoneAwareInstant(value) !== null;
const month = (value: unknown): value is Month => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const storeReference = (value: unknown) => {
  if (!record(value) || !only(value, ["trtid", "storeNameEn"])) return false;
  const trtidValid = value.trtid === undefined || typeof value.trtid === "string" && value.trtid.trim() !== "";
  const storeNameValid = value.storeNameEn === undefined || value.storeNameEn === null || typeof value.storeNameEn === "string" && value.storeNameEn.trim() !== "";
  const hasIdentity = typeof value.trtid === "string" && value.trtid.trim() !== "" || typeof value.storeNameEn === "string" && value.storeNameEn.trim() !== "";
  return trtidValid && storeNameValid && hasIdentity;
};
const dateOnlyOrNull = (value: unknown) => {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};
const textOrNull = (value: unknown) => value === null || typeof value === "string";
function parseTimeRange(value: unknown): ParsedKpiPeriod | null {
  if (!record(value) || !only(value, ["startInclusive", "endExclusive"])) return null;
  const startMilliseconds = typeof value.startInclusive === "string" ? parseTimezoneAwareInstant(value.startInclusive) : null;
  const endMilliseconds = typeof value.endExclusive === "string" ? parseTimezoneAwareInstant(value.endExclusive) : null;
  return startMilliseconds !== null && endMilliseconds !== null && startMilliseconds < endMilliseconds ? { startMilliseconds, endMilliseconds } : null;
}
const timeRange = (value: unknown) => parseTimeRange(value) !== null;
const requiredFields: Partial<Record<ProductionDomain, readonly string[]>> = {
  "store-master": ["region", "area", "storeNameCn", "storeNameEn", "trtid"],
  training: ["storeReference", "month", "trainingName", "completionRate", "incompletePeople"],
  drill: ["storeReference", "month", "drillName", "status"],
  inspection: ["inspectionNumber", "storeReference", "inspectionName", "dueDate", "inspector", "status"],
  "action-closure-rate": ["storeReference", "startInclusive", "endExclusive", "value"],
  events: ["eventId", "storeReference", "eventType", "submittedBy", "eventDate", "EventDetail", "Status", "ASTMInjuryIllness"],
  actions: ["actionId", "storeReference", "problem", "action", "submittedBy", "owner", "submittedDate", "dueDate", "closedDate", "Status"],
  "take-charge": ["storeReference", "tchId", "submittedBy", "submittedAt", "summary", "Status"],
  certificates: ["TRTID", "Certificate Type", "Expiry Date", "Person", "Person Email", "Business Title"],
  environment: ["TRTID", "环境影响评价", "排污许可", "排水许可", "环境预案", "监测", "废弃物合同"],
  "required-sets": ["storeReference", "month"],
};

function nestedValue(parent: UnknownRecord, key: string, allowed: readonly string[], add: (field: string | null, code: string, message: string) => void, path: string): UnknownRecord | null {
  const value = parent[key];
  if (!record(value) || !only(value, allowed)) { add(path, "INVALID_OBJECT", `${path} 字段与 Environment V1 契约不符。`); return null; }
  for (const field of allowed) if (!Object.hasOwn(value, field)) add(`${path}.${field}`, "REQUIRED_FIELD_MISSING", `缺少 ${path}.${field}。`);
  return value;
}
const allowedFields: Partial<Record<ProductionDomain, readonly string[]>> = {
  "store-master": ["region", "area", "storeNameCn", "storeNameEn", "trtid", "regionOwner", "regionOwnerEmail", "areaOwner", "areaOwnerEmail", "manager", "managerEmail", "ehsAmbassador", "ehsAmbassadorEmail", "extraFields"],
  training: ["storeReference", "month", "trainingName", "completionRate", "incompletePeople", "sourceReference"],
  drill: ["storeReference", "month", "drillName", "status", "sourceReference"],
  inspection: ["inspectionNumber", "storeReference", "inspectionName", "dueDate", "inspector", "status", "sourceReference"],
  "action-closure-rate": ["storeReference", "startInclusive", "endExclusive", "value", "sourceReference"],
  events: ["eventId", "storeReference", "eventType", "submittedBy", "eventDate", "EventDetail", "Status", "ASTMInjuryIllness", "sourceReference"],
  actions: ["actionId", "storeReference", "problem", "action", "submittedBy", "owner", "submittedDate", "dueDate", "closedDate", "Status", "sourceReference"],
  "take-charge": ["storeReference", "tchId", "submittedBy", "submittedAt", "summary", "Status", "extraFields", "sourceReference"],
  certificates: ["TRTID", "English Store Name", "Certificate Type", "Expiry Date", "Person", "Person Email", "Business Title"],
  environment: ["TRTID", "English Store Name", "环境影响评价", "排污许可", "排水许可", "环境预案", "监测", "废弃物合同"],
  "take-charge-annual-aggregates": ["scope", "currentYear", "asOfMonth", "submissionsPerCapitaYtd", "participationRateYtd"],
  "required-sets": ["storeReference", "month", "requiredTrainingItems", "expectedInspectionTasks"],
};

function recordDiagnostics(domain: ProductionDomain, batchId: string, value: unknown, index: number, coveragePeriod: ParsedKpiPeriod | null): ImportDiagnostic[] {
  const errors: ImportDiagnostic[] = [];
  if (!record(value)) return [{ domain, batchId, recordIndex: index, recordId: null, field: null, code: "RECORD_NOT_OBJECT", message: "每条 records 项必须是对象。", severity: "ERROR" }];
  const recordId = [value.eventId, value.actionId, value.tchId, value.inspectionNumber, value.trtid, value.TRTID].find((candidate) => typeof candidate === "string") as string | undefined;
  const add = (field: string | null, code: string, message: string) => errors.push({ domain, batchId, recordIndex: index, recordId: recordId ?? null, field, code, message, severity: "ERROR" });
  const warn = (field: string | null, code: string, message: string) => errors.push({ domain, batchId, recordIndex: index, recordId: recordId ?? null, field, code, message, severity: "WARNING" });
  const allowed = allowedFields[domain];
  if (allowed && !only(value, allowed)) for (const key of Object.keys(value)) if (!allowed.includes(key)) add(key, "UNEXPECTED_FIELD", `字段 ${key} 不在该 Domain 契约中。`);
  for (const key of requiredFields[domain] ?? []) if (!Object.hasOwn(value, key)) add(key, "REQUIRED_FIELD_MISSING", `缺少必需字段 ${key}。`);
  if ("storeReference" in value && !storeReference(value.storeReference)) add("storeReference", "INVALID_STORE_REFERENCE", "门店引用格式无效。");
  if ("month" in value && !month(value.month)) add("month", "INVALID_MONTH", "月份必须为 YYYY-MM。");
  for (const key of ["eventDate", "submittedAt", "submittedDate", "startInclusive", "endExclusive"]) if (key in value && !timestamp(value[key])) add(key, "INVALID_DATETIME", `${key} 必须是带时区的 ISO datetime。`);
  if ("closedDate" in value && value.closedDate !== null && !timestamp(value.closedDate)) add("closedDate", "INVALID_DATETIME", "closedDate 必须是带时区的 ISO datetime 或 null。");
  if ("dueDate" in value && domain === "inspection" && !dateOnlyOrNull(value.dueDate)) add("dueDate", "INVALID_DATE", "Inspection dueDate 必须是 YYYY-MM-DD 或 null。");
  if ("dueDate" in value && domain !== "inspection" && !timestamp(value.dueDate)) add("dueDate", "INVALID_DATETIME", "dueDate 必须是带时区的 ISO datetime。");
  if ("Expiry Date" in value && value["Expiry Date"] !== null && typeof value["Expiry Date"] !== "string") add("Expiry Date", "INVALID_TYPE", "Expiry Date 必须为 string 或 null。");
  else if (domain === "certificates" && typeof value["Expiry Date"] === "string" && !dateOnlyOrNull(value["Expiry Date"])) warn("Expiry Date", "INVALID_DATE_PRESERVED", "保留无效到期日文本，供现有 Certificate Domain Rule 诊断。");
  if ("completionRate" in value && value.completionRate !== null && (typeof value.completionRate !== "number" || !Number.isFinite(value.completionRate) || value.completionRate < 0 || value.completionRate > 100)) add("completionRate", "INVALID_NUMBER", "completionRate 必须为 0–100 或 null。");
  if ("value" in value && value.value !== null && (typeof value.value !== "number" || !Number.isFinite(value.value) || value.value < 0 || value.value > 100)) add("value", "INVALID_NUMBER", "value 必须为 0–100 或 null。");
  if ("ASTMInjuryIllness" in value && value.ASTMInjuryIllness !== "Yes" && value.ASTMInjuryIllness !== "No") add("ASTMInjuryIllness", "INVALID_ENUM", "ASTMInjuryIllness 仅接受 Yes 或 No。");
  if (domain === "events" && (!record(value.EventDetail) || !only(value.EventDetail, ["Description"]) || typeof value.EventDetail.Description !== "string")) add("EventDetail", "INVALID_OBJECT", "EventDetail 必须包含 Description 字符串。");
  if (domain === "action-closure-rate" && timestamp(value.startInclusive) && timestamp(value.endExclusive) && Date.parse(value.startInclusive) >= Date.parse(value.endExclusive)) add("endExclusive", "INVALID_PERIOD", "周期必须满足 startInclusive < endExclusive。");
  if (domain === "certificates" && (typeof value.TRTID !== "string" || !value.TRTID.trim())) add("TRTID", "REQUIRED_FIELD_MISSING", "TRTID 不能为空。");
  if (domain === "environment" && (typeof value.TRTID !== "string" || !value.TRTID.trim())) add("TRTID", "REQUIRED_FIELD_MISSING", "TRTID 不能为空。");
  for (const key of ["regionOwner", "regionOwnerEmail", "areaOwner", "areaOwnerEmail", "manager", "managerEmail", "ehsAmbassador", "ehsAmbassadorEmail", "inspector", "status", "Expiry Date", "closedDate", "English Store Name"]) {
    if (key in value && !textOrNull(value[key])) add(key, "INVALID_TYPE", `${key} 必须为 string 或 null。`);
  }
  for (const key of ["region", "area", "storeNameCn", "storeNameEn", "trtid", "trainingName", "drillName", "inspectionNumber", "inspectionName", "eventId", "eventType", "submittedBy", "Status", "actionId", "problem", "action", "owner", "tchId", "summary", "Certificate Type", "Person", "Person Email", "Business Title"]) {
    if (key in value && typeof value[key] !== "string") add(key, "INVALID_TYPE", `${key} 必须为 string。`);
  }
  if (domain === "store-master" && (typeof value.trtid !== "string" || !value.trtid.trim())) add("trtid", "INVALID_TRTID", "TRTID 必须是非空稳定标识，不允许空白字符串。");
  if ("incompletePeople" in value && value.incompletePeople !== null && (!Array.isArray(value.incompletePeople) || !value.incompletePeople.every((person) => typeof person === "string"))) add("incompletePeople", "INVALID_TYPE", "incompletePeople 必须为 string[] 或 null。");
  if ("sourceReference" in value && value.sourceReference !== null && (!record(value.sourceReference) || !only(value.sourceReference, ["sourceSystem", "sourceRecordId", "sourceUrl"]) || Object.values(value.sourceReference).some((item) => item !== undefined && typeof item !== "string"))) add("sourceReference", "INVALID_OBJECT", "sourceReference 只能包含 string 类型的已定义字段。");
  if ("extraFields" in value && (!record(value.extraFields) || Object.values(value.extraFields).some((item) => item !== null && typeof item !== "string" && typeof item !== "boolean" && (typeof item !== "number" || !Number.isFinite(item))))) add("extraFields", "INVALID_OBJECT", "extraFields 只能包含 string、有限 number、boolean 或 null。");
  if (record(value.sourceReference) && typeof value.sourceReference.sourceUrl === "string") {
    try { new URL(value.sourceReference.sourceUrl); }
    catch { add("sourceReference.sourceUrl", "INVALID_URI", "sourceUrl 必须是绝对 URI。"); }
  }
  if (domain === "required-sets") {
    const hasTraining = Object.hasOwn(value, "requiredTrainingItems");
    const hasInspection = Object.hasOwn(value, "expectedInspectionTasks");
    if (hasTraining === hasInspection) add(null, "INVALID_REQUIRED_SET", "每条配置必须且只能包含一种 required set。");
    const list = hasTraining ? value.requiredTrainingItems : value.expectedInspectionTasks;
    if (!Array.isArray(list) || list.length === 0 || !list.every((item) => typeof item === "string" && item.trim() !== "") || new Set(list).size !== list.length) add(hasTraining ? "requiredTrainingItems" : "expectedInspectionTasks", "INVALID_REQUIRED_SET", "配置集合必须是非空数组、无空项且无重复值。");
  }
  if (coveragePeriod) {
    const instantFields: Partial<Record<ProductionDomain, string>> = { events: "eventDate", actions: "submittedDate", "take-charge": "submittedAt" };
    let field = instantFields[domain];
    const businessTime = field ? value[field] : null;
    let start = typeof businessTime === "string" ? parseTimezoneAwareInstant(businessTime) : null;
    let end: number | null = null;
    if ((domain === "training" || domain === "drill") && month(value.month)) {
      field = "month";
      const period = periodFromMonthRange(value.month, value.month);
      start = period ? parseTimezoneAwareInstant(period.startInclusive) : null;
      end = period ? parseTimezoneAwareInstant(period.endExclusive) : null;
    } else if (domain === "inspection" && typeof value.dueDate === "string" && dateOnlyOrNull(value.dueDate)) {
      field = "dueDate";
      start = parseTimezoneAwareInstant(`${value.dueDate}T00:00:00+08:00`);
    } else if (domain === "action-closure-rate") {
      field = "startInclusive";
      const period = parseTimeRange({ startInclusive: value.startInclusive, endExclusive: value.endExclusive });
      start = period?.startMilliseconds ?? null;
      end = period?.endMilliseconds ?? null;
    }
    if (field && start !== null && (start < coveragePeriod.startMilliseconds || start >= coveragePeriod.endMilliseconds || end !== null && end > coveragePeriod.endMilliseconds)) add(field, "RECORD_OUTSIDE_COVERAGE_PERIOD", "记录的业务时间或统计范围超出声明的 coverage.businessPeriod。");
  }
  if (domain === "environment") {
    const nested = (field: string, required: readonly string[], optional: readonly string[] = []) => {
      const object = value[field];
      if (!record(object) || !only(object, [...required, ...optional])) { add(field, "INVALID_OBJECT", `${field} 结构与 Environment V1 契约不符。`); return null; }
      for (const key of required) if (!Object.hasOwn(object, key)) add(`${field}.${key}`, "REQUIRED_FIELD_MISSING", `缺少 ${field}.${key}。`);
      return object;
    };
    const nullableStrings = (object: UnknownRecord | null, field: string, keys: readonly string[]) => {
      if (!object) return;
      for (const key of keys) if (!textOrNull(object[key])) add(`${field}.${key}`, "INVALID_TYPE", `${field}.${key} 必须是 string 或 null。`);
    };
    const nullableDates = (object: UnknownRecord | null, field: string, keys: readonly string[]) => {
      if (!object) return;
      for (const key of keys) if (!dateOnlyOrNull(object[key])) add(`${field}.${key}`, "INVALID_DATE", `${field}.${key} 必须是 YYYY-MM-DD 或 null。`);
    };
    const impact = nested("环境影响评价", ["环境影响评价", "总量要求"]);
    nullableStrings(impact, "环境影响评价", ["环境影响评价"]);
    const impactTotals = impact ? nestedValue(impact, "总量要求", ["气-颗粒物", "气-VOCs", "水-氨氮", "水-总氮", "水-总磷", "水-CODcr"], add, "环境影响评价.总量要求") : null;
    if (impactTotals) for (const [key, number] of Object.entries(impactTotals)) if (number !== null && (typeof number !== "number" || !Number.isFinite(number))) add(`环境影响评价.总量要求.${key}`, "INVALID_TYPE", "排放总量必须是有限数字或 null。");
    const discharge = nested("排污许可", ["排污许可", "执行报告", "编号", "有效期起", "有效期止", "总量要求", "备注"]);
    nullableStrings(discharge, "排污许可", ["排污许可", "执行报告", "编号", "备注"]);
    nullableDates(discharge, "排污许可", ["有效期起", "有效期止"]);
    const dischargeTotals = discharge ? nestedValue(discharge, "总量要求", ["产能", "涂料批复用量"], add, "排污许可.总量要求") : null;
    if (dischargeTotals) for (const [key, item] of Object.entries(dischargeTotals)) if (item !== null && typeof item !== "string" && (typeof item !== "number" || !Number.isFinite(item))) add(`排污许可.总量要求.${key}`, "INVALID_TYPE", "该值必须是 string、有限数字或 null。");
    const drainage = nested("排水许可", ["洗车", "排水许可", "有效期起", "有效期止", "备注"]);
    nullableStrings(drainage, "排水许可", ["洗车", "排水许可", "备注"]);
    nullableDates(drainage, "排水许可", ["有效期起", "有效期止"]);
    const emergency = nested("环境预案", ["突发环境事件应急预案备案情况", "备案编号", "有效期起", "有效期止", "备注"]);
    nullableStrings(emergency, "环境预案", ["突发环境事件应急预案备案情况", "备案编号", "备注"]);
    nullableDates(emergency, "环境预案", ["有效期起", "有效期止"]);
    if (!["有", "无", "不适用"].includes(String(value.监测))) add("监测", "INVALID_ENUM", "监测仅接受有、无、不适用。");
    const waste = nested("废弃物合同", ["危险废物处置合同", "一般工业固体废物处置合同"]);
    if (waste) for (const key of ["危险废物处置合同", "一般工业固体废物处置合同"]) {
      const contracts = waste[key];
      if (!Array.isArray(contracts)) { add(`废弃物合同.${key}`, "INVALID_TYPE", "合同记录必须是数组。"); continue; }
      contracts.forEach((contract, contractIndex) => {
        if (!record(contract) || !only(contract, ["供应商名称", "种类", "有效期起", "有效期止"]) || typeof contract.供应商名称 !== "string" || typeof contract.种类 !== "string" || !dateOnlyOrNull(contract.有效期起) || !dateOnlyOrNull(contract.有效期止)) add(`废弃物合同.${key}[${contractIndex}]`, "INVALID_RECORD", "合同记录字段与 Environment V1 契约不符。");
      });
    }
  }
  return errors;
}

export function parseProductionImportBatch(input: unknown): { value: ProductionImportBatchInput | null; diagnostics: readonly ImportDiagnostic[] } {
  const domain = record(input) && PRODUCTION_DOMAINS.includes(input.domain as ProductionDomain) ? input.domain as ProductionDomain : "store-master";
  const batchId = record(input) && typeof input.batchId === "string" ? input.batchId : "unknown";
  const errors: ImportDiagnostic[] = [];
  const add = (field: string | null, code: string, message: string) => errors.push({ domain, batchId, recordIndex: null, recordId: null, field, code, message, severity: "ERROR" });
  if (!record(input)) return { value: null, diagnostics: [{ domain, batchId, recordIndex: null, recordId: null, field: null, code: "INVALID_REQUEST", message: "请求必须是对象。", severity: "ERROR" }] };
  const keys = ["schemaVersion", "sourceSystem", "sourceVersion", "configurationVersion", "domain", "batchId", "extractionTime", "businessPeriod", "effectiveTime", "coverage", "expectedRecordCount", "idempotencyKey", "records"];
  if (!only(input, keys)) for (const key of Object.keys(input)) if (!keys.includes(key)) add(key, "UNEXPECTED_FIELD", `字段 ${key} 不受支持。`);
  if (input.schemaVersion !== "v1") add("schemaVersion", "UNSUPPORTED_SCHEMA_VERSION", "schemaVersion 必须为 v1。");
  if (!PRODUCTION_DOMAINS.includes(input.domain as ProductionDomain)) add("domain", "INVALID_DOMAIN", "Domain 不受支持。");
  if (domain === "take-charge-annual-aggregates") add("domain", "DIRECT_REPOSITORY_INTEGRATION_REQUIRED", "年度指标的业务目标与逻辑输出已冻结；公司数据应由 Production Repository Adapter 直接映射，当前通用批量导入不接收该 Domain。");
  if (typeof input.sourceSystem !== "string" || !input.sourceSystem.trim() || input.sourceSystem.length > 120) add("sourceSystem", "INVALID_SOURCE_SYSTEM", "sourceSystem 必须为 1–120 字符的非空字符串。");
  for (const field of ["sourceVersion", "configurationVersion"] as const) if (input[field] !== undefined && (typeof input[field] !== "string" || !input[field].trim() || input[field].length > 120)) add(field, "INVALID_VERSION", `${field} 必须为 1–120 字符的非空字符串。`);
  if (typeof input.batchId !== "string" || !input.batchId.trim() || input.batchId.length > 160) add("batchId", "INVALID_BATCH_ID", "batchId 必须为 1–160 字符的非空字符串。");
  if (typeof input.idempotencyKey !== "string" || !input.idempotencyKey.trim() || input.idempotencyKey.length > 200) add("idempotencyKey", "INVALID_IDEMPOTENCY_KEY", "idempotencyKey 必须为 1–200 字符的非空字符串。");
  if (!timestamp(input.extractionTime)) add("extractionTime", "INVALID_DATETIME", "extractionTime 必须是带时区的 ISO datetime。");
  const businessPeriod = parseTimeRange(input.businessPeriod);
  const coveragePeriod = record(input.coverage) ? parseTimeRange(input.coverage.businessPeriod) : null;
  if (input.businessPeriod !== undefined && businessPeriod === null) add("businessPeriod", "INVALID_PERIOD", "businessPeriod 必须是有效的半开时区时间范围。");
  if (input.effectiveTime !== undefined && !timeRange(input.effectiveTime)) add("effectiveTime", "INVALID_PERIOD", "effectiveTime 必须是有效的半开时区时间范围。");
  if (businessPeriod && coveragePeriod && (businessPeriod.startMilliseconds !== coveragePeriod.startMilliseconds || businessPeriod.endMilliseconds !== coveragePeriod.endMilliseconds)) add("coverage.businessPeriod", "COVERAGE_PERIOD_MISMATCH", "coverage.businessPeriod 必须与批次 businessPeriod 一致。");
  if (!Number.isSafeInteger(input.expectedRecordCount) || (input.expectedRecordCount as number) < 0) add("expectedRecordCount", "INVALID_RECORD_COUNT", "expectedRecordCount 必须为非负整数。");
  if (!Array.isArray(input.records)) add("records", "INVALID_RECORDS", "records 必须是数组。");
  else if (input.records.length > 10_000) add("records", "BATCH_LIMIT_EXCEEDED", "单批最多接收 10,000 条记录。");
  const proofValid = (proof: unknown) => record(proof) && only(proof, ["kind", "reference", "controlRecordCount", "scope", "digest"]) &&
    ["SOURCE_CONTROL_TOTAL", "EXPORT_MANIFEST", "SCOPE_DIGEST", "AUTHORITATIVE_EMPTY"].includes(String(proof.kind)) &&
    typeof proof.reference === "string" && proof.reference.trim().length > 0 && proof.reference.length <= 500 &&
    (proof.controlRecordCount === undefined || Number.isSafeInteger(proof.controlRecordCount) && Number(proof.controlRecordCount) >= 0) &&
    (proof.scope === undefined || typeof proof.scope === "string" && !!proof.scope.trim() && proof.scope.length <= 500) &&
    (proof.digest === undefined || typeof proof.digest === "string" && !!proof.digest.trim() && proof.digest.length <= 256) &&
    (proof.kind === "SOURCE_CONTROL_TOTAL" ? Number.isSafeInteger(proof.controlRecordCount) && Number(proof.controlRecordCount) >= 0 : true) &&
    (proof.kind === "SCOPE_DIGEST" ? typeof proof.scope === "string" && !!proof.scope.trim() && typeof proof.digest === "string" && !!proof.digest.trim() : true) &&
    (proof.kind !== "AUTHORITATIVE_EMPTY" || proof.controlRecordCount === 0);
  if (!record(input.coverage) || !only(input.coverage, ["completeness", "stores", "businessPeriod", "proof"]) || !["COMPLETE", "PARTIAL", "UNKNOWN"].includes(String(input.coverage.completeness)) || !Array.isArray(input.coverage.stores) || input.coverage.stores.length > 10_000 || !input.coverage.stores.every(storeReference) || (input.coverage.businessPeriod !== undefined && !timeRange(input.coverage.businessPeriod)) || (input.coverage.proof !== undefined && !proofValid(input.coverage.proof))) add("coverage", "INVALID_COVERAGE", "coverage 必须声明完整性、有效门店范围、可选业务周期及格式正确的来源证明。");
  if (domain === "store-master" && record(input.coverage) && input.coverage.completeness === "COMPLETE" && Array.isArray(input.coverage.stores) && input.coverage.stores.some((reference) => !record(reference) || typeof reference.trtid !== "string" || !reference.trtid.trim())) add("coverage.stores", "STORE_MASTER_COVERAGE_REQUIRES_TRTID", "完整 Store Master 覆盖清单必须使用 TRTID 标识门店。");
  const timeCoveredDomains: readonly ProductionDomain[] = ["training", "drill", "inspection", "action-closure-rate", "events", "actions", "take-charge"];
  const effectiveTimeDomains: readonly ProductionDomain[] = ["store-master", "certificates", "environment", "required-sets"];
  if (timeCoveredDomains.includes(domain) && (!record(input.coverage) || !timeRange(input.coverage.businessPeriod))) add("coverage.businessPeriod", "COVERAGE_PERIOD_REQUIRED", "该 Domain 的完整覆盖必须声明业务周期。");
  if (effectiveTimeDomains.includes(domain) && input.effectiveTime === undefined) add("effectiveTime", "EFFECTIVE_TIME_REQUIRED", "该 Domain 必须声明数据适用时间范围。");
  const rows = Array.isArray(input.records) ? input.records : [];
  if (Number.isSafeInteger(input.expectedRecordCount) && input.expectedRecordCount !== rows.length) add("expectedRecordCount", "RECORD_COUNT_MISMATCH", "records 数量与 expectedRecordCount 不一致；此比较仅校验请求自洽，不构成来源完整性证明。");
  if (PRODUCTION_DOMAINS.includes(input.domain as ProductionDomain)) {
    const selectedDomain = input.domain as ProductionDomain;
    rows.forEach((row, index) => errors.push(...recordDiagnostics(selectedDomain, batchId, row, index, timeCoveredDomains.includes(selectedDomain) ? coveragePeriod : null)));
    const uniqueKey = (row: unknown): string | null => {
      if (!record(row)) return null;
      const fields: Partial<Record<ProductionDomain, string>> = { "store-master": "trtid", inspection: "inspectionNumber", events: "eventId", actions: "actionId", "take-charge": "tchId" };
      const field = fields[selectedDomain];
      if (field && typeof row[field] === "string") return `${field}:${row[field]}`;
      if (selectedDomain === "training" && typeof row.month === "string" && typeof row.trainingName === "string" && record(row.storeReference)) return `training-provisional:${String(row.storeReference.trtid ?? row.storeReference.storeNameEn)}:${row.month}:${row.trainingName}`;
      if (selectedDomain === "required-sets" && typeof row.month === "string" && record(row.storeReference)) {
        const kind = Array.isArray(row.requiredTrainingItems) ? "training" : "inspection";
        return `required-set:${String(row.storeReference.trtid ?? row.storeReference.storeNameEn)}:${row.month}:${kind}`;
      }
      if (selectedDomain === "action-closure-rate" && typeof row.startInclusive === "string" && typeof row.endExclusive === "string" && record(row.storeReference)) return `action-closure:${String(row.storeReference.trtid ?? row.storeReference.storeNameEn)}:${row.startInclusive}:${row.endExclusive}`;
      return null;
    };
    const seen = new Set<string>();
    rows.forEach((row, recordIndex) => {
      const key = uniqueKey(row);
      if (key && seen.has(key)) errors.push({ domain: selectedDomain, batchId, recordIndex, recordId: key.slice(key.indexOf(":") + 1), field: key.slice(0, key.indexOf(":")), code: "DUPLICATE_RECORD_KEY", message: "批次内存在重复记录身份。", severity: "ERROR" });
      else if (key) seen.add(key);
    });
  }
  const value = errors.every((item) => item.severity !== "ERROR") ? input as unknown as ProductionImportBatchInput : null;
  return { value, diagnostics: errors };
}

export function validateProductionBatchStoreLinks(
  batch: ProductionImportBatchInput,
  resolve: (reference: { trtid: string; storeNameEn?: string | null } | { storeNameEn: string }) => { kind: "RESOLVED"; store: { trtid: string } } | { kind: "CONFLICT" | "UNRESOLVED" },
): readonly ImportDiagnostic[] {
  if (batch.domain === "store-master") {
    const ids = new Set<string>();
    const diagnostics: ImportDiagnostic[] = batch.records.flatMap((record, recordIndex) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return [];
      const row = record as Record<string, unknown>;
      const id = typeof row.trtid === "string" ? row.trtid : "";
      if (!id || !ids.has(id)) { if (id) ids.add(id); return []; }
      return [{ domain: batch.domain, batchId: batch.batchId, recordIndex, recordId: id, field: "trtid", code: "DUPLICATE_STORE_IDENTITY", message: "同一批次内 TRTID 必须唯一。", severity: "ERROR" as const }];
    });
    if (batch.coverage.completeness === "COMPLETE") {
      const declared = new Set(batch.coverage.stores.flatMap((reference) => "trtid" in reference && reference.trtid ? [reference.trtid] : []));
      if (declared.size !== ids.size || [...declared].some((id) => !ids.has(id))) diagnostics.push({ domain: batch.domain, batchId: batch.batchId, recordIndex: null, recordId: null, field: "coverage.stores", code: "COVERAGE_MISMATCH", message: "Store Master 批次记录与声明的门店覆盖范围不一致。", severity: "ERROR" });
    }
    return diagnostics;
  }
  const references: { reference: { trtid: string; storeNameEn?: string | null } | { storeNameEn: string }; recordIndex: number | null; field: string }[] = [];
  batch.coverage.stores.forEach((reference) => references.push({ reference, recordIndex: null, field: "coverage.stores" }));
  batch.records.forEach((record, recordIndex) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const row = record as Record<string, unknown>;
    if (row.storeReference && typeof row.storeReference === "object") references.push({ reference: row.storeReference as { trtid: string; storeNameEn?: string | null } | { storeNameEn: string }, recordIndex, field: "storeReference" });
    else if (typeof row.TRTID === "string") references.push({ reference: { trtid: row.TRTID, storeNameEn: typeof row["English Store Name"] === "string" ? row["English Store Name"] : null }, recordIndex, field: "TRTID" });
  });
  const diagnostics = references.flatMap(({ reference, recordIndex, field }) => {
    const result = resolve(reference);
    if (result.kind === "RESOLVED") return [];
    const unresolved = result.kind === "UNRESOLVED";
    return [{ domain: batch.domain, batchId: batch.batchId, recordIndex, recordId: null, field,
      code: unresolved ? "UNKNOWN_STORE" : "STORE_REFERENCE_CONFLICT",
      message: unresolved ? "门店引用未匹配到唯一 Store Master 记录。" : "TRTID 与英文门店名解析冲突。", severity: "ERROR" as const }];
  });
  if (diagnostics.length) return diagnostics;
  const coveredIds = new Set<string>();
  const coverageStoreIds = new Set<string>();
  batch.coverage.stores.forEach((reference) => {
    const result = resolve(reference);
    if (result.kind === "RESOLVED") coverageStoreIds.add(result.store.trtid);
  });
  batch.records.forEach((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const row = record as Record<string, unknown>;
    let reference: { trtid: string; storeNameEn?: string | null } | { storeNameEn: string } | null = null;
    if (row.storeReference && typeof row.storeReference === "object") reference = row.storeReference as { trtid: string; storeNameEn?: string | null } | { storeNameEn: string };
    else if (typeof row.TRTID === "string") reference = { trtid: row.TRTID, storeNameEn: typeof row["English Store Name"] === "string" ? row["English Store Name"] : null };
    if (!reference) return;
    const result = resolve(reference);
    if (result.kind === "RESOLVED") coveredIds.add(result.store.trtid);
  });
  const outside = [...coveredIds].filter((storeId) => !coverageStoreIds.has(storeId));
  if (outside.length) diagnostics.push({ domain: batch.domain, batchId: batch.batchId, recordIndex: null, recordId: null, field: "coverage.stores", code: "COVERAGE_MISMATCH", message: "记录门店超出声明的 coverage 范围。", severity: "ERROR" });
  return diagnostics;
}
