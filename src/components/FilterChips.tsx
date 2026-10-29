interface FilterChip {
  value: string;
  label: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  active: string;
  onChange: (value: string) => void;
}

const FilterChips = ({ filters, active, onChange }: FilterChipsProps) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-250 ${
            active === f.value
              ? "bg-primary text-primary-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-transparent hover:border-border/40"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};

export default FilterChips;
