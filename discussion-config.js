/**
 * Shared discussion storage (Supabase). When both values are non-empty, the
 * Discussion tab reads/writes the public `discussion_board` table instead of
 * only localStorage. See discussion-supabase.sql and README.
 *
 * Safe to commit the anon key (it is public); protect data with RLS policies above.
 */
window.STORYMAP_DISCUSSION_SUPABASE_URL = "";
window.STORYMAP_DISCUSSION_SUPABASE_ANON_KEY = "";
