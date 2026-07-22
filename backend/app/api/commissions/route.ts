import { NextResponse } from "next/server";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { commissionSchema } from "@/lib/validation";

/** Admins see every commission; closers only see rows where they are the
 * closer_id (enforced by RLS — this query just returns whatever the
 * caller's session is allowed to see). */
export async function GET() {
  const { supabase } = await getCurrentProfile();
  const { data, error } = await supabase
    .from("commissions")
    .select("*, closer:profiles(id,name,initials), deal:deals(id,person_name)")
    .order("period", { ascending: false });
  if (error) return dbError(error);
  return NextResponse.json({ commissions: data });
}

export async function POST(request: Request) {
  const { supabase, profile } = await getCurrentProfile();
  const forbidden = requireAdmin(profile?.role);
  if (forbidden) return forbidden;

  const parsed = await parseBody(request, commissionSchema);
  if ("error" in parsed) return parsed.error;

  const { data, error } = await supabase
    .from("commissions")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return dbError(error);
  return NextResponse.json({ commission: data }, { status: 201 });
}
