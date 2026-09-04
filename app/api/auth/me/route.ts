import { NextResponse } from "next/server";
import { getSessionUid } from "@/lib/session";
import { store } from "@/lib/store";

export async function GET() {
  const uid = await getSessionUid();
  if (!uid) return NextResponse.json({ user: null }, { status: 401 });
  const user = store.getUserById(uid);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: store.toPublic(user) });
}
