import { DetailAccordion, DetailAccordionItem } from "@/components/shared/detail-accordion";
import { DetailField } from "@/components/shared/detail-field";
import type { EnvironmentDischargePermit, EnvironmentDrainagePermit, EnvironmentImpactAssessment } from "@/data/contracts/environment";
import { displayEnvironmentValue, displayTonnesPerYear } from "../environment-view-model";

function EnvironmentalImpactAssessmentSection({ value }: { value: EnvironmentImpactAssessment }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <DetailField label="环境影响评价">{displayEnvironmentValue(value.assessmentText)}</DetailField>
      <DetailField label="气-颗粒物">{displayTonnesPerYear(value.totalRequirements.airParticulate)}</DetailField>
      <DetailField label="气-VOCs">{displayTonnesPerYear(value.totalRequirements.airVocs)}</DetailField>
      <DetailField label="水-氨氮">{displayTonnesPerYear(value.totalRequirements.waterAmmoniaNitrogen)}</DetailField>
      <DetailField label="水-总氮">{displayTonnesPerYear(value.totalRequirements.waterTotalNitrogen)}</DetailField>
      <DetailField label="水-总磷">{displayTonnesPerYear(value.totalRequirements.waterTotalPhosphorus)}</DetailField>
      <DetailField label="水-CODcr">{displayTonnesPerYear(value.totalRequirements.waterCodCr)}</DetailField>
    </dl>
  );
}

function DischargePermitSection({ value }: { value: EnvironmentDischargePermit }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <DetailField label="排污许可">{displayEnvironmentValue(value.permitText)}</DetailField>
      <DetailField label="执行报告">{displayEnvironmentValue(value.executionReport)}</DetailField>
      <DetailField label="编号">{displayEnvironmentValue(value.permitNumber)}</DetailField>
      <DetailField label="有效期起">{displayEnvironmentValue(value.validFrom)}</DetailField>
      <DetailField label="有效期止">{displayEnvironmentValue(value.validTo)}</DetailField>
      <DetailField label="产能">{displayEnvironmentValue(value.totalRequirements.productionCapacity)}</DetailField>
      <DetailField label="涂料批复用量">{displayEnvironmentValue(value.totalRequirements.approvedCoatingUsage)}</DetailField>
      <DetailField label="备注">{displayEnvironmentValue(value.remarks)}</DetailField>
    </dl>
  );
}

function DrainagePermitSection({ value }: { value: EnvironmentDrainagePermit }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <DetailField label="洗车">{displayEnvironmentValue(value.carWash)}</DetailField>
      <DetailField label="排水许可">{displayEnvironmentValue(value.drainagePermitText)}</DetailField>
      <DetailField label="有效期起">{displayEnvironmentValue(value.validFrom)}</DetailField>
      <DetailField label="有效期止">{displayEnvironmentValue(value.validTo)}</DetailField>
      <DetailField label="备注">{displayEnvironmentValue(value.remarks)}</DetailField>
    </dl>
  );
}

export function EnvironmentalLicensesDetail({ environmentalImpactAssessment, dischargePermit, drainagePermit }: {
  environmentalImpactAssessment: EnvironmentImpactAssessment;
  dischargePermit: EnvironmentDischargePermit;
  drainagePermit: EnvironmentDrainagePermit;
}) {
  return (
    <DetailAccordion>
      <DetailAccordionItem value="environmental-impact-assessment" title="环境影响评价">
        <EnvironmentalImpactAssessmentSection value={environmentalImpactAssessment} />
      </DetailAccordionItem>
      <DetailAccordionItem value="discharge-permit" title="排污许可">
        <DischargePermitSection value={dischargePermit} />
      </DetailAccordionItem>
      <DetailAccordionItem value="drainage-permit" title="排水许可">
        <DrainagePermitSection value={drainagePermit} />
      </DetailAccordionItem>
    </DetailAccordion>
  );
}
