import { NextResponse } from "next/server";
import { createServiceClient, getUserFromRequest } from "@/lib/supabase-server";
import type { Address } from "@/types/order";

function rowToAddress(row: Record<string, unknown>): Address {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    line1: row.line1 as string,
    line2: (row.line2 as string | null) ?? undefined,
    city: row.city as string,
    postcode: row.postcode as string,
    country: row.country as string,
  };
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: (data ?? []).map(rowToAddress) });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fullName, line1, line2, city, postcode, country } = body;

  if (!fullName || !line1 || !city || !postcode || !country) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("addresses")
    .insert({ user_id: user.id, full_name: fullName, line1, line2: line2 || null, city, postcode, country })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: rowToAddress(data) });
}
