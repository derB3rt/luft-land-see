import { createClient } from "@supabase/supabase-js";

const url = "https://yxtbpilbifljdmtyxnrl.supabase.co";
const token = [
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGJwaWxiaWZsamRtdHl4bnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjMwNzksImV4cCI6MjA5ODg5OTA3OX0",
  "U7ORFk24zF7nt54I_AQHdKxcenlGCN4pjapnG8HtWG0"
].join(".");

export const db = createClient(url, token);
