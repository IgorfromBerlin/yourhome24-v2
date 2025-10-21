import { createClient } from "@supabase/supabase-js";

// Wir unterstützen beide Namen (lokal + Vercel)
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Klare Fehlermeldung, statt kryptischem Crash
  throw new Error(
    `Missing Supabase env vars. Please set SUPABASE_URL and SUPABASE_ANON_KEY (.env.local)`,
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});