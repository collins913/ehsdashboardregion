"use client";

import { type ReactNode, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

// Both Select and searchable Popover use the adopted filter trigger presentation.
const filterTriggerClassName = "w-full min-w-0 h-8 gap-2 rounded-lg border-input bg-transparent px-2.5 py-1.5 text-sm font-normal text-foreground shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50";

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

export function GlobalFilters() {
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
    <section aria-label="全局筛选" className="border-b bg-muted/30">
      <PageContainer className="py-4 lg:py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span>全局筛选</span>
          </div>

          <div className="grid max-w-5xl min-w-0 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
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
                    <SelectItem key={area} value={area}>
                      {area}
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
                    className={`${filterTriggerClassName} justify-between hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-foreground disabled:pointer-events-auto`}
                    aria-label={storeLabel}
                    aria-expanded={storePopoverOpen}
                    role="combobox"
                  >
                    <OverflowTooltip
                      text={storeLabel}
                      className="w-0 flex-1 text-left"
                      focusable={false}
                    />
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground opacity-50" aria-hidden="true" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-(--radix-popover-trigger-width) min-w-56 p-0"
                >
                  <Command shouldFilter={false} label="搜索并选择门店">
                    <CommandInput
                      value={storeKeyword}
                      onValueChange={setStoreKeyword}
                      placeholder="搜索门店"
                    />
                    <CommandList className="overscroll-y-contain">
                      {!hasStoreKeyword ? (
                        <CommandGroup>
                          <CommandItem
                            value={ALL_VALUE}
                            onSelect={() => setStore({ kind: "ALL" })}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              全部门店
                            </span>
                            <Check
                              className={
                                state.store.kind === "ALL"
                                  ? "size-4 opacity-100"
                                  : "size-4 opacity-0"
                              }
                              aria-hidden="true"
                            />
                          </CommandItem>
                        </CommandGroup>
                      ) : null}
                      {visibleStores.length === 0 ? (
                        <CommandEmpty>未找到门店</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {visibleStores.map((store) => {
                            const isSelected =
                              selectedIds?.has(store.storeId) ?? false;

                            return (
                              <CommandItem
                                key={store.storeId}
                                value={store.storeId}
                                onSelect={() =>
                                  toggleStore(store.storeId, !isSelected)
                                }
                              >
                                <OverflowTooltip
                                  text={store.displayName}
                                  className="w-0 flex-1"
                                  focusable={false}
                                />
                                <Check
                                  className={
                                    isSelected
                                      ? "size-4 opacity-100"
                                      : "size-4 opacity-0"
                                  }
                                  aria-hidden="true"
                                />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FilterField>

            <FilterField label={globalFilterLabels.period}>
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
            </FilterField>
          </div>
        </div>

        {state.period.mode === "CUSTOM" ? (
          <div className="mt-1.5 grid max-w-xl grid-cols-1 gap-2 border-t pt-1.5 md:grid-cols-2">
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
              <p className="text-xs text-destructive md:col-span-2">
                请选择有效的月份范围，开始月份不能晚于结束月份。
              </p>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </section>
  );
}
