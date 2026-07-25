import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Public endpoints that must work without a session: the login call
// itself, POSTing a new lead from the public landing page (GET on
// /api/leads still requires a session — that's the team reading leads),
// the WhatsApp webhook (Meta calls it directly, no user session), and the
// cron routes (Vercel Cron calls them with a bearer secret instead).
function isPublic(pathname: string, method: string) {
  if (pathname === "/api/auth/login") return true;
  if (pathname === "/api/leads" && method === "POST") return true;
  if (pathname === "/api/webhooks/whatsapp") return true;
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron routes authenticate via CRON_SECRET inside the route handler
  // itself (see lib/auth.ts#verifyCronSecret) — skip the Supabase session
  // refresh entirely, there's no cookie to refresh for a server-to-server call.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (pathname.startsWith("/api") && !isPublic(pathname, request.method)) {
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
  }

  return response;
}

export const config = {
  // Também roda nas páginas logadas (/dashboard, /crm, ...) só para manter
  // o cookie de sessão do Supabase renovado a cada navegação — quem decide
  // redirecionar para /login sem sessão é o próprio Server Component do
  // layout (app/(app)/layout.tsx), não este middleware.
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/crm/:path*",
    "/time/:path*",
    "/clientes/:path*",
    "/automacoes/:path*",
    "/gargalos/:path*",
    "/funis/:path*",
    "/produtos/:path*",
    "/performance/:path*",
    "/comissoes/:path*",
    "/chats/:path*",
    "/rfv/:path*",
  ],
};
