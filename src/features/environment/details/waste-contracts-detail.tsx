import { DetailField, DetailFields } from "@/components/shared/detail-field";
import { DetailRecordCard } from "@/components/shared/detail-record-card";
import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion";
import type { EnvironmentWasteContractGroup } from "../environment-view-model";
import { displayEnvironmentValue } from "../environment-view-model";

export function WasteContractsDetail({ groups, defaultOpenValues }: {
  groups: readonly EnvironmentWasteContractGroup[];
  defaultOpenValues: string[];
}) {
  return (
    <DetailAccordion defaultValue={defaultOpenValues}>
      {groups.map((group) => (
        <DetailAccordionItem
          key={group.value}
          value={group.value}
          title={group.label}
          count={group.count}
          disabled={group.disabled}
          contentClassName="space-y-3"
        >
          {group.records.length === 0 ? (
            <p className="text-sm text-muted-foreground">当前暂无合同记录</p>
          ) : group.records.map((contract, index) => (
            <DetailRecordCard key={`${contract.supplierName}-${contract.wasteType}-${index}`}>
              <DetailFields className="sm:grid-cols-2">
                <DetailField label="供应商名称">{displayEnvironmentValue(contract.supplierName)}</DetailField>
                <DetailField label="种类">{displayEnvironmentValue(contract.wasteType)}</DetailField>
                <DetailField label="有效期起">{displayEnvironmentValue(contract.validFrom)}</DetailField>
                <DetailField label="有效期止">{displayEnvironmentValue(contract.validTo)}</DetailField>
              </DetailFields>
            </DetailRecordCard>
          ))}
        </DetailAccordionItem>
      ))}
    </DetailAccordion>
  );
}
