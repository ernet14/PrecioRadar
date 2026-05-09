import type { DateLike } from "@/types";

const arsFormatter = new Intl.NumberFormat("es-AR", {
  currency: "ARS",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCurrencyARS(value: number) {
  return arsFormatter.format(value);
}

export function formatDate(date: DateLike) {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return dateFormatter.format(parsedDate);
}
