import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  const { user, profile } = await getCurrentProfile();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ user, profile });
}
