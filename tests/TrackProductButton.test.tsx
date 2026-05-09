import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { TrackProductButton } from "../src/components/product/TrackProductButton";
import type { TrackingOverview } from "../src/services/trackedProductService";

function createOverview({
  trackedCount,
  trackedOfferKeys,
  trackedSlugs = [],
}: {
  trackedCount: number;
  trackedOfferKeys: string[];
  trackedSlugs?: string[];
}): TrackingOverview {
  return {
    status: "ready",
    limit: 2,
    trackedCount,
    trackedSlugs: new Set(trackedSlugs),
    trackedOfferKeys: new Set(trackedOfferKeys),
  };
}

function collectText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return collectText(node.props.children);
  }

  return "";
}

function renderButtonText(offerKey: string, trackingOverview: TrackingOverview) {
  return collectText(
    TrackProductButton({
      offerKey,
      productSlug: "samsung-galaxy-a55",
      returnTo: "/buscar?q=a55",
      trackingOverview,
    }),
  );
}

test("marks only the followed offer as tracked", () => {
  const overview = createOverview({
    trackedCount: 1,
    trackedOfferKeys: ["mercadolibre:MLA-A55"],
  });

  assert.match(
    renderButtonText("mercadolibre:MLA-A55", overview),
    /Ya segu.s esta oferta/,
  );
  assert.match(
    renderButtonText("musimundo:MUSI-A55", overview),
    /Seguir esta oferta/,
  );
});

test("does not use legacy product tracking to mark every offer as tracked", () => {
  const overview = createOverview({
    trackedCount: 0,
    trackedOfferKeys: [],
    trackedSlugs: ["samsung-galaxy-a55"],
  });

  const offerText = renderButtonText("musimundo:MUSI-A55", overview);

  assert.match(offerText, /Seguir esta oferta/);
  assert.doesNotMatch(offerText, /Producto seguido/);
});

test("keeps the free offer tracking limit enforced", () => {
  const overview = createOverview({
    trackedCount: 2,
    trackedOfferKeys: ["mercadolibre:MLA-A55", "fravega:FRA-A55"],
  });

  assert.match(renderButtonText("musimundo:MUSI-A55", overview), /Limite alcanzado/);
});
