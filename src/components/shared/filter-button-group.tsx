import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

export type FilterButtonGroupOption<Value extends string = string> = {
  value: Value;
  label: string;
};

export function FilterButtonGroup<Value extends string>({
  value,
  options,
  onValueChange,
  disabled = false,
  ariaLabel,
}: {
  value: Value;
  options: readonly FilterButtonGroupOption<Value>[];
  onValueChange: (value: Value) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <ButtonGroup aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            className={
              selected
                ? "w-20 justify-center bg-muted text-foreground"
                : "w-20 justify-center"
            }
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
