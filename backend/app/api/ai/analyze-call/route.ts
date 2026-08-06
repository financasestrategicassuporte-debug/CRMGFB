import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody } from "@/lib/api";
import { analyzeCallTranscript } from "@/lib/integrations/callAnalysis";

const analyzeCallSchema = z.object({
  transcript: z.string(),
  criteria: z.string().optional(),
});

export async function POST(request: Request) {
  const { user } = await getCurrentProfile();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = await parseBody(request, analyzeCallSchema);
  if ("error" in parsed) return parsed.error;

  const result = await analyzeCallTranscript(parsed.data.transcript, parsed.data.criteria);
  return NextResponse.json(result);
}
