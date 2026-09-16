import type { EnvironmentEmergencyPlan } from "@/data/contracts/environment";
import { displayEnvironmentValue } from "../environment-view-model";
import { DetailField } from "./detail-field";

export function EmergencyPlanDetail({ emergencyPlan }: { emergencyPlan: EnvironmentEmergencyPlan }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <DetailField label="突发环境事件应急预案备案情况">{displayEnvironmentValue(emergencyPlan.filingStatus)}</DetailField>
      <DetailField label="备案编号">{displayEnvironmentValue(emergencyPlan.filingNumber)}</DetailField>
      <DetailField label="有效期起">{displayEnvironmentValue(emergencyPlan.validFrom)}</DetailField>
      <DetailField label="有效期止">{displayEnvironmentValue(emergencyPlan.validTo)}</DetailField>
      <DetailField label="备注">{displayEnvironmentValue(emergencyPlan.remarks)}</DetailField>
    </dl>
  );
}
