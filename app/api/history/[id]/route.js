import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

export async function DELETE(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }

    const { error } = await supabase.from("descriptions").delete().eq("id", id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}