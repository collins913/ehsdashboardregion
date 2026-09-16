export type IsoDate = `${number}-${number}-${number}`;
export type IsoDateTime = `${string}T${string}`;
export type TimezoneAwareIsoDateTime =
  | `${string}T${string}Z`
  | `${string}T${string}${"+" | "-"}${string}:${string}`;
export type Month = `${number}-${number}`;
export type StoreId = string;

export type EnvironmentSourceValue = "有" | "无" | "不适用";

export interface RawEnvironmentRecord {
  TRTID: string;
  "English Store Name": string;
  环境影响评价: EnvironmentSourceValue;
  排污许可: EnvironmentSourceValue;
  排水许可: EnvironmentSourceValue;
  环境预案: EnvironmentSourceValue;
  监测: EnvironmentSourceValue;
  废弃物合同: EnvironmentSourceValue;
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
  manager: string;
  ehsAmbassador: string;
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
