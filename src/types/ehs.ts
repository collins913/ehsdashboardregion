export type IsoDate = `${number}-${number}-${number}`;
export type IsoDateTime = `${string}T${string}`;
export type TimezoneAwareIsoDateTime =
  | `${string}T${string}Z`
  | `${string}T${string}${"+" | "-"}${string}:${string}`;
export type Month = `${number}-${number}`;
export type StoreId = string;

export type EnvironmentSourceValue = "有" | "无" | "不适用";

export interface RawEnvironmentImpactAssessment {
  环境影响评价: string | null;
  总量要求: {
    "气-颗粒物": number | null;
    "气-VOCs": number | null;
    "水-氨氮": number | null;
    "水-总氮": number | null;
    "水-总磷": number | null;
    "水-CODcr": number | null;
  };
}

export interface RawEnvironmentDischargePermit {
  排污许可: string | null;
  执行报告: string | null;
  编号: string | null;
  有效期起: IsoDate | null;
  有效期止: IsoDate | null;
  总量要求: {
    产能: string | number | null;
    涂料批复用量: string | number | null;
  };
  备注: string | null;
}

export interface RawEnvironmentDrainagePermit {
  洗车: string | null;
  排水许可: string | null;
  有效期起: IsoDate | null;
  有效期止: IsoDate | null;
  备注: string | null;
}

export interface RawEnvironmentEmergencyPlan {
  突发环境事件应急预案备案情况: string | null;
  备案编号: string | null;
  有效期起: IsoDate | null;
  有效期止: IsoDate | null;
  备注: string | null;
}

export interface RawEnvironmentWasteContract {
  供应商名称: string;
  种类: string;
  有效期起: IsoDate | null;
  有效期止: IsoDate | null;
}

export interface RawEnvironmentRecord {
  TRTID: string;
  "English Store Name": string;
  环境影响评价: RawEnvironmentImpactAssessment;
  排污许可: RawEnvironmentDischargePermit;
  排水许可: RawEnvironmentDrainagePermit;
  环境预案: RawEnvironmentEmergencyPlan;
  监测: EnvironmentSourceValue;
  废弃物合同: {
    危险废物处置合同: readonly RawEnvironmentWasteContract[];
    一般工业固体废物处置合同: readonly RawEnvironmentWasteContract[];
  };
}

export type StoreReference =
  | { trtid: string; storeNameEn?: string }
  | { storeNameCn: string }
  | { storeNameEn: string };

export interface SourceReference {
  sourceSystem?: string;
  sourceRecordId?: string;
  sourceUrl?: string;
}

export interface StoreMasterData {
  region: string;
  area: string;
  storeNameCn: string;
  storeNameEn: string;
  trtid: string;
  regionOwner: string | null;
  regionOwnerEmail: string | null;
  areaOwner: string | null;
  areaOwnerEmail: string | null;
  manager: string | null;
  managerEmail: string | null;
  ehsAmbassador: string | null;
  ehsAmbassadorEmail: string | null;
}

export interface TrainingRecord {
  storeReference: StoreReference;
  month: Month;
  trainingName: string;
  isRequired: boolean;
  isFullyCompleted: boolean;
  sourceReference?: SourceReference | null;
}

export interface DrillRecord {
  storeReference: StoreReference;
  month: Month;
  drillName: string;
  isCompleted: boolean;
  sourceReference?: SourceReference | null;
}

export interface InspectionRecord {
  storeReference: StoreReference;
  period: Month;
  isRequired: boolean;
  isCompleted: boolean;
  sourceReference?: SourceReference | null;
}

export interface ActionClosureRateRecord {
  storeReference: StoreReference;
  startInclusive: TimezoneAwareIsoDateTime;
  endExclusive: TimezoneAwareIsoDateTime;
  value: number | null;
  sourceReference?: SourceReference | null;
}

export interface TakeChargeRecord {
  storeReference: { trtid: string };
  tchId: string;
  submittedBy: string;
  submittedAt: IsoDateTime;
  summary: string;
  Status: string;
  extraFields?: Readonly<Record<string, string | number | boolean | null>>;
  sourceReference?: SourceReference | null;
}

export type EventType = string;

export interface EventDetail {
  Description: string;
}

export interface EventRecord {
  eventId: string;
  storeReference: StoreReference;
  eventType: EventType;
  submittedBy: string;
  eventDate: IsoDateTime;
  EventDetail: EventDetail;
  Status: string;
  ASTMInjuryIllness: string;
  sourceReference?: SourceReference | null;
}

export type KnownActionStatus =
  | "Assigned"
  | "In Progress"
  | "In Review"
  | "Sign Off"
  | "Closed"
  | "Cancelled";

export type ParsedActionStatus =
  | { kind: "KNOWN"; value: KnownActionStatus }
  | { kind: "UNKNOWN"; value: string };

interface ActionRecordBase {
  actionId: string;
  storeReference: StoreReference;
  problem: string;
  action: string;
  submittedBy: string;
  owner: string;
  submittedDate: IsoDateTime;
  dueDate: IsoDateTime;
  closedDate: IsoDateTime | null;
  sourceReference?: SourceReference | null;
}

export interface RawActionRecord extends ActionRecordBase {
  Status: string;
}

export interface ActionRecord extends ActionRecordBase {
  Status: ParsedActionStatus;
}

export type DefaultCertificateCategory =
  | "安全健康"
  | "急救员"
  | "特种作业"
  | "安全驾驶";

export interface RawCertificateRecord {
  TRTID: string;
  "English Store Name": string;
  "Certificate Type": string;
  "Expiry Date": string | null;
  Person: string;
  "Person Email": string;
  "Business Title": string;
}
