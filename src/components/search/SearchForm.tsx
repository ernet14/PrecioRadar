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
        <div className="relative flex-1">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id={id}
            className={cn(
              "w-full min-w-0 rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100",
              compact ? "h-12" : "h-14",
              inputClassName,
            )}
            defaultValue={defaultValue}
            name="q"
            placeholder="Samsung A55, RTX 5070, notebook Lenovo..."
            type="search"
          />
        </div>
        <Button
          className={cn(compact ? "sm:min-w-28" : "sm:min-w-32 sm:h-14", buttonClassName)}
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
