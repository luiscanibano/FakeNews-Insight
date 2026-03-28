import { createClient } from "@supabase/supabase-js";

// Variables de entorno necesarias para conectar con Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Valida que una URL exista y use protocolo HTTP/HTTPS.
const isValidHttpUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const hasRequiredEnv = Boolean(supabaseUrl && supabaseAnonKey);
const canInitializeClient = hasRequiredEnv && isValidHttpUrl(supabaseUrl);

// Punto de acceso seguro al cliente, con validaciones previas.
export const getSupabaseClient = () => {
  if (!hasRequiredEnv) {
    throw new Error(
      "Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    );
  }

  if (!isValidHttpUrl(supabaseUrl)) {
    throw new Error(
      "Invalid VITE_SUPABASE_URL. It must be a valid HTTP or HTTPS URL."
    );
  }

  return supabase;
};

// Se crea solo cuando la configuracion es valida para evitar fallos en build/runtime.
export const supabase = canInitializeClient
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
