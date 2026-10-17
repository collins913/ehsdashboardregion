import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterSelectOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export function FilterSelect<Value extends string>({
  value,
  options,
  onValueChange,
  disabled = false,
  ariaLabel,
  className,
}: {
  value: Value;
  options: readonly FilterSelectOption<Value>[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => {
        const selectedOption = options.find(
          (option) => option.value === nextValue,
        );

        if (selectedOption) onValueChange(selectedOption.value);
      }}
    >
      <SelectTrigger className={className ?? "w-36"} aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
