export async function POST(req) {
  try {
    const input = await req.json(); // 1. einmal komplett lesen
const {
  property_type="Apartment", area_m2=85, bedrooms=2, bathrooms=null,
  city="Larnaca", year_built=null, features=[], highlights="",
  tone="Sachlich", audience="Käufer", language="de",
} = input; // 2. Werte aus input holen

    const systemPrompt = `Du bist ein Assistent, der Immobilienbeschreibungen schreibt.
- Nur Informationen verwenden, die im Faktenblock stehen.
- Keine Angaben erfinden.
- Struktur: kurze Einleitung (1–2 Sätze), 3–5 Bullet Points, kurzer Abschluss-CTA.
- m² schreiben. Keine Preise nennen.`;

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
- Features: ${(features||[]).join(", ") || "—"}
- Highlights (Stichpunkte): ${highlights || "—"}

AUFGABE:
Erstelle eine ansprechende Exposé-Beschreibung (120–180 Wörter) in der angegebenen SPRACHE und im angegebenen TON.
Struktur:
- 1–2 Sätze Einleitung
- 3–5 Bullet Points
- 1 kurzer Abschluss mit Call-to-Action
Keine Fakten erfinden. Fehlende Angaben weglassen.`;

    const resp = await fetch(`${process.env.MODEL_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MODEL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Model API error: ${txt}` }), { status: 500 });
    }

    const data = await resp.json();
    // Speichern in Supabase
const { error } = await supabase.from("descriptions").insert({
  payload: input,
  text,
});
if (error) {
  console.error("Supabase insert error:", error.message);
}
    return new Response(JSON.stringify({ description: text }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}