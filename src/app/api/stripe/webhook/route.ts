import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

// Map Stripe events to order statuses
const EVENT_STATUS: Partial<Record<string, { status: string; note: string }>> = {
  "payment_intent.succeeded":      { status: "confirmed",  note: "Payment confirmed by Stripe" },
  "payment_intent.payment_failed": { status: "cancelled",  note: "Payment failed" },
  "charge.refunded":               { status: "cancelled",  note: "Payment refunded" },
};

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency — ignore events already processed
  const { data: existing } = await supabase
    .from("stripe_events")
    .select("id, processed")
    .eq("id", event.id)
    .single();

  if (existing?.processed) {
    return NextResponse.json({ received: true });
  }

  // Log the event (upsert so a retry after a failed log doesn't duplicate)
  await supabase.from("stripe_events").upsert({
    id: event.id,
    type: event.type,
    payload: event.data.object,
    processed: false,
  });

  const mapping = EVENT_STATUS[event.type];
  if (mapping) {
    // All handled events carry a PaymentIntent object with an `id` field
    const pi = event.data.object as { id: string };

    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("payment_intent_id", pi.id)
      .single();

    if (order) {
      await supabase
        .from("orders")
        .update({ status: mapping.status })
        .eq("id", order.id);

      await supabase.from("order_status_history").insert({
        order_id: order.id,
        status: mapping.status,
        note: mapping.note,
      });
    }
  }

  // Mark event as processed
  await supabase
    .from("stripe_events")
    .update({ processed: true })
    .eq("id", event.id);

  return NextResponse.json({ received: true });
}
