"use client";
import { useState } from "react";

export default function DescribePage() {
  const [form, setForm] = useState({
    property_type: "Apartment",
    area_m2: 85,
    bedrooms: 2,
    bathrooms: 1,
    city: "Larnaca",
    year_built: 2015,
    features: "Balkon, Meerblick, Parkplatz",
    highlights: "Helle Räume; ruhige Lage; sanierter Zustand",
    tone: "Sachlich",
    audience: "Käufer",
    language: "de",
  });

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function update(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onGenerate() {
    setLoading(true); setErr(""); setText("");
    try {
      const payload = {
        ...form,
        area_m2: Number(form.area_m2),
        bedrooms: Number(form.bedrooms),
        bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
        year_built: form.year_built === "" ? null : Number(form.year_built),
        features: form.features.split(",").map(s => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unbekannter Fehler");
      setText(data.description || "Keine Antwort erhalten.");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1>YourHome24 – Beschreibungs-Assistent</h1>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label>Immobilientyp
          <select value={form.property_type} onChange={(e)=>update("property_type", e.target.value)}>
            <option>Apartment</option><option>Haus</option><option>Villa</option><option>Reihenhaus</option>
          </select>
        </label>
        <label>Stadt/Region
          <input value={form.city} onChange={(e)=>update("city", e.target.value)} />
        </label>
        <label>Wohnfläche (m²)
          <input type="number" value={form.area_m2} onChange={(e)=>update("area_m2", e.target.value)} />
        </label>
        <label>Schlafzimmer
          <input type="number" value={form.bedrooms} onChange={(e)=>update("bedrooms", e.target.value)} />
        </label>
        <label>Badezimmer
          <input type="number" value={form.bathrooms} onChange={(e)=>update("bathrooms", e.target.value)} />
        </label>
        <label>Baujahr
          <input type="number" value={form.year_built} onChange={(e)=>update("year_built", e.target.value)} />
        </label>
      </div>

      <label style={{ display: "block", marginTop: 8 }}>
        Features (Komma-getrennt)
        <input style={{ width: "100%" }} value={form.features} onChange={(e)=>update("features", e.target.value)} />
      </label>
      <label style={{ display: "block", marginTop: 8 }}>
        Highlights (Stichpunkte)
        <input style={{ width: "100%" }} value={form.highlights} onChange={(e)=>update("highlights", e.target.value)} />
      </label>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <label>Ton
          <select value={form.tone} onChange={(e)=>update("tone", e.target.value)}>
            <option>Sachlich</option><option>Premium</option><option>Locker</option>
          </select>
        </label>
        <label>Sprache
          <select value={form.language} onChange={(e)=>update("language", e.target.value)}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
            <option value="el">Ελληνικά</option>
          </select>
        </label>
        <label>Zielgruppe
          <select value={form.audience} onChange={(e)=>update("audience", e.target.value)}>
            <option>Käufer</option><option>Mieter</option><option>Investoren</option><option>Expats</option>
          </select>
        </label>
      </div>

      <button onClick={onGenerate} disabled={loading} style={{ marginTop: 16, padding: "10px 16px" }}>
        {loading ? "Generiere..." : "Beschreibung generieren"}
      </button>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}

      {text && (
        <section style={{ marginTop: 20 }}>
          <h2>Vorschlag</h2>
          <textarea rows={12} value={text} onChange={(e)=>setText(e.target.value)} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => navigator.clipboard.writeText(text)}>Kopieren</button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
              download="beschreibung.txt"
              style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6, textDecoration: "none" }}
            >
              Download .txt
            </a>
          </div>
        </section>
      )}
    </main>
  );
}