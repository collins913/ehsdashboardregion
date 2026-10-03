import type { DomainReason, DomainSource } from "./contracts/domain-result";
import type { Month, StoreId } from "@/types/ehs";
import { mostSpecificReason } from "@/lib/rules/domain-diagnostics";

export const storeMonthKey = (storeId: StoreId, month: Month) => `${storeId}\u0000${month}`;

/** Records are retained; issues are isolated to identifiable Store/period slices. */
export class StorePeriodIndex<T> {
  private readonly records = new Map<string, T[]>();
  private readonly issues = new Map<string, DomainReason[]>();
  private readonly unplacedIssues = new Map<StoreId, DomainReason[]>();
  private readonly unattributedIssues = new Map<Month | null, number>();
  public unattributedIssueCountFor(months: readonly Month[]) {
    return (this.unattributedIssues.get(null) ?? 0) + months.reduce((sum, month) => sum + (this.unattributedIssues.get(month) ?? 0), 0);
  }

  add(storeId: StoreId, month: Month, record: T) {
    const key = storeMonthKey(storeId, month);
    const items = this.records.get(key) ?? [];
    items.push(record);
    this.records.set(key, items);
  }
  issue(storeIds: readonly StoreId[], month: Month | null, reason: DomainReason) {
    if (storeIds.length === 0) this.unattributedIssues.set(month, (this.unattributedIssues.get(month) ?? 0) + 1);
    for (const storeId of storeIds) {
      const key = month === null ? storeId : storeMonthKey(storeId, month);
      const index = month === null ? this.unplacedIssues : this.issues;
      const reasons = index.get(key) ?? [];
      reasons.push(reason);
      index.set(key, reasons);
    }
  }
  read(storeId: StoreId, months: readonly Month[], covered: boolean): DomainSource<T> {
    const items = months.flatMap((month) => this.records.get(storeMonthKey(storeId, month)) ?? []);
    const reason = mostSpecificReason([
      covered ? undefined : "SOURCE_INCOMPLETE",
      ...(this.unplacedIssues.get(storeId) ?? []),
      ...months.flatMap((month) => this.issues.get(storeMonthKey(storeId, month)) ?? []),
    ]);
    return { items, availability: reason === "ACHIEVED" ? items.length ? "AVAILABLE" : "CONFIRMED_EMPTY" : "INCOMPLETE",
      ...(reason === "ACHIEVED" ? {} : { reason }) };
  }
}
