import type { DataAvailability, EhsStoreScope, KpiPeriod } from "@/data/contracts/kpi";
import type { DomainReason } from "@/data/contracts/domain-result";
import type { StoreMasterData, TimezoneAwareIsoDateTime } from "@/types/ehs";
import type { ProductionDomain } from "@/data/contracts/production-import";
import type { ImportBatchStore } from "./production-import-batch-store";

export interface PublishedSourceRead<T> {
  domain: ProductionDomain;
  batchId: string;
  schemaVersion: "v1";
  sourceVersion?: string;
  configurationVersion?: string;
  extractedAt: TimezoneAwareIsoDateTime;
  publishedAt: TimezoneAwareIsoDateTime;
  effectiveTime: { startInclusive: TimezoneAwareIsoDateTime; endExclusive: TimezoneAwareIsoDateTime } | null;
  businessPeriod: KpiPeriod | null;
  availability: DataAvailability;
  reason?: DomainReason;
  items: readonly T[];
}

export interface PublishedSourceScope {
  storeScope?: EhsStoreScope;
  period?: KpiPeriod;
  referenceDate?: TimezoneAwareIsoDateTime;
}

/** Database-neutral storage SPI. Implementations must expose only atomically published batches. */
export interface ProductionStorageAdapter extends ImportBatchStore {
  readPublishedStoreMaster(): Promise<PublishedSourceRead<StoreMasterData> | null>;
  readPublishedDomain<T>(domain: ProductionDomain, scope: PublishedSourceScope): Promise<PublishedSourceRead<T> | null>;
}
