import { NextResponse } from "next/server";
import { createServiceClient, getUserFromRequest } from "@/lib/supabase-server";
import type { Order } from "@/types/order";

export type StatusHistoryEntry = { status: string; note?: string; createdAt: string };
export type OrderWithHistory = Order & { statusHistory: StatusHistoryEntry[] };

function rowToOrder(row: Record<string, unknown>): OrderWithHistory {
  const history = Array.isArray(row.order_status_history)
    ? (row.order_status_history as Array<{ status: string; note: string | null; created_at: string }>)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((h) => ({ status: h.status, note: h.note ?? undefined, createdAt: h.created_at }))
    : [];

  return {
    id: row.id as string,
    paymentIntentId: (row.payment_intent_id as string | null) ?? undefined,
    createdAt: row.created_at as string,
    status: row.status as Order["status"],
    items: row.items as Order["items"],
    address: row.address as Order["address"],
    subtotal: row.subtotal as number,
    delivery: row.delivery as number,
    total: row.total as number,
    customerEmail: (row.customer_email as string | null) ?? undefined,
    customerName: (row.customer_name as string | null) ?? undefined,
    statusHistory: history,
  };
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_status_history(status, note, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: (data ?? []).map(rowToOrder) });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  const body: Order & { createdAt: string } = await req.json();

  const supabase = createServiceClient();

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      ...(user ? { user_id: user.id } : {}),
      payment_intent_id: body.paymentIntentId ?? null,
      status: body.status,
      items: body.items,
      address: body.address,
      subtotal: body.subtotal,
      delivery: body.delivery,
      total: body.total,
      customer_email: body.customerEmail ?? null,
      customer_name: body.customerName ?? null,
      created_at: body.createdAt,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed the initial status history row
  await supabase.from("order_status_history").insert({
    order_id: inserted.id,
    status: body.status,
    created_at: body.createdAt,
  });

  return NextResponse.json({ saved: true });
}
