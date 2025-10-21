import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabase
    .from("descriptions")
    .select("id, created_at, text, payload")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ data }), { status: 200 });
}