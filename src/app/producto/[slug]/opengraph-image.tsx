import { ImageResponse } from "next/og";
import { getMockProductDetailBySlug } from "@/services/productService";
import { formatCurrencyARS } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "PrecioRadar — comparador de precios en Argentina";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const product = getMockProductDetailBySlug(slug);

  const title = product?.name ?? "PrecioRadar";
  const price = product
    ? formatCurrencyARS(product.bestOffer.price)
    : "Comparador de precios";
  const storeName = product?.bestOffer.storeName ?? "Fuente integrada";
  const offersCount = product?.offers.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          padding: "64px",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              fontSize: "36px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Precio<span style={{ color: "#10b981" }}>Radar</span>
          </div>
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "9999px",
              background: "rgba(96, 165, 250, 0.18)",
              color: "#bfdbfe",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            Argentina · ARS · Historial real
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#94a3b8",
              fontWeight: 700,
            }}
          >
            Desde
          </div>
          <div
            style={{
              fontSize: "104px",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {price}
          </div>
          <div
            style={{
              fontSize: "40px",
              fontWeight: 700,
              maxWidth: "1000px",
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px",
              color: "#cbd5f5",
              fontSize: "22px",
            }}
          >
            <span style={{ fontWeight: 700 }}>{storeName}</span>
            {offersCount > 0 ? (
              <>
                <span>·</span>
                <span>
                  {offersCount} oferta{offersCount === 1 ? "" : "s"} comparadas
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
