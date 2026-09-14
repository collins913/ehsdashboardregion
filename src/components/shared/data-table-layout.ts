export const dataTableFrameClassName =
  "overflow-hidden rounded-lg border";

export const dataTableClassName = "min-w-224";

export const dataTableColumnSizeClassNames = {
  primary: "w-[28%] min-w-48 max-w-96",
  content: "w-[22%] min-w-36 max-w-72",
  standard: "w-[14%] min-w-28 max-w-44",
  compact: "w-28 min-w-24 max-w-32",
} as const;

export const dataTableColumnContentClassNames = {
  primary: "w-full max-w-96",
  content: "w-full max-w-72",
  standard: "w-full max-w-44",
  compact: "w-full max-w-32",
} as const;

export type DataTableColumnSizeRole = keyof typeof dataTableColumnSizeClassNames;

export const stickyStoreHeaderClassName =
  "sticky left-0 z-20 border-r bg-background";

export const stickyStoreCellClassName =
  "sticky left-0 z-10 border-r bg-background";
