import { createClient } from '@supabase/supabase-js';
import { sharedAuthStorage, readStoredSession, AUTH_STORAGE_KEY } from './shell/auth-storage.js';

export const supabaseUrl = 'https://xnejbxdvqmzlaljkgwaf.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWpieGR2cW16bGFsamtnd2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTU1MDEsImV4cCI6MjA4NTA3MTUwMX0.NAW9CZ9GtMLhj1fyk1V8C0B4giLoI1NPT4aupQpvJdg';

// The session is stored in cookies shared across *.aimakersgeneration.com (so
// signing in on the main site also signs you in on cohorts.) and in plain
// localStorage everywhere else. See src/shell/auth-storage.js.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sharedAuthStorage,
    storageKey: AUTH_STORAGE_KEY, // the supabase-js default for this project, pinned
  },
});

// Synchronous peek at the stored session (no network, no supabase-js needed).
export { readStoredSession };
