import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { requireRole } from "@/lib/apiauth";

export async function GET(req: Request) {
  const auth = await requireRole("view_log");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100) || 100);
  return NextResponse.json({ entries: store.recent(limit) });
}
