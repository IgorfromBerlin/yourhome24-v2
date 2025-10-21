import { supabase } from "@/lib/supabase";

// WICHTIG: Supabase im Server nur in Node-Runtime benutzen
export const runtime = "nodejs";
// Immer frisch laden (kein Build-Cache)
export const revalidate = 0;

export default async function HistoryPage() {
  try {
    const { data, error } = await supabase
      .from("descriptions")
      .select("id, created_at, text, payload")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return (
        <main style={wrap}>
          <h1>History</h1>
          <p style={{ color: "crimson" }}>
            Fehler beim Laden: {error.message}
          </p>
        </main>
      );
    }

    return (
      <main style={wrap}>
        <h1 style={{ marginBottom: 12 }}>History (letzte 50)</h1>
        {!data?.length && <p>Noch keine Einträge gespeichert.</p>}

        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
          {data?.map((row) => {
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
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>
                  {meta || "—"}
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={row.text || ""}
                  style={{ width: "100%", resize: "vertical" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(row.text || "")}
                    style={btn}
                  >
                    Kopieren
                  </button>
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                      row.text || ""
                    )}`}
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
  } catch (e) {
    // Falls wirklich etwas im Server crasht, zeigen wir es sauber an
    return (
      <main style={wrap}>
        <h1>History</h1>
        <p style={{ color: "crimson" }}>
          Serverfehler: {String(e?.message || e)}
        </p>
      </main>
    );
  }
}

const wrap = {
  maxWidth: 900,
  margin: "40px auto",
  padding: 20,
  fontFamily: "system-ui, sans-serif",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  background: "#fff",
};

const btn = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  background: "#f8f8f8",
  cursor: "pointer",
};