import { mockPersonAt } from "@/data/mock/people";
import { formatBusinessDate } from "@/lib/format-business-date-time";
import type { RawCertificateRecord, StoreMasterData } from "@/types/ehs";

const types = [
  "主要负责人安全生产培训合格证书-S", "安全生产管理人员安全生产培训合格证书-M",
  "主要负责人职业卫生培训合格证书-H1", "职业卫生管理人员职业卫生培训合格证书-H2",
  "急救员证", "熔化焊接与热切割作业", "安全驾驶内训师", "安全驾驶内驾证",
] as const;

export function createMockCertificateRecords(stores: readonly StoreMasterData[], referenceDate: Date): readonly RawCertificateRecord[] {
  const today = formatBusinessDate(referenceDate.toISOString());
  const dateAt = (days: number) => new Date(Date.parse(today + "T00:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
  const records: RawCertificateRecord[] = [];
  const categoryForType = (typeIndex: number) => typeIndex < 4 ? 0 : typeIndex === 4 ? 1 : typeIndex === 5 ? 2 : 3;
  stores.forEach((store, index) => {
    // Keep a small confirmed-empty sample while covering every other Store in both profiles.
    if (index === 11) return;
    types.forEach((type, typeIndex) => {
      const categoryIndex = categoryForType(typeIndex);
      if ((index + categoryIndex * 7) % 29 === 0) return;
      // A category shares one deterministic case so the fixture contains both achieved and failed categories.
      const caseIndex = (index * 7 + categoryIndex * 3) % 10;
      const expiryDate = caseIndex <= 6 ? dateAt(30 + (index % 180))
        : caseIndex === 7 ? today
        : caseIndex === 8 ? dateAt(-5)
        : Math.floor(index / 10) % 2 === 0 ? null : "invalid-date";
      records.push({
        TRTID: store.trtid, "English Store Name": store.storeNameEn,
        "Certificate Type": type,
        "Expiry Date": expiryDate,
        Person: mockPersonAt(index + typeIndex),
        "Person Email": `person.${index + typeIndex + 1}@example.test`,
        "Business Title": index % 2 === 0 ? "门店员工" : "门店管理人员",
      });
    });
  });
  const first = records[0];
  if (first) records.push({ ...first, "Certificate Type": "未来待定义证件", "Expiry Date": dateAt(-10) });
  return records;
}
