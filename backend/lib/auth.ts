import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Loads the signed-in user's profile row (id, role, name, ...). The
 * middleware already guarantees a session exists for protected routes, so
 * a missing profile here means the auth user was never provisioned with
 * a matching row in `profiles`. */
export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

export function requireAdmin(role: string | undefined) {
  if (role !== "admin") {
    return NextResponse.json(
      { error: "Apenas administradores podem realizar esta ação" },
      { status: 403 }
    );
  }
  return null;
}

/** Usado pelas rotas de performance individual (`/performance/sdr/:id`,
 * `/performance/closer/:id`) e afins: admin acessa qualquer `id`, um
 * sdr/closer só acessa o próprio. */
export function requireSelfOrAdmin(
  profile: { id: string; role: string } | null,
  targetId: string
) {
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (profile.role !== "admin" && profile.id !== targetId) {
    return NextResponse.json(
      { error: "Você só pode acessar os seus próprios dados" },
      { status: 403 }
    );
  }
  return null;
}

/** Verifica o header usado pelo Vercel Cron (`Authorization: Bearer
 * ${CRON_SECRET}`) nas rotas `/api/cron/*`, que não rodam com sessão de
 * usuário. */
export function verifyCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}
