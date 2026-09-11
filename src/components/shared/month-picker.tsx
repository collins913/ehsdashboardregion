"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { Month } from "@/types/ehs";

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

type MonthPickerProps = {
  value: Month | null;
  onValueChange: (value: Month) => void;
  "aria-label": string;
  placeholder?: string;
};

function currentShanghaiYear(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).format(new Date()),
  );
}

function yearFromMonth(value: Month | null): number | null {
  const match = value === null ? null : MONTH_PATTERN.exec(value);
  return match === null ? null : Number(match[1]);
}

function monthNumber(value: Month | null): number | null {
  const match = value === null ? null : MONTH_PATTERN.exec(value);
  return match === null ? null : Number(match[2]);
}

function formatMonth(value: Month | null): string | null {
  const match = value === null ? null : MONTH_PATTERN.exec(value);
  return match === null ? null : `${match[1]}年${match[2]}月`;
}

function yearOptions(centerYear: number): number[] {
  return Array.from({ length: 21 }, (_, index) => centerYear - 10 + index);
}

export function MonthPicker({
  value,
  onValueChange,
  "aria-label": ariaLabel,
  placeholder = "选择月份",
}: MonthPickerProps) {
  const selectedYear = yearFromMonth(value);
  const selectedMonth = monthNumber(value);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selectedYear ?? currentShanghaiYear);
  const years = useMemo(() => yearOptions(year), [year]);

  useEffect(() => {
    if (selectedYear !== null) {
      setYear(selectedYear);
    }
  }, [selectedYear]);

  function selectMonth(month: number) {
    onValueChange(
      `${year}-${String(month).padStart(2, "0")}` as Month,
    );
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          aria-label={ariaLabel}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className={value === null ? "text-muted-foreground" : undefined}>
              {formatMonth(value) ?? placeholder}
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
          <SelectTrigger className="w-full" aria-label="年份">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-3 grid grid-cols-4 gap-1" aria-label={`${year}年月选择`}>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
            const isSelected = selectedYear === year && selectedMonth === month;

            return (
              <Button
                key={month}
                type="button"
                size="sm"
                variant={isSelected ? "default" : "ghost"}
                aria-pressed={isSelected}
                onClick={() => selectMonth(month)}
              >
                {month}月
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
