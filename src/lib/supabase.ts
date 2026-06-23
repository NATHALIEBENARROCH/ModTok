import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nfklspshcnthsoholtjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_M0QJjItq0AFbtjQaKPSdVw_VNpO0BoP";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
