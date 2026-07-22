import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { parseBody, dbError } from "@/lib/api";
import { qualifyDealSchema } from "@/lib/validation";
import { scoreLead } from "@/lib/scoring";

/** Runs the qualification-wizard scoring, updates the deal's
 * score/qualification/pipeline, and writes an AI-authored note —
 * mirroring the original scripted-call flow. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();
  const parsed = await parseBody(request, qualifyDealSchema);
  if ("error" in parsed) return parsed.error;

  const { score, qualification, classification } = scoreLead(parsed.data);

  const { data: deal, error } = await supabase
    .from("deals")
    .update({
      score,
      qualification,
      pipeline: classification === "frio" ? "frio" : "quente",
      students_count: parsed.data.students_count,
      revenue: parsed.data.revenue,
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error) return dbError(error);

  const summary =
    `Qualificação automática: score ${score}/100 (${classification}). ` +
    `${parsed.data.students_count} alunos, faturamento R$ ${parsed.data.revenue.toFixed(2)}, ` +
    `dor ${parsed.data.pain_level}/5, urgência ${parsed.data.urgency}/5, ` +
    `${parsed.data.uses_software ? "já usa" : "não usa"} ferramenta atualmente.`;

  const { data: note, error: noteError } = await supabase
    .from("deal_notes")
    .insert({ deal_id: params.id, body: summary, is_ai_generated: true })
    .select()
    .single();
  if (noteError) return dbError(noteError);

  return NextResponse.json({ deal, note, score, qualification, classification });
}
