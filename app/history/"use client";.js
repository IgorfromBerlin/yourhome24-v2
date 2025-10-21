"use client";
import { useEffect, useMemo, useState } from "react";

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Suche + Filter
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Alle");
  const [ptype, setPtype] = useState("Alle");

  // Daten laden
  useEffect(() => {
    setLoading(true);
    fetch("/api/history")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows(j.data || []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Dropdown-Optionen aus Daten ableiten
  const { cities, types } = useMemo(() => {
    const cSet = new Set(), tSet = new Set();
    for (const r of rows) {
      const p = r.payload || {};
      if (p.city) cSet.add(String(p.city));
      if (p.property_type) tSet.add(String(p.property_type));
    }
    return {
      cities: ["Alle", ...Array.from(cSet).sort((a,b)=>a.localeCompare(b))],
      types: ["Alle", ...Array.from(tSet).sort((a,b)=>a.localeCompare(b))],
    };
  }, [rows]);

  // Filter + Suche anwenden
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const p = r.payload || {};

      if (city !== "Alle" && String(p.city) !== city) return false;
      if (ptype !== "Alle" && String(p.property_type) !== ptype) return false;

      if (!needle) return true;
      const hay = [
        r.text,
        p.city,
        p.property_type,
        String(p.area_m2 || ""),
        String(p.bedrooms || ""),
        String(p.bathrooms || ""),
        String(p.year_built || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [rows, q, city, ptype]);

  async function handleDelete(id) {
    const ok = confirm("Diesen Eintrag wirklich löschen?");
    if (!ok) return;

    // Optimistisches Update
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));

    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Delete failed");
      }
    } catch (e) {
      alert("Löschen fehlgeschlagen: " + String(e.message || e));
      setRows(prev); // rollback
    }
  }

  return (
    <main style={wrap}>
      <h1 style={{ marginBottom: 12 }}>History (letzte 50)</h1>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr auto" }}>
        <input
          placeholder="Suche: Stadt, Typ, Text…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={input}
        />

        <select value={city} onChange={(e) => setCity(e.target.value)} style={input}>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={ptype} onChange={(e) => setPtype(e.target.value)} style={input}>
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <a href="/api/history/csv" style={btn}>Export CSV</a>
      </div>

      {loading && <p style={{ marginTop: 12 }}>Lade…</p>}
      {err && <p style={{ color: "crimson", marginTop: 12 }}>Fehler: {err}</p>}
      {!loading && !err && !filtered.length && <p style={{ marginTop: 12 }}>Keine Treffer.</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, marginTop: 12 }}>
        {filtered.map((row) => {
          const p = row.payload || {};
          const meta = [
            p.city,
            p.property_type,
            p.area_m2 ? `${p.area_m2} m²` : null,
            p.bedrooms ? `${p.bedrooms} SZ` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <li key={row.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {new Date(row.created_at).toLocaleString()}
                </div>
                <button onClick={() => handleDelete(row.id)} style={dangerBtn}>Löschen</button>
              </div>

              <div style={{ fontSize: 13, opacity: 0.8, margin: "6px 0 8px" }}>
                {meta || "—"}
              </div>

              <textarea
                readOnly
                rows={8}
                value={row.text || ""}
                style={{ width: "100%", resize: "vertical" }}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(row.text || "")} style={btn}>
                  Kopieren
                </button>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(row.text || "")}`}
                  download={`beschreibung-${row.id}.txt`}
                  style={{ ...btn, textDecoration: "none", display: "inline-block" }}
                >
                  Download .txt
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

const wrap = { maxWidth: 900, margin: "40px auto", padding: 20, fontFamily: "system-ui, sans-serif" };
const input = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 };
const card = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" };
const btn = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, background: "#f8f8f8", cursor: "pointer" };
const dangerBtn = { ...btn, borderColor: "#fca5a5", background: "#fee2e2" };