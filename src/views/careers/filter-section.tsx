import { Checkbox } from "@/components/ui/checkbox";

interface FilterSectionProps {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  toggle: (
    filter: string,
    list: string[],
    setList: (val: string[]) => void
  ) => void;
  setSelected: (val: string[]) => void;
}

export default function FilterSection({
  title,
  options,
  selected,
  toggle,
  setSelected,
}: FilterSectionProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value, selected, setSelected)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
