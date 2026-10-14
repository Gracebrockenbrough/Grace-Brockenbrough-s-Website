import { localDriver, type SessionDriver } from "./backend";
import { supabaseConfigured, supabaseDriver, webAI } from "./backends/supabase";

/** The website uses email accounts when Supabase is configured; otherwise it saves on this device. */
export const webDriver: SessionDriver = supabaseConfigured() ? supabaseDriver : { ...localDriver, ai: webAI };
