import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const token = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const db = url && token ? createClient(url, token) : null;
