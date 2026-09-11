import { SlidersHorizontal } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { globalFilters } from "@/config/global-filters";

export function GlobalFiltersPlaceholder() {
  return (
    <section aria-label="全局筛选" className="border-b bg-muted/30">
      <PageContainer className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span>全局筛选</span>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {globalFilters.map((filter) => (
            <Button
              key={filter.key}
              variant="outline"
              disabled
              className="justify-between bg-background"
            >
              <span>{filter.label}</span>
              <span className="text-muted-foreground">待定</span>
            </Button>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
