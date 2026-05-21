import Link from "next/link";
import { reviewProductAction } from "@/app/reviews/actions";
import { formatDate } from "@/lib/utils";
import type { ReviewListItem, ReviewSummary } from "@/services/reviewService";

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span aria-label={`${rating} de 5`} className="text-amber-500">
      {"★".repeat(rounded)}
      <span className="text-slate-300">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}

const REVIEW_MESSAGES: Record<string, { text: string; tone: "ok" | "error" }> = {
  ok: { text: "¡Gracias! Tu reseña se publicó.", tone: "ok" },
  rejected: {
    text: "Tu reseña no pasó la moderación (lenguaje, enlaces o spam). Editala y reintentá.",
    tone: "error",
  },
  "too-new": { text: "Tu cuenta es muy nueva para reseñar todavía.", tone: "error" },
  invalid: { text: "Revisá la puntuación y el texto de la reseña.", tone: "error" },
  "not-found": { text: "No encontramos el producto para reseñar.", tone: "error" },
  unavailable: { text: "No pudimos guardar la reseña ahora. Reintentá.", tone: "error" },
  error: { text: "Ocurrió un error al guardar la reseña.", tone: "error" },
};

export function ProductReviews({
  summary,
  reviews,
  slug,
  returnTo,
  isLoggedIn,
  reviewStatus,
}: {
  summary: ReviewSummary;
  reviews: ReviewListItem[];
  slug: string;
  returnTo: string;
  isLoggedIn: boolean;
  reviewStatus?: string;
}) {
  const message = reviewStatus ? REVIEW_MESSAGES[reviewStatus] : undefined;

  return (
    <section id="resenas" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Reseñas de la comunidad</h2>
          {summary.count > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Stars rating={summary.average} />
              <span className="font-semibold text-slate-900">{summary.average}</span>
              <span>· {summary.count} reseña{summary.count === 1 ? "" : "s"}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Todavía no hay reseñas.</p>
          )}
        </div>
      </div>

      {message ? (
        <p
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            message.tone === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {isLoggedIn ? (
        <form
          action={reviewProductAction}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-semibold text-slate-700" htmlFor="rating">
              Tu puntuación
            </label>
            <select
              id="rating"
              name="rating"
              defaultValue="5"
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="5">★★★★★ Excelente</option>
              <option value="4">★★★★ Muy bueno</option>
              <option value="3">★★★ Normal</option>
              <option value="2">★★ Malo</option>
              <option value="1">★ Muy malo</option>
            </select>
          </div>
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            placeholder="Contá tu experiencia con este producto (sin enlaces ni datos de contacto)."
            className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Publicar reseña
          </button>
        </form>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Iniciá sesión para dejar una reseña
        </Link>
      )}

      {reviews.length > 0 ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-950">
                    {review.authorName}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {review.authorReputation} reseña{review.authorReputation === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
              </div>
              <div className="mt-1">
                <Stars rating={review.rating} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{review.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
