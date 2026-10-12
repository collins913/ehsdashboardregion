import { queryErrorCode } from "@/data/contracts/query-result";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access/access-service.server";

export default async function DevLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (queryErrorCode(error) === "ACCESS_DENIED") {
      redirect("/no-access");
    }
    throw error;
  }

  return children;
}
