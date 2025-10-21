import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    // 1) Ein Test-Select (zählt Zeilen)
    const { data: rows, error: selErr, count } = await supabase
      .from("descriptions")
      .select("id", { count: "exact", head: true });

    // 2) Optional: Mini-Testinsert (kommentiere ein, wenn du möchtest)
    // const { error: insErr } = await supabase.from("descriptions").insert({
    //   payload: { test: true },
    //   text: "Hello from db-test",
    // });

    return new Response(
      JSON.stringify({
        ok: true,
        count: count ?? null,
        selectError: selErr?.message ?? null,
        // insertError: insErr?.message ?? null,
        env: {
          url: !!process.env.SUPABASE_URL,
          key: !!process.env.SUPABASE_ANON_KEY,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}