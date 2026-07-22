import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "JSON inválido" }, { status: 400 }) };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Dados inválidos", issues: result.error.flatten() },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

export function dbError(error: { message: string; code?: string }) {
  return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
}
