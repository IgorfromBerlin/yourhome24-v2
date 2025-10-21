import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("descriptions")
      .select("id, created_at, text, payload")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return new Response("Error: " + error.message, { status: 500 });
    }

    const header = [
      "id",
      "created_at",
      "city",
      "property_type",
      "area_m2",
      "bedrooms",
      "bathrooms",
      "year_built",
      "features",
      "text",
    ];
    const rows = (data || []).map((r) => {
      const p = r.payload || {};
      const features = Array.isArray(p.features) ? p.features.join(" | ") : (p.features || "");
      const fields = [
        r.id,
        r.created_at,
        p.city || "",
        p.property_type || "",
        p.area_m2 ?? "",
        p.bedrooms ?? "",
        p.bathrooms ?? "",
        p.year_built ?? "",
        features,
        r.text || "",
      ].map((v) => {
        const s = String(v ?? "");
        const needsQuote = /[",;\n]/.test(s);
        return needsQuote ? `"${s.replace(/"/g, '""')}"` : s;
      });
      return fields.join(";");
    });

    const csv = [header.join(";"), ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="yourhome24-history.csv"`,
      },
    });
  } catch (e) {
    return new Response("Server error: " + String(e), { status: 500 });
  }
}