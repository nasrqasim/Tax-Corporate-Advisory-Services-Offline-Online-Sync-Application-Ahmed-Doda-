/**
 * Backwards compatibility proxy:
 * Redirects all former Firestore sync calls to Supabase Cloud Engine.
 */

export * from './supabaseSync';
export { syncEngine as default } from './supabaseSync';
