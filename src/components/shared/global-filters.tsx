"use client";

import { type ReactNode, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/components/shared/month-picker";
import { OverflowTooltip } from "@/components/shared/overflow-tooltip";
import { PageContainer } from "@/components/shared/page-container";
import { globalFilterLabels } from "@/config/global-filters";
import type { FilterScope, KpiStore } from "@/data/contracts/kpi";
import { useGlobalFilters } from "@/features/global-filters/global-filter-provider";
import type { StoreId } from "@/types/ehs";

const ALL_VALUE = "__ALL__";

// Width belongs to the filter layout; each primitive owns its visual presentation.
const filterTriggerClassName = "w-full min-w-0";

const periodLabels = {
  THIS_YEAR: "本年",
  THIS_QUARTER: "本季度",
  THIS_MONTH: "本月",
  CUSTOM: "自定义",
} as const;

function singleScope(value: string): FilterScope<string> {
  return value === ALL_VALUE
    ? { kind: "ALL" }
    : { kind: "INCLUDE", values: [value] };
}

function singleScopeValue(scope: FilterScope<string>): string {
  return scope.kind === "ALL" ? ALL_VALUE : scope.values[0];
}

function selectedStoreLabel(
  scope: FilterScope<StoreId>,
  stores: readonly KpiStore[],
): string {
  if (scope.kind === "ALL") {
    return "全部门店";
  }

  if (scope.values.length === 1) {
    return (
      stores.find((store) => store.storeId === scope.values[0])?.displayName ??
      "1 个门店"
    );
  }

  return `${scope.values.length} 个门店`;
}

export function filterStoresByDisplayName(
  stores: readonly KpiStore[],
  keyword: string,
): readonly KpiStore[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase("zh-CN");

  return normalizedKeyword.length === 0
    ? stores
    : stores.filter((store) =>
        store.displayName
          .toLocaleLowerCase("zh-CN")
          .includes(normalizedKeyword),
      );
}

type FilterFieldProps = {
  label: string;
  children: ReactNode;
};

function FilterField({ label, children }: FilterFieldProps) {
  return (
    <div className="min-w-0 space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

export function GlobalFilters({ showPeriodFilter = true }: { showPeriodFilter?: boolean }) {
  const filterGridClassName = `grid max-w-5xl min-w-0 grid-cols-1 gap-2 md:grid-cols-2 ${showPeriodFilter ? "lg:grid-cols-4" : "lg:grid-cols-3"}`;
  const [storePopoverOpen, setStorePopoverOpen] = useState(false);
  const [storeKeyword, setStoreKeyword] = useState("");
  const {
    state,
    readiness,
    options,
    setRegion,
    setArea,
    setStore,
    setPeriodMode,
    setCustomStartMonth,
    setCustomEndMonth,
  } = useGlobalFilters();
  const selectedIds =
    state.store.kind === "INCLUDE" ? new Set(state.store.values) : null;
  const storeLabel = selectedStoreLabel(state.store, options.stores);
  const visibleStores = filterStoresByDisplayName(
    options.stores,
    storeKeyword,
  );
  const hasStoreKeyword = storeKeyword.trim().length > 0;

  function toggleStore(storeId: StoreId, checked: boolean) {
    const nextIds = new Set(selectedIds ?? []);

    if (checked) {
      nextIds.add(storeId);
    } else {
      nextIds.delete(storeId);
    }

    const values = options.stores
      .map((store) => store.storeId)
      .filter((id) => nextIds.has(id));

    setStore(
      values.length === 0
        ? { kind: "ALL" }
        : {
            kind: "INCLUDE",
            values: values as [StoreId, ...StoreId[]],
          },
    );
  }

  return (
    <section aria-label="全局筛选">
      <PageContainer className="pt-3 pb-0 lg:pt-3 lg:pb-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>全局筛选</span>
          </div>

          <div className={filterGridClassName}>
            <FilterField label={globalFilterLabels.region}>
              <Select
                value={singleScopeValue(state.region)}
                onValueChange={(value) => setRegion(singleScope(value))}
              >
                <SelectTrigger className={filterTriggerClassName} aria-label="区域">
                  <SelectValue className="min-w-0 flex-1 truncate text-left" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>全部区域</SelectItem>
                  {options.regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label={globalFilterLabels.area}>
              <Select
                value={singleScopeValue(state.area)}
                onValueChange={(value) => setArea(singleScope(value))}
              >
                <SelectTrigger className={filterTriggerClassName} aria-label="小区">
                  <SelectValue className="min-w-0 flex-1 truncate text-left" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>全部小区</SelectItem>
                  {options.areas.map((area) => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label={globalFilterLabels.store}>
              <Popover
                open={storePopoverOpen}
                onOpenChange={(open) => {
                  setStorePopoverOpen(open);
                  if (!open) setStoreKeyword("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`${filterTriggerClassName} justify-between font-normal`}
                    aria-label={storeLabel}
                    aria-expanded={storePopoverOpen}
                  >
                    <OverflowTooltip
                      text={storeLabel}
                      className="w-0 flex-1 text-left"
                      focusable={false}
                    />
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  aria-label="选择门店"
                  className="w-(--radix-popover-trigger-width) min-w-56"
                >
                  <InputGroup>
                    <InputGroupInput
                      aria-label="搜索门店"
                      value={storeKeyword}
                      onChange={(event) => setStoreKeyword(event.target.value)}
                      placeholder="搜索门店"
                    />
                    <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                  </InputGroup>
                  <div role="group" aria-label="门店选项" className="max-h-72 space-y-3 overflow-y-auto overscroll-y-contain p-1">
                    {!hasStoreKeyword ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={state.store.kind === "ALL"}
                        onClick={() => setStore({ kind: "ALL" })}
                        className="w-full justify-start"
                      >
                        <Check aria-hidden="true" className={state.store.kind === "ALL" ? "opacity-100" : "opacity-0"} />
                        全部门店
                      </Button>
                    ) : null}
                    {visibleStores.length === 0 ? (
                      <p className="py-6 text-center text-sm">未找到门店</p>
                    ) : visibleStores.map((store) => (
                      <label key={store.storeId} className="flex items-center gap-3 text-sm">
                        <Checkbox
                          checked={selectedIds?.has(store.storeId) ?? false}
                          onCheckedChange={(checked) => toggleStore(store.storeId, checked === true)}
                        />
                        <OverflowTooltip
                          text={store.displayName}
                          className="w-0 flex-1"
                          focusable={false}
                        />
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </FilterField>

            {showPeriodFilter ? <FilterField label={globalFilterLabels.period}>
              <Select
                value={state.period.mode}
                onValueChange={(value) =>
                  setPeriodMode(value as keyof typeof periodLabels)
                }
              >
                <SelectTrigger className={filterTriggerClassName} aria-label="周期">
                  <SelectValue className="min-w-0 flex-1 truncate text-left" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField> : null}
          </div>
        </div>

        {showPeriodFilter && state.period.mode === "CUSTOM" ? (
          <div className={`${filterGridClassName} mt-1.5 pt-1.5`}>
            <FilterField label="开始月份">
              <MonthPicker
                aria-label="开始月份"
                value={state.period.startMonth}
                onValueChange={setCustomStartMonth}
              />
            </FilterField>
            <FilterField label="结束月份">
              <MonthPicker
                aria-label="结束月份"
                value={state.period.endMonth}
                onValueChange={setCustomEndMonth}
              />
            </FilterField>
            {readiness === "INVALID_PERIOD" ? (
              <p className="col-span-full text-xs text-destructive">
                请选择有效的月份范围，开始月份不能晚于结束月份。
              </p>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </section>
  );
}
