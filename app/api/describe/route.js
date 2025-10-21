import { supabase } from "@/lib/supabase";

export async function POST(req) {
  try {
    // ---------- 1) ENV-Variablen prüfen ----------
    const BASE  = process.env.MODEL_BASE_URL || "";
    const KEY   = process.env.MODEL_API_KEY  || "";
    const MODEL = process.env.MODEL_NAME     || "";

    if (!BASE || !KEY || !MODEL) {
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          hint: {
            MODEL_BASE_URL: !!BASE,
            MODEL_API_KEY: KEY ? "set" : "missing",
            MODEL_NAME: !!MODEL,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `${BASE.replace(/\/+$/, "")}/v1/chat/completions`;

    // ---------- 2) Request einmal einlesen ----------
    const input = await req.json().catch(() => ({}));

    const {
      property_type = "Apartment",
      area_m2 = 85,
      bedrooms = 2,
      bathrooms = null,
      city = "Larnaca",
      year_built = null,
      features = [],
      highlights = "",
      tone = "Sachlich",
      audience = "Käufer",
      language = "de",
    } = input;

    // ---------- 3) Prompts bauen ----------
    const systemPrompt = `Du bist ein Assistent, der Immobilienbeschreibungen schreibt.
- Nutze nur die im Faktenblock angegebenen Infos.
- Erfinde keine Angaben.
- Struktur: kurze Einleitung (1–2 Sätze), 3–5 Bullet Points, kurzer Abschluss-CTA.
- Schreibe m² korrekt. Keine Preise nennen.`;

    const userPrompt = `SPRACHE: ${language}
TON: ${tone}
ZIELGRUPPE: ${audience}

FAKTEN:
- Immobilientyp: ${property_type}
- Stadt/Region: ${city}
- Wohnfläche: ${area_m2} m²
- Schlafzimmer: ${bedrooms}
- Badezimmer: ${bathrooms ?? "—"}
- Baujahr: ${year_built ?? "—"}
- Features: ${(Array.isArray(features) ? features : String(features).split(","))
  .map((s) => String(s).trim())
  .filter(Boolean)
  .join(", ") || "—"}
- Highlights: ${highlights || "—"}

AUFGABE:
Erstelle eine ansprechende Exposé-Beschreibung (ca. 120–180 Wörter) in der angegebenen SPRACHE und im angegebenen TON.
Struktur:
- 1–2 Sätze Einleitung
- 3–5 Bullet Points
- 1 kurzer Abschluss mit Call-to-Action
Keine Fakten erfinden. Fehlendes weglassen.`;

    // ---------- 4) OpenAI aufrufen ----------
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Model API error: ${txt}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json().catch(() => ({}));
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    // ---------- 5) In Supabase speichern (non-blocking Fehlerbehandlung) ----------
    try {
      const { error } = await supabase.from("descriptions").insert({
        payload: input,
        text,
      });
      if (error) {
        console.error("Supabase insert error:", error.message);
      }
    } catch (e) {
      console.error("Supabase insert exception:", e);
    }

    // ---------- 6) Antwort an den Client ----------
    return new Response(
      JSON.stringify({ description: text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}