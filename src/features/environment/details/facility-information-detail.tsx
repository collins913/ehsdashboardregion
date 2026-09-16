import type { EnvironmentFacilityInformation } from "@/data/contracts/environment";

export function FacilityInformationDetail({ facilityInformation: _facilityInformation }: { facilityInformation: EnvironmentFacilityInformation }) {
  return (
    <section aria-labelledby="facility-information-heading" className="space-y-3">
      <h3 id="facility-information-heading" className="text-lg font-semibold">设施信息</h3>
      <p className="text-sm text-muted-foreground">详情字段待定义</p>
    </section>
  );
}
