import { formatCurrencyARS } from "@/lib/utils";
import type { ProductDetail } from "@/services/productService";

const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const ALERT_EMAIL_SUBJECT = "Tu alerta de PrecioRadar se cumplio";

export type SendAlertEmailInput = {
  alertId: string;
  conditionLabel: string;
  comparisonUrl: string;
  product: ProductDetail;
  recipientEmail: string | null;
};

export type SendAlertEmailResult =
  | { status: "sent"; emailId?: string }
  | {
      status: "skipped";
      reason: "missing_api_key" | "missing_from_email" | "missing_recipient";
    }
  | { status: "failed"; error: string };

function getEnvValue(key: string) {
  const value = process.env[key]?.trim();
  return value ? value : null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResendEmailId(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "id" in payload &&
    typeof payload.id === "string"
  ) {
    return payload.id;
  }

  return undefined;
}

function createEmailHtml({
  comparisonUrl,
  conditionLabel,
  product,
}: Omit<SendAlertEmailInput, "alertId" | "recipientEmail">) {
  const offer = product.bestOffer;
  const productName = escapeHtml(product.name);
  const storeName = escapeHtml(offer.storeName);
  const currentPrice = escapeHtml(formatCurrencyARS(offer.price));
  const condition = escapeHtml(conditionLabel);
  const offerUrl = escapeHtml(offer.productUrl);
  const safeComparisonUrl = escapeHtml(comparisonUrl);

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 16px;">Tu alerta de PrecioRadar se cumpli&oacute;</h1>
      <p style="margin: 0 0 12px;">Encontramos una oferta que cumple la condici&oacute;n que configuraste.</p>
      <table style="border-collapse: collapse; margin: 16px 0; width: 100%; max-width: 560px;">
        <tr>
          <td style="padding: 8px 0; color: #475569;">Producto</td>
          <td style="padding: 8px 0; font-weight: 700;">${productName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">Tienda/oferta</td>
          <td style="padding: 8px 0;">${storeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">Precio actual</td>
          <td style="padding: 8px 0; font-weight: 700;">${currentPrice}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">Condici&oacute;n cumplida</td>
          <td style="padding: 8px 0;">${condition}</td>
        </tr>
      </table>
      <p style="margin: 20px 0;">
        <a href="${offerUrl}" style="background: #0f172a; border-radius: 8px; color: #ffffff; display: inline-block; font-weight: 700; padding: 12px 16px; text-decoration: none;">Ver oferta</a>
      </p>
      <p style="margin: 0 0 16px;">
        <a href="${safeComparisonUrl}" style="color: #047857; font-weight: 700;">Ver comparaci&oacute;n</a>
      </p>
      <p style="color: #64748b; font-size: 13px; margin: 20px 0 0;">Los precios pueden cambiar sin previo aviso.</p>
    </div>
  `;
}

function createEmailText({
  comparisonUrl,
  conditionLabel,
  product,
}: Omit<SendAlertEmailInput, "alertId" | "recipientEmail">) {
  const offer = product.bestOffer;

  return [
    "Tu alerta de PrecioRadar se cumplio",
    "",
    `Producto: ${product.name}`,
    `Tienda/oferta: ${offer.storeName}`,
    `Precio actual: ${formatCurrencyARS(offer.price)}`,
    `Condicion cumplida: ${conditionLabel}`,
    "",
    `Ver oferta: ${offer.productUrl}`,
    `Ver comparacion: ${comparisonUrl}`,
    "",
    "Los precios pueden cambiar sin previo aviso.",
  ].join("\n");
}

export async function sendAlertFulfilledEmail({
  alertId,
  comparisonUrl,
  conditionLabel,
  product,
  recipientEmail,
}: SendAlertEmailInput): Promise<SendAlertEmailResult> {
  const apiKey = getEnvValue("RESEND_API_KEY");
  const fromEmail = getEnvValue("RESEND_FROM_EMAIL");

  if (!recipientEmail) {
    console.info("PrecioRadar alert email skipped: missing recipient email.", {
      alertId,
    });
    return { status: "skipped", reason: "missing_recipient" };
  }

  if (!apiKey) {
    console.info("PrecioRadar alert email skipped: missing RESEND_API_KEY.", {
      alertId,
      recipientEmail,
    });
    return { status: "skipped", reason: "missing_api_key" };
  }

  if (!fromEmail) {
    console.info("PrecioRadar alert email skipped: missing RESEND_FROM_EMAIL.", {
      alertId,
      recipientEmail,
    });
    return { status: "skipped", reason: "missing_from_email" };
  }

  try {
    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      body: JSON.stringify({
        from: fromEmail,
        html: createEmailHtml({ comparisonUrl, conditionLabel, product }),
        subject: ALERT_EMAIL_SUBJECT,
        text: createEmailText({ comparisonUrl, conditionLabel, product }),
        to: [recipientEmail],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `precioradar-alert-${alertId}`,
      },
      method: "POST",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        payload && typeof payload === "object" && "message" in payload
          ? String(payload.message)
          : `Resend API returned ${response.status}.`;
      console.error("PrecioRadar alert email failed.", {
        alertId,
        error: errorMessage,
        recipientEmail,
      });
      return { status: "failed", error: errorMessage };
    }

    const emailId = getResendEmailId(payload);
    console.info("PrecioRadar alert email sent.", {
      alertId,
      emailId,
      recipientEmail,
    });
    return { status: "sent", emailId };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown email sending error.";
    console.error("PrecioRadar alert email failed.", {
      alertId,
      error: errorMessage,
      recipientEmail,
    });
    return { status: "failed", error: errorMessage };
  }
}
