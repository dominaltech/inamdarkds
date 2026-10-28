import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ovxvfzdnwhakkujktxky.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92eHZmemRud2hha2t1amt0eGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NDU1NTUsImV4cCI6MjEwODQyMTU1NX0.HDfQrJl-vFZG3sI8bM8fCEzc6K_YVzz_SzzYHJM3roM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
