import Link from "next/link";
import { followProductAction } from "@/app/tracked-products/actions";
import { Button } from "@/components/ui/Button";
import type { TrackingOverview } from "@/services/trackedProductService";

type TrackProductButtonProps = {
  offerKey: string;
  productSlug: string;
  returnTo: string;
  trackingOverview: TrackingOverview;
  className?: string;
  fullWidth?: boolean;
};

function LoginRequiredState({
  className,
  fullWidth,
  returnTo,
}: {
  className?: string;
  returnTo: string;
  fullWidth: boolean;
}) {
  return (
    <div className={fullWidth ? "space-y-2" : "space-y-1"}>
      <Link
        className={`inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 ${className ?? ""} ${
          fullWidth ? "w-full" : ""
        }`}
        href={`/login?next=${encodeURIComponent(returnTo)}`}
      >
        Seguir esta oferta
      </Link>
    </div>
  );
}

function HiddenFields({
  offerKey,
  productSlug,
  returnTo,
}: {
  offerKey: string;
  productSlug: string;
  returnTo: string;
}) {
  return (
    <>
      <input name="slug" type="hidden" value={productSlug} />
      <input name="offerKey" type="hidden" value={offerKey} />
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}

export function TrackProductButton({
  className,
  offerKey,
  fullWidth = false,
  productSlug,
  returnTo,
  trackingOverview,
}: TrackProductButtonProps) {
  const isTracked =
    trackingOverview.status === "ready" &&
    trackingOverview.trackedOfferKeys.has(offerKey);
  const hasReachedLimit =
    trackingOverview.status === "ready" &&
    trackingOverview.trackedCount >= trackingOverview.limit;
  const buttonWidth = fullWidth ? "w-full" : "";

  if (trackingOverview.status === "anonymous") {
    return (
      <LoginRequiredState
        className={className}
        fullWidth={fullWidth}
        returnTo={returnTo}
      />
    );
  }

  if (trackingOverview.status === "unavailable") {
    return (
      <div className={fullWidth ? "space-y-2" : "space-y-1"}>
        <Button className={buttonWidth} disabled size="md" variant="secondary">
          Oferta no disponible
        </Button>
        <p className="max-w-xs text-xs font-medium leading-5 text-slate-500">
          {trackingOverview.reason}
        </p>
      </div>
    );
  }

  if (isTracked) {
    return (
      <div className={fullWidth ? "space-y-2" : "flex flex-wrap items-center gap-2"}>
        <span
          className={`inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 font-semibold text-emerald-700 ${
            fullWidth ? "w-full px-2 text-xs" : "px-4 text-sm"
          }`}
        >
          Ya seguís esta oferta
        </span>
      </div>
    );
  }

  if (hasReachedLimit) {
    return (
      <div className={fullWidth ? "space-y-2" : "space-y-1"}>
        <Button className={buttonWidth} disabled size="md" variant="secondary">
          Limite alcanzado
        </Button>
        <p className="text-xs font-medium text-slate-500">
          Gratis permite hasta {trackingOverview.limit} ofertas seguidas.
        </p>
      </div>
    );
  }

  return (
    <form action={followProductAction}>
      <HiddenFields
        offerKey={offerKey}
        productSlug={productSlug}
        returnTo={returnTo}
      />
      <Button className={`${buttonWidth} ${className ?? ""}`} size="md" type="submit">
        Seguir esta oferta
      </Button>
    </form>
  );
}
