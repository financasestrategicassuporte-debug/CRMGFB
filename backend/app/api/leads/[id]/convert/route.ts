import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { dbError } from "@/lib/api";

/** Converts a raw landing-page lead into a "frio" CRM deal, the same
 * hand-off the Meta Ads pipeline does in the original dashboard. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { supabase } = await getCurrentProfile();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .single();
  if (leadError) return dbError(leadError);

  if (lead.converted_deal_id) {
    return NextResponse.json({ error: "Lead já convertido" }, { status: 409 });
  }

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      pipeline: "frio",
      person_name: lead.name,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      campaign: lead.campaign,
      adset: lead.adset,
      ad: lead.ad,
      students_count: lead.students_count,
      revenue: lead.revenue,
      pain_points: lead.pain_points,
      stage: 0,
    })
    .select()
    .single();
  if (dealError) return dbError(dealError);

  const { error: updateError } = await supabase
    .from("leads")
    .update({ converted_deal_id: deal.id })
    .eq("id", params.id);
  if (updateError) return dbError(updateError);

  return NextResponse.json({ deal }, { status: 201 });
}
