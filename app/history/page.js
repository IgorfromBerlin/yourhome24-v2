"use client";
import { useEffect, useMemo, useState } from "react";

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); // Suche

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setErr(j.error);
        else setRows(j.data || []);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const p = r.payload || {};
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
  }, [rows, q]);

  return (
    <main style={wrap}>
      <h1 style={{ marginBottom: 12 }}>History (letzte 50)</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <input
          placeholder="Suche: Stadt, Typ, Text…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        />
        <a href="/api/history/csv" style={btn}>Export CSV</a>
      </div>

      {loading && <p>Lade…</p>}
      {err && <p style={{ color: "crimson" }}>Fehler: {err}</p>}
      {!loading && !err && !filtered.length && <p>Keine Treffer.</p>}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
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
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                {new Date(row.created_at).toLocaleString()}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>{meta || "—"}</div>

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
const card = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff" };
const btn = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, background: "#f8f8f8", cursor: "pointer" };