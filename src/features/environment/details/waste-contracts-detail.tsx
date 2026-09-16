import { Card, CardContent } from "@/components/ui/card";
import type { EnvironmentWasteContract } from "@/data/contracts/environment";
import { displayEnvironmentValue } from "../environment-view-model";
import { DetailField } from "./detail-field";

function ContractCategory({ title, contracts }: { title: string; contracts: readonly EnvironmentWasteContract[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">当前暂无合同记录</p>
      ) : contracts.map((contract, index) => (
        <Card key={index} className="min-w-0 py-4 shadow-none">
          <CardContent className="px-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="供应商名称">{displayEnvironmentValue(contract.supplierName)}</DetailField>
              <DetailField label="种类">{displayEnvironmentValue(contract.wasteType)}</DetailField>
              <DetailField label="有效期起">{displayEnvironmentValue(contract.validFrom)}</DetailField>
              <DetailField label="有效期止">{displayEnvironmentValue(contract.validTo)}</DetailField>
            </dl>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function WasteContractsDetail({ hazardousWaste, generalIndustrialSolidWaste }: {
  hazardousWaste: readonly EnvironmentWasteContract[];
  generalIndustrialSolidWaste: readonly EnvironmentWasteContract[];
}) {
  return (
    <div className="space-y-6">
      <ContractCategory title="危险废物处置合同" contracts={hazardousWaste} />
      <ContractCategory title="一般工业固体废物处置合同" contracts={generalIndustrialSolidWaste} />
    </div>
  );
}
