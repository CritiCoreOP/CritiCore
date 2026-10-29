import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { X as CloseTwoTone, Search as SearchTwoTone } from "lucide-react";

interface PageSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const PageSearchBar = ({ value, onChange, placeholder }: PageSearchBarProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex items-center w-full group">
      <SearchTwoTone className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none transition-colors duration-200 group-focus-within:text-primary" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t("search.placeholder", "Suchen...")}
        className="w-full h-10 pl-9 pr-9 rounded-lg bg-secondary/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 focus:bg-secondary/60 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all duration-300"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <CloseTwoTone className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default PageSearchBar;
