import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("descriptions")
      .select("id, created_at, text, payload")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase select error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("API /history error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}