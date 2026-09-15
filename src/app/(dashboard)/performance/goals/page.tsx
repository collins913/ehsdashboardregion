import { GoalsPageContent } from "@/features/goals/goals-page-content";
import {
  queryTakeChargeGoals,
  queryTakeChargeRecords,
} from "@/data/server/ehs-query-actions";

export default function GoalsPage() {
  return (
    <GoalsPageContent
      queryGoals={queryTakeChargeGoals}
      queryRecords={queryTakeChargeRecords}
    />
  );
}
