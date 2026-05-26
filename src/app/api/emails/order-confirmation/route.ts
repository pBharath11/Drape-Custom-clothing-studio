import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { Order } from "@/types/order";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { order }: { order: Order } = await req.json();
    if (!order.customerEmail) {
      return NextResponse.json({ error: "No customer email" }, { status: 400 });
    }

    // In dev/test, EMAIL_TO_OVERRIDE routes all emails to a single inbox
    // (Resend requires a verified domain to send to arbitrary addresses)
    const recipient = process.env.EMAIL_TO_OVERRIDE ?? order.customerEmail;

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Drape <onboarding@resend.dev>",
      to: [recipient],
      subject: `Order confirmed — £${(order.total / 100).toFixed(2)}`,
      html: buildOrderEmail(order),
    });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function formatPence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

const DESIGN_LABELS: Record<string, string> = {
  none: "Plain",
  "two-tone": "Two-tone",
  "horizontal-stripes": "Horizontal stripes",
  "vertical-stripes": "Vertical stripes",
  grid: "Grid",
  dots: "Dots",
};

function buildOrderEmail(order: Order): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const logoHtml = appUrl
    ? `<img src="${appUrl}/images/drape-logo.png" alt="Drape" height="64" style="display:block;height:64px;width:auto;" />`
    : `<p style="margin:0;font-size:22px;font-weight:300;color:#ffffff;letter-spacing:0.06em;">Drape</p>`;

  const logoFooterHtml = appUrl
    ? `<img src="${appUrl}/images/drape-logo.png" alt="Drape" height="48" style="display:block;height:48px;width:auto;margin-bottom:10px;filter:invert(1);" />`
    : `<p style="margin:0 0 8px;font-size:16px;font-weight:300;color:#555;letter-spacing:0.06em;">Drape</p>`;

  const orderId = order.paymentIntentId
    ? order.paymentIntentId.slice(-8).toUpperCase()
    : order.id.slice(-8).toUpperCase();

  const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const itemsHtml = order.items
    .map((item) => {
      const m = item.measurements;
      const unit = m.unit;
      return `
      <tr>
        <td colspan="2" style="padding: 16px 0 8px; border-top: 1px solid #f0f0f0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${item.colorHex}; border: 1px solid #e5e5e5; flex-shrink: 0;"></span>
                  <strong style="font-size: 14px; color: #111;">${item.clothingLabel}</strong>
                </div>
                <p style="margin: 0 0 4px; font-size: 13px; color: #666;">
                  Design: ${DESIGN_LABELS[item.designId] ?? item.designId}
                  &nbsp;·&nbsp;Qty: ${item.quantity}
                </p>
                <p style="margin: 0; font-size: 12px; color: #999;">
                  Measurements (${unit}): Chest ${m.chest} · Waist ${m.waist} · Hips ${m.hips} · Length ${m.length} · Shoulder ${m.shoulder}
                </p>
              </td>
              <td style="text-align: right; vertical-align: top; font-size: 14px; color: #111; white-space: nowrap; padding-left: 16px;">
                ${formatPence(item.unitPrice * item.quantity)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  const { address: a } = order;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background: #f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f6f6f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: #09090b; padding: 28px 40px;">
              ${logoHtml}
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <h1 style="margin: 0 0 6px; font-size: 28px; font-weight: 300; color: #111;">
                Order confirmed ✓
              </h1>
              <p style="margin: 0; font-size: 14px; color: #666;">
                Hi ${order.customerName ?? "there"}, thanks for your order. We'll be in touch as it moves to production.
              </p>
            </td>
          </tr>

          <!-- Order meta -->
          <tr>
            <td style="padding: 16px 40px 0;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Order ref: <strong style="color: #555;">#${orderId}</strong>
                &nbsp;·&nbsp;
                ${date}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 24px 40px 0;"><div style="height: 1px; background: #f0f0f0;"></div></td></tr>

          <!-- Items -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td colspan="2" style="padding: 20px 0 4px;">
                    <p style="margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #999;">Items ordered</p>
                  </td>
                </tr>
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 20px 40px 0;"><div style="height: 1px; background: #f0f0f0;"></div></td></tr>

          <!-- Delivery address -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #999;">Delivery address</p>
              <p style="margin: 0; font-size: 13px; color: #444; line-height: 1.6;">
                ${a.fullName}<br/>
                ${a.line1}${a.line2 ? `<br/>${a.line2}` : ""}<br/>
                ${a.city}, ${a.postcode}<br/>
                ${a.country}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 20px 40px 0;"><div style="height: 1px; background: #f0f0f0;"></div></td></tr>

          <!-- Pricing -->
          <tr>
            <td style="padding: 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; color: #666; padding-bottom: 6px;">Subtotal</td>
                  <td style="text-align: right; font-size: 13px; color: #666; padding-bottom: 6px;">${formatPence(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #666; padding-bottom: 12px;">Delivery</td>
                  <td style="text-align: right; font-size: 13px; color: #666; padding-bottom: 12px;">${order.delivery === 0 ? "Free" : formatPence(order.delivery)}</td>
                </tr>
                <tr style="border-top: 1px solid #f0f0f0;">
                  <td style="font-size: 15px; font-weight: 600; color: #111; padding-top: 12px;">Total</td>
                  <td style="text-align: right; font-size: 15px; font-weight: 600; color: #111; padding-top: 12px;">${formatPence(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f9f9f9; padding: 24px 40px; border-top: 1px solid #f0f0f0;">
              ${logoFooterHtml}
              <p style="margin: 0; font-size: 12px; color: #999; line-height: 1.6;">
                Questions? Reply to this email and we'll help you out.<br/>
                © ${new Date().getFullYear()} Drape
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
