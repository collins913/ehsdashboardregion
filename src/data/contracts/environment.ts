import type { DataSet, EhsStoreScope } from "@/data/contracts/kpi";
import type { EnvironmentSourceValue, IsoDate, StoreId } from "@/types/ehs";

export type EnvironmentFacilityInformation = null;

export interface EnvironmentImpactAssessment {
  assessmentText: string | null;
  totalRequirements: {
    airParticulate: number | null;
    airVocs: number | null;
    waterAmmoniaNitrogen: number | null;
    waterTotalNitrogen: number | null;
    waterTotalPhosphorus: number | null;
    waterCodCr: number | null;
  };
}

export interface EnvironmentDischargePermit {
  permitText: string | null;
  executionReport: string | null;
  permitNumber: string | null;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
  totalRequirements: {
    productionCapacity: string | number | null;
    approvedCoatingUsage: string | number | null;
  };
  remarks: string | null;
}

export interface EnvironmentDrainagePermit {
  carWash: string | null;
  drainagePermitText: string | null;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
  remarks: string | null;
}

export interface EnvironmentEmergencyPlan {
  filingStatus: string | null;
  filingNumber: string | null;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
  remarks: string | null;
}

export interface EnvironmentMonitoring {
  monitoringText: EnvironmentSourceValue;
}

export interface EnvironmentWasteContract {
  supplierName: string;
  wasteType: string;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
}

export interface NormalizedEnvironmentRecord {
  storeId: StoreId;
  storeDisplayName: string;
  facilityInformation: EnvironmentFacilityInformation;
  environmentalLicenses: {
    environmentalImpactAssessment: EnvironmentImpactAssessment;
    dischargePermit: EnvironmentDischargePermit;
    drainagePermit: EnvironmentDrainagePermit;
  };
  emergencyPlan: EnvironmentEmergencyPlan;
  monitoring: EnvironmentMonitoring;
  wasteContracts: {
    hazardousWaste: readonly EnvironmentWasteContract[];
    generalIndustrialSolidWaste: readonly EnvironmentWasteContract[];
  };
}

export interface EnvironmentQuery {
  context: EhsStoreScope;
}

export type EnvironmentQueryResult = DataSet<NormalizedEnvironmentRecord>;
