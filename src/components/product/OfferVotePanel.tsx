import Link from "next/link";
import { voteProductAction } from "@/app/votes/actions";
import type { VoteSummary } from "@/services/voteService";

function percent(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function VoteButton({
  slug,
  returnTo,
  value,
  active,
  label,
  emoji,
  activeClass,
}: {
  slug: string;
  returnTo: string;
  value: 1 | -1;
  active: boolean;
  label: string;
  emoji: string;
  activeClass: string;
}) {
  return (
    <form action={voteProductAction} className="flex-1">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="value" value={value} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        aria-pressed={active}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
          active
            ? activeClass
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span aria-hidden>{emoji}</span>
        {label}
      </button>
    </form>
  );
}

export function OfferVotePanel({
  summary,
  slug,
  returnTo,
  isLoggedIn,
}: {
  summary: VoteSummary;
  slug: string;
  returnTo: string;
  isLoggedIn: boolean;
}) {
  const realPercent = percent(summary.real, summary.total);

  return (
    <div id="votos" className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-950">
        ¿Esta oferta es real?
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Sumá tu voto a la comunidad. Complementa el análisis automático de precio.
      </p>

      {summary.total > 0 ? (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="bg-emerald-500" style={{ width: `${realPercent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {realPercent}% la votó como real · {summary.total} voto
            {summary.total === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">Todavía no hay votos. Sé el primero.</p>
      )}

      {isLoggedIn ? (
        <div className="mt-3 flex gap-2">
          <VoteButton
            slug={slug}
            returnTo={returnTo}
            value={1}
            active={summary.myVote === 1}
            emoji="👍"
            label={`Es real (${summary.real})`}
            activeClass="border-emerald-300 bg-emerald-50 text-emerald-800"
          />
          <VoteButton
            slug={slug}
            returnTo={returnTo}
            value={-1}
            active={summary.myVote === -1}
            emoji="👎"
            label={`No es real (${summary.fake})`}
            activeClass="border-red-300 bg-red-50 text-red-800"
          />
        </div>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Iniciá sesión para votar
        </Link>
      )}
    </div>
  );
}
