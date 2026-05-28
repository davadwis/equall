import { createClient } from "@supabase/supabase-js";
import type { SplitBillState } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveSession(
  slug: string,
  data: SplitBillState,
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .upsert({ slug, data }, { onConflict: "slug" });

  if (error) throw new Error(error.message);
}

export async function fetchSession(
  slug: string,
): Promise<SplitBillState | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("data")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data?.data as SplitBillState;
}
