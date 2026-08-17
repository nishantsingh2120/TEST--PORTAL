// Supabase Configuration Object
// Replace placeholders with your dynamic Supabase environment keys.
const SUPABASE_URL = "https://kzutrwddzxpqjgfhhlhc.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_3pQkQDCdjZgcABFzCVlGQA_NpivWNkl";

// Maximum security violations allowed before automatic exam disqualification/submission
const MAX_VIOLATION_LIMIT = 3;

// Initialize Supabase Client Instance Global
let supabaseClient = null;

if (typeof supabase !== 'undefined' && SUPABASE_URL !== "https://YOUR_SUPABASE_PROJECT_ID.supabase.co") {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.warn("Supabase credentials unset. Please configure config.js.");
}
