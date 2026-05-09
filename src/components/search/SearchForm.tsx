import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type SearchFormProps = {
  buttonClassName?: string;
  defaultValue?: string;
  helperText?: string;
  id?: string;
  inputClassName?: string;
  variant?: "hero" | "compact";
};

export function SearchForm({
  buttonClassName,
  defaultValue = "",
  helperText,
  id = "search-input",
  inputClassName,
  variant = "hero",
}: SearchFormProps) {
  const compact = variant === "compact";

  return (
    <div>
      <form
        action="/buscar"
        className="flex flex-col gap-3 sm:flex-row"
        method="get"
      >
        <label className="sr-only" htmlFor={id}>
          Buscar producto
        </label>
        <input
          id={id}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100",
            compact ? "h-12" : "h-14",
            inputClassName,
          )}
          defaultValue={defaultValue}
          name="q"
          placeholder="Samsung A55, RTX 5070, notebook Lenovo..."
          type="search"
        />
        <Button
          className={cn(compact ? "sm:min-w-28" : "sm:min-w-32", buttonClassName)}
          size={compact ? "md" : "lg"}
          type="submit"
        >
          Buscar
        </Button>
      </form>
      {helperText ? (
        <p className="px-1 pt-3 text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
