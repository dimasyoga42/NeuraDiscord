import { SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv"
dotenv.config()
export const supabase = new SupabaseClient("https://dpzomyklvfwauezwmdja.supabase.co", process.env.DB_KEY)
