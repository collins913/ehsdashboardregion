import {
  Select,
  SelectContent,
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
}: {
  value: Value;
  options: readonly FilterSelectOption<Value>[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  ariaLabel: string;
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
      <SelectTrigger className="w-24" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
