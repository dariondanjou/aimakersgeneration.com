import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xnejbxdvqmzlaljkgwaf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWpieGR2cW16bGFsamtnd2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTU1MDEsImV4cCI6MjA4NTA3MTUwMX0.NAW9CZ9GtMLhj1fyk1V8C0B4giLoI1NPT4aupQpvJdg';

export const supabase = createClient(supabaseUrl, supabaseKey);
