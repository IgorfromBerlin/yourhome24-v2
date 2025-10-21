"use client";
import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase"; // falls du supabase client im frontend nutzen willst

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50";
const labelCls = "text-sm font-medium text-slate-700";
const cardCls = "rounded-2xl border border-slate-200 bg-white p-4";

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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Images state
  const [files, setFiles] = useState([]); // File objects selected
  const [images, setImages] = useState([]); // uploaded public URLs
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({}); // optional per-file progress

  function update(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  const isValid = useMemo(() => {
    if (!String(form.city).trim()) return false;
    if (!String(form.property_type).trim()) return false;
    const area = Number(form.area_m2);
    if (!Number.isFinite(area) || area <= 0) return false;
    return true;
  }, [form]);

  // File input change
  function handleFileSelect(e) {
    const chosen = Array.from(e.target.files || []);
    // limit, e.g. max 8 files
    const max = 8;
    const combined = [...files, ...chosen].slice(0, max);
    setFiles(combined);
  }

  // Remove selected (before upload)
  function removeSelected(idx) {
    setFiles((f) => f.filter((_, i) => i !== idx));
  }

  // Upload all selected files to Supabase Storage 'images' bucket
  async function uploadFiles() {
    if (!files.length) return [];
    setUploading(true);
    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // unique path
        const path = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${file.name.replace(/\s/g,'_')}`;

        // supabase v2: storage.from('bucket').upload(path, file, { cacheControl, upsert })
        const { data, error } = await supabase.storage
          .from("images")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (error) {
          console.error("Upload error", error);
          setErr("Fehler beim Upload: " + error.message);
          continue;
        }

        // get public URL
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(data.path);
        const publicUrl = urlData?.publicUrl || null;
        if (publicUrl) uploadedUrls.push(publicUrl);
        // update per-file progress trivially
        setProgress((p) => ({ ...p, [file.name]: 100 }));
      } catch (e) {
        console.error("Upload exception", e);
        setErr("Upload Ausnahme: " + String(e));
      }
    }

    setUploading(false);
    setImages((old) => [...old, ...uploadedUrls]);
    // clear selected files after upload
    setFiles([]);
    return uploadedUrls;
  }

  async function onGenerate(e) {
    e?.preventDefault?.();
    setErr("");
    setText("");
    if (!isValid) {
      setErr("Bitte fülle die Pflichtfelder korrekt aus (Stadt, Typ, Wohnfläche).");
      return;
    }
    setLoading(true);
    try {
      // Wenn Dateien ausgewählt sind: Upload zuerst
      let uploaded = [];
      if (files.length) {
        uploaded = await uploadFiles();
      }

      const payload = {
        ...form,
        area_m2: Number(form.area_m2),
        bedrooms: Number(form.bedrooms),
        bathrooms:
          form.bathrooms === "" || form.bathrooms === null
            ? null
            : Number(form.bathrooms),
        year_built:
          form.year_built === "" || form.year_built === null
            ? null
            : Number(form.year_built),
        features: String(form.features)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        images: [...images, ...uploaded], // <-- include uploaded images URLs
      };

      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error || "Unbekannter Fehler bei der Textgenerierung."
        );
      }
      setText(data?.description || "");
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    setForm({
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
    setErr("");
    setText("");
    setFiles([]);
    setImages([]);
  }

  // Remove uploaded image (also delete from storage optional)
  async function removeImage(url) {
    // find path inside url after /storage/v1/object/public/images/
    try {
      const prefix = "/storage/v1/object/public/images/";
      const idx = url.indexOf(prefix);
      if (idx === -1) {
        // Not a supabase url - just remove from list
        setImages((arr) => arr.filter((u) => u !== url));
        return;
      }
      const path = url.slice(idx + prefix.length);
      // delete object (requires anon key allowed for delete; for PoC may fail if not allowed)
      const { error } = await supabase.storage.from("images").remove([path]);
      if (error) {
        console.error("Delete error", error);
        // still remove from UI
      }
    } catch (e) {
      console.error(e);
    } finally {
      setImages((arr) => arr.filter((u) => u !== url));
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <form onSubmit={onGenerate} className={`md:col-span-3 ${cardCls} space-y-4`}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Beschreibungs-Assistent</h1>
          <span className="text-xs text-slate-500">Felder mit * sind Pflicht</span>
        </div>

        {/* -- hier alle bisherigen Felder (wie vorher) -- */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* property_type, city, area_m2, bedrooms, bathrooms, year_built */}
          <label className="block">
            <div className={labelCls}>Immobilientyp *</div>
            <select className={fieldCls} value={form.property_type} onChange={(e)=>update("property_type", e.target.value)}>
              <option>Apartment</option>
              <option>Haus</option>
              <option>Villa</option>
              <option>Reihenhaus</option>
              <option>Semi Detached House</option>
              <option>Detached House</option>
            </select>
          </label>

          <label className="block">
            <div className={labelCls}>Stadt/Region *</div>
            <input className={fieldCls} value={form.city} onChange={(e)=>update("city", e.target.value)} placeholder="z. B. Limassol" />
          </label>

          <label className="block">
            <div className={labelCls}>Wohnfläche (m²) *</div>
            <input type="number" className={fieldCls} value={form.area_m2} onChange={(e)=>update("area_m2", e.target.value)} min={1} />
          </label>

          <label className="block">
            <div className={labelCls}>Schlafzimmer</div>
            <input type="number" className={fieldCls} value={form.bedrooms} onChange={(e)=>update("bedrooms", e.target.value)} min={0} />
          </label>

          <label className="block">
            <div className={labelCls}>Badezimmer</div>
            <input type="number" className={fieldCls} value={form.bathrooms} onChange={(e)=>update("bathrooms", e.target.value)} min={0} />
          </label>

          <label className="block">
            <div className={labelCls}>Baujahr</div>
            <input type="number" className={fieldCls} value={form.year_built} onChange={(e)=>update("year_built", e.target.value)} min={1800} max={2100} />
          </label>
        </div>

        <label className="block">
          <div className={labelCls}>Features (Komma-getrennt)</div>
          <input className={fieldCls} value={form.features} onChange={(e)=>update("features", e.target.value)} placeholder="z. B. Balkon, Meerblick, Parkplatz" />
        </label>

        <label className="block">
          <div className={labelCls}>Highlights (Stichpunkte; frei)</div>
          <input className={fieldCls} value={form.highlights} onChange={(e)=>update("highlights", e.target.value)} placeholder="z. B. Helle Räume; ruhige Lage" />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <div className={labelCls}>Ton</div>
            <select className={fieldCls} value={form.tone} onChange={(e)=>update("tone", e.target.value)}>
              <option>Sachlich</option>
              <option>Premium</option>
              <option>Locker</option>
            </select>
          </label>

          <label className="block">
            <div className={labelCls}>Sprache</div>
            <select className={fieldCls} value={form.language} onChange={(e)=>update("language", e.target.value)}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="el">Ελληνικά</option>
            </select>
          </label>

          <label className="block">
            <div className={labelCls}>Zielgruppe</div>
            <select className={fieldCls} value={form.audience} onChange={(e)=>update("audience", e.target.value)}>
              <option>Käufer</option>
              <option>Mieter</option>
              <option>Investoren</option>
              <option>Expats</option>
            </select>
          </label>
        </div>

        {/* ===== IMAGE UPLOAD UI ===== */}
        <div>
          <div className={labelCls}>Bilder / Grundrisse (max. 8)</div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="mt-2"
          />
          {/* selected previews (before upload) */}
          {files.length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {files.map((f, i) => {
                const url = URL.createObjectURL(f);
                return (
                  <div key={i} className="relative">
                    <img src={url} alt={f.name} className="w-full h-24 object-cover rounded-md" />
                    <button type="button" onClick={() => removeSelected(i)} className="absolute top-1 right-1 bg-white/80 rounded-full px-2">x</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* uploaded previews */}
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((u) => (
                <div key={u} className="relative">
                  <img src={u} alt="uploaded" className="w-full h-24 object-cover rounded-md" />
                  <button type="button" onClick={() => removeImage(u)} className="absolute top-1 right-1 bg-white/80 rounded-full px-2">x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || !isValid || uploading}
            className="inline-flex items-center rounded-xl border border-cyan-300 bg-cyan-500/90 text-white px-4 py-2 text-sm hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generiere…" : uploading ? "Lade Bilder hoch…" : "Beschreibung generieren"}
          </button>
          <button type="button" onClick={onReset} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:shadow-sm">
            Reset
          </button>
        </div>
      </form>

      {/* Rechte Spalte: Ergebnis */}
      <div className={`md:col-span-2 ${cardCls} space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Vorschau</h2>
          {text ? <span className="text-xs text-emerald-600">fertig ✓</span> : <span className="text-xs text-slate-500">noch leer</span>}
        </div>

        <textarea className="min-h-[360px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Hier erscheint der generierte Text …" />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>text && navigator.clipboard.writeText(text)} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:shadow-sm disabled:opacity-50" disabled={!text}>Kopieren</button>
          <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text || "")}`} download="beschreibung.txt" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:shadow-sm">Download .txt</a>
        </div>
      </div>
    </div>
  );
}