"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EnvironmentDetail } from "./environment-view-model";
import { EmergencyPlanDetail } from "./details/emergency-plan-detail";
import { EnvironmentalLicensesDetail } from "./details/environmental-licenses-detail";
import { FacilityInformationDetail } from "./details/facility-information-detail";
import { MonitoringDetail } from "./details/monitoring-detail";
import { WasteContractsDetail } from "./details/waste-contracts-detail";

export function EnvironmentDetailContent({ detail }: { detail: EnvironmentDetail }) {
  switch (detail.kind) {
    case "facility":
      return <FacilityInformationDetail facilityInformation={detail.data} />;
    case "environmentalLicenses":
      return <EnvironmentalLicensesDetail {...detail.data} />;
    case "emergencyPlan":
      return <EmergencyPlanDetail emergencyPlan={detail.data} />;
    case "monitoring":
      return <MonitoringDetail monitoring={detail.data} />;
    case "wasteContracts":
      return <WasteContractsDetail {...detail.data} />;
  }
}

export function EnvironmentDetailSheet({
  detail,
  onOpenChange,
}: {
  detail: EnvironmentDetail | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={detail !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl!">
        <SheetHeader>
          <SheetTitle>{detail?.storeDisplayName ?? "环境详情"}</SheetTitle>
          <SheetDescription>{detail?.label ?? ""}</SheetDescription>
        </SheetHeader>
        {detail ? (
          <div className="min-w-0 px-4 pb-4">
            <EnvironmentDetailContent detail={detail} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
