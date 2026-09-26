import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access/access-service.server";

export default async function DevLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_AUTHORIZED") {
      redirect("/no-access");
    }
    throw error;
  }

  return children;
}
